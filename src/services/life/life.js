import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicJSON, readJSON } from '../../shared/files.js';
import { revision } from '../scheduling/schedules.js';
import { LifeAPI, LifeTokenVault, lifeOrigin } from './life-api.js';
import {desktopReminderReplica} from './reminder-replica.js';
import {LifeHome} from './life-home.js';
export const lifeSections=Object.freeze([['reminders','Reminders'],['overview','Overview'],['nutrition','Nutrition'],['garage','Garage'],['fuel','Fuel & mileage'],['captures','Capture inbox'],['security','Account & security'],['connections','Connections']].map(([id,label])=>Object.freeze({id,label,title:label})));
export function validateLifeSettings(value){if(!value||value.schemaVersion!==3||typeof value.enabled!=='boolean')throw new Error('Life settings require schemaVersion 3 and an enabled flag.');return {schemaVersion:3,enabled:value.enabled,...(value.websiteOrigin!==undefined?{websiteOrigin:lifeOrigin(value.websiteOrigin)}:{})};}
export class LifeStore {
 constructor(home,options={}){
  this.file=path.join(home,'life.json');this.home=path.join(home,'life');this.options=options;
  const old=readJSON(this.file,null);
  if(old&&old.schemaVersion!==3){
   fs.mkdirSync(this.home,{recursive:true,mode:0o700});const archived=path.join(this.home,'legacy-config-'+randomUUID()+'.json');
   fs.copyFileSync(this.file,archived,fs.constants.COPYFILE_EXCL);fs.chmodSync(archived,0o600);
   let origin='https://proteus.example';try{origin=lifeOrigin(old.websiteOrigin||old.websiteUrl||origin);}catch{}
   atomicJSON(this.file,{schemaVersion:3,enabled:old.enabled===true,websiteOrigin:origin,legacyArchived:true});
  }
  this.api=new LifeAPI({vault:options.vault||new LifeTokenVault(home,options.safeStorage),fetch:options.fetch,openExternal:options.openExternal,callbackURL:options.callbackURL,client:options.client,onChange:()=>options.onChange?.(),timeout:options.timeout});
  this.reminderReplica=null;
  this.homeAssistant=new LifeHome(this,{home,safeStorage:options.safeStorage,fetch:options.fetch});
 }
 settings(){return readJSON(this.file,{schemaVersion:3,enabled:false,websiteOrigin:'https://proteus.example'});}
 get(){const s=this.settings();if(s.enabled&&this.api.identity()&&!this.api.closing)this.reminderReplica??=desktopReminderReplica(this.home,this.api);const p=this.api.profile,identity=this.api.identity(),connected=!!p&&!this.api.error,ready=s.enabled===true&&connected;return {schemaVersion:3,enabled:s.enabled===true,configured:!!this.api.credential||!!this.api.vault?.exists?.(),connected,ready,remindersCached:this.reminderReplica?.cached()===true,revision:revision(s),websiteOrigin:this.api.credential?.origin||s.websiteOrigin,identity,legacyArchived:s.legacyArchived===true,auth:{pending:!!this.api.pending,error:this.api.error,notice:this.api.notice},connection:{label:p?.displayName||'Website account',mode:'website-api',readOnly:!connected||p?.readOnly!==false},capabilities:p?.capabilities||[],sections:lifeSections.filter(section=>!p?.sections||p.sections.includes(section.id))};}
 save(value,expectedRevision){if(expectedRevision!==this.get().revision)throw new Error('Life settings changed. Reload before saving.');const next={...this.settings(),...validateLifeSettings(value)};if(value.websiteOrigin!==undefined&&next.websiteOrigin!==(this.api.credential?.origin||this.settings().websiteOrigin)&&(this.api.credential||this.api.vault?.exists?.()))throw new Error('Sign out before changing the Life website.');atomicJSON(this.file,next);return this.get();}
 requireEnabled(){if(!this.settings().enabled)throw new Error('Life is disabled. Enable it in Setup first.');}
 async refresh(){await this.api.refresh();return this.get();}
 async auth(action,value={}){if(action==='status')return this.get();if(action==='logout'){this.reminderReplica?.clear();await this.api.logout();return this.get();}if(action==='upgrade'){this.api.load();await this.api.begin(this.api.credential?.origin||this.settings().websiteOrigin,{extend:true});return this.get();}if(action==='begin'){const origin=lifeOrigin(value.websiteOrigin||this.settings().websiteOrigin);await this.api.begin(origin);atomicJSON(this.file,{...this.settings(),websiteOrigin:origin});return this.get();}if(action==='refresh')return this.refresh();if(action==='cancel'){this.api.cancel();return this.get();}throw new Error('Unknown Life account action.');}
 async callback(value){await this.api.callback(value);return this.get();}
 async data(section,query={}){this.requireEnabled();if(!lifeSections.some(s=>s.id===section))throw new Error('Unknown Life section.');const clean=Object.fromEntries(Object.entries(query).filter(([,v])=>v!==''&&v!==undefined&&v!==null));if(section==='reminders'){this.api.load();this.reminderReplica??=desktopReminderReplica(this.home,this.api);return this.reminderReplica.read(clean);}return this.api.data(section,{...clean,client:'desktop',...(clean.tab?{projection:'tab'}:{})});}
 async action(action,input={},key,identity){this.requireEnabled();const result=await this.api.action(action,input,key,identity);if(action.startsWith('reminders.'))this.reminderReplica?.invalidate();return result;}
 async evidence(id,identity){this.requireEnabled();return this.api.evidence(id,identity);}
 async close(){this.reminderReplica?.close();this.api.close();}
}
