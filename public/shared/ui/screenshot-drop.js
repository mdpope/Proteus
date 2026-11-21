const screenshotType = 'application/x-proteus-screenshot';
const drops = new WeakMap();

export function markScreenshotDrag(event, id) {
  event.dataTransfer.setData(screenshotType,id);
  event.dataTransfer.effectAllowed='copy';
}

export function bindScreenshotDrop(target, receiver, report) {
  if(!target || window.desktop?.platform!=='darwin' || !window.desktop.screenshotShare)return;
  drops.get(target)?.abort();
  const controller=new AbortController();
  drops.set(target,controller);
  const options={capture:true,signal:controller.signal};
  target.addEventListener('dragover',event=>{
    if(!event.dataTransfer.types.includes(screenshotType)||!receiver(event))return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect='copy';
    target.classList.add('screenshot-drop-active');
  },options);
  target.addEventListener('dragleave',event=>{
    if(!target.contains(event.relatedTarget))target.classList.remove('screenshot-drop-active');
  },options);
  target.addEventListener('drop',event=>{
    target.classList.remove('screenshot-drop-active');
    if(!event.dataTransfer.types.includes(screenshotType))return;
    const accept=receiver(event);
    if(!accept)return;
    const id=event.dataTransfer.getData(screenshotType);
    event.preventDefault();
    event.stopPropagation();
    const read=async()=>{
      const value=await window.desktop.screenshotShare({action:'read',id});
      if(!target.isConnected)throw Error('This destination closed. The screenshot is still in the tray.');
      return new File([value.bytes],value.name,{type:value.type});
    };
    void Promise.resolve().then(()=>accept(read,id)).catch(error=>report(error.message));
  },options);
}
