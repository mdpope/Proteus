import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const {environment}=createRequire(import.meta.url)('../desktop/updates/update-helper.cjs');

test('update and rollback relaunch keep provider namespaces without copying tokens or helper mode',()=>{
 const source={HOME:'/synthetic/user',PATH:'/synthetic/bin',CLAUDE_CONFIG_DIR:'/synthetic/work-claude',PROTEUS_CLAUDE_PATH:'/synthetic/claude',CODEX_HOME:'/synthetic/work-codex',PROTEUS_CODEX_PATH:'/synthetic/codex',COPILOT_HOME:'/synthetic/work-copilot',COPILOT_CLI_PATH:'/synthetic/copilot',ELECTRON_RUN_AS_NODE:'1',ANTHROPIC_API_KEY:'synthetic-secret',CLAUDE_CODE_OAUTH_TOKEN:'synthetic-secret',GITHUB_TOKEN:'synthetic-secret'};
 const env=environment('/synthetic/proteus',false,{PROTEUS_UPDATE_JOB:'/synthetic/job'},source);
 for(const key of ['HOME','PATH','CLAUDE_CONFIG_DIR','PROTEUS_CLAUDE_PATH','CODEX_HOME','PROTEUS_CODEX_PATH','COPILOT_HOME','COPILOT_CLI_PATH'])assert.equal(env[key],source[key]);
 for(const key of ['ELECTRON_RUN_AS_NODE','ANTHROPIC_API_KEY','CLAUDE_CODE_OAUTH_TOKEN','GITHUB_TOKEN'])assert.equal(Object.hasOwn(env,key),false);
 assert.equal(env.PROTEUS_UPDATE_JOB,'/synthetic/job');assert.equal(env.PROTEUS_HOME,'/synthetic/proteus');
});
test('isolated update smoke cannot use the real provider homes or executables',()=>{
 const home=path.resolve('/synthetic/smoke'),source={CLAUDE_CONFIG_DIR:'/synthetic/real-claude',CODEX_HOME:'/synthetic/real-codex',COPILOT_HOME:'/synthetic/real-copilot',PROTEUS_CLAUDE_PATH:'/synthetic/real-cli',PROTEUS_CODEX_PATH:'/synthetic/real-cli',COPILOT_CLI_PATH:'/synthetic/real-cli'};
 const env=environment(home,true,{},source);
 for(const [key,folder] of [['CLAUDE_CONFIG_DIR','claude'],['CODEX_HOME','codex'],['COPILOT_HOME','copilot']])assert.equal(env[key],path.join(home,folder));
 for(const [key,name] of [['PROTEUS_CLAUDE_PATH','claude'],['PROTEUS_CODEX_PATH','codex'],['COPILOT_CLI_PATH','copilot']])assert.equal(env[key],path.join(home,'no-'+name));
});
test('default provider locations stay native rather than acquiring a new update-specific profile',()=>{
 const env=environment('/synthetic/proteus',false,{},{});
 for(const key of ['CLAUDE_CONFIG_DIR','PROTEUS_CLAUDE_PATH','CODEX_HOME','COPILOT_HOME'])assert.equal(Object.hasOwn(env,key),false);
});
