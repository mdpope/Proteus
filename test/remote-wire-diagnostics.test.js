import test from 'node:test';
import assert from 'node:assert/strict';
import {PerformanceDiagnostics} from '../src/services/telemetry/performance-diagnostics.js';
import {RemoteHost} from '../src/services/remote/remote.js';
test('wire diagnostics count encoded bytes in bounded windows without accepting content',()=>{
 let now=0;const diagnostics=new PerformanceDiagnostics({clock:{wall:()=>now,monotonic:()=>now}});
 for(let i=0;i<30;i++){now=i*10000;diagnostics.transport({direction:'send',bytes:400,buffered:600,payload:'PRIVATE',label:'PRIVATE'});diagnostics.transport({direction:'receive',bytes:100});}
 for(let code=1000;code<5000;code++)diagnostics.transport({closeCode:code});
 diagnostics.transport({congested:true,buffered:9000000});
 const value=diagnostics.snapshot().remoteTransport;
 assert.equal(value.sentBytes,12000);assert.equal(value.receivedBytes,3000);assert.equal(value.windows.length,12);assert.equal(value.maxBufferedBytes,9000000);assert.equal(value.congestionCount,1);assert.ok(Object.keys(value.closes).length<=8);assert.equal(JSON.stringify(value).includes('PRIVATE'),false);
});
test('host congestion and wire sends expose only aggregate transport evidence',()=>{
 const diagnostics=new PerformanceDiagnostics(),host=Object.create(RemoteHost.prototype);
 host.service={performanceDiagnostics:diagnostics};host.socket={readyState:1,bufferedAmount:0,send(){},close(code){this.code=code;}};
 host.raw({id:'PRIVATE-peer'},{type:'synthetic',secret:'PRIVATE'});
 const sent=diagnostics.snapshot().remoteTransport;assert.equal(sent.sentPackets,1);assert.equal(sent.sentBytes,Buffer.byteLength(JSON.stringify({clientId:'PRIVATE-peer',packet:{type:'synthetic',secret:'PRIVATE'}})));
 host.socket.bufferedAmount=8000000;host.raw({id:'PRIVATE-peer'},{type:'synthetic'});assert.equal(host.socket.code,undefined,'normal socket pressure waits instead of closing all clients');host.outbound.stop();assert.equal(JSON.stringify(diagnostics.snapshot().remoteTransport).includes('PRIVATE'),false);
});
