const tags=new Set('svg g path rect circle ellipse line polyline polygon text tspan defs linearGradient radialGradient stop clipPath title desc'.split(' '));
const attrs=new Set('xmlns width height viewBox preserveAspectRatio x y x1 y1 x2 y2 cx cy r rx ry d points fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray opacity transform id font-family font-size font-weight text-anchor dominant-baseline dx dy offset stop-color stop-opacity gradientUnits gradientTransform clip-path'.split(' '));
// Never place model markup into the chat DOM. Permit a small static SVG subset,
// then use the browser's isolated SVG image context (no script/HTML/document access).
export function safeSvg(source) {
  if(source.length>100_000||/<!|<\?/.test(source))return null;
  const doc=new DOMParser().parseFromString(source,'image/svg+xml'),root=doc.documentElement;
  if(root.localName!=='svg'||doc.querySelector('parsererror')||root.namespaceURI!=='http://www.w3.org/2000/svg')return null;
  const elements=[root,...root.querySelectorAll('*')];if(elements.length>1000)return null;
  for(const node of elements){
    if(node.namespaceURI!==root.namespaceURI||!tags.has(node.localName))return null;
    for(const attr of node.attributes){
      if(attr.name==='xmlns'){if(attr.value!==root.namespaceURI)return null;continue;}
      if(!attrs.has(attr.name)||/url\s*\(/i.test(attr.value)&&!/^url\(#[A-Za-z_][\w.-]*\)$/.test(attr.value)||/[<>\\]|(?:https?:|data:|javascript:|file:|@import)/i.test(attr.value))return null;
    }
  }
  return new XMLSerializer().serializeToString(root);
}
export function mountSvgPreviews(body,{resize}={}) {
  for(const block of [...body.querySelectorAll('.md-code')].slice(0,20)){
    if(block.querySelector('.mtplx-svg-preview')||block.querySelector('.md-codebar span')?.textContent.trim().toLowerCase()!=='svg')continue;
    const source=block.querySelector('code')?.textContent||'',svg=safeSvg(source);
    const preview=document.createElement('figure');preview.className='mtplx-svg-preview';
    const caption=document.createElement('figcaption');caption.textContent=svg?'SVG drawing · generated code':'SVG preview unavailable: this drawing uses unsupported markup. The original code is above.';preview.append(caption);
    if(svg){const img=document.createElement('img');img.alt='Generated SVG drawing';img.onload=()=>resize?.();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);preview.append(img);}
    block.append(preview);
  }
}
