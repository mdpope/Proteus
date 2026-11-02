import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const webRoot=import.meta.dirname,sourceRoot=path.resolve(webRoot,'..');
const read=async name=>{try{return await readFile(path.join(sourceRoot,name),'utf8');}catch{return null;}};
const packageText=await read('package.json');
if(packageText){
    const pkg=JSON.parse(packageText);
    const changelog=await read('CHANGELOG.md');
    const lines=changelog?.split('\n')||[],firstRelease=lines.findIndex(line=>/^##\s+v?\d+\.\d+\.\d+(?:\s|$)/i.test(line));
    const releases=[];let current=null;
    for(const line of lines.slice(Math.max(firstRelease,0))){if(/^##\s+/.test(line)){current=/^##\s+v?\d+\.\d+\.\d+(?:\s|$)/i.test(line)&&releases.length<3?[]:null;if(current)releases.push(current);}if(current&&current.length<75)current.push(line);}
    const releaseNotes=firstRelease<0?null:releases.map(section=>section.join('\n').trim()).filter(Boolean).join('\n\n');
    const updates='Planned for future releases:\n\n- Browser tab groups and broader browser organization.\n- More provider and document workflows across devices.\n- Automatic update checks and installation when a distribution source is configured.';
    const metadata={readme:await read('README.md'),version:pkg.version||'Unknown',releaseDate:pkg.releaseDate||null,releaseName:pkg.releaseName||null,buildId:process.env.PROTEUS_RELEASE_ID||null,changelog:releaseNotes||null,updates};
    await writeFile(path.join(webRoot,'resources','release.json'),JSON.stringify(metadata,null,2)+'\n');
}
