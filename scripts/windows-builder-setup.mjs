// One-time per-user designation. Paths are non-secret references; key bytes
// remain in the existing protected store. Normal coordinators need no shell.
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import packages from '../desktop/updates/update-package.cjs';
import builder from '../desktop/updates/windows-builder.cjs';
const {values}=parseArgs({options:{home:{type:'string'},installation:{type:'string'},source:{type:'string'},node:{type:'string'},'npm-cli':{type:'string'},git:{type:'string'},'publisher-key':{type:'string'}}});
const home=fs.realpathSync(values.home),installation=fs.realpathSync(values.installation),root=path.join(path.dirname(home),'Proteus Updates',packages.digest(home+'\0'+installation).slice(0,24));
console.log(JSON.stringify(builder.configureBuilder(root,{home,installation,source:values.source,node:values.node,npmCli:values['npm-cli'],git:values.git,publisherKey:values['publisher-key']})));
