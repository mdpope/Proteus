import {execFileSync} from 'node:child_process';
import {createProvenance} from './desktop-build.mjs';

// Bind newly built Linux packages to the actual clean checkout. Historical
// transfer metadata remains separate and cannot substitute for the current pin.
export function linuxBuildIdentity({root,version,upstream,runtimeFiles,buildInputs,git=execFileSync}){
 const sourceCommit=git('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40,64}$/.test(sourceCommit))throw Error('Use a complete Linux source commit.');
 const gitHead=sourceCommit.slice(0,12);
 const dirty=Boolean(git('git',['status','--porcelain','--',...Object.keys(runtimeFiles),...Object.keys(buildInputs)],{cwd:root,encoding:'utf8'}).trim());
 const identity=createProvenance({version,upstream,sourceCommit,gitHead,dirty,runtimeFiles,buildInputs});
 const buildRevision=`${gitHead}+${dirty?'dirty.':'src.'}${identity.sourceFingerprint.slice(0,12)}`;
 return {...identity,buildRevision};
}
