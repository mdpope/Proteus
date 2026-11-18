import test from 'node:test';
import assert from 'node:assert/strict';
import {FeatureTabGroups} from '../public/models/feature-tab-groups.js';

test('Home tabs reuse identities, retain insertion positions and separate Life accounts',()=>{
 const groups=new FeatureTabGroups();groups.add('a','ha',{homeAssistant:true});groups.add('a','b');groups.add('a','c',{afterId:'ha'});groups.add('a','ha');
 assert.deepEqual(groups.group('a'),{ids:['ha','c','b'],homeAssistant:'ha'});assert.equal(groups.contains('b','ha'),false);
 groups.replace('c','chat:1');assert.deepEqual(groups.group('a').ids,['ha','chat:1','b']);groups.remap(new Map([['ha','restored']]));assert.equal(groups.group('a').homeAssistant,'restored');
 groups.remove('chat:1');assert.deepEqual(new FeatureTabGroups(groups.snapshot([])).group('a').ids,['restored','b']);
});
test('private tab membership is never persisted and closing leaves no reference',()=>{
 const groups=new FeatureTabGroups();groups.add('a','private');groups.add('a','regular');const saved=groups.snapshot([{id:'private',info:{incognito:true}}]);assert.doesNotMatch(JSON.stringify(saved),/private/);assert.equal(groups.contains('a','private'),true);groups.remove('private');assert.equal(groups.contains('a','private'),false);
});
test('private creation and conversion cannot leak an ID before its browser is registered',()=>{
 const groups=new FeatureTabGroups();groups.add('a','landing');groups.replace('landing','secret-new-tab',{private:true});assert.doesNotMatch(JSON.stringify(groups.snapshot([])),/secret-new-tab/);
 groups.add('a','secret-link',{private:true});assert.doesNotMatch(JSON.stringify(groups.snapshot([])),/secret-link/);
});
