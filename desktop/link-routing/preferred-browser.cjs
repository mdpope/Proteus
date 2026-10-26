const {webURL}=require('../services/external-urls.cjs');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
/** The host's single URL-launch policy, including provider/MCP sign-in links. */
async function openPreferredBrowser(value,{preference,embedded,system}){
  const url=webURL(value);if(!url)throw Error('Use an HTTP or HTTPS link without credentials.');
  if(preference==='system')return system(url);
  if(!embedded)throw Error('The in-app browser is not ready. Open Proteus and retry sign-in.');
  return embedded(url);
}
/** Address the installed app explicitly so the system HTTP default cannot recurse. */
async function openSafariSelector(value,{platform=process.platform,launch=promisify(execFile)}={}){
  const url=webURL(value);if(!url)throw Error('Use an HTTP or HTTPS link without credentials.');
  if(platform!=='darwin')throw Error('SafariSelector is available on macOS only.');
  try{await launch('/usr/bin/open',['-b','org.proteusapp.review.SafariSelector',url]);}
  catch{throw Error('SafariSelector could not receive this link. Check that SafariSelector is installed, then try again.');}
  return {handedOff:true,browser:'safariselector'};
}
module.exports={openPreferredBrowser,openSafariSelector};
