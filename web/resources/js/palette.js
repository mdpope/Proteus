import {webPaletteConfig} from './palette-config.js';
// Browser/PWA installation configuration. Never write a connected desktop's palette.
import {syncPalette,renderPalette} from '../../../public/shared/ui/palette.js';

const account=typeof document==='undefined'?null:document.body.dataset.browserAccount;
const config=account?webPaletteConfig(account):null;
if(config){
    syncPalette({appearance:{palette:config.read().palette}});
    addEventListener('storage',event=>{if(event.key===config.key)syncPalette({appearance:{palette:config.read().palette}});});
}
export function renderWebPalette(host,{escape,notify}){
    if(!config)return;
    const settings=()=>{const current=config.read();return {revision:current.revision,appearance:{palette:current.palette}};};
    const state={data:{settings:settings()}};
    const api=async(path,value)=>{if(path.startsWith('/api/state'))return {settings:settings()};if(path==='/api/settings'){config.save(value.settings.appearance.palette,value.expectedRevision);return settings();}throw Error('Unsupported local palette action.');};
    renderPalette(host,{api,state,escape,toast:message=>notify(message==='Palette saved for this computer.'?'Palette saved in this browser’s local configuration.':message)});
    host.querySelector('p').textContent='Tune this browser/PWA installation. Save palette writes its local configuration and restores these colors when you reopen Proteus. Other computers and devices keep their own palettes.';
}
