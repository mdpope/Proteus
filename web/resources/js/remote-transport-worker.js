import {BrowserRemoteClient} from '../../../src/services/remote/remote-client.js';
import {createStateProjection,projectSyncResult} from './remote-state.js';
let client;
const projectState = createStateProjection();
self.onmessage = async ({data}) => {
    const {id, action, args} = data;
    try {
        if (action === 'connect') {
            client = new BrowserRemoteClient(args.host, args.options);
            for (const type of ['status','stage','change','failure','rejected','revoked','recovery-blocked']) {
                client.addEventListener(type, event => {
                    const state = type === 'change' && event.detail?.event === 'state';
                    self.postMessage({event:type, detail:state ? {...event.detail,data:undefined} : event.detail, status:client.status,
                        ...(state ? {stateProjection:projectState(event.detail.data)} : {})});
                });
            }
            await client.connect();
            self.postMessage({id, result:true});
        } else if (action === 'request') {
            const result = await client.request(...args);
            self.postMessage({id,...projectSyncResult(args[0],result,projectState)});
        } else if (action === 'close') client?.close();
    } catch (error) {
        self.postMessage({id, error:{message:error.message, code:error.code, details:error.details}});
    }
};
