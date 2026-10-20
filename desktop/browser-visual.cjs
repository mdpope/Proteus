function visualPoint(value,viewport){
 const {x,y}=value;
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=viewport.width||y>=viewport.height)throw new Error('Choose CSS viewport coordinates inside the latest screenshot.');
 return {x,y};
}
function validateCapture(capture,value,viewport,{revision,now=Date.now()}={}){
 if(!capture||value.captureId!==capture.id||now-capture.at>60000||capture.revision!==revision||capture.url!==viewport.url||capture.width!==viewport.width||capture.height!==viewport.height||capture.dpr!==viewport.dpr)throw new Error('Browser observation is stale. Take a fresh screenshot before coordinate input.');
 return visualPoint(value,viewport);
}
module.exports={visualPoint,validateCapture};
