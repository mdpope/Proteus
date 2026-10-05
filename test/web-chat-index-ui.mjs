import assert from 'node:assert/strict';
export async function exerciseChatIndex(page,apps){
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-shell-nav=chats]').click();await page.locator('#chat-index-rows').waitFor();
 assert.equal(await page.locator('#remote-chat-tabs,.remote-run-list').count(),0);
 for(const id of ['query','host','provider','status','workspace','schedule','after','before'])assert.equal(await page.locator('#chat-index-'+id).count(),1);
 await page.locator('#chat-index-host').selectOption(apps[1].remote.config.hostId);
 assert.equal(await page.locator('#chat-index-rows [data-run]').count(),1);
 assert.equal(await page.locator('#chat-index-rows [data-run]').getAttribute('data-run-host'),apps[1].remote.config.hostId);
 await page.locator('#chat-index-query').fill('no matching synthetic chat');assert.equal(await page.locator('#chat-index-rows [data-run]').count(),0);
 await page.locator('#chat-index-query').fill('');await page.locator('#chat-index-host').selectOption('');
 await page.locator('#chat-index-status').selectOption('awaiting_input');assert.equal(await page.locator('#chat-index-rows [data-run]').count(),1);await page.locator('#chat-index-status').selectOption('');
 await page.locator('#chat-index-after').fill('2099-01-01');assert.equal(await page.locator('#chat-index-rows [data-run]').count(),0);await page.locator('#chat-index-after').fill('');
 await page.locator('#remote-pair-panel').evaluate(node=>node.open=false);await page.screenshot({path:'/private/tmp/proteus-web-chat-index.png',fullPage:true});
 const row=page.locator('#chat-index-rows [data-run]').first(),id=await row.getAttribute('data-run'),host=await row.getAttribute('data-run-host');await row.click();
 const tab=page.locator(`[data-shell-chat="${id}"][data-shell-chat-host="${host}"]`);await tab.locator('a[aria-current=page]').waitFor();
 await page.locator('#remote-composer [name=prompt]').fill('Synthetic main tab draft');
 await page.locator('[data-shell-nav=chats]').click();await tab.locator('a').click();assert.equal(await page.locator('#remote-composer [name=prompt]').inputValue(),'Synthetic main tab draft');
 await page.screenshot({path:'/private/tmp/proteus-web-main-chat-tab.png',fullPage:true});
 await tab.locator('button').click();await page.locator('#chat-index-rows').waitFor();assert.equal(await tab.count(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/private/tmp/proteus-web-chat-index-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
}
