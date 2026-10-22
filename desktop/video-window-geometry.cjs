// All coordinates are desktop DIPs. Keep the OS menu/taskbar work area available.
function resizeVideoWindow(bounds,area,factor){
 if(!Number.isFinite(factor)||factor<=0)return bounds;
 const ratio=bounds.width/bounds.height,maxWidth=Math.min(area.width,area.height*ratio);
 const minWidth=Math.min(maxWidth,Math.max(240,160*ratio));
 const width=Math.round(Math.min(maxWidth,Math.max(minWidth,bounds.width*factor))),height=Math.min(area.height,Math.round(width/ratio));
 const x=Math.round(Math.max(area.x,Math.min(area.x+area.width-width,bounds.x+(bounds.width-width)/2)));
 const y=Math.round(Math.max(area.y,Math.min(area.y+area.height-height,bounds.y+(bounds.height-height)/2)));
 return {x,y,width,height};
}
function moveVideoWindow(bounds,area,dx,dy){return {...bounds,x:Math.round(Math.max(area.x,Math.min(area.x+area.width-bounds.width,bounds.x+dx))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-bounds.height,bounds.y+dy)))};}
module.exports={resizeVideoWindow,moveVideoWindow};
