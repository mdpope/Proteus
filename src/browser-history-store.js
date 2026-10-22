import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import historyURLs from '../desktop/browser-history.cjs';

const DAY = 86400000, MAX_BATCH = 200;
const {safeHistoryURL:safeURL}=historyURLs;
const identity = (value, name) => {
  if (typeof value !== 'string' || !value || value.length > 600 || /[\x00-\x1f\x7f]/.test(value)) throw new Error(`Invalid history ${name}.`);
  return value;
};
const stamp = value => { const at = Date.parse(value); if (!Number.isFinite(at)) throw new Error('Invalid history date.'); return new Date(at).toISOString(); };
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = value => { try { if (typeof value !== 'string' || value.length > 4000) throw Error(); return JSON.parse(Buffer.from(value, 'base64url').toString()); } catch { throw new Error('Invalid history cursor.'); } };
const limitOf = value => Math.max(1, Math.min(MAX_BATCH, Math.floor(Number(value) || 100)));

// DatabaseSync is deliberately isolated in browser-history-worker.js.
export class BrowserHistoryStore {
  constructor(home, {hostId = '', legacyFile = path.join(home, 'browsing-history.json')} = {}) {
    fs.mkdirSync(home, {recursive:true}); this.hostId = hostId; this.file = path.join(home, 'browser-history.sqlite');
    const fd = fs.openSync(this.file, 'a', 0o600); fs.closeSync(fd); fs.chmodSync(this.file, 0o600);
    this.db = new DatabaseSync(this.file);this.mutationCount=0;
    try {
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA cache_size=-8192;
        CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,visited_at TEXT NOT NULL,profile_id TEXT NOT NULL,source_host_id TEXT NOT NULL,url TEXT NOT NULL,title TEXT NOT NULL,tab_id TEXT,entry_id TEXT,updated_at TEXT NOT NULL,payload TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS visits_date ON events(visited_at DESC,event_id DESC);
        CREATE INDEX IF NOT EXISTS visits_profile ON events(profile_id,visited_at DESC,event_id DESC);
        CREATE INDEX IF NOT EXISTS visits_source ON events(source_host_id,visited_at DESC,event_id DESC);
        CREATE VIRTUAL TABLE IF NOT EXISTS event_search USING fts5(event_id UNINDEXED,title,url,tokenize='unicode61');
        CREATE TRIGGER IF NOT EXISTS search_insert AFTER INSERT ON events BEGIN INSERT INTO event_search(rowid,event_id,title,url) VALUES(new.rowid,new.event_id,new.title,new.url); END;
        CREATE TRIGGER IF NOT EXISTS search_delete AFTER DELETE ON events BEGIN DELETE FROM event_search WHERE rowid=old.rowid; END;
        CREATE TRIGGER IF NOT EXISTS search_update AFTER UPDATE ON events BEGIN DELETE FROM event_search WHERE rowid=old.rowid; INSERT INTO event_search(rowid,event_id,title,url) VALUES(new.rowid,new.event_id,new.title,new.url); END;
        CREATE TABLE IF NOT EXISTS tombstones(event_id TEXT PRIMARY KEY,deleted_at TEXT NOT NULL,profile_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS changes(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT UNIQUE NOT NULL,kind TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS peer_cursors(host_id TEXT PRIMARY KEY,cursor TEXT,signature TEXT,last_sync_at TEXT,error TEXT);
        CREATE TABLE IF NOT EXISTS nav_tabs(tab_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,selected_entry_id TEXT);
        CREATE TABLE IF NOT EXISTS nav_entries(tab_id TEXT NOT NULL,entry_id TEXT NOT NULL,position INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(tab_id,entry_id));
        CREATE INDEX IF NOT EXISTS nav_position ON nav_entries(tab_id,position);
        CREATE TABLE IF NOT EXISTS nav_receipts(operation_id TEXT PRIMARY KEY,digest TEXT NOT NULL,payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS nav_changes(tab_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(tab_id,revision));`);
      this.db.prepare('INSERT OR IGNORE INTO metadata VALUES(?,?)').run('epoch', randomUUID());
      this.db.prepare('INSERT OR IGNORE INTO metadata VALUES(?,?)').run('settings', JSON.stringify({enabled:true,retentionDays:0,peers:[]}));
      this.epoch = this.meta('epoch'); this.migrateSearch(); this.migrate(legacyFile);
      for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(this.file + suffix)) fs.chmodSync(this.file + suffix, 0o600);
    } catch (error) { this.db.close(); throw error; }
  }
  meta(key) { return this.db.prepare('SELECT value FROM metadata WHERE key=?').get(key)?.value; }
  transaction(action) { if(this.inTransaction)return action();this.db.exec('BEGIN IMMEDIATE');this.inTransaction=true;try { const result=action(); this.db.exec('COMMIT'); return result; } catch(error) { this.db.exec('ROLLBACK'); throw error; } finally {this.inTransaction=false;} }
  migrateSearch() {
    if(this.meta('search-version')==='2')return;
    // Earlier versions gave FTS unrelated row IDs and deleted by an unindexed
    // text column. Rebuild only that derived index atomically; visits/receipts stay.
    this.transaction(()=>{
      this.db.exec(`DROP TRIGGER IF EXISTS search_insert;DROP TRIGGER IF EXISTS search_delete;DROP TRIGGER IF EXISTS search_update;
        DELETE FROM event_search;
        INSERT INTO event_search(rowid,event_id,title,url) SELECT rowid,event_id,title,url FROM events;
        CREATE TRIGGER search_insert AFTER INSERT ON events BEGIN INSERT INTO event_search(rowid,event_id,title,url) VALUES(new.rowid,new.event_id,new.title,new.url); END;
        CREATE TRIGGER search_delete AFTER DELETE ON events BEGIN DELETE FROM event_search WHERE rowid=old.rowid; END;
        CREATE TRIGGER search_update AFTER UPDATE ON events BEGIN DELETE FROM event_search WHERE rowid=old.rowid; INSERT INTO event_search(rowid,event_id,title,url) VALUES(new.rowid,new.event_id,new.title,new.url); END;`);
      this.db.prepare('INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('search-version','2');
    });
  }
  normalize(raw,{replicated=false}={}) {
    if (!raw || typeof raw !== 'object' || raw.private === true || raw.privateBrowsing === true || String(raw.profileId || '').startsWith('private:')) throw new Error('Private browsing is excluded from shared history.');
    const url=safeURL(raw.url); if (!url) throw new Error('This address cannot be stored in browsing history.');
    const aliases=replicated && raw.aliases!==undefined?raw.aliases:[];if(!Array.isArray(aliases)||aliases.length>100)throw new Error('Invalid redirected history addresses.');const safeAliases=[...new Set(aliases.map(value=>{const safe=safeURL(value);if(!safe)throw new Error('Private authentication addresses cannot replicate.');return safe;}))];
    return {...(safeAliases.length?{aliases:safeAliases}:{}),eventId:identity(raw.eventId || raw.id,'event ID'),url,title:String(raw.title || new URL(url).hostname).slice(0,200),visitedAt:stamp(raw.visitedAt || raw.createdAt),profileId:identity(raw.profileId || 'default','profile'),sourceHostId:raw.sourceHostId || raw.hostId || raw.deviceId || this.hostId ? identity(raw.sourceHostId || raw.hostId || raw.deviceId || this.hostId,'source host') : '',
      ...(raw.visitTabId || raw.tabId ? {tabId:identity(raw.visitTabId || raw.tabId,'tab')} : {}),...(raw.entryId ? {entryId:identity(raw.entryId,'entry')} : {}),updatedAt:stamp(raw.updatedAt || raw.visitedAt || raw.createdAt)};
  }
  change(id,kind) { this.mutationCount++;this.db.prepare('DELETE FROM changes WHERE event_id=?').run(id); this.db.prepare('INSERT INTO changes(event_id,kind) VALUES(?,?)').run(id,kind); }
  insert(event,trusted=false) {
    if(this.db.prepare('SELECT event_id FROM tombstones WHERE event_id=?').get(event.eventId)) return false;
    const old=this.db.prepare('SELECT payload FROM events WHERE event_id=?').get(event.eventId);
    if(old) {
      const previous=JSON.parse(old.payload);
      if(previous.profileId!==event.profileId || previous.visitedAt!==event.visitedAt || previous.sourceHostId!==event.sourceHostId) throw new Error('History event ID was already used for another visit.');
      if(previous.url!==event.url && !(trusted && event.aliases?.includes(previous.url))){
        // An acknowledged original outbox payload can arrive after its redirect.
        // It is the same visit, but cannot replace the current canonical URL.
        if(previous.aliases?.includes(event.url))return false;
        throw new Error('History event ID was already used for another visit.');
      }
      if(event.updatedAt <= previous.updatedAt)return false;
      const aliases=[...new Set([...(previous.aliases || []),...(event.aliases || [])])];
      if(aliases.length>100)throw new Error('Too many redirected destinations for one navigation. Start a new navigation.');
      event={...previous,url:event.url,title:event.title,updatedAt:event.updatedAt,...(aliases.length?{aliases}:{})};
    }
    this.db.prepare(`INSERT INTO events VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET url=excluded.url,title=excluded.title,updated_at=excluded.updated_at,payload=excluded.payload`).run(event.eventId,event.visitedAt,event.profileId,event.sourceHostId,event.url,event.title,event.tabId || null,event.entryId || null,event.updatedAt,JSON.stringify(event));
    this.change(event.eventId,'event'); return !old;
  }
  record(value = {}) {
    const rows=value.events || value.visits || (value.eventId ? [value] : []);
    if(!Array.isArray(rows) || !rows.length || rows.length>MAX_BATCH) throw new Error('Send between 1 and 200 history visits.');
    const events=rows.map(row=>this.normalize(row));
    return this.transaction(()=>{const before=this.mutationCount;if(!JSON.parse(this.meta('settings')).enabled) return {acknowledgedEventIds:events.map(e=>e.eventId),inserted:0,disabled:true}; let inserted=0; for(const event of events) if(this.insert(event)) inserted++; return {acknowledgedEventIds:events.map(e=>e.eventId),inserted,changed:this.mutationCount>before};});
  }
  migrate(file) {
    if(this.meta('legacy-import') || !fs.existsSync(file)) return;
    if(fs.statSync(file).size>16*1024*1024) throw new Error('Legacy history exceeds the migration size limit; original preserved.');
    let data; try {data=JSON.parse(fs.readFileSync(file,'utf8'));} catch {throw new Error('Legacy history could not be read; original preserved.');}
    if(!Array.isArray(data.items)) throw new Error('Legacy history is invalid; original preserved.');
    this.transaction(()=>{
      let imported=0,excluded=0;
      data.items.forEach((row,index)=>{
        // Never collapse two original records by URL/time. Repeated import uses stable source IDs.
        const eventId='legacy-desktop:'+fingerprint([row.id || null,index,row]);
        if(!safeURL(row.url) || row.private === true || String(row.profileId || '').startsWith('private:')) {excluded++;return;}
        if(this.insert(this.normalize({...row,eventId}))) imported++;
      });
      const settings=JSON.parse(this.meta('settings')); if(typeof data.enabled==='boolean') settings.enabled=data.enabled;
      if([0,7,30,90,365].includes(data.retentionDays)) settings.retentionDays=data.retentionDays;
      this.db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify(settings),'settings');
      this.db.prepare('INSERT INTO metadata VALUES(?,?)').run('legacy-import',JSON.stringify({imported,excluded,verifiedAt:new Date().toISOString(),originalPreserved:true,legacySettings:Object.fromEntries(Object.entries(data).filter(([key])=>key!=='items'))}));
    });
  }
  importLegacy(value={}) {
    if(!Array.isArray(value.items) || value.items.length>MAX_BATCH) throw new Error('Import at most 200 legacy history records.');
    const source=identity(value.source,'import source');
    return this.transaction(()=>{let imported=0,excluded=0;for(const row of value.items){if(!row.id) throw new Error('Legacy account records require their stable original IDs.');if(!safeURL(row.url) || row.private === true){excluded++;continue;}const event=this.normalize({...row,eventId:'legacy-account:'+fingerprint([source,row.id])});if(this.insert(event))imported++;}return {imported,excluded,originalPreserved:true};});
  }
  accountImport(value={}) {
    const key='account-import:'+fingerprint(identity(value.source,'import source'));
    if(value.complete===true){const report={imported:value.imported || 0,excluded:value.excluded || 0,verifiedAt:new Date().toISOString(),originalPreserved:true};this.db.prepare('INSERT INTO metadata VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(report));return report;}
    const marker=this.meta(key);return marker?JSON.parse(marker):null;
  }
  filters(value) {
    const where=[],args=[];
    for(const [key,column] of [['profileId','profile_id'],['sourceHostId','source_host_id']]) if(value[key]) {where.push(`e.${column}=?`);args.push(identity(value[key],key));}
    if(value.from){where.push('e.visited_at>=?');args.push(stamp(value.from));}
    if(value.before){where.push('e.visited_at<?');args.push(stamp(value.before));}
    const search=String(value.query || value.search || '').slice(0,200).match(/[\p{L}\p{N}]+/gu);
    if(search?.length){where.push('e.event_id IN (SELECT event_id FROM event_search WHERE event_search MATCH ?)');args.push(search.map(word=>'"'+word+'"*').join(' AND '));}
    return {where,args};
  }
  query(value = {}) {
    const {where,args}=this.filters(value),signature=fingerprint([value.profileId || '',value.sourceHostId || '',value.from || '',value.before || '',value.query || value.search || '']);
    const coverage=this.db.prepare('SELECT MIN(visited_at) AS oldestAt,MAX(visited_at) AS newestAt,COUNT(*) AS total FROM events e'+(where.length?' WHERE '+where.join(' AND '):'')).get(...args);
    if(value.cursor){const cursor=decode(value.cursor);if(cursor.signature!==signature || cursor.epoch!==this.epoch)throw new Error('History query changed. Start from the first page.');where.push('(e.visited_at<? OR (e.visited_at=? AND e.event_id<?))');args.push(cursor.at,cursor.at,cursor.id);}
    const limit=limitOf(value.limit || value.pageSize),rows=this.db.prepare('SELECT payload FROM events e'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY visited_at DESC,event_id DESC LIMIT ?').all(...args,limit+1);
    const hasMore=rows.length>limit,items=rows.slice(0,limit).map(row=>{const {aliases,...item}=JSON.parse(row.payload);return item;}),last=items.at(-1);
    const nextCursor=hasMore?encode({epoch:this.epoch,signature,at:last.visitedAt,id:last.eventId}):null;
    const settings=JSON.parse(this.meta('settings'));
    return {items,entries:items,nextCursor,cursor:nextCursor,hasMore,total:coverage.total,coverage:{oldestAt:coverage.oldestAt,newestAt:coverage.newestAt},enabled:settings.enabled,retentionDays:settings.retentionDays};
  }
  settings(value={}) {
    if(!['enabled','retentionDays','peers'].some(key=>Object.hasOwn(value,key)) || value.action==='get') return {...JSON.parse(this.meta('settings')),peers:this.peerStatus()};
    return this.transaction(()=>{
      const old=JSON.parse(this.meta('settings')),next={...old};
      delete next.availablePeers;delete next.availableProfiles;delete next.changed;
      if(value.enabled!==undefined){if(typeof value.enabled!=='boolean')throw new Error('Choose a valid history preference.');next.enabled=value.enabled;}
      if(value.retentionDays!==undefined){if(![0,7,30,90,365].includes(value.retentionDays))throw new Error('Choose a valid history retention.');next.retentionDays=value.retentionDays;}
      if(value.peers!==undefined){if(!Array.isArray(value.peers)||value.peers.length>32)throw new Error('Choose at most 32 history peers.');next.peers=value.peers.map(peer=>{if(!peer||typeof peer.enabled!=='boolean'||!['7','30','all'].includes(String(peer.backfill))||!Array.isArray(peer.profileIds)||!peer.profileIds.length||peer.profileIds.length>100)throw new Error('Choose history profiles and a valid backfill.');const result={...old.peers.find(row=>row.hostId===peer.hostId),...peer,hostId:identity(peer.hostId,'peer'),enabled:peer.enabled,backfill:String(peer.backfill),profileIds:[...new Set(peer.profileIds.map(id=>identity(id,'profile')))]};for(const key of ['cursor','signature','lastSyncAt','error'])delete result[key];return result;});if(new Set(next.peers.map(peer=>peer.hostId)).size!==next.peers.length)throw new Error('Duplicate history peer.');}
      const changed=JSON.stringify(old)!==JSON.stringify(next);if(changed)this.db.prepare('UPDATE metadata SET value=? WHERE key=?').run(JSON.stringify(next),'settings');return {...next,changed};
    });
  }
  peerStatus(){return JSON.parse(this.meta('settings')).peers.map(peer=>({...peer,...this.db.prepare('SELECT cursor,signature,last_sync_at AS lastSyncAt,error FROM peer_cursors WHERE host_id=?').get(peer.hostId)}));}
  delete(value={}) {
    return this.transaction(()=>{
      let rows;if(value.eventIds){if(!Array.isArray(value.eventIds)||value.eventIds.length>MAX_BATCH)throw new Error('Delete at most 200 history visits.');rows=value.eventIds.map(id=>({event_id:identity(id,'event ID'),profile_id:this.db.prepare('SELECT profile_id FROM events WHERE event_id=?').get(id)?.profile_id || value.profileId || 'default'}));}
      else if(value.before || value.all===true){const {where,args}=this.filters(value);rows=this.db.prepare('SELECT event_id,profile_id FROM events e'+(where.length?' WHERE '+where.join(' AND '):'')).all(...args);}
      else throw new Error('Choose visits to delete.');
      const at=new Date().toISOString();for(const row of rows)this.tombstone({eventId:row.event_id,profileId:row.profile_id,deletedAt:at});return {deleted:rows.length};
    });
  }
  tombstone(raw){const id=identity(raw.eventId,'event ID'),at=stamp(raw.deletedAt),profile=identity(raw.profileId || 'default','profile');const old=this.db.prepare('SELECT deleted_at FROM tombstones WHERE event_id=?').get(id);if(old && old.deleted_at>=at)return;this.db.prepare('DELETE FROM events WHERE event_id=?').run(id);this.db.prepare('INSERT INTO tombstones VALUES(?,?,?) ON CONFLICT(event_id) DO UPDATE SET deleted_at=excluded.deleted_at').run(id,at,profile);this.change(id,'delete');}
  prune(value={}) {const retentionDays=JSON.parse(this.meta('settings')).retentionDays;if(retentionDays===0)return {pruned:0,hasMore:false};const cutoff=new Date((value.now || Date.now())-retentionDays*DAY).toISOString();return this.transaction(()=>{const rows=this.db.prepare('SELECT event_id FROM events WHERE visited_at<? LIMIT 1000').all(cutoff);for(const row of rows){this.db.prepare('DELETE FROM events WHERE event_id=?').run(row.event_id);this.db.prepare('DELETE FROM changes WHERE event_id=? AND kind=?').run(row.event_id,'event');}return {pruned:rows.length,hasMore:rows.length===1000};});}
  sync(value={}) {
    const profiles=value.profileIds || [];if(!Array.isArray(profiles)||profiles.length>100)throw new Error('Invalid history profile selection.');profiles.forEach(id=>identity(id,'profile'));
    let seq=0;if(value.cursor){const cursor=decode(value.cursor);if(cursor.epoch!==this.epoch) return {rebootstrap:true,epoch:this.epoch,cursor:null,events:[],tombstones:[],hasMore:false};if(!Number.isSafeInteger(cursor.seq)||cursor.seq<0)throw new Error('Invalid history synchronization cursor.');seq=cursor.seq;}
    const args=[seq],where=['c.seq>?'];if(profiles.length){where.push(`COALESCE(e.profile_id,t.profile_id) IN (${profiles.map(()=>'?').join(',')})`);args.push(...profiles);}if(value.from){where.push('(c.kind=\'delete\' OR e.visited_at>=?)');args.push(stamp(value.from));}
    const limit=limitOf(value.limit),rows=this.db.prepare(`SELECT c.seq,c.kind,e.payload,t.event_id,t.deleted_at,t.profile_id FROM changes c LEFT JOIN events e ON e.event_id=c.event_id LEFT JOIN tombstones t ON t.event_id=c.event_id WHERE ${where.join(' AND ')} ORDER BY c.seq LIMIT ?`).all(...args,limit+1);
    const page=[];let bytes=0;for(const row of rows.slice(0,limit)){const size=Buffer.byteLength(row.payload || JSON.stringify(row));if(page.length && bytes+size>512*1024)break;page.push(row);bytes+=size;}const events=[],tombstones=[];for(const row of page){if(row.kind==='event' && row.payload)events.push(JSON.parse(row.payload));else if(row.kind==='delete')tombstones.push({eventId:row.event_id,deletedAt:row.deleted_at,profileId:row.profile_id});}
    const hasMore=rows.length>page.length;const end=hasMore?page.at(-1).seq:this.db.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM changes').get().seq;
    return {events,tombstones,cursor:encode({epoch:this.epoch,seq:end}),hasMore,epoch:this.epoch};
  }
  apply(value={}) {
    if(!Array.isArray(value.events)||!Array.isArray(value.tombstones)||value.events.length+value.tombstones.length>MAX_BATCH)throw new Error('Invalid history replication batch.');
    const events=value.events.map(row=>this.normalize(row,{replicated:true}));
    return this.transaction(()=>{const before=this.mutationCount;let inserted=0;for(const row of value.tombstones)this.tombstone(row);for(const event of events)if(this.insert(event,true))inserted++;if(value.peerHostId)this.db.prepare('INSERT INTO peer_cursors VALUES(?,?,?,?,NULL) ON CONFLICT(host_id) DO UPDATE SET cursor=excluded.cursor,signature=excluded.signature,last_sync_at=excluded.last_sync_at,error=NULL').run(identity(value.peerHostId,'peer'),value.cursor || null,value.signature || null,new Date().toISOString());return {inserted,applied:true,changed:this.mutationCount>before};});
  }
  peerError(value){this.db.prepare('INSERT INTO peer_cursors VALUES(?,NULL,NULL,NULL,?) ON CONFLICT(host_id) DO UPDATE SET error=excluded.error').run(identity(value.hostId,'peer'),String(value.error || '').slice(0,200));return {ok:true};}
  status(){return {supported:true,epoch:this.epoch,...this.settings(),coverage:this.query({limit:1}).coverage,migration:this.meta('legacy-import')?JSON.parse(this.meta('legacy-import')):null};}
  navigationGet(value={}) {
    const tabId=identity(value.tabId,'tab'),tab=this.db.prepare('SELECT revision,selected_entry_id AS selectedEntryId FROM nav_tabs WHERE tab_id=?').get(tabId) || {revision:0,selectedEntryId:null};
    const limit=Math.max(1,Math.min(10000,Math.floor(Number(value.limit)||200))),total=this.db.prepare('SELECT COUNT(*) AS total FROM nav_entries WHERE tab_id=?').get(tabId).total;
    if(value.sinceRevision!==undefined){
      if(!Number.isSafeInteger(value.sinceRevision)||value.sinceRevision<0||value.sinceRevision>tab.revision)throw new Error('Invalid navigation base revision.');
      const rows=this.db.prepare('SELECT revision,payload FROM nav_changes WHERE tab_id=? AND revision>? ORDER BY revision').all(tabId,value.sinceRevision);
      const complete=rows.length===tab.revision-value.sinceRevision&&rows.every((row,index)=>row.revision===value.sinceRevision+index+1)&&rows.reduce((size,row)=>size+Buffer.byteLength(row.payload),0)<=480*1024;
      return {tabId,revision:tab.revision,currentEntryId:tab.selectedEntryId,total,deltaSupported:true,...(complete?{delta:{baseRevision:value.sinceRevision,changes:rows.map(row=>JSON.parse(row.payload))}}:{reset:true})};
    }
    const selectedPosition=this.db.prepare('SELECT position FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,tab.selectedEntryId)?.position || 0;
    const paging=value.cursor?decode(value.cursor):null;if(paging && (paging.tabId!==tabId || paging.revision!==tab.revision))throw new Error('Navigation changed while paging. Start from the first page.');
    let position=paging?Number(paging.position):value.start===true?-1:Math.max(-1,selectedPosition-Math.floor(limit/2)-1);
    if(!Number.isInteger(position)||position< -1)throw new Error('Invalid navigation cursor.');
    const read=()=>{
      const entries=[];let bytes=0,lastPosition=position,hasMore=false;
      // Stop the SQLite iterator at the page boundary. Materializing limit+1
      // rows first would allocate entire large stacks before the byte cap applies.
      for(const row of this.db.prepare('SELECT position,payload FROM nav_entries WHERE tab_id=? AND position>? ORDER BY position LIMIT ?').iterate(tabId,position,limit+1)){
        if(entries.length===limit){hasMore=true;break;}
        const entry=JSON.parse(row.payload),value={...entry,id:entry.entryId},size=Buffer.byteLength(JSON.stringify(value))+1;
        if(entries.length&&bytes+size>240*1024){hasMore=true;break;}
        entries.push(value);bytes+=size;lastPosition=row.position;
      }
      return {entries,hasMore,lastPosition};
    };
    let page=read();
    // Long URLs can exhaust the byte budget before the selected entry in a
    // centered window. A normal descriptor must still identify its actual page.
    if(!paging&&value.start!==true&&tab.selectedEntryId&&!page.entries.some(entry=>entry.id===tab.selectedEntryId)){position=selectedPosition-1;page=read();}
    const selected=tab.selectedEntryId?this.db.prepare('SELECT payload FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,tab.selectedEntryId):null;
    const current=selected?JSON.parse(selected.payload):null,{entries,hasMore,lastPosition}=page;
    return {offset:position+1,total,tabId,...tab,currentEntryId:tab.selectedEntryId,entries,history:{entries,index:entries.findIndex(entry=>entry.id===tab.selectedEntryId),currentEntryId:tab.selectedEntryId,revision:tab.revision},deltaSupported:true,url:current?.url || '',title:current?.title || '',eventId:current?.eventId || null,hasMore,nextCursor:hasMore?encode({tabId,revision:tab.revision,position:lastPosition}):null};
  }
  seed(value={}) {
    return this.transaction(()=>{
      if(value.private===true || String(value.profileId || '').startsWith('private:'))throw new Error('Private browsing is excluded from shared navigation.');
      const tabId=identity(value.tabId,'tab');if(this.db.prepare('SELECT tab_id FROM nav_tabs WHERE tab_id=?').get(tabId))return this.navigationGet({tabId});
      const input=value.history?.entries || (value.url?[{url:value.url,title:value.title}]:[]);if(!Array.isArray(input))throw new Error('Choose a navigation entry list.');
      let selected=null;const entries=[];for(const [index,row] of input.entries()){const url=safeURL(row.url);if(!url)continue;const entry={entryId:identity(row.id || row.entryId || 'legacy-nav:'+fingerprint([tabId,index,row]),'entry'),url,title:String(row.title || '').slice(0,200),profileId:identity(value.profileId || 'default','profile'),...(safeURL(row.requestedURL)?{requestedURL:safeURL(row.requestedURL)}:{})};entries.push(entry);if((value.history?.currentEntryId && row.id===value.history.currentEntryId) || index===value.history?.index)selected=entry.entryId;}
      if(!selected)selected=entries.at(-1)?.entryId || null;
      entries.forEach((entry,index)=>this.db.prepare('INSERT INTO nav_entries VALUES(?,?,?,?)').run(tabId,entry.entryId,index,JSON.stringify(entry)));
      this.db.prepare('INSERT INTO nav_tabs VALUES(?,?,?)').run(tabId,0,selected);return this.navigationGet({tabId});
    });
  }
  relocateNavigation({source,target}={}) {
    source=identity(source,'source tab');target=identity(target,'destination tab');
    if(source===target)return {moved:false};
    return this.transaction(()=>{
      const original=this.db.prepare('SELECT revision,selected_entry_id FROM nav_tabs WHERE tab_id=?').get(source);
      if(!original)throw new Error('Source browser history is unavailable.');
      const previous=this.db.prepare('SELECT revision FROM nav_tabs WHERE tab_id=?').get(target);
      const sourceCount=this.db.prepare('SELECT COUNT(*) AS total FROM nav_entries WHERE tab_id=?').get(source).total;
      const targetCount=this.db.prepare('SELECT COUNT(*) AS total FROM nav_entries WHERE tab_id=?').get(target).total;
      if(!sourceCount&&targetCount){const error=new Error('Destination retains browser history but the source is empty. Preserve both copies and resolve the source before moving.');error.code='NAVIGATION_CONFLICT';throw error;}
      const revision=Math.max(original.revision,previous?.revision||0)+1;
      if(!Number.isSafeInteger(revision))throw new Error('Browser history revision limit reached.');
      this.db.prepare('DELETE FROM nav_entries WHERE tab_id=?').run(target);
      this.db.prepare('DELETE FROM nav_changes WHERE tab_id=?').run(target);
      this.db.prepare('INSERT INTO nav_entries SELECT ?,entry_id,position,payload FROM nav_entries WHERE tab_id=?').run(target,source);
      this.db.prepare('INSERT INTO nav_tabs VALUES(?,?,?) ON CONFLICT(tab_id) DO UPDATE SET revision=excluded.revision,selected_entry_id=excluded.selected_entry_id').run(target,revision,original.selected_entry_id);
      // Retain the source and operation receipts for crash recovery/old retries.
      // No visit or replicated history event is generated by a placement change.
      return {moved:true,revision,total:this.db.prepare('SELECT COUNT(*) AS total FROM nav_entries WHERE tab_id=?').get(target).total};
    });
  }
  batchNavigation(value={}) {if(!Array.isArray(value.operations)||!value.operations.length||value.operations.length>20)throw new Error('Send between 1 and 20 navigation operations.');return this.transaction(()=>({results:value.operations.map(op=>this.navigation(op))}));}
  navigation(value={}) {
    if(value.private===true || String(value.profileId || '').startsWith('private:'))throw new Error('Private browsing is excluded from shared navigation.');
    if(value.action==='seed')return this.seed(value);
    const operationId=identity(value.operationId,'operation'),digest=fingerprint(value);value={...value,eventId:value.eventId || operationId};
    return this.transaction(()=>{
      const receipt=this.db.prepare('SELECT digest,payload FROM nav_receipts WHERE operation_id=?').get(operationId);if(receipt){if(receipt.digest!==digest){const error=new Error('Navigation operation ID was already used.');error.code='NAVIGATION_OPERATION_CONFLICT';throw error;}return {...JSON.parse(receipt.payload),replayed:true};}
      const tabId=identity(value.tabId,'tab'),tab=this.db.prepare('SELECT revision,selected_entry_id AS selectedEntryId FROM nav_tabs WHERE tab_id=?').get(tabId) || {revision:0,selectedEntryId:null};
      if(value.baseRevision!==tab.revision){const error=new Error('Navigation changed on the owning computer. Preserve this pending action and refresh.');error.code='NAVIGATION_CONFLICT';throw error;}
      if(value.action==='redirect'){
        const previousId=identity(value.selectedEntryId || value.entryId,'entry'),row=this.db.prepare('SELECT payload FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,previousId);
        if(!row || previousId!==tab.selectedEntryId)throw new Error('Redirect belongs to a navigation entry that is no longer selected.');
        const previous=JSON.parse(row.payload),url=safeURL(value.url);if(!url)throw new Error('Private authentication destinations stay local.');
        if(value.profileId && value.profileId!==previous.profileId)throw new Error('Navigation entry belongs to another browser profile.');
        // Older clients send redirects as replacement commands. Keep the original
        // entry/visit and append a stable new destination under the same receipt.
        if(url!==previous.url)value={...value,action:'navigate',entryId:'redirect-entry:'+fingerprint([operationId,previousId]),eventId:'redirect-visit:'+fingerprint([operationId,previousId]),profileId:previous.profileId,requestedURL:previous.url};
      }
      let entry,changePosition;
      if(value.action==='navigate'){
        const event=this.normalize({...value,eventId:value.eventId,visitedAt:value.visitedAt || new Date().toISOString(),entryId:identity(value.entryId,'entry')});
        const current=tab.selectedEntryId?this.db.prepare('SELECT position,payload FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,tab.selectedEntryId):null;
        if(current && JSON.parse(current.payload).profileId!==event.profileId)throw new Error('Open a separate tab to change browser profiles.');
        const position=current?current.position+1:0;if(!Number.isSafeInteger(position))throw new Error('Navigation history position limit reached.');changePosition=position;if(this.db.prepare('SELECT entry_id FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,event.entryId))throw new Error('Navigation entry ID was already used.');this.db.prepare('DELETE FROM nav_entries WHERE tab_id=? AND position>=?').run(tabId,position);
        entry={entryId:event.entryId,url:event.url,title:event.title,eventId:event.eventId,profileId:event.profileId,...(safeURL(value.requestedURL)?{requestedURL:safeURL(value.requestedURL)}:{})};this.db.prepare('INSERT INTO nav_entries VALUES(?,?,?,?)').run(tabId,event.entryId,position,JSON.stringify(entry));tab.selectedEntryId=entry.entryId;
        if(JSON.parse(this.meta('settings')).enabled)this.insert(event);
      } else if(value.action==='traverse' || value.action==='redirect') {
        const entryId=identity(value.selectedEntryId || value.entryId,'entry'),row=this.db.prepare('SELECT position,payload FROM nav_entries WHERE tab_id=? AND entry_id=?').get(tabId,entryId);if(!row)throw new Error('Navigation entry is unavailable.');changePosition=row.position;entry=JSON.parse(row.payload);if(value.profileId && entry.profileId!==value.profileId)throw new Error('Navigation entry belongs to another browser profile.');tab.selectedEntryId=entryId;
        if(value.action==='redirect'){if(tab.selectedEntryId!==entryId || entryId!==(this.db.prepare('SELECT selected_entry_id FROM nav_tabs WHERE tab_id=?').get(tabId)?.selected_entry_id))throw new Error('Redirect belongs to a navigation entry that is no longer selected.');const url=safeURL(value.url);if(!url)throw new Error('Private authentication destinations stay local.');entry={...entry,requestedURL:entry.requestedURL||entry.url,url,title:String(value.title || entry.title).slice(0,200)};this.db.prepare('UPDATE nav_entries SET payload=? WHERE tab_id=? AND entry_id=?').run(JSON.stringify(entry),tabId,entryId);
          const visit=entry.eventId?this.db.prepare('SELECT payload FROM events WHERE event_id=?').get(entry.eventId):null;
          if(visit){const original=JSON.parse(visit.payload),aliases=[...new Set([...(original.aliases || []),original.url,url])];if(aliases.length>100)throw new Error('Too many redirected destinations for one navigation. Start a new navigation.');this.insert({...original,url,title:entry.title,aliases,updatedAt:new Date(Math.max(Date.now(),Date.parse(original.updatedAt)+1)).toISOString()},true);}}
        else if(value.eventId && JSON.parse(this.meta('settings')).enabled){this.insert(this.normalize({...value,...entry,eventId:value.eventId,visitedAt:value.visitedAt || new Date().toISOString()}));entry={...entry,eventId:value.eventId};this.db.prepare('UPDATE nav_entries SET payload=? WHERE tab_id=? AND entry_id=?').run(JSON.stringify(entry),tabId,entryId);}
      } else throw new Error('Unknown navigation operation.');
      tab.revision++;this.db.prepare('INSERT INTO nav_tabs VALUES(?,?,?) ON CONFLICT(tab_id) DO UPDATE SET revision=excluded.revision,selected_entry_id=excluded.selected_entry_id').run(tabId,tab.revision,tab.selectedEntryId);
      this.db.prepare('INSERT INTO nav_changes VALUES(?,?,?)').run(tabId,tab.revision,JSON.stringify({revision:tab.revision,position:changePosition,truncate:value.action==='navigate',entry:{...entry,id:entry.entryId}}));
      // This is a transport accelerator, not retained history. Older clients or
      // longer gaps receive a verified paged snapshot of the complete stack.
      this.db.prepare('DELETE FROM nav_changes WHERE tab_id=? AND revision<=?').run(tabId,tab.revision-256);
      // Receipts retain the exact operation acknowledgement, not a duplicated growing
      // navigation window. Callers hydrate the current list with navigationGet.
      const result={tabId,...tab,currentEntryId:tab.selectedEntryId,entry,url:entry.url,title:entry.title,eventId:value.eventId || entry.eventId || null,acknowledgedOperationId:operationId};this.db.prepare('INSERT INTO nav_receipts VALUES(?,?,?)').run(operationId,digest,JSON.stringify(result));return result;
    });
  }
  close(){this.db.close();return {closed:true};}
}
