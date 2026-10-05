import http from 'node:http';
import {readFile} from 'node:fs/promises';
import handler from './netlify/functions/leaderboard.mjs';
const html=await readFile(new URL('./public/index.html',import.meta.url));
const server=http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/leaderboard'){
   const result=await handler(new Request('http://localhost/api/leaderboard',{method:req.method}));
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());return;
  }
  if(req.method==='GET'&&(path==='/'||path==='/index.html')){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
  }
  res.writeHead(404);res.end('Not found');
 }catch{res.writeHead(500);res.end('Server error');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(8888,'127.0.0.1',()=>console.log('FitC: http://127.0.0.1:8888'));
