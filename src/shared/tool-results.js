const imageTypes=new Set(['image/png','image/jpeg','image/webp']);
export function modelToolResult(result){
 if(!Array.isArray(result?.content))return typeof result==='string'?result:JSON.stringify(result);
 const images=result.content.filter(item=>item.type==='image'&&imageTypes.has(item.mimeType)&&typeof item.data==='string'&&item.data.length<=12*1024*1024&&/^[A-Za-z0-9+/]+=*$/.test(item.data));
 return {resultType:result.isError?'failure':'success',textResultForLlm:result.content.filter(item=>item.type==='text').map(item=>String(item.text).slice(0,100000)).join('\n'),...(images.length?{binaryResultsForLlm:images.slice(0,4).map(({data,mimeType})=>({type:'image',data,mimeType}))}:{}),sessionLog:'Proteus browser observation (image bytes omitted from activity summary).'};
}
export function mcpToolResult(result){
 if(Array.isArray(result?.content))return result;
 return {content:[{type:'text',text:typeof result==='string'?result:result?.textResultForLlm||JSON.stringify(result)},...(result?.binaryResultsForLlm||[]).filter(item=>item.type==='image').map(({data,mimeType})=>({type:'image',data,mimeType}))],...(result?.resultType==='failure'?{isError:true}:{})};
}
export function codexToolContent(result){
 const text=typeof result==='string'?result:result?.textResultForLlm||JSON.stringify(result);
 return [{type:'inputText',text},...(result?.binaryResultsForLlm||[]).filter(item=>item.type==='image'&&imageTypes.has(item.mimeType)).map(item=>({type:'inputImage',imageUrl:'data:'+item.mimeType+';base64,'+item.data}))];
}
