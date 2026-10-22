import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('workspace terminal aliases receive live events and dispose by their actual view identity',()=>{
  let listener;
  const sandbox={window:{desktop:{onTerminal:callback=>{listener=callback;return ()=>{};}}}};
  vm.createContext(sandbox);
  const source=fs.readFileSync(new URL('../public/terminals.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/,'').replaceAll('export ','');
  vm.runInContext(source+'\nglobalThis.routing={views,initTerminals,disposeTerminalUi};',sandbox);
  const {views,initTerminals,disposeTerminalUi}=sandbox.routing;
  initTerminals({});
  const output=[],disposed=[];
  const status={textContent:''};
  const view={id:'workspace:local:one:terminal:shell',tab:{terminal:{id:'shell'}},loading:false,seq:1,host:{querySelector:()=>status},term:{write:data=>output.push(data),dispose:()=>disposed.push('term')},resize:{disconnect:()=>disposed.push('resize')}};
  views.set(view.id,view);
  const remote={...view,id:'workspace:remote:one:terminal:shell',tab:{terminal:{id:'shell'},hostId:'remote'},term:{write:()=>assert.fail('remote identity must not receive local events')}};
  views.set(remote.id,remote);
  listener({id:'shell',type:'data',seq:2,data:'live output'});
  listener({id:'shell',type:'data',seq:1,data:'duplicate'});
  assert.deepEqual(output,['live output']);
  listener({id:'shell',type:'exit',session:{status:'exited',exitCode:0}});
  assert.equal(view.session.exitCode,0);
  disposeTerminalUi(view.id);
  assert.equal(views.has(view.id),false);
  assert.equal(views.has(remote.id),true);
  assert.deepEqual(disposed,['resize','term']);
});
