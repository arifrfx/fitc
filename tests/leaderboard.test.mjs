import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {handle} from '../netlify/functions/leaderboard.mjs';
const url='https://script.google.com/macros/s/test-deployment/exec';
const row={key:'1',category:'Overweight',rank:1,name:'Peserta Contoh',department:'A',total:10,bmi:0,workout:0,weighing:10,paguyuban:0,training:0,activeDays:0,elapsedDays:5,weighingFulfilled:1,weighingRequired:1,paguyubanPresent:0,paguyubanRequired:0,trainingPresent:0,trainingRequired:0};
const data={rows:[row],totalParticipants:1,incomplete:0,startDate:'2026-10-01',endDate:'',asOf:'2026-10-05'};
const req=new Request('https://example.netlify.app/api/leaderboard?url=https://evil.example');
const good=()=>Response.json({ok:true,data});
test('fetches configured URL only, follows redirects, strips private fields and caches',async()=>{
 const result=await handle(req,{url,fetcher:async(u,opts)=>{
  assert.equal(u,url+'?action=leaderboard');assert.equal(opts.redirect,'follow');assert.ok(opts.signal);
  return Response.json({ok:true,data:{...data,secret:'private',rows:[{...row,employeeId:'private',latestBmi:25}]}});
 }});
 assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/s-maxage=60/);
 assert.deepEqual(await result.json(),{ok:true,data});
});
test('rejects invalid config without fetching',async()=>{
 for(const bad of [undefined,'https://evil.example','https://script.google.com/macros/u/1/s/test/exec']){
  assert.equal((await handle(req,{url:bad,fetcher:()=>{throw Error('Must not fetch');}})).status,503);
 }
});
test('rejects writes without fetching',async()=>{
 assert.equal((await handle(new Request(req.url,{method:'POST'}),{url,fetcher:good})).status,405);
});
test('HTML login, upstream errors, timeout and invalid scores return safe errors',async()=>{
 for(const fetcher of [
  async()=>new Response('<html>Login</html>',{headers:{'content-type':'text/html'}}),
  async()=>Response.json({ok:false,error:'private'}),
  async()=>{throw new Error('private timeout');},
  async()=>Response.json({ok:true,data:{...data,rows:[{...row,total:101}]}}),
  async()=>new Response('bad json',{headers:{'content-type':'application/json'}})
 ]){
  const result=await handle(req,{url,fetcher});assert.equal(result.status,502);
  assert.equal(result.headers.get('cache-control'),'no-store');assert.ok(!(await result.text()).includes('private'));
 }
});
test('Netlify HTML uses same-origin endpoint, parses, contains no preview data',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.ok(html.includes("fetch('/api/leaderboard'"));assert.ok(!html.includes('google.script.run'));
 assert.ok(!html.includes('window.FITC_PREVIEW'));assert.ok(!html.includes('script.google.com'));
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});
test('Apps Script endpoint returns only public data, masks failures and preserves HTML route',()=>{
 const ctx=vm.createContext({});
 vm.runInContext(readFileSync(new URL('../apps-script/Web.gs',import.meta.url),'utf8'),ctx);
 ctx.getLeaderboardData=()=>data;
 ctx.ContentService={MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:mime=>({text,mime})})};
 assert.deepEqual(JSON.parse(ctx.doGet({parameter:{action:'leaderboard'}}).text),{ok:true,data});
 ctx.getLeaderboardData=()=>{throw Error('private');};
 assert.equal(JSON.parse(ctx.doGet({parameter:{action:'leaderboard'}}).text).ok,false);
 assert.ok(!ctx.doGet({parameter:{action:'leaderboard'}}).text.includes('private'));
 const html={setTitle(){return this;},setXFrameOptionsMode(){return this;},addMetaTag(){return this;}};
 ctx.HtmlService={XFrameOptionsMode:{ALLOWALL:'all'},createHtmlOutputFromFile:name=>{assert.equal(name,'Leaderboard');return html;}};
 assert.equal(ctx.doGet(),html);
});

