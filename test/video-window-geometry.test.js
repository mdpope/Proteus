import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {resizeVideoWindow,moveVideoWindow}=createRequire(import.meta.url)('../desktop/browser/video-window-geometry.cjs');
test('pinch resizing is proportional, reversible before limits, and respects the display work area',()=>{
 const area={x:0,y:24,width:1920,height:1016},bounds={x:400,y:200,width:960,height:540};
 const small=resizeVideoWindow(bounds,area,.5);assert.equal(small.width,480);assert.equal(small.height,270);assert.deepEqual(resizeVideoWindow(small,area,2),bounds);
 for(const factor of [1e-8,1e8,NaN,-1]){const next=resizeVideoWindow(bounds,area,factor);assert.ok(next.width>=240);assert.ok(next.height>=160);assert.ok(next.x>=area.x&&next.y>=area.y);assert.ok(next.x+next.width<=area.x+area.width);assert.ok(next.y+next.height<=area.y+area.height);}
});
test('movement and resize use negative-origin and portrait displays without covering reserved OS space',()=>{
 const area={x:-1080,y:40,width:1080,height:1840},bounds={x:-800,y:400,width:800,height:450};
 const large=resizeVideoWindow(bounds,area,20);assert.equal(large.width,1080);assert.equal(large.x,-1080);assert.ok(large.y>=40);assert.ok(large.y+large.height<=1880);
 const moved=moveVideoWindow(bounds,area,-900,-900);assert.equal(moved.x,-1080);assert.equal(moved.y,40);
 const end=moveVideoWindow(bounds,area,9000,9000);assert.equal(end.x+end.width,0);assert.equal(end.y+end.height,1880);
});
