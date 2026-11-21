import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import pipes from '../desktop/services/console-pipes.cjs';

test('a detached desktop logging pipe cannot raise an uncaught EPIPE',()=>{
 const stdout=new EventEmitter(),stderr=new EventEmitter();
 pipes.protectConsolePipes(stdout,stderr);
 for(const stream of [stdout,stderr])assert.doesNotThrow(()=>stream.emit('error',Object.assign(new Error('Closed console'),{code:'EPIPE'})));
 const unexpected=Object.assign(new Error('Unexpected stream failure'),{code:'EIO'});
 assert.throws(()=>stderr.emit('error',unexpected),error=>error===unexpected);
});
