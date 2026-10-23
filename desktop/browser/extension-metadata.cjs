const fs=require('node:fs'),path=require('node:path');
function extensionName(folder,manifest,locale='en'){
 const raw=String(manifest.name||'Extension'),match=raw.match(/^__MSG_([a-zA-Z0-9_@]+)__$/i);
 if(!match)return raw.slice(0,200);
 const preferred=String(locale).replaceAll('-','_');
 for(const language of [...new Set([preferred,preferred.split('_')[0],manifest.default_locale])]){
  if(!/^[a-zA-Z0-9_]{1,40}$/.test(language||''))continue;
  try{
   const file=path.join(folder,'_locales',language,'messages.json'),root=fs.realpathSync(folder),real=fs.realpathSync(file);
   if(!real.startsWith(root+path.sep)||fs.statSync(real).size>1024*1024)continue;
   const messages=JSON.parse(fs.readFileSync(real,'utf8'));
   const value=Object.entries(messages).find(([key])=>key.toLowerCase()===match[1].toLowerCase())?.[1]?.message;
   if(typeof value==='string'&&value.trim()&&!value.includes('__MSG_'))return value.replace(/[\x00-\x1f\x7f]/g,'').slice(0,200);
  }catch{}
 }
 return 'Browser extension';
}
module.exports={extensionName};
