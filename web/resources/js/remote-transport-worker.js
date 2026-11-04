import {BrowserRemoteClient} from '../../../src/services/remote/remote-client.js';
let client;
self.onmessage = async ({data}) => {
    const {id, action, args} = data;
    try {
        if (action === 'connect') {
            client = new BrowserRemoteClient(args.host, args.options);
            for (const type of ['status','stage','change','failure','rejected','revoked','recovery-blocked']) {
                client.addEventListener(type, event => self.postMessage({event:type, detail:event.detail, status:client.status}));
            }
            await client.connect();
            self.postMessage({id, result:true});
        } else if (action === 'request') {
            const result = await client.request(...args);
            self.postMessage({id, result});
        } else if (action === 'close') client?.close();
    } catch (error) {
        self.postMessage({id, error:{message:error.message, code:error.code, details:error.details}});
    }
};
