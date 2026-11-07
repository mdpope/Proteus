// Fixed, target-scoped observation around ONE authorized fill. No caller code,
// key/data/text export, retry, submission or editor-state mutation is permitted.
async function diagnosticFill(locator, value) {
  const target = await locator.elementHandle();
  if (!target) throw Error('The selected field is no longer available.');
  let trace;
  try {
    trace = await target.evaluateHandle(element => {
      const events = [], types = ['beforeinput','input','keydown','keyup','compositionstart','compositionend'];
      const safeInputTypes = new Set(['insertText','insertReplacementText','insertFromPaste','insertCompositionText','deleteContentBackward','deleteContentForward','deleteByCut']);
      const sample = () => {
        const secret = element.matches('input[type=password],input[autocomplete=current-password],input[autocomplete=new-password],input[autocomplete=one-time-code]');
        const text = ['INPUT','TEXTAREA'].includes(element.tagName) ? element.value : element.isContentEditable ? element.innerText : null;
        return {connected:element.isConnected,focused:element.ownerDocument.activeElement===element,documentFocused:element.ownerDocument.hasFocus(),visibility:element.ownerDocument.visibilityState,length:secret?null:typeof text==='string'?text.length:null};
      };
      let stopped = false, timer;
      const stop = () => { if(stopped)return;stopped=true;clearTimeout(timer);for(const type of types)element.removeEventListener(type,listener); };
      const listener = event => {
        if(events.length>=32)return;
        const row={type:event.type,inputType:safeInputTypes.has(event.inputType)?event.inputType:event.inputType?'other':null,trusted:event.isTrusted,defaultPrevented:event.defaultPrevented,...sample()};
        events.push(row);
        // Observe final cancellation after remaining handlers without delaying input.
        queueMicrotask(()=>{row.defaultPrevented=event.defaultPrevented;});
      };
      for(const type of types)element.addEventListener(type,listener,{passive:true});
      timer=setTimeout(stop,15000);
      return {events,sample,stop};
    });
    const samples = [];
    const sample = async phase => {
      const original = await trace.evaluate(t=>t.sample());
      let current;
      try {
        current=await locator.evaluate((element,{target,expected})=>({sameTarget:element===target,connected:element.isConnected,retained:element.isConnected&&(['INPUT','TEXTAREA'].includes(element.tagName)?element.value:element.isContentEditable?element.innerText:null)===expected}),{target,expected:value});
      } catch { current={available:false}; }
      samples.push({phase,original,current});
    };
    await sample('before');
    await locator.fill(value); // Exactly once; never retry an uncertain input.
    await sample('immediate');
    await new Promise(resolve=>setTimeout(resolve,150));await sample('150ms');
    await new Promise(resolve=>setTimeout(resolve,350));await sample('500ms');
    const events=await trace.evaluate(t=>t.events);
    const targetType=await target.evaluate(e=>({tag:e.tagName.toLowerCase(),role:['combobox','textbox','searchbox','spinbutton'].includes(e.getAttribute('role'))?e.getAttribute('role'):null,contentEditable:e.isContentEditable}));
    return {...targetType,retained:samples.at(-1).current.retained===true,verification:'DOM value after fill; not application submission',diagnostics:{samples,events,eventLimit:32,containsText:false}};
  } finally {
    if(trace){await trace.evaluate(t=>t.stop()).catch(()=>{});await trace.dispose().catch(()=>{});}
    await target.dispose().catch(()=>{});
  }
}
module.exports={diagnosticFill};
