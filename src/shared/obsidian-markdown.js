import {parseDocument} from 'yaml';

// Parse only a bounded, leading properties block. Invalid YAML remains visible as
// ordinary Markdown; aliases/custom tags cannot expand into executable content.
export function installObsidianMarkdown(md) {
  md.block.ruler.before('hr', 'properties', (state, start, end, silent) => {
    if (start !== 0 || state.src.slice(state.bMarks[0],state.eMarks[0]).trim() !== '---') return false;
    let last = 1;
    for (; last < Math.min(end,202); last++) {
      if (state.bMarks[last] > 16384) return false;
      if (/^(---|\.\.\.)\s*$/.test(state.src.slice(state.bMarks[last],state.eMarks[last]))) break;
    }
    if (last >= Math.min(end,202)) return false;
    let values;
    try {
      const doc = parseDocument(state.src.slice(state.bMarks[1],state.bMarks[last]), {strict:true,uniqueKeys:true});
      if (doc.errors.length || doc.warnings.length) return false;
      values = doc.toJS({maxAliasCount:0});
      if (!values || Array.isArray(values) || typeof values !== 'object') return false;
    } catch { return false; }
    if (!silent) { const token=state.push('properties','',0); token.meta=values; token.map=[0,last+1]; }
    state.line=last+1;return true;
  });
  md.renderer.rules.properties = (tokens,index) => {
    const esc=md.utils.escapeHtml;
    const value=item=>item===null?'—':typeof item==='object'?JSON.stringify(item):String(item);
    return '<details class="md-properties" open><summary>Properties</summary><dl>'+Object.entries(tokens[index].meta).map(([key,item])=>'<dt>'+esc(key)+'</dt><dd>'+esc(Array.isArray(item)?item.map(value).join(', '):value(item))+'</dd>').join('')+'</dl></details>\n';
  };
  md.inline.ruler.before('image','wiki-image',(state,silent)=>{
    const from=state.pos;if(state.src.slice(from,from+3)!=='![[')return false;
    const end=state.src.indexOf(']]',from+3);if(end<0||end-from>2048)return false;
    const [target,...alias]=state.src.slice(from+3,end).split('|');
    if(!target||/[\n\r\[\]\\]/.test(target)||/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//')||! /\.(png|jpe?g|gif|webp)$/i.test(target))return false;
    if(!silent){const token=state.push('image','img',0);token.attrSet('src',encodeURI(target.trim()));token.attrSet('alt',alias.join('|')||target);token.children=[];}
    state.pos=end+2;return true;
  });
  md.inline.ruler.before('link','wiki-link',(state,silent)=>{
    const from=state.pos;
    if (state.src.slice(from,from+2)!=='[[' || state.linkLevel>0) return false;
    const end=state.src.indexOf(']]',from+2);if(end<0||end-from>2048)return false;
    const raw=state.src.slice(from+2,end);if(/[\n\r\[\]]/.test(raw))return false;
    const [destination,...alias]=raw.split('|'), target=destination.trim();
    if(!target || /^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//')||target.includes('\\'))return false;
    const hash=target.indexOf('#'),file=hash<0?target:target.slice(0,hash),fragment=hash<0?'':target.slice(hash);
    const href=(file?file+( /\.[a-z0-9]+$/i.test(file)?'':'.md'):'')+fragment;
    if(!silent){let t=state.push('link_open','a',1);t.attrSet('href',encodeURI(href));t=state.push('text','',0);t.content=alias.join('|').trim()||target;state.push('link_close','a',-1);}
    state.pos=end+2;return true;
  });
}
