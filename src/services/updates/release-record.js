import fs from 'node:fs';
import path from 'node:path';
import {atomicJSON} from '../../shared/files.js';

export function currentRelease(root){
 const pointer=path.join(root,'docs/releases/current.json');if(!fs.existsSync(pointer))return null;
 const current=JSON.parse(fs.readFileSync(pointer,'utf8'));
 if(current.schemaVersion!==1||!/^[-a-z0-9]{1,80}$/.test(current.id||''))throw Error('Invalid current release record.');
 const record=JSON.parse(fs.readFileSync(path.join(root,'docs/releases',current.id,'release.json'),'utf8'));
 if(record.schemaVersion!==1||record.id!==current.id||record.version!==current.version||!['open','closed'].includes(record.status))throw Error('Current release identity differs from its record.');
 return record;
}

/** Reserve one version when a named release opens. Re-entering the same open
 * release is idempotent; package builds never increment it again. */
export function openRelease(root,{id,name,date,plan}){
 if(!/^[-a-z0-9]{1,80}$/.test(id||'')||typeof name!=='string'||!name.trim()||name.length>120||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date||'')||!Number.isFinite(Date.parse(date)))throw Error('Supply a stable release ID, name and ISO date.');
 const current=currentRelease(root),metadata=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 if(current?.status==='open'){
  if(current.id!==id||current.name!==name)throw Error('Close the current named release before opening another.');
  if(current.version!==metadata.version)throw Error('The open release and package versions differ.');
  return current;
 }
 if(!/^\d+\.\d+\.\d+$/.test(metadata.version))throw Error('Open a release from a normal three-part version.');
 const parts=metadata.version.split('.').map(Number),version=[parts[0],parts[1],parts[2]+1].join('.');
 const base='docs/releases/'+id,directory=path.join(root,base);
 if(fs.existsSync(directory))throw Error('That release ID already exists; do not overwrite a closed release.');
 const planFile=plan||'docs/'+date+'-release-plan.md';
 if(path.isAbsolute(planFile)||planFile.split(/[\\/]/).includes('..')||!planFile.startsWith('docs/')||!fs.statSync(path.join(root,planFile)).isFile())throw Error('Choose an existing repository release plan.');
 const record={schemaVersion:1,id,name,version,status:'open',openedOn:date,plan:planFile,implementation:base+'/implementation.md',rollout:base+'/rollout.md',closeout:base+'/closeout.md',sourceCommit:null};
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 metadata.version=version;lock.version=version;if(lock.packages?.[''])lock.packages[''].version=version;
 fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(root,record.implementation),'# '+name+' implementation\n\nVersion: '+version+'\n\nRecord implemented scope, source pins, tests, package hashes and unresolved limits here.\n',{flag:'wx'});
 fs.writeFileSync(path.join(root,record.rollout),'# '+name+' rollout\n\nVersion: '+version+'\n\n| Machine or target | Platform | Requested version | Stage | Evidence and remaining work |\n| --- | --- | --- | --- | --- |\n\nStages: not started, building, published, dispatched, staged, installed, live verified, blocked, deferred.\nKeep secrets, machine IDs, private paths and raw receipts outside Git.\n',{flag:'wx'});
 atomicJSON(path.join(root,'package.json'),metadata);atomicJSON(path.join(root,'package-lock.json'),lock);
 atomicJSON(path.join(root,base,'release.json'),record);
 atomicJSON(path.join(root,'docs/releases/current.json'),{schemaVersion:1,id,version});
 return record;
}
