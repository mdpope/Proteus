import {lifeSectionIcon} from './life-icons.js';
import {featureTabTitle} from '../../shared/navigation/feature-workspace-tabs.js';

export function lifeSectionStrip(sections,selected,choose){
 const navigation=document.createElement('nav');
 navigation.className='feature-tab-bar feature-workspace-tabs project-tab-strip';
 navigation.setAttribute('aria-label','Life sections');
 const list=document.createElement('div');
 list.className='feature-tab-list';
 for(const [id,title] of sections){
  const {item,open}=featureTabTitle(title,lifeSectionIcon(id),id===selected,()=>choose(id));
  open.dataset.lifeSection=id;
  list.append(item);
 }
 navigation.append(list);
 return navigation;
}
// The Life section bar (Overview, Ask, Smart Home, ...). Section pages and their
// content tabs (Smart Home, Nutrition, Garage) are ordinary feature strips owned by the
// shared feature-content workspaces, so Life follows the same tab conventions as Projects.
const lifeFeatures=['life-home','life-nutrition','life-garage'];
export function createLifeHomeTabs(ui){
 const featureFor=id=>lifeFeatures.find(feature=>ui.content.owner(id)===feature)||null;
 const sectionOf=feature=>feature?feature.slice(5):null;
 function removeBar(){document.querySelector('#life-section-navigation')?.remove();}
 function render(){
  const main=document.querySelector('#main');if(!main)return;
  const feature=featureFor(ui.selected()),inLife=ui.inLife()||!!feature;
  const inline=main.querySelector('nav[aria-label="Life sections"]');if(inline)inline.hidden=inLife;
  if(!inLife||!ui.account()){removeBar();return;}
  const shown=feature?sectionOf(feature):ui.section();
  const signature=JSON.stringify([ui.account(),shown]);
  let navigation=document.querySelector('#life-section-navigation');
  if(navigation&&navigation.dataset.signature===signature)return;
  const scroll=navigation?.firstElementChild.scrollLeft||0;
  removeBar();
  navigation=lifeSectionStrip(ui.sections,shown,ui.openSection);
  navigation.id='life-section-navigation';navigation.dataset.signature=signature;
  main.before(navigation);
  navigation.firstElementChild.scrollLeft=scroll;
 }
 // Smart Home keeps one Home Assistant tab per Life account, created on demand.
 async function openAssistant(url){
  const owner=ui.account();if(!owner)throw Error('Sign in to Life first.');
  if(!url){const connection=await ui.connection();if(ui.account()!==owner||connection.accountId!==owner)throw Error('Life account changed.');url=connection.origin;}
  if(!url)throw Error('Connect Home Assistant in Smart Home first.');
  const origin=new URL(url);if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw Error('Invalid Home Assistant address.');
  const existing=ui.tabs().find(tab=>tab.id===ui.content.group('life-home').homeAssistant);
  if(existing){if(new URL(existing.info?.url||origin.href).origin!==origin.origin)await ui.navigate(existing.id,origin.href);if(ui.account()===owner)ui.selectInFeature(existing.id,'life-home');return;}
  const tab=await ui.create({id:'browser',url:origin.href,title:'Home Assistant'});tab.customTitle='Home Assistant';ui.content.adopt('life-home',tab,{homeAssistant:true});if(ui.account()===owner)ui.selectInFeature(tab.id,'life-home');
 }
 return {owns:id=>!!featureFor(id),active:()=>!!featureFor(ui.selected())||ui.inLife()&&ui.section()==='home',render,openAssistant,featureFor};
}
