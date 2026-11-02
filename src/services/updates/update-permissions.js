// A user-started coordinator retains its installation authorization across
// restart. Its narrow owner preflight does not inherit a source workspace or
// grant arbitrary shell, website content, chat dispatch or desktop input.
export function updateCoordinatorPermission(run,request,{pid=process.pid}={}){
 const authorization=run.schedule?.updateAuthorization;
 if(run.schedule?.purpose!=='update'||authorization?.tool!=='proteus_update'||request?.kind!=='custom-tool'||request.managedApprovalRequired||request.requestSandboxBypass)return null;
 const names=new Map(['proteus_update','proteus_tabs','proteus_browser','proteus_desktop','proteus_chats'].flatMap(name=>[[name,name],['mcp__proteus_app__'+name,name]]));
 const tool=names.get(request.toolName),args=request.args||{};
 if(tool==='proteus_update')return {allowed:true,reason:'User-started update coordinator'};
 if(authorization.scopeVersion!==2||!authorization.hostId)return null;
 let allowed=false;
 if(tool==='proteus_tabs')allowed=args.action==='list';
 if(tool==='proteus_browser')allowed=['list','destinations'].includes(args.action);
 if(tool==='proteus_chats')allowed=(!args.hostId||args.hostId===authorization.hostId)&&(['computers','projects','models'].includes(args.action)||args.action==='read'&&args.chatId===run.id);
 if(tool==='proteus_desktop'){
  allowed=['status','catalog','stop'].includes(args.action);
  if(args.action==='call'&&args.backend==='cua'){
   const input=args.arguments||{};
   allowed=args.tool==='check_permissions'&&input.prompt!==true||args.tool==='list_windows'&&(input.pid===pid||input.pid===undefined&&input.app==='Proteus')||['get_window_state','verify_state'].includes(args.tool)&&input.pid===pid&&input.target===undefined&&input.screenshot_out_file===undefined;
  }
 }
 return allowed?{allowed:true,reason:'User-started update preflight'}:null;
}
