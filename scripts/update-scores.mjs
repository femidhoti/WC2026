// ════════════════════════════════════════════════════════════════════
//  WC2026 hourly score updater (GitHub Actions, server-side).
//  Primary source: football-data.org (free token, full World Cup feed,
//  all matches + scores in one call). Fallback: TheSportsDB (no key).
//  Computes scorelines / group 1st-2nd / knockout winners and writes
//  them to the Firebase Realtime DB via REST. No CORS, no browser.
//
//  SETUP: add a repo secret named FOOTBALL_DATA_TOKEN (free key from
//  football-data.org). Without it, the script falls back to TheSportsDB.
// ════════════════════════════════════════════════════════════════════
const DB_URL='https://terry-worldcup26-default-rtdb.europe-west1.firebasedatabase.app';
const FD_TOKEN=process.env.FOOTBALL_DATA_TOKEN||'';
const SPORTSDB_KEY='3';

const D={"GRP_DEFS":{"A":[{"id":"A0","d":"Mexico 🇲🇽"},{"id":"A1","d":"South Africa 🇿🇦"},{"id":"A2","d":"Korea Republic 🇰🇷"},{"id":"A3","d":"Czechia 🇨🇿"}],"B":[{"id":"B0","d":"Canada 🇨🇦"},{"id":"B1","d":"Bosnia & Herz. 🇧🇦"},{"id":"B2","d":"Qatar 🇶🇦"},{"id":"B3","d":"Switzerland 🇨🇭"}],"C":[{"id":"C0","d":"Brazil 🇧🇷"},{"id":"C1","d":"Haiti 🇭🇹"},{"id":"C2","d":"Morocco 🇲🇦"},{"id":"C3","d":"Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿"}],"D":[{"id":"D0","d":"USA 🇺🇸"},{"id":"D1","d":"Paraguay 🇵🇾"},{"id":"D2","d":"Australia 🇦🇺"},{"id":"D3","d":"Türkiye 🇹🇷"}],"E":[{"id":"E0","d":"Germany 🇩🇪"},{"id":"E1","d":"Ivory Coast 🇨🇮"},{"id":"E2","d":"Ecuador 🇪🇨"},{"id":"E3","d":"Curaçao 🇨🇼"}],"F":[{"id":"F0","d":"Netherlands 🇳🇱"},{"id":"F1","d":"Japan 🇯🇵"},{"id":"F2","d":"Sweden 🇸🇪"},{"id":"F3","d":"Tunisia 🇹🇳"}],"G":[{"id":"G0","d":"Belgium 🇧🇪"},{"id":"G1","d":"Egypt 🇪🇬"},{"id":"G2","d":"Iran 🇮🇷"},{"id":"G3","d":"New Zealand 🇳🇿"}],"H":[{"id":"H0","d":"Spain 🇪🇸"},{"id":"H1","d":"Saudi Arabia 🇸🇦"},{"id":"H2","d":"Uruguay 🇺🇾"},{"id":"H3","d":"Cape Verde 🇨🇻"}],"I":[{"id":"I0","d":"France 🇫🇷"},{"id":"I1","d":"Senegal 🇸🇳"},{"id":"I2","d":"Norway 🇳🇴"},{"id":"I3","d":"Iraq 🇮🇶"}],"J":[{"id":"J0","d":"Argentina 🇦🇷"},{"id":"J1","d":"Algeria 🇩🇿"},{"id":"J2","d":"Austria 🇦🇹"},{"id":"J3","d":"Jordan 🇯🇴"}],"K":[{"id":"K0","d":"Portugal 🇵🇹"},{"id":"K1","d":"Colombia 🇨🇴"},{"id":"K2","d":"Congo DR 🇨🇩"},{"id":"K3","d":"Uzbekistan 🇺🇿"}],"L":[{"id":"L0","d":"England 🏴󠁧󠁢󠁥󠁮󠁧󠁿"},{"id":"L1","d":"Croatia 🇭🇷"},{"id":"L2","d":"Ghana 🇬🇭"},{"id":"L3","d":"Panama 🇵🇦"}]},"FIXTURES":[{"id":"m1","grp":"A","t1":"A0","t2":"A1"},{"id":"m2","grp":"A","t1":"A2","t2":"A3"},{"id":"m3","grp":"A","t1":"A3","t2":"A1"},{"id":"m4","grp":"A","t1":"A0","t2":"A2"},{"id":"m5","grp":"A","t1":"A3","t2":"A0"},{"id":"m6","grp":"A","t1":"A1","t2":"A2"},{"id":"m7","grp":"B","t1":"B0","t2":"B1"},{"id":"m8","grp":"B","t1":"B2","t2":"B3"},{"id":"m9","grp":"B","t1":"B3","t2":"B1"},{"id":"m10","grp":"B","t1":"B0","t2":"B2"},{"id":"m11","grp":"B","t1":"B3","t2":"B0"},{"id":"m12","grp":"B","t1":"B1","t2":"B2"},{"id":"m13","grp":"C","t1":"C0","t2":"C2"},{"id":"m14","grp":"C","t1":"C1","t2":"C3"},{"id":"m15","grp":"C","t1":"C3","t2":"C2"},{"id":"m16","grp":"C","t1":"C0","t2":"C1"},{"id":"m17","grp":"C","t1":"C3","t2":"C0"},{"id":"m18","grp":"C","t1":"C2","t2":"C1"},{"id":"m19","grp":"D","t1":"D0","t2":"D1"},{"id":"m20","grp":"D","t1":"D2","t2":"D3"},{"id":"m21","grp":"D","t1":"D0","t2":"D2"},{"id":"m22","grp":"D","t1":"D3","t2":"D1"},{"id":"m23","grp":"D","t1":"D3","t2":"D0"},{"id":"m24","grp":"D","t1":"D1","t2":"D2"},{"id":"m25","grp":"E","t1":"E0","t2":"E3"},{"id":"m26","grp":"E","t1":"E1","t2":"E2"},{"id":"m27","grp":"E","t1":"E0","t2":"E1"},{"id":"m28","grp":"E","t1":"E2","t2":"E3"},{"id":"m29","grp":"E","t1":"E2","t2":"E0"},{"id":"m30","grp":"E","t1":"E3","t2":"E1"},{"id":"m31","grp":"F","t1":"F0","t2":"F1"},{"id":"m32","grp":"F","t1":"F2","t2":"F3"},{"id":"m33","grp":"F","t1":"F0","t2":"F2"},{"id":"m34","grp":"F","t1":"F3","t2":"F1"},{"id":"m35","grp":"F","t1":"F1","t2":"F2"},{"id":"m36","grp":"F","t1":"F3","t2":"F0"},{"id":"m37","grp":"G","t1":"G0","t2":"G1"},{"id":"m38","grp":"G","t1":"G2","t2":"G3"},{"id":"m39","grp":"G","t1":"G0","t2":"G2"},{"id":"m40","grp":"G","t1":"G3","t2":"G1"},{"id":"m41","grp":"G","t1":"G1","t2":"G2"},{"id":"m42","grp":"G","t1":"G3","t2":"G0"},{"id":"m43","grp":"H","t1":"H0","t2":"H3"},{"id":"m44","grp":"H","t1":"H1","t2":"H2"},{"id":"m45","grp":"H","t1":"H0","t2":"H1"},{"id":"m46","grp":"H","t1":"H2","t2":"H3"},{"id":"m47","grp":"H","t1":"H3","t2":"H1"},{"id":"m48","grp":"H","t1":"H2","t2":"H0"},{"id":"m49","grp":"I","t1":"I0","t2":"I1"},{"id":"m50","grp":"I","t1":"I3","t2":"I2"},{"id":"m51","grp":"I","t1":"I0","t2":"I3"},{"id":"m52","grp":"I","t1":"I2","t2":"I1"},{"id":"m53","grp":"I","t1":"I2","t2":"I0"},{"id":"m54","grp":"I","t1":"I1","t2":"I3"},{"id":"m55","grp":"J","t1":"J0","t2":"J1"},{"id":"m56","grp":"J","t1":"J2","t2":"J3"},{"id":"m57","grp":"J","t1":"J0","t2":"J2"},{"id":"m58","grp":"J","t1":"J3","t2":"J1"},{"id":"m59","grp":"J","t1":"J3","t2":"J0"},{"id":"m60","grp":"J","t1":"J1","t2":"J2"},{"id":"m61","grp":"K","t1":"K0","t2":"K2"},{"id":"m62","grp":"K","t1":"K3","t2":"K1"},{"id":"m63","grp":"K","t1":"K0","t2":"K3"},{"id":"m64","grp":"K","t1":"K1","t2":"K2"},{"id":"m65","grp":"K","t1":"K1","t2":"K0"},{"id":"m66","grp":"K","t1":"K2","t2":"K3"},{"id":"m67","grp":"L","t1":"L0","t2":"L1"},{"id":"m68","grp":"L","t1":"L2","t2":"L3"},{"id":"m69","grp":"L","t1":"L0","t2":"L2"},{"id":"m70","grp":"L","t1":"L3","t2":"L1"},{"id":"m71","grp":"L","t1":"L3","t2":"L0"},{"id":"m72","grp":"L","t1":"L1","t2":"L2"}],"TEAM_ALIASES":{"A0":["Mexico"],"A1":["South Africa"],"A2":["South Korea","Korea Republic","Korea"],"A3":["Czechia","Czech Republic"],"B0":["Canada"],"B1":["Bosnia and Herzegovina","Bosnia & Herzegovina","Bosnia-Herzegovina","Bosnia & Herz."],"B2":["Qatar"],"B3":["Switzerland"],"C0":["Brazil"],"C1":["Haiti"],"C2":["Morocco"],"C3":["Scotland"],"D0":["USA","United States","United States of America"],"D1":["Paraguay"],"D2":["Australia"],"D3":["Türkiye","Turkiye","Turkey"],"E0":["Germany"],"E1":["Ivory Coast","Côte d'Ivoire","Cote d'Ivoire"],"E2":["Ecuador"],"E3":["Curaçao","Curacao"],"F0":["Netherlands"],"F1":["Japan"],"F2":["Sweden"],"F3":["Tunisia"],"G0":["Belgium"],"G1":["Egypt"],"G2":["Iran","IR Iran"],"G3":["New Zealand"],"H0":["Spain"],"H1":["Saudi Arabia"],"H2":["Uruguay"],"H3":["Cape Verde","Cabo Verde"],"I0":["France"],"I1":["Senegal"],"I2":["Norway"],"I3":["Iraq"],"J0":["Argentina"],"J1":["Algeria"],"J2":["Austria"],"J3":["Jordan"],"K0":["Portugal"],"K1":["Colombia"],"K2":["Congo DR","DR Congo","Democratic Republic of the Congo"],"K3":["Uzbekistan"],"L0":["England"],"L1":["Croatia"],"L2":["Ghana"],"L3":["Panama"]},"KO_KICKOFF":{"73":"2026-06-28T19:00Z","74":"2026-06-29T20:30Z","75":"2026-06-30T01:00Z","76":"2026-06-29T17:00Z","77":"2026-06-30T21:00Z","78":"2026-06-30T17:00Z","79":"2026-07-01T01:00Z","80":"2026-07-01T16:00Z","81":"2026-07-02T00:00Z","82":"2026-07-01T20:00Z","83":"2026-07-02T23:00Z","84":"2026-07-02T19:00Z","85":"2026-07-03T03:00Z","86":"2026-07-03T22:00Z","87":"2026-07-04T01:30Z","88":"2026-07-03T18:00Z","89":"2026-07-04T21:00Z","90":"2026-07-04T17:00Z","91":"2026-07-05T20:00Z","92":"2026-07-06T00:00Z","93":"2026-07-06T19:00Z","94":"2026-07-07T00:00Z","95":"2026-07-07T16:00Z","96":"2026-07-07T20:00Z","97":"2026-07-09T20:00Z","98":"2026-07-10T19:00Z","99":"2026-07-11T21:00Z","100":"2026-07-12T01:00Z","101":"2026-07-14T19:00Z","102":"2026-07-15T19:00Z","103":"2026-07-18T21:00Z","104":"2026-07-19T19:00Z"}};
const {GRP_DEFS,FIXTURES,TEAM_ALIASES,KO_KICKOFF}=D;

function normNm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
const NAME2ID={}; Object.entries(TEAM_ALIASES).forEach(([id,names])=>names.forEach(n=>{NAME2ID[normNm(n)]=id;}));
const name2id=n=>NAME2ID[normNm(n)]||null;
const FIX_BY_ID={}; FIXTURES.forEach(f=>FIX_BY_ID[f.id]=f);
const FIX_BY_PAIR={}; FIXTURES.forEach(f=>{FIX_BY_PAIR[[f.t1,f.t2].sort().join('|')]=f.id;});

function koNumFor(ts){
  if(!ts)return null;
  const t=Date.parse((''+ts).trim().replace(' ','T').replace(/Z?$/,'Z'));
  if(isNaN(t))return null;
  let best=null,bd=Infinity;
  for(const num in KO_KICKOFF){const d=Math.abs(Date.parse(KO_KICKOFF[num])-t); if(d<bd){bd=d;best=+num;}}
  return bd<=5*3600*1000?best:null;
}

// Build {sc,g,br} from a list of normalised matches:
//   {home,away,hs,as,finished,winner('HOME'|'AWAY'|null),utcDate}
function build(events){
  const sc={}, br={}, groupMatches={};
  for(const ev of events){
    if(!ev.finished)continue;
    const hid=name2id(ev.home), aid=name2id(ev.away);
    if(!hid||!aid)continue;
    const hs=+ev.hs, as=+ev.as;
    if(!Number.isFinite(hs)||!Number.isFinite(as))continue;
    const fid=FIX_BY_PAIR[[hid,aid].sort().join('|')];
    if(fid){ // group-stage match
      const f=FIX_BY_ID[fid];
      sc[fid]= hid===f.t1 ? {h:hs,a:as} : {h:as,a:hs};
      (groupMatches[f.grp]=groupMatches[f.grp]||[]).push({a:hid,b:aid,ga:hs,gb:as});
      continue;
    }
    // knockout match → map to match number by kickoff time
    const num=koNumFor(ev.utcDate);
    if(num){
      const win = ev.winner==='HOME'?hid : ev.winner==='AWAY'?aid : (hs>as?hid:(as>hs?aid:null));
      if(win) br[num]=win;
    }
  }
  const g={};
  Object.entries(groupMatches).forEach(([grp,ms])=>{
    if(ms.length<6||!GRP_DEFS[grp])return;
    const table={}; GRP_DEFS[grp].forEach(t=>table[t.id]={id:t.id,pts:0,gf:0,ga:0});
    ms.forEach(x=>{ if(!table[x.a]||!table[x.b])return;
      table[x.a].gf+=x.ga;table[x.a].ga+=x.gb;table[x.b].gf+=x.gb;table[x.b].ga+=x.ga;
      if(x.ga>x.gb)table[x.a].pts+=3;else if(x.gb>x.ga)table[x.b].pts+=3;else{table[x.a].pts++;table[x.b].pts++;}});
    const h2h=(A,B)=>{let pa=0,pb=0;ms.forEach(x=>{
      if(x.a===A&&x.b===B){if(x.ga>x.gb)pa+=3;else if(x.gb>x.ga)pb+=3;else{pa++;pb++;}}
      else if(x.a===B&&x.b===A){if(x.ga>x.gb)pb+=3;else if(x.gb>x.ga)pa+=3;else{pa++;pb++;}}});return pb-pa;};
    const arr=Object.values(table).sort((A,B)=> B.pts-A.pts || (B.gf-B.ga)-(A.gf-A.ga) || B.gf-A.gf || h2h(A.id,B.id) || A.id.localeCompare(B.id));
    if(arr[0]&&arr[1]) g[grp]={f:arr[0].id,s:arr[1].id};
  });
  return {sc,g,br};
}

async function fromFootballData(){
  const res=await fetch('https://api.football-data.org/v4/competitions/WC/matches',{headers:{'X-Auth-Token':FD_TOKEN}});
  if(!res.ok)throw new Error('football-data '+res.status+' '+await res.text());
  const data=await res.json();
  return (data.matches||[]).map(m=>({
    home:m.homeTeam&&m.homeTeam.name, away:m.awayTeam&&m.awayTeam.name,
    hs:m.score&&m.score.fullTime&&m.score.fullTime.home,
    as:m.score&&m.score.fullTime&&m.score.fullTime.away,
    finished:m.status==='FINISHED',
    winner: m.score&&m.score.winner==='HOME_TEAM'?'HOME':(m.score&&m.score.winner==='AWAY_TEAM'?'AWAY':null),
    utcDate:m.utcDate
  }));
}
const NOT_FINAL=new Set(['ns','not started','1h','2h','ht','live','postp','postponed','tbd','','sched','scheduled']);
async function fromSportsDB(){
  const res=await fetch('https://www.thesportsdb.com/api/v1/json/'+SPORTSDB_KEY+'/eventsseason.php?id=4429&s=2026');
  if(!res.ok)throw new Error('thesportsdb '+res.status);
  const data=await res.json();
  return (data.events||[]).map(ev=>{
    const st=(ev.strStatus||'').trim().toLowerCase();
    const finished=!NOT_FINAL.has(st)&&ev.intHomeScore!=null&&ev.intHomeScore!==''&&ev.intAwayScore!=null&&ev.intAwayScore!=='';
    return {home:ev.strHomeTeam, away:ev.strAwayTeam, hs:+ev.intHomeScore, as:+ev.intAwayScore, finished, winner:null, utcDate:ev.strTimestamp||ev.dateEvent};
  });
}

async function patch(path,obj){
  if(!obj||!Object.keys(obj).length)return;
  const res=await fetch(DB_URL+path,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
  if(!res.ok)throw new Error('PATCH '+path+' -> '+res.status+' '+await res.text());
}

(async()=>{
  let events, source;
  if(FD_TOKEN){ try{ events=await fromFootballData(); source='football-data.org'; }
    catch(e){ console.warn('football-data failed, falling back to TheSportsDB:',e.message); } }
  if(!events){ events=await fromSportsDB(); source='TheSportsDB (fallback)'; }
  const {sc,g,br}=build(events);
  await patch('/results/sc.json',sc);
  await patch('/results/g.json',g);
  await patch('/results/br.json',br);
  console.log('Source:',source,'| wrote',Object.keys(sc).length,'scorelines,',Object.keys(g).length,'group standings,',Object.keys(br).length,'knockout winners');
})().catch(e=>{console.error(e);process.exit(1)});  const sc={}, br={}, groupMatches={};
  events.forEach(ev=>{
    if(!isFinished(ev))return;
    const hid=name2id(ev.strHomeTeam), aid=name2id(ev.strAwayTeam);
    const hs=+ev.intHomeScore, as=+ev.intAwayScore;
    if(isNaN(hs)||isNaN(as))return;
    if(hid&&aid){
      const fid=FIX_BY_PAIR[[hid,aid].sort().join('|')];
      if(fid){ const f=FIX_BY_ID[fid];
        sc[fid]= hid===f.t1 ? {h:hs,a:as} : {h:as,a:hs};
        (groupMatches[f.grp]=groupMatches[f.grp]||[]).push({a:hid,b:aid,ga:hs,gb:as});
        return; }
    }
    const num=koNumFor(ev.strTimestamp||ev.dateEvent);
    if(num&&hid&&aid){ const win=hs>as?hid:(as>hs?aid:null); if(win)br[num]=win; }
  });
  const g={};
  Object.entries(groupMatches).forEach(([grp,ms])=>{
    if(ms.length<6||!GRP_DEFS[grp])return;
    const table={}; GRP_DEFS[grp].forEach(t=>table[t.id]={id:t.id,pts:0,gf:0,ga:0});
    ms.forEach(x=>{ if(!table[x.a]||!table[x.b])return;
      table[x.a].gf+=x.ga;table[x.a].ga+=x.gb;table[x.b].gf+=x.gb;table[x.b].ga+=x.ga;
      if(x.ga>x.gb)table[x.a].pts+=3;else if(x.gb>x.ga)table[x.b].pts+=3;else{table[x.a].pts++;table[x.b].pts++;}});
    const h2h=(A,B)=>{let pa=0,pb=0;ms.forEach(x=>{
      if(x.a===A&&x.b===B){if(x.ga>x.gb)pa+=3;else if(x.gb>x.ga)pb+=3;else{pa++;pb++;}}
      else if(x.a===B&&x.b===A){if(x.ga>x.gb)pb+=3;else if(x.gb>x.ga)pa+=3;else{pa++;pb++;}}});return pb-pa;};
    const arr=Object.values(table).sort((A,B)=> B.pts-A.pts || (B.gf-B.ga)-(A.gf-A.ga) || B.gf-A.gf || h2h(A.id,B.id) || A.id.localeCompare(B.id));
    if(arr[0]&&arr[1]) g[grp]={f:arr[0].id,s:arr[1].id};
  });
  return {sc,g,br};
}

async function patch(path,obj){
  if(!obj||!Object.keys(obj).length)return;
  const res=await fetch(DB_URL+path,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});
  if(!res.ok)throw new Error('PATCH '+path+' -> '+res.status+' '+await res.text());
}

(async()=>{
  const res=await fetch(FEED);
  if(!res.ok)throw new Error('feed '+res.status);
  const data=await res.json();
  const {sc,g,br}=processEvents(data.events||[]);
  // merge each subtree (preserves any manual Organiser entries)
  await patch('/results/sc.json',sc);
  await patch('/results/g.json',g);
  await patch('/results/br.json',br);
  console.log('Updated:',Object.keys(sc).length,'scorelines,',Object.keys(g).length,'group standings,',Object.keys(br).length,'knockout winners');
})().catch(e=>{console.error(e);process.exit(1)});
