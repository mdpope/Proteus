import assert from 'node:assert/strict';

// Exercise the real picker and composer, including replacing desktop strip nodes.
export async function exerciseComposerAttachments(page,{input,textarea,composer,web=false}){
 const originalViewport=page.viewportSize()||await page.evaluate(()=>({width:innerWidth,height:innerHeight})),draft=await page.locator(textarea).inputValue();
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lKkAAAAASUVORK5CYII=','base64');
 const remove=web?'[data-attachment-remove]':'[data-attach-remove]';
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
 const geometry=()=>page.locator(composer).evaluate(node=>{
  const footer=node.querySelector('.composer-footer'),strip=node.querySelector('.attachment-strip,.remote-attachment-strip'),add=node.querySelector('.attachment-add,.remote-attach-button'),send=node.querySelector('.composer-actions button'),models=node.querySelector('.model-options');
  const c=node.getBoundingClientRect(),f=footer.getBoundingClientRect(),a=add.getBoundingClientRect(),s=send.getBoundingClientRect(),t=strip.getBoundingClientRect(),m=models.getBoundingClientRect();
  return {bottom:s.bottom,stripHeight:t.height,stripAbove:t.height===0||t.bottom<=Math.min(a.top,s.top)+1,aligned:Math.abs((a.top+a.bottom-s.top-s.bottom)/2)<12,inside:a.left>=c.left&&s.right<=c.right&&s.bottom<=innerHeight,overflow:footer.scrollWidth-footer.clientWidth,compactInside:m.width===0||m.right<=f.right+1,pane:node.closest('.chat-pane,.remote-chat-main')?.getBoundingClientRect().toJSON(),editor:node.querySelector('textarea').getBoundingClientRect().toJSON()};
 });
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const prompt of ['Short draft',Array.from({length:65},()=> 'Long draft that must scroll without losing the footer.').join('\n')]){
   await page.locator(textarea).fill(prompt);await settle();const before=await geometry();
   for(const count of [1,48]){
    await page.locator(input).setInputFiles(Array.from({length:count},(_,i)=>({name:`long-attachment-name-${i}.png`,mimeType:'image/png',buffer:image})));
    await settle();const after=await geometry();
    assert.ok(after.stripAbove&&after.aligned&&after.inside&&after.compactInside&&after.overflow<=2&&after.stripHeight<=101,JSON.stringify({width,count,before,after}));
    assert.ok(Math.abs(before.bottom-after.bottom)<2,JSON.stringify({width,count,before,after}));
    assert.equal(await page.locator(textarea).inputValue(),prompt);
    await page.locator(composer).evaluate((node,selector)=>{while(node.querySelector(selector))node.querySelector(selector).click();},remove);
    await settle();const cleared=await geometry();assert.equal(cleared.stripHeight,0);assert.ok(Math.abs(before.bottom-cleared.bottom)<2);
   }
  }
 }
 await page.locator(textarea).fill(draft);if(originalViewport)await page.setViewportSize(originalViewport);await settle();
}
