import {appRequest,ownerRequest} from './shared-app.js';
import {mountFileDocument} from '../../../public/features/workspaces/file-browser.js';
import '../../../public/features/workspaces/file-browser.css';
const host=document.querySelector('#life-result');
if(host)void(async()=>{
 let closed=false,view;window.addEventListener('pagehide',()=>{closed=true;view?.dispose?.();host.replaceChildren();});
 const status=message=>{if(!closed)host.querySelector('[role=status]').textContent=message;};
 try{
  const params=new URL(location.href).searchParams,account=params.get('account'),owner=params.get('host'),documentId=params.get('document');
  const identity=await appRequest('?view=bootstrap');if(identity.accountId!==account)throw Error('Sign in to the Life account that saved this memory.');
  const ref=await ownerRequest(owner,'life.ask.document',{accountId:account,documentId});
  const request=(action,args={})=>ownerRequest(owner,'files.'+action,{...ref,...args});
  const value=await request('preview');if(closed)return;
  view=mountFileDocument(host.querySelector('article'),{value,request,open:()=>status('Open linked documents from the shared workspace file browser.'),onError:error=>status(error.message)});
  status('Saved memory · authorized source document');
 }catch(error){status('Memory saved; document unavailable. '+error.message+' Check Source Library and this device’s workspace file viewing in Connections.');}
})();
