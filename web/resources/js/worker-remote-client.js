import {BrowserRemoteClient as DirectClient} from '../../../src/services/remote/remote-client.js';
import {mergeStateProjection} from './remote-state.js';
// Pairing callbacks stay on the page. Established sessions reuse the complete shared
// transport in a worker: no duplicate sequencing, acknowledgement or retry logic.
export class BrowserRemoteClient extends EventTarget {
    constructor(host, options = {}) {
        super();
        if (!host.key || typeof Worker === 'undefined' || options.socketFactory) return new DirectClient(host, options);
        this.host = host; this.options = {name:options.name, timeoutMs:options.timeoutMs};
        this.status = 'disconnected'; this.waiting = new Map(); this.serial = 0;
    }
    call(action, args) {
        if (!this.worker) return Promise.reject(new Error('Connect this computer first.'));
        if (this.waiting.size >= 128) return Promise.reject(Object.assign(new Error('Too many remote actions are pending. Wait before retrying.'),{code:'REMOTE_BUSY'}));
        const id = ++this.serial;
        return new Promise((resolve, reject) => {
            this.waiting.set(id, {resolve,reject});
            try { this.worker.postMessage({id,action,args}); }
            catch (error) { this.waiting.delete(id); reject(error); }
        });
    }
    connect() {
        if (this.worker || this.status === 'closed') return Promise.reject(new Error('This connection already started.'));
        this.worker = new Worker(new URL('./remote-transport-worker.js', import.meta.url), {type:'module'});
        this.worker.onmessage = ({data}) => {
            if (Object.hasOwn(data,'stateProjection')) {
                this.receivedState = mergeStateProjection(this.receivedState,data.stateProjection);
                if (data.event) data.detail = {...data.detail,data:this.receivedState};
                else data.result = {...data.result,state:this.receivedState};
            }
            if (data.event) {
                this.status = data.status;
                this.dispatchEvent(new CustomEvent(data.event,{detail:data.detail}));
                if (data.event === 'failure') this.dispose(data.detail);
            } else {
                const pending = this.waiting.get(data.id); if (!pending) return;
                this.waiting.delete(data.id);
                if (data.error) pending.reject(Object.assign(new Error(data.error.message),data.error));
                else pending.resolve(data.result);
            }
        };
        this.worker.onerror = this.worker.onmessageerror = () => {
            const message='Remote transport worker stopped. Reconnect and review the owner state before retrying.';
            this.dispose(message);
            this.dispatchEvent(new CustomEvent('status',{detail:'offline'}));
            this.dispatchEvent(new CustomEvent('failure',{detail:message}));
        };
        return this.call('connect',{host:this.host,options:this.options}).then(()=>this);
    }
    request(...args) { return this.call('request',args); }
    dispose(message) {
        this.status = 'closed'; this.worker?.terminate(); this.worker = null;
        this.receivedState = null;
        for (const pending of this.waiting.values()) pending.reject(new Error(message));
        this.waiting.clear();
    }
    close() {
        this.dispose('Disconnected. Review the owner state before retrying an uncertain action.');
        this.dispatchEvent(new CustomEvent('status',{detail:'offline'}));
    }
}
