const {ScreenshotShare} = require('./bridge.cjs');

function installScreenshotShare({windows, trusted, nativeImage, clipboard, showWindow, saveImage}) {
  const bridge = new ScreenshotShare({
    thumbnail(bytes) {
      const image=nativeImage.createFromBuffer(bytes);
      if(image.isEmpty())return null;
      const {width,height}=image.getSize(),scale=Math.min(1,192/width,144/height);
      return image.resize({width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))}).toDataURL();
    },
    onChange(items, received) {
      if(received)showWindow();
      windows.broadcast('proteus:screenshot-share-update',{items,received});
    },
  });
  windows.handle('proteus:screenshot-share', (event,value) => {
    trusted(event);
    if(value?.action==='list')return bridge.list();
    if(typeof value?.id!=='string')throw Error('Choose a screenshot.');
    if(value.action==='read')return bridge.get(value.id);
    if(value.action==='remove')return bridge.remove(value.id);
    if(value.action==='save-to-folder'){
      const {workspaceId,rootId,directory}=value;
      return saveImage({workspaceId,rootId,directory},bridge.get(value.id));
    }
    if(value.action==='copy'){
      const image=nativeImage.createFromBuffer(bridge.get(value.id).bytes);
      if(image.isEmpty())throw Error('The screenshot could not be read.');
      clipboard.writeImage(image);
      return true;
    }
    throw Error('Unknown screenshot tray action.');
  });
  return bridge;
}

module.exports = {installScreenshotShare};
