const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function packageDigest(root) {
 const stats=await fs.lstat(root);
 if(!stats.isDirectory()||stats.isSymbolicLink())throw Error('The installed extension package is unavailable.');
 const hash=createHash('sha256');
 let size=0,count=0;
 async function walk(folder,relative='',depth=0) {
  if(depth>30)throw Error('Extension folder is too deep.');
  const names=(await fs.readdir(folder)).sort();
  for(const name of names){
   const file=path.join(folder,name),member=relative?relative+'/'+name:name;
   const stat=await fs.lstat(file);
   if(stat.isSymbolicLink()||!stat.isDirectory()&&!stat.isFile())throw Error('Extension contains unsupported files.');
   if(stat.isDirectory())await walk(file,member,depth+1);
   else{
    size+=stat.size;
    if(size>150*1024*1024||++count>15000)throw Error('Extension package is too large.');
    const contents=await fs.readFile(file);
    if(contents.length!==stat.size)throw Error('Extension changed while reading its package.');
    hash.update(JSON.stringify([member,contents.length])).update(contents);
   }
  }
 }
 await walk(root);
 return hash.digest('hex');
}

async function reusablePackage(root,row) {
 const directory=await fs.lstat(root);
 if(!directory.isDirectory()||directory.isSymbolicLink())return null;
 const manifestPath=path.join(root,'manifest.json');
 const stat=await fs.lstat(manifestPath);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024*1024)return null;
 const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
 if(manifest.version!==row.version||!row.store&&!manifest.key)return null;
 return {manifest,digest:await packageDigest(root)};
}

module.exports={packageDigest,reusablePackage};
