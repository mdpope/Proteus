const {webURL}=require('../services/external-urls.cjs');
/** The host's single URL-launch policy, including provider/MCP sign-in links. */
async function openPreferredBrowser(value,{preference,embedded,system}){
  const url=webURL(value);if(!url)throw Error('Use an HTTP or HTTPS link without credentials.');
  if(preference==='system')return system(url);
  if(!embedded)throw Error('The in-app browser is not ready. Open Proteus and retry sign-in.');
  return embedded(url);
}
module.exports={openPreferredBrowser};
