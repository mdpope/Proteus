import {EditorView, minimalSetup} from 'codemirror';
import {Compartment,StateField} from '@codemirror/state';
import {Decoration,WidgetType} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {syntaxTree} from '@codemirror/language';

// Markdown remains canonical. Widgets only replace inactive syntax-tree blocks;
// entering a block exposes its original source, without an HTML round trip.
export function mount(parent,{value,onChange,render}){
 class Preview extends WidgetType{
  constructor(source,from){super();this.source=source;this.from=from;}
  eq(other){return other.source===this.source&&other.from===this.from;}
  toDOM(view){const host=document.createElement('div');host.className='scratch-live-block rich-text';render(host,this.source);host.onmousedown=event=>{event.preventDefault();view.dispatch({selection:{anchor:this.from}});view.focus();};return host;}
  ignoreEvent(){return false;}
 }
 const blocks=state=>{const ranges=[],selection=state.selection.main;
  for(let block=syntaxTree(state).topNode.firstChild;block;block=block.nextSibling){if(block.from<=selection.to&&block.to>=selection.from)continue;
   ranges.push(Decoration.replace({widget:new Preview(state.doc.sliceString(block.from,block.to),block.from),block:true}).range(block.from,block.to));}
  return Decoration.set(ranges);
 };
 const live=StateField.define({create:blocks,update:(value,tr)=>tr.docChanged||tr.selection?blocks(tr.state):value,provide:field=>EditorView.decorations.from(field)}),mode=new Compartment(),wrapping=new Compartment();
 const view=new EditorView({parent,doc:value,extensions:[minimalSetup,EditorView.cspNonce.of(document.querySelector("meta[name=proteus-style-nonce]")?.content||""),markdown(),wrapping.of(EditorView.lineWrapping),mode.of(live),EditorView.contentAttributes.of({'aria-label':'Scratch Markdown editor'}),EditorView.updateListener.of(update=>{if(update.docChanged)onChange(update.state.doc.toString());}),EditorView.theme({'&':{height:'100%',background:'transparent',color:'var(--proteus-ink)'},'.cm-scroller':{overflow:'auto',minHeight:'60vh'},'.cm-gutters':{display:'none'},'.cm-content':{padding:'16px',caretColor:'var(--proteus-ink)'},'.cm-cursor,.cm-dropCursor':{borderLeftColor:'var(--proteus-ink)'},'&.cm-focused .cm-selectionBackground, .cm-selectionBackground':{backgroundColor:'color-mix(in srgb,var(--proteus-accent) 25%,transparent)'},'&.cm-focused':{outline:'none'},'.scratch-live-block':{padding:'4px 0'}})]});
 return {value(){return view.state.doc.toString();},replaceSelection(text){view.dispatch(view.state.replaceSelection(text));},source(enabled){view.dispatch({effects:mode.reconfigure(enabled?[]:live)});},setWrap(enabled){view.dispatch({effects:wrapping.reconfigure(enabled?EditorView.lineWrapping:[])});},
  position(){const {anchor,head}=view.state.selection.main;return {anchor,head,top:view.scrollDOM.scrollTop,left:view.scrollDOM.scrollLeft};},
  restore(saved){
   if(!saved)return;
   const {anchor,head}=view.state.selection.main,clamp=value=>Math.max(0,Math.min(view.state.doc.length,Math.trunc(value)||0));
   const selection={anchor:clamp(saved.anchor),head:clamp(saved.head)};
   if(anchor!==selection.anchor||head!==selection.head)view.dispatch({selection});
   view.requestMeasure({read:()=>null,write:()=>view.scrollDOM.scrollTo(saved.left||0,saved.top||0)});
  },
  insert(before,after){const {from,to}=view.state.selection.main;view.dispatch({changes:{from,to,insert:before+view.state.sliceDoc(from,to)+after},selection:{anchor:from+before.length,head:to+before.length}});view.focus();},destroy(){view.destroy();}};
}
