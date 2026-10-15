import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const logLimits = Object.freeze({ entries: 2000, bytes: 64 * 1024 * 1024, entryBytes: 256 * 1024 });
// This store is used only by log-worker.js. Deleted pages are reused; periodic
// incremental vacuum/checkpoint also releases unused pages and bounds the WAL.
export class LogStore {
  constructor(home) {
    this.file = path.join(home, 'logs.sqlite');
    fs.mkdirSync(home, { recursive: true });
    const fd = fs.openSync(this.file, 'a', 0o600); fs.closeSync(fd);
    this.db = new DatabaseSync(this.file);
    try {
      this.db.exec(`PRAGMA auto_vacuum=INCREMENTAL; PRAGMA journal_mode=WAL;
        PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA journal_size_limit=1048576;
        CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS logs(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,level TEXT NOT NULL,event TEXT NOT NULL,summary TEXT NOT NULL,
          context TEXT NOT NULL,payload TEXT NOT NULL,bytes INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS log_time ON logs(created_at DESC,seq DESC);
        CREATE INDEX IF NOT EXISTS log_level ON logs(level,seq DESC);
        CREATE INDEX IF NOT EXISTS log_event ON logs(event,seq DESC);`);
      if (!this.db.prepare("SELECT value FROM metadata WHERE key='legacy-import'").get()) {
        const legacy = path.join(home, 'activity.json'), backup = path.join(home, 'activity.legacy.json');
        let items = [];
        if (fs.existsSync(legacy)) {
          const data = JSON.parse(fs.readFileSync(legacy, 'utf8'));
          if (data.logs !== undefined && !Array.isArray(data.logs)) throw new Error('Saved activity logs are invalid. The original file was preserved.');
          items = data.logs || [];
          try { fs.copyFileSync(legacy, backup, fs.constants.COPYFILE_EXCL); fs.chmodSync(backup, 0o600); }
          catch (error) { if (error.code !== 'EEXIST') throw error; }
        }
        this.transaction(() => {
          for (const item of items.slice(-logLimits.entries)) this.insert({ ...item, summary: String(item.message || item.event || '').split('\n')[0].slice(0,240), legacy: true });
          this.rotate();
          this.db.prepare("INSERT INTO metadata VALUES('legacy-import','1')").run();
        });
      }
      for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(this.file + suffix)) fs.chmodSync(this.file + suffix, 0o600);
      this.writes = 0;
    } catch (error) { this.db.close(); throw error; }
  }
  transaction(action) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  insert(item) {
    const payload = JSON.stringify(item);
    if (Buffer.byteLength(payload) > logLimits.entryBytes) throw new Error('Log entry exceeds its diagnostic limit.');
    const context = JSON.stringify(Object.fromEntries(['hostId','chatId','scheduleId','source','truncated','legacy'].filter(key => item[key] !== undefined).map(key => [key,item[key]])));
    this.db.prepare('INSERT OR IGNORE INTO logs(id,created_at,level,event,summary,context,payload,bytes) VALUES(?,?,?,?,?,?,?,?)')
      .run(item.id,item.createdAt,item.level,item.event,item.summary || item.event,context,payload,Buffer.byteLength(payload));
  }
  rotate() {
    this.db.exec(`DELETE FROM logs WHERE seq NOT IN (SELECT seq FROM logs ORDER BY seq DESC LIMIT ${logLimits.entries})`);
    let bytes = this.db.prepare('SELECT COALESCE(SUM(bytes),0) AS bytes FROM logs').get().bytes;
    while (bytes > logLimits.bytes) {
      const row = this.db.prepare('SELECT seq,bytes FROM logs ORDER BY seq LIMIT 1').get();
      this.db.prepare('DELETE FROM logs WHERE seq=?').run(row.seq); bytes -= row.bytes;
    }
  }
  append(item) {
    this.transaction(() => { this.insert(item); this.rotate(); });
    if (++this.writes % 100 === 0) this.db.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA incremental_vacuum(256);');
    return { ok: true };
  }
  query(value = {}) {
    const limit = Math.max(1, Math.min(100, Math.floor(Number(value.limit) || 50)));
    let before = Number.MAX_SAFE_INTEGER;
    if (value.cursor) {
      if (typeof value.cursor !== 'string' || !/^\d{1,16}$/.test(value.cursor) || !Number.isSafeInteger(Number(value.cursor))) throw new Error('Invalid log cursor.');
      before = Number(value.cursor);
    } else if (value.target) {
      const target = this.db.prepare('SELECT seq FROM logs WHERE id=?').get(String(value.target));
      if (target) before = target.seq + 1;
    }
    const rows = this.db.prepare('SELECT seq,id,created_at,level,event,summary,context FROM logs WHERE seq<? ORDER BY seq DESC LIMIT ?').all(before,limit + 1);
    const hasMore = rows.length > limit, page = rows.slice(0,limit);
    return { items: page.map(row => ({ id: row.id, createdAt: row.created_at, level: row.level, event: row.event, summary: row.summary, message: row.summary, ...JSON.parse(row.context) })),
      hasMore, nextCursor: hasMore ? String(page.at(-1).seq) : null, limit,
      total: this.db.prepare('SELECT COUNT(*) AS count FROM logs').get().count, retention: logLimits };
  }
  detail(id) {
    const row = this.db.prepare('SELECT payload FROM logs WHERE id=?').get(String(id));
    if (!row) throw new Error('This log entry is no longer retained.');
    return JSON.parse(row.payload);
  }
  close() { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE); PRAGMA incremental_vacuum;'); this.db.close(); return { ok: true }; }
}
