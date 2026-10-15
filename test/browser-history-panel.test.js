import test from 'node:test';import assert from 'node:assert/strict';
import {historyPeerChoices,historySettingsPatch} from '../public/browser-history-panel.js';
test('history controls use owner pairings, including an authoritative empty list',()=>{
 const viewer=[{hostId:'viewer',label:'Viewer'},{hostId:'owner',label:'Owner'},{hostId:'viewer-peer',label:'Viewer peer'}];
 assert.deepEqual(historyPeerChoices({availablePeers:[{hostId:'owner-peer',label:'Owner peer'}]},viewer,'owner').map(peer=>peer.hostId),['owner-peer']);
 assert.deepEqual(historyPeerChoices({availablePeers:[]},viewer,'owner'),[]);
 assert.deepEqual(historyPeerChoices({},viewer,'owner').map(peer=>peer.hostId),['viewer','viewer-peer']);
});
test('editing a visible history peer preserves invisible configurations and future settings',()=>{
 const settings={enabled:true,retentionDays:0,future:{version:2},availablePeers:[{hostId:'visible'}],availableProfiles:[{id:'default',name:'Default'}],peers:[{hostId:'invisible',enabled:true,profileIds:['private-account-profile'],backfill:'all',future:{keep:true}},{hostId:'visible',enabled:false,profileIds:['default'],backfill:'7',future:{option:true}}]};
 const value=historySettingsPatch(settings,{enabled:false,retentionDays:30,peers:[{hostId:'visible',enabled:true,profileIds:['default'],backfill:'30'},{hostId:'new',enabled:true,profileIds:['default'],backfill:'all'}]});
 assert.equal(value.enabled,false);assert.equal(value.retentionDays,30);assert.deepEqual(value.future,{version:2});assert.ok(!Object.hasOwn(value,'availablePeers'));assert.ok(!Object.hasOwn(value,'availableProfiles'));assert.deepEqual(value.peers[0],settings.peers[0]);assert.deepEqual(value.peers[1].future,{option:true});assert.equal(value.peers[1].backfill,'30');assert.equal(value.peers[2].hostId,'new');assert.equal(settings.peers[1].enabled,false);
});
