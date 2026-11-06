import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StringDecoder } from 'node:string_decoder';

export const commandJournalLimits = Object.freeze({ maxRecords: 10_000, maxBytes: 256 * 1024 * 1024, retentionMs: 24 * 3600_000 });
// Ordinary tab snapshots are often below 64 KiB; compress them too without
// changing replay, retention or admission limits. Tiny receipts remain inline.
const compressionThreshold = 4096;
const expiredMessage = 'Command expired. Refresh before trying again.';

// This synchronous implementation belongs exclusively to the journal worker.
export class RemoteCommandStore {
  constructor(home, limits = {}) {
    this.limits = { ...commandJournalLimits, ...limits };
    for (const key of Object.keys(commandJournalLimits)) if (!Number.isSafeInteger(this.limits[key]) || this.limits[key] <= 0) throw new Error('Invalid remote command journal limit.');
    this.metrics = { claimWrites: 0, resultWrites: 0, payloadBytesWritten: 0, migrationRecords: 0, migrationBytes: 0 };
    this.file = path.join(home, 'remote-commands.sqlite');
    // Precreate with private permissions, including before SQLite creates WAL/SHM siblings.
    const fd = fs.openSync(this.file, 'a', 0o600); fs.closeSync(fd); fs.chmodSync(this.file, 0o600);
    this.db = new DatabaseSync(this.file);
    try {
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA cache_size=-4096;
        CREATE TABLE IF NOT EXISTS receipts (key TEXT PRIMARY KEY, digest TEXT NOT NULL, pending INTEGER NOT NULL, at REAL NOT NULL, payload TEXT NOT NULL, bytes INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS receipt_expiry ON receipts(pending, at);
        CREATE TABLE IF NOT EXISTS receipt_encoding (key TEXT PRIMARY KEY, compressed BLOB NOT NULL, hash TEXT NOT NULL, rawBytes INTEGER NOT NULL);
        CREATE TRIGGER IF NOT EXISTS receipt_encoding_delete AFTER DELETE ON receipts BEGIN DELETE FROM receipt_encoding WHERE key=old.key; END;
        CREATE TABLE IF NOT EXISTS receipt_methods (key TEXT PRIMARY KEY, method TEXT NOT NULL);
        CREATE TRIGGER IF NOT EXISTS receipt_method_delete AFTER DELETE ON receipts BEGIN DELETE FROM receipt_methods WHERE key=old.key; END;
        CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS totals (id INTEGER PRIMARY KEY CHECK(id=1), records INTEGER NOT NULL, bytes INTEGER NOT NULL, pending INTEGER NOT NULL);
        INSERT OR IGNORE INTO totals VALUES(1,0,0,0);
        CREATE TRIGGER IF NOT EXISTS receipt_insert AFTER INSERT ON receipts BEGIN UPDATE totals SET records=records+1, bytes=bytes+new.bytes, pending=pending+new.pending WHERE id=1; END;
        CREATE TRIGGER IF NOT EXISTS receipt_delete AFTER DELETE ON receipts BEGIN UPDATE totals SET records=records-1, bytes=bytes-old.bytes, pending=pending-old.pending WHERE id=1; END;
        CREATE TRIGGER IF NOT EXISTS receipt_update AFTER UPDATE ON receipts BEGIN UPDATE totals SET bytes=bytes+new.bytes-old.bytes, pending=pending+new.pending-old.pending WHERE id=1; END;`);
      this.get = this.db.prepare('SELECT r.digest,r.payload,e.compressed,e.hash,e.rawBytes FROM receipts r LEFT JOIN receipt_encoding e ON e.key=r.key WHERE r.key=?');
      this.insert = this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?)');
      this.replace = this.db.prepare('UPDATE receipts SET pending=?,at=?,payload=?,bytes=? WHERE key=? AND digest=?');
      this.prune = this.db.prepare('DELETE FROM receipts WHERE pending=0 AND at<?');
      this.total = this.db.prepare('SELECT records,bytes,pending FROM totals WHERE id=1');
      this.migrate(path.join(home, 'remote-commands.json'));
      this.compact();
      this.privateFiles();
    } catch (error) { this.db.close(); throw error; }
  }
  privateFiles() { for (const file of [this.file, this.file + '-wal', this.file + '-shm']) if (fs.existsSync(file)) fs.chmodSync(file, 0o600); }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { try { this.db.exec('ROLLBACK'); } catch { /* SQLite may already have rolled back an I/O failure. */ } throw error; }
  }
  encode(key, record) {
    const payload = JSON.stringify(record);
    return { payload, bytes: Buffer.byteLength(key) + Buffer.byteLength(payload) };
  }
  decode(row){
    if(!row.compressed)return JSON.parse(row.payload);
    const bytes=gunzipSync(row.compressed,{maxOutputLength:row.rawBytes});
    if(bytes.length!==row.rawBytes||createHash('sha256').update(bytes).digest('hex')!==row.hash)throw Error('Remote command receipt integrity check failed.');
    return JSON.parse(bytes.toString('utf8'));
  }
  storeCompleted(key,digest,record){
    const encoded=this.encode(key,record),raw=Buffer.from(encoded.payload);
    if(raw.length>=compressionThreshold){
      const compressed=gzipSync(raw);
      // Older SQLite readers see an uncertain claim, never an empty successful
      // outcome or permission to repeat the mutation. New readers restore exact JSON.
      const stub=this.encode(key,{digest,pending:true,at:record.at,issuedAt:record.issuedAt});
      if(compressed.length+stub.bytes+128<encoded.bytes){
        this.db.prepare('INSERT OR REPLACE INTO receipt_encoding VALUES(?,?,?,?)').run(key,compressed,createHash('sha256').update(raw).digest('hex'),raw.length);
        this.replace.run(0,record.at,stub.payload,stub.bytes+compressed.length+128,key,digest);
        return stub.bytes+compressed.length+128;
      }
    }
    this.replace.run(0,record.at,encoded.payload,encoded.bytes,key,digest);return encoded.bytes;
  }
  compact(){
    // One bounded receipt at a time, atomically with its encoding. Existing
    // uncertainty and full retention windows remain intact; no effects are replayed.
    let after='';
    while(true){
      const row=this.db.prepare('SELECT r.key,r.digest,r.payload FROM receipts r LEFT JOIN receipt_encoding e ON e.key=r.key WHERE r.pending=0 AND r.bytes>=? AND e.key IS NULL AND r.key>? ORDER BY r.key LIMIT 1').get(compressionThreshold,after);
      if(!row)break;after=row.key;
      this.transaction(()=>this.storeCompleted(row.key,row.digest,JSON.parse(row.payload)));
    }
  }
  migrate(legacyFile) {
    if (this.db.prepare("SELECT value FROM metadata WHERE key='legacy-import'").get()) return;
    // Import and its marker commit together. Preserve the original bytes for recovery;
    // an interrupted/invalid import rolls back, never leaving a partially trusted ledger.
    let migrationRecords = 0, migrationBytes = 0;
    this.transaction(() => {
      if (fs.existsSync(legacyFile)) {
        for (const [key, record] of legacyReceipts(legacyFile)) {
          if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.digest !== 'string' || !Number.isFinite(record.at)) throw new Error('Invalid legacy remote command receipt.');
          const { payload, bytes } = this.encode(key, record);
          this.insert.run(key, record.digest, record.pending ? 1 : 0, record.at, payload, bytes);
          migrationRecords++; migrationBytes += bytes;
        }
      }
      this.db.prepare("INSERT INTO metadata VALUES('legacy-import','1')").run();
    });
    this.metrics.migrationRecords = migrationRecords; this.metrics.migrationBytes = migrationBytes;
  }
  lookup(key) { const row=this.get.get(key);return row?this.decode(row):null; }
  claim(key, digest, issuedAt, now = Date.now(), method) {
    let prunedAt;
    const result = this.transaction(() => {
      // Lookup precedes issue-time validation: retries can retrieve full 24h receipts.
      const previous = this.get.get(key);
      if (previous) {
        if (previous.digest !== digest) throw new Error('Request ID was already used for another command.');
        return { previous: this.decode(previous) };
      }
      if (!Number.isFinite(Date.parse(issuedAt)) || Math.abs(now - Date.parse(issuedAt)) > 300_000) throw new Error(expiredMessage);
      // Never expire an unresolved claim. Completed results retain the full retry window.
      if (!this.lastPrune || now - this.lastPrune >= 60_000) { this.prune.run(now - this.limits.retentionMs); prunedAt = now; }
      const record = { digest, pending: true, at: now, issuedAt };
      const { payload, bytes } = this.encode(key, record); const totals = this.total.get();
      if (totals.records >= this.limits.maxRecords || totals.bytes + bytes > this.limits.maxBytes) {
        const error = new Error('Remote command history is busy. Retry later; recent and uncertain actions are protected.');
        error.code = 'JOURNAL_BUSY';
        const next=this.db.prepare('SELECT MIN(at) AS at FROM receipts WHERE pending=0').get().at;
        const retryAfterMs=next===null?null:Math.max(0,next+this.limits.retentionMs-now);
        error.details = { records: totals.records, bytes: totals.bytes, pending: totals.pending, maxRecords: this.limits.maxRecords, maxBytes: this.limits.maxBytes,
          limitingCounter: totals.records >= this.limits.maxRecords ? 'records' : 'bytes', retryAfterMs, nextExpiryAt:next===null?null:new Date(next+this.limits.retentionMs).toISOString() };
        throw error;
      }
      this.insert.run(key, digest, 1, now, payload, bytes);
      if(typeof method==='string'&&/^[a-z][a-z.-]{0,63}$/.test(method))this.db.prepare('INSERT INTO receipt_methods VALUES(?,?)').run(key,method);
      return { claimed: true, bytesWritten: bytes };
    });
    if (prunedAt !== undefined) this.lastPrune = prunedAt;
    if (result.claimed) { this.metrics.claimWrites++; this.metrics.payloadBytesWritten += result.bytesWritten; }
    return result;
  }
  complete(key, digest, outcome, now = Date.now()) {
    const result = this.transaction(() => {
      const old = this.get.get(key);
      if (!old || old.digest !== digest) throw new Error('Remote command claim is unavailable.');
      const claim = this.decode(old);
      if (!claim.pending) throw new Error('Remote command already completed.');
      const record = { digest, ...outcome, at: now, issuedAt: claim.issuedAt };
      // Existing claims must always be allowed to finish, even if a large result exceeds
      // the admission budget. Subsequent new claims are refused; no valid receipt is lost.
      const bytes=this.storeCompleted(key,digest,record);
      return { stored: true, bytesWritten: bytes };
    });
    this.metrics.resultWrites++; this.metrics.payloadBytesWritten += result.bytesWritten;
    return result;
  }
  diagnostics() {
    const totals = this.total.get();
    const protectedTotals = this.db.prepare('SELECT COUNT(*) AS protectedRecords, COALESCE(SUM(bytes),0) AS protectedBytes FROM receipts WHERE pending=1 OR at>=?').get(Date.now() - this.limits.retentionMs);
    const nextExpiry=this.db.prepare('SELECT MIN(at) AS at FROM receipts WHERE pending=0').get().at;
    const byMethod=this.db.prepare("SELECT COALESCE(m.method,'unknown-legacy') AS method,COUNT(*) AS records,SUM(r.bytes) AS bytes,SUM(r.pending) AS pending FROM receipts r LEFT JOIN receipt_methods m ON m.key=r.key GROUP BY m.method ORDER BY bytes DESC LIMIT 100").all();
    const nextExpiryAt=nextExpiry===null?null:new Date(nextExpiry+this.limits.retentionMs).toISOString();
    const fileBytes = file => { try { return fs.statSync(file).size; } catch { return 0; } };
    return { ...totals, ...this.metrics, ...protectedTotals, byMethod, nextExpiryAt, capacityWarning:totals.records>=this.limits.maxRecords*0.8||totals.bytes>=this.limits.maxBytes*0.8, expiredRecords: totals.records - protectedTotals.protectedRecords, workerHeapBytes: process.memoryUsage().heapUsed, maxRecords: this.limits.maxRecords, maxBytes: this.limits.maxBytes, retentionMs: this.limits.retentionMs,
      overBudget: totals.records >= this.limits.maxRecords || totals.bytes >= this.limits.maxBytes,
      storageBytes: fileBytes(this.file) + fileBytes(this.file + '-wal') + fileBytes(this.file + '-shm') };
  }
  close() { this.db.close(); }
}

// Stream the outer object so a large old ledger never becomes a resident object/map.
// JSON.parse still validates each complete key/receipt, including escapes and unknown fields.
function* legacyReceipts(file) {
  const fd = fs.openSync(file, 'r'), buffer = Buffer.alloc(64 * 1024), decoder = new StringDecoder('utf8');
  let chunk = '', index = 0, ended = false;
  const peek = () => {
    while (index >= chunk.length && !ended) {
      const count = fs.readSync(fd, buffer); index = 0;
      if (count) chunk = decoder.write(buffer.subarray(0, count));
      else { ended = true; chunk = decoder.end(); }
    }
    return chunk[index];
  };
  const read = () => { const char = peek(); if (char !== undefined) index++; return char; };
  const whitespace = () => { while (peek() !== undefined && /[ \t\r\n]/.test(peek())) read(); };
  const expect = value => { whitespace(); if (read() !== value) throw new Error('Invalid legacy remote command journal.'); };
  const token = kind => {
    let quoted = kind === 'key', escaped = false, depth = kind === 'key' ? 0 : 1, part = kind === 'key' ? '"' : '{'; const parts = [];
    if (read() !== (kind === 'key' ? '"' : '{')) throw new Error('Invalid legacy remote command journal.');
    while (true) {
      const char = read(); if (char === undefined) throw new Error('Incomplete legacy remote command journal.');
      part += char; if (part.length >= 65536) { parts.push(part); part = ''; }
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') { quoted = false; if (kind === 'key') break; }
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') { depth--; if (depth === 0) break; }
    }
    parts.push(part); return JSON.parse(parts.join(''));
  };
  try {
    expect('{'); whitespace();
    if (peek() !== '}') while (true) {
      const key = token('key'); expect(':'); whitespace(); const record = token('record');
      yield [key, record]; whitespace();
      if (peek() === '}') break;
      expect(','); whitespace();
    }
    expect('}'); whitespace(); if (peek() !== undefined) throw new Error('Invalid legacy remote command journal trailing data.');
  } finally { fs.closeSync(fd); }
}
