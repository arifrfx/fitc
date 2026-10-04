/** Run once from the bound Apps Script editor before web-app deployment. */
function configureLeaderboard_() {
  var ss = fitcSpreadsheet_();
  PropertiesService.getScriptProperties().setProperty('FITC_SPREADSHEET_ID', ss.getId());
  return 'Leaderboard terhubung ke ' + ss.getName();
}
function doGet(e) {
  if(e && e.parameter && e.parameter.action==='leaderboard') {
    var payload;
    try { payload={ok:true,data:getLeaderboardData()}; }
    catch(error) { payload={ok:false,error:'Leaderboard belum dapat dimuat. Coba lagi atau hubungi pengelola FitC.'}; }
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createHtmlOutputFromFile('Leaderboard')
    .setTitle('FitC | Leaderboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
/** Read-only employee endpoint. */
function getLeaderboardData() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Data sedang diperbarui. Coba beberapa saat lagi.');
  try {
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty('FITC_SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('NOT_CONFIGURED');
    var ss = SpreadsheetApp.openById(spreadsheetId);
    return fitcPublicLeaderboard_(fitcRead_(ss, 'LBHasil'), fitcRead_(ss, 'MPengaturan'));
  } catch (error) {
    console.error('Leaderboard read failed: ' + error.message);
    throw new Error('Leaderboard belum dapat dimuat. Coba lagi atau hubungi pengelola FitC.');
  } finally { lock.releaseLock(); }
}
function fitcPublicLeaderboard_(records, settings) {
  var config = new Map(settings.map(function(r) { return [r.Key, String(r.Value || '')]; }));
  var dates = new Set(), incomplete = 0;
  function number(r,key,max) {
    var v=r[key], n=Number(v);
    if(v==='' || v==null || !isFinite(n) || n<0 || (max!=null && n>max)) throw new Error('Invalid score: '+key);
    return n;
  }
  var rows=records.map(function(r,i) {
    if(r['As Of']) { FitC.date(r['As Of']); dates.add(r['As Of']); }
    if(r.Status!=='Lengkap' || ['Overweight','Under/Normal Weight'].indexOf(r.Category)<0) { incomplete++; return null; }
    if(!r['As Of']) throw new Error('Missing score date');
    var rank=number(r,'Rank');
    if(rank<1 || Math.floor(rank)!==rank) throw new Error('Invalid rank');
    // Only public score fields; no employee IDs or individual measurements.
    return {
      key:String(i), category:r.Category, rank:rank,
      name:String(r['Employee Name']||''), department:String(r.Departemen||''),
      total:number(r,'Total Points',100), bmi:number(r,'BMI Points',40),
      workout:number(r,'Workout Points',40), weighing:number(r,'Weighing Points',10),
      paguyuban:number(r,'Paguyuban Points',5), training:number(r,'Training Points',5),
      activeDays:number(r,'Active Days'), elapsedDays:number(r,'Elapsed Days'),
      weighingFulfilled:number(r,'Weighing Fulfilled'), weighingRequired:number(r,'Weighing Required'),
      paguyubanPresent:number(r,'Paguyuban Present'), paguyubanRequired:number(r,'Paguyuban Required'),
      trainingPresent:number(r,'Training Present'), trainingRequired:number(r,'Training Required')
    };
  }).filter(function(r) {return r!==null;});
  if(dates.size>1) throw new Error('Mixed score dates; recalculate first');
  rows.sort(function(a,b) {return a.category.localeCompare(b.category)||a.rank-b.rank||a.name.localeCompare(b.name);});
  return {rows:rows,incomplete:incomplete,totalParticipants:records.length,
    startDate:config.get('START_DATE')||'2026-10-01',endDate:config.get('END_DATE')||'',
    asOf:dates.size?Array.from(dates)[0]:''};
}



