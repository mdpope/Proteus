import fs from 'node:fs';
import path from 'node:path';
import {fileDigest} from './desktop-build.mjs';

export const windowsTerminalAsset='desktop/terminal/windows-terminal-guardian.exe';
function existingInfo(file){
  try{return fs.lstatSync(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}

// Only the packaging boundary replaces this generated asset. The compiler always
// receives a fresh output path, so an old helper cannot silently satisfy a build.
export function prepareWindowsTerminal(root,{build}){
  const runtime=path.join(root,'.runtime');
  const target=path.join(root,windowsTerminalAsset);
  for(const directory of [path.join(root,'desktop'),path.dirname(target)]){
    if(!fs.lstatSync(directory).isDirectory())throw Error('Windows terminal asset directory must be a regular directory.');
  }
  if(existingInfo(target)&&!existingInfo(target).isFile())throw Error('Windows terminal asset must be a regular file.');
  if(existingInfo(runtime)&&!existingInfo(runtime).isDirectory())throw Error('Build scratch directory must be a regular directory.');
  fs.mkdirSync(runtime,{recursive:true});
  const scratch=fs.mkdtempSync(path.join(runtime,'windows-terminal-build-'));
  try{
    const output=path.join(scratch,'guardian.exe');
    const receipt=build({output,testOnlyJobFailureSeam:false});
    if(!fs.lstatSync(output).isFile())throw Error('Compiler did not produce a regular terminal helper.');
    if(receipt.testOnlyJobFailureSeam!==false)throw Error('A test-only terminal helper cannot ship.');
    if(!/^[a-f0-9]{64}$/.test(receipt.compilerSha256))throw Error('Terminal compiler identity is missing.');
    if(receipt.sourceSha256!==fileDigest(path.join(root,'native/windows-terminal/guardian.cs'))||receipt.helperSha256!==fileDigest(output))throw Error('Terminal build receipt differs from compiled inputs or output.');
    fs.copyFileSync(output,target);
    if(fileDigest(target)!==receipt.helperSha256)throw Error('Copied terminal helper differs from compiler output.');
    // Scratch paths are transient; the receipt identifies the managed asset.
    return {...receipt,output:windowsTerminalAsset};
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
