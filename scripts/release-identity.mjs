// Public paths use an immutable package identity, independently of a build
// revision's display punctuation. Full revision/source hashes remain signed.
export function desktopReleaseId(candidate,platform,arch){
 if(!/^[a-f0-9]{64}$/.test(candidate.hash||''))throw Error('A verified package hash is required for a release identity.');
 const id=[String(candidate.version).replaceAll('+','-'),platform,arch,candidate.hash.slice(0,24)].join('-');
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(id))throw Error('The public release identity is invalid.');
 return id;
}
