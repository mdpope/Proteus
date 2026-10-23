// Small, fixed vector marks; labels and extension names remain plain text.
const paths={
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 move:'<path d="M3 12h17m-6-6 6 6-6 6M4 4H2v16h2"/>',
 edit:'<path d="m4 15 12-12 5 5-12 12-6 1zM13 6l5 5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 unload:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 hide:'<path d="m3 3 18 18M10 5c6-1 11 7 11 7l-3 4M6 6c-3 2-5 6-5 6s5 8 12 7l3-1M10 10a3 3 0 0 0 4 4"/>',
 pin:'<path d="M8 3h8l-1 7 4 4H5l4-4zM12 14v7"/>',
 link:'<path d="m10 7 3-3a5 5 0 0 1 7 7l-3 3M14 17l-3 3a5 5 0 0 1-7-7l3-3M8 16l8-8"/>',
 settings:'<path d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6"/>',
 video:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 8 6 4-6 4z"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM9 12l2 2 4-4"/>',
 desktop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 mobile:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
 code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
 extension:'<path d="M3 3h6a3 3 0 1 1 6 0h6v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H3z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
};
function key(id){if(id==='duplicate'||id.startsWith('copy'))return 'copy';if(id.startsWith('add')||id==='install')return 'plus';if(id.startsWith('move')||id.startsWith('send'))return 'move';if(id.startsWith('rename'))return 'edit';if(id.startsWith('close'))return 'close';if(id==='unload'||id==='hide'||id==='persist')return id==='persist'?'pin':id;if(id==='autoplay')return 'video';if(id==='clear-site')return 'trash';if(id==='certificate')return 'shield';if(id==='mode:mobile')return 'mobile';if(id.startsWith('mode:'))return 'desktop';if(id==='devtools')return 'code';if(id==='manage')return 'extension';if(id==='site-data')return 'settings';return /^[a-p]{32}$/.test(id)?'extension':null;}
export function appendMenuLabel(button,item){
 const name=key(item.id);let icon;
 if(typeof item.icon==='string'&&item.icon.length<=32768&&/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(item.icon)){icon=document.createElement('img');icon.src=item.icon;icon.alt='';}
 else if(name){icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.6');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');icon.innerHTML=paths[name];}
 if(icon){icon.classList.add('menu-icon');icon.setAttribute('aria-hidden','true');button.append(icon);}const label=document.createElement('span');label.className='menu-label';label.textContent=item.label;button.append(label);
}
