import test from 'node:test';
import assert from 'node:assert/strict';
import {previewSidebarBounds,previewSidebarWidth} from '../public/preview-sidebar-layout.js';

test('preview sidebar width uses application preference with bounded viewport display and no preference mutation',()=>{
 assert.equal(previewSidebarWidth(undefined,1280),230);
 assert.equal(previewSidebarWidth(100,1280),220);assert.equal(previewSidebarWidth(900,1280),520);
 const appearance={sidebarWidth:480};
 assert.equal(previewSidebarWidth(appearance.sidebarWidth,700),380);assert.equal(appearance.sidebarWidth,480);
 assert.equal(previewSidebarWidth(appearance.sidebarWidth,1280),480);
 assert.deepEqual(previewSidebarBounds(200),{min:144,max:144});assert.equal(previewSidebarWidth(480,200),144);
 assert.equal(previewSidebarWidth(327.4,1280),327);
});
