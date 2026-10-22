import test from 'node:test';import assert from 'node:assert/strict';import {browserObservation} from '../src/browser-observation.js';
test('model browser observations deduplicate icon identity without changing full history or screenshots',()=>{
 const history={entries:Array.from({length:45},(_,i)=>({url:'https://example.test/path/'+i+'?q='+('long'.repeat(80)),title:'Visit '+i})),currentIndex:30},favicon='data:image/png;base64,'+'A'.repeat(12000);
 const source={id:'tab',favicon,history};const result=browserObservation([source,{...source,id:'second'},{...source,id:'third',favicon:favicon+'B'}]);
 assert.deepEqual(result[0].history,history);assert.equal(result[0].faviconRef,result[1].faviconRef);assert.notEqual(result[0].faviconRef,result[2].faviconRef);assert.equal(result[0].favicon,undefined);assert.equal(source.favicon,favicon);assert.ok(JSON.stringify(result).length<JSON.stringify([source,source,source]).length-30000);
 const image={content:[{type:'image',mimeType:'image/png',data:'aGVsbG8='}]};assert.deepEqual(browserObservation(image),image);
});
