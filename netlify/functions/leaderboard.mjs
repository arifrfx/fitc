const rowFields=['key','category','rank','name','department','total','bmi','workout','weighing','paguyuban','training','activeDays','elapsedDays','weighingFulfilled','weighingRequired','paguyubanPresent','paguyubanRequired','trainingPresent','trainingRequired'];
const numericFields=rowFields.filter(k=>!['key','category','name','department'].includes(k));
const limits={total:100,bmi:40,workout:40,weighing:10,paguyuban:5,training:5};
const message='Leaderboard belum dapat dimuat. Coba lagi atau hubungi pengelola FitC.';

function response(body,status=200){
 return new Response(JSON.stringify(body),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':status===200?'public, max-age=0, s-maxage=60':'no-store',
  'X-Content-Type-Options':'nosniff'
 }});
}
function publicData(data){
 if(!data||!Array.isArray(data.rows))throw Error('Invalid data');
 for(const k of ['totalParticipants','incomplete']){
  if(!Number.isInteger(data[k])||data[k]<0)throw Error('Invalid count');
 }
 for(const k of ['startDate','endDate','asOf']){
  if(typeof data[k]!=='string'||(data[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(data[k])))throw Error('Invalid date');
 }
 const rows=data.rows.map(row=>{
  if(!row||!['Overweight','Under/Normal Weight'].includes(row.category))throw Error('Invalid category');
  for(const k of ['key','name','department'])if(typeof row[k]!=='string')throw Error('Invalid text');
  for(const k of numericFields){
   if(typeof row[k]!=='number'||!Number.isFinite(row[k])||row[k]<0||(limits[k]!=null&&row[k]>limits[k]))throw Error('Invalid score');
  }
  if(!Number.isInteger(row.rank)||row.rank<1)throw Error('Invalid rank');
  return Object.fromEntries(rowFields.map(k=>[k,row[k]]));
 });
 return {rows,totalParticipants:data.totalParticipants,incomplete:data.incomplete,startDate:data.startDate,endDate:data.endDate,asOf:data.asOf};
}
export async function handle(request,{url=process.env.FITC_APPS_SCRIPT_URL,fetcher=fetch}={}){
 if(request.method!=='GET')return response({ok:false,error:'Metode tidak didukung.'},405);
 let upstream;
 try{
  upstream=new URL(url);
  if(upstream.origin!=='https://script.google.com'||!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(upstream.pathname)||upstream.username||upstream.password)throw Error('Invalid URL');
  upstream.search='';upstream.hash='';upstream.searchParams.set('action','leaderboard');
 }catch{
  return response({ok:false,error:'Koneksi leaderboard belum dikonfigurasi oleh pengelola.'},503);
 }
 try{
  const result=await fetcher(upstream.href,{signal:AbortSignal.timeout(20000),redirect:'follow',headers:{Accept:'application/json'}});
  if(!result.ok||!result.headers.get('content-type')?.includes('application/json'))throw Error('Invalid upstream response');
  const body=await result.json();
  if(body.ok!==true)throw Error('Upstream unavailable');
  return response({ok:true,data:publicData(body.data)});
 }catch{
  // Do not expose upstream HTML, spreadsheet identifiers, or internal errors.
  return response({ok:false,error:message},502);
 }
}
export default function handler(request){return handle(request);}
