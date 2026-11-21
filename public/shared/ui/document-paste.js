const mediaTypes = new Map([
  ['png','image/png'], ['jpg','image/jpeg'], ['jpeg','image/jpeg'], ['gif','image/gif'],
  ['webp','image/webp'], ['pdf','application/pdf'],
]);

export function encodeDocumentAsset(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',',2)[1]);
    reader.onerror=()=>reject(reader.error||Error('Could not read the image or document.'));
    reader.readAsDataURL(file);
  });
}

export async function insertDocumentAsset(file,{save,insert},mediaType=file.type) {
  if(file.size>4*1024*1024)throw Error('Document and file attachments can be up to 4 MiB.');
  const value=await save({mediaType,data:await encodeDocumentAsset(file)});
  insert('![['+value.name+']]');
}

export function documentAssetPaste(event, {save, insert, report}) {
  const files=Array.from(event.clipboardData?.files||[]).map(file=>({
    file, mediaType:file.type||mediaTypes.get(file.name.split('.').pop()?.toLowerCase()),
  })).filter(item=>[...mediaTypes.values()].includes(item.mediaType));
  if(!files.length)return;
  event.preventDefault();
  event.stopPropagation();
  void (async()=>{
    for(const {file,mediaType} of files) {
      try {
        await insertDocumentAsset(file,{save,insert},mediaType);
      } catch(error) {report(error);}
    }
  })();
}
