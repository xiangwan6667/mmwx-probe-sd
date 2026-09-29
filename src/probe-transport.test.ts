import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { startProbeTransport } from './probe-transport';

const flush = async () => { for (let i=0;i<12;i++) await Promise.resolve(); };
function setup(t: TestContext) {
  t.mock.timers.enable({apis:['setInterval','setTimeout','Date'],now:100000});
  const sockets: FakeSocket[]=[];
  class FakeSocket {
    onmessage: ((event:{data:string})=>void)|null=null;
    onerror: (()=>void)|null=null;
    onclose: (()=>void)|null=null;
    constructor(){sockets.push(this);}
    close(){this.onclose?.();}
  }
  const page=Object.assign(new EventTarget(),{visibilityState:'visible'});
  for(const [key,value] of Object.entries({WebSocket:FakeSocket,document:page,location:{protocol:'https:',host:'probe.test'}})) {
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>descriptor?Object.defineProperty(globalThis,key,descriptor):Reflect.deleteProperty(globalThis,key));
  }
  const data: unknown[]=[];
  const errors:string[]=[];
  return {sockets,page,data,errors,start:()=>startProbeTransport(value=>data.push(value),error=>errors.push(error))};
}
test('active stream suppresses polls, silence recovers, cleanup cannot restart polling',async t=>{
 const h=setup(t);let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({enabled:true,title:'poll'});});
 const stop=h.start();await flush();assert.equal(calls,1);
 for(let i=0;i<6;i++){h.sockets[0].onmessage?.({data:JSON.stringify({enabled:true,title:'stream'})});t.mock.timers.tick(5000);await flush();}
 assert.equal(calls,1);
 t.mock.timers.tick(15000);await flush();assert.equal(calls,2);
 stop();t.mock.timers.tick(30000);await flush();assert.equal(calls,2);
});
test('slow polls stay serial and cannot replace a newer stream frame',async t=>{
 const h=setup(t);let resolve!:(response:Response)=>void;let calls=0;let signal:AbortSignal|undefined;
 t.mock.method(globalThis,'fetch',(_url: string | URL | Request,options?:RequestInit)=>{calls++;signal=options?.signal as AbortSignal;return new Promise<Response>(done=>{resolve=done;});});
 const stop=h.start();t.mock.timers.tick(5000);assert.equal(calls,1);
 h.sockets[0].onmessage?.({data:JSON.stringify({enabled:true,title:'new'})});
 resolve(Response.json({enabled:true,title:'old'}));await flush();
 assert.deepEqual(h.data,[{enabled:true,title:'new'}]);stop();assert.ok(signal?.aborted);
});
test('hidden pages pause polling and returning refreshes a stale stream',async t=>{
 const h=setup(t);let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({enabled:true});});
 const stop=h.start();await flush();h.page.visibilityState='hidden';
 t.mock.timers.tick(30000);await flush();assert.equal(calls,1);
 h.page.visibilityState='visible';h.page.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(calls,2);
 h.sockets[0].onmessage?.({data:'{"enabled":true,"servers":[null]}'});
 assert.equal(h.data.length,2);stop();
});

test('timed out HTTP requests release the polling slot for recovery',async t=>{
 const h=setup(t);let calls=0;
 t.mock.method(globalThis,'fetch',(_url:string|URL|Request,options?:RequestInit)=>{
  calls++;
  if(calls>1)return Promise.resolve(Response.json({enabled:true,title:'recovered'}));
  return new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
 });
 const stop=h.start();t.mock.timers.tick(10000);await flush();
 assert.deepEqual(h.errors,['探针请求超时']);
 t.mock.timers.tick(5000);await flush();
 assert.equal(calls,2);assert.deepEqual(h.data,[{enabled:true,title:'recovered'}]);stop();
});
