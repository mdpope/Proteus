import {defaultPalette,validatePalette} from '../../../public/palette.js';

export function webPaletteConfig(account,storage=globalThis.localStorage){
    const key='proteus.palette.config.v1.'+account;
    const read=()=>{try{const config=JSON.parse(storage.getItem(key));if(config?.version===1&&typeof config.revision==='string')return {...config,palette:validatePalette(config.palette)};}catch{}return {version:1,revision:'initial',palette:defaultPalette()};};
    return {key,read,save(palette,expectedRevision){const current=read();if(current.revision!==expectedRevision)throw Error('Palette changed in another tab. Discard changes and try again.');const config={...current,version:1,revision:crypto.randomUUID(),palette:validatePalette(structuredClone(palette))};storage.setItem(key,JSON.stringify(config));return config;}};
}
