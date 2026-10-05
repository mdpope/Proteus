<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Proteus preview</title><style>html,body{margin:0;height:100%;background:#fff}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe id="artifact" sandbox="" referrerpolicy="no-referrer" title="Document content"></iframe><script>
const frame=document.getElementById('artifact');
window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.data?.type!=='proteus:preview'||typeof event.data.html!=='string'||event.data.html.length>1048576)return;
    const enabled=event.data.enabled===true,script=enabled?"'unsafe-inline'":"'none'";
    const policy=`default-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; font-src 'none'; frame-src 'none'; script-src ${script}`;
    frame.setAttribute('sandbox',enabled?'allow-scripts':'');
    frame.srcdoc='<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="'+policy+'"></head><body>'+event.data.html+'</body></html>';
},{once:true});
</script></body></html>
