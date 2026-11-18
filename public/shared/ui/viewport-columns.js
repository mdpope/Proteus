// Full-height workbenches share the actual mounted offset, including nested
// navigation and window zoom. Each column owns its scrolling, not the page.
export function fitViewportColumns(node){
 let frame;
 const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(node.isConnected)node.style.setProperty('--column-top',Math.max(0,node.getBoundingClientRect().top)+'px');});};
 const observer=new ResizeObserver(update);if(node.parentElement)observer.observe(node.parentElement);
 window.addEventListener('resize',update);update();
 return ()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',update);};
}
