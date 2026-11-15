

// Pure game engine: no DOM, seeded RNG, deterministic.
const C={cols:7,rows:5,mc:{easy:1500,normal:1200,hard:1000},crew:4,
 mod:{solar:{n:"Solar array",c:80,p:0,tt:2,i:"☀"},battery:{n:"Battery bank",c:60,p:0,tt:2,i:"▮"},o2:{n:"Oxygen generator",c:120,p:18,tt:3,i:"O₂"},
 green:{n:"Greenhouse",c:150,p:14,tt:3,i:"❀"},water:{n:"Water extractor",c:130,p:16,tt:2,i:"💧"},recy:{n:"Water recycler",c:100,p:6,tt:2,i:"♻"},
 shield:{n:"Regolith shield",c:90,p:0,tt:2,i:"▤"},med:{n:"Med bay",c:140,p:6,tt:2,i:"+"}},
 prio:["o2","recy","med","water","green"]};
const FACT={storm:"Fact: Opportunity rover went silent during the 2018 global dust storm, which blocked the sunlight its solar panels needed.",
 flare:"Fact: Instruments on Curiosity have measured surface radiation of roughly 0.6 millisieverts per day. Shielding and shelter reduce it.",
 o2:"Fact: The MOXIE experiment on Perseverance made oxygen from the Martian atmosphere.",
 fail:"Equipment fails. Spare power and reserves buy you time.",leak:"A leak multiplies oxygen loss by 5 until patched.",blight:"Blight halves greenhouse output for 6 sols.",ice:"Ice found: +40 L water."};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function schedule(seed,diff){const r=rng(seed),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),S={},used=new Set([...Array(10)].map((_,i)=>i+1));
 const hi=diff==="hard",lo=diff==="easy",cnt=(a,b)=>lo?a:hi?b:ri(a,b);
 const add=(t,lo2,hi2,n,gap,dur)=>{const got=[];for(let k=0,tries=0;k<n&&tries<400;tries++){const s=ri(lo2,hi2);if(used.has(s)||got.some(g=>Math.abs(g-s)<gap))continue;
  got.push(s);used.add(s);(S[s]=S[s]||[]).push({t,d:dur?ri(4,8):0});k++}};
 add("storm",12,90,cnt(2,3),20,1);add("flare",11,100,cnt(2,3),15);add("fail",11,100,cnt(2,4),1);add("leak",11,100,cnt(1,2),1);add("blight",31,100,cnt(1,2),1);add("ice",11,100,1,1);
 for(let s=10;s<=90;s+=10)(S[s]=S[s]||[]).push({t:"resupply"});return S}
function newGame(seed,diff){const mk=(id,type,x,y,t)=>({id,type,x,y,t});
 return{seed,diff,sol:1,over:false,mc:C.mc[diff],o2:150,water:350,food:120,bat:80,dose:0,ration:1,shelter:false,hp:[100,100,100,100],
 mods:[mk(1,"hab",3,2,0),mk(2,"solar",2,2,0),mk(3,"solar",4,2,0)],nid:4,sched:schedule(seed,diff),storm:0,blight:0,leak:0,fail:null,flare:false,
 log:[],hist:[],zero:0,powerShort:0,flares:[],o2Low:null,facts:{},lastUse:{o2:3.5,water:3,food:2.5},wasted:0,undo:null}}
const clone=s=>JSON.parse(JSON.stringify(s));
const find=(s,x,y)=>s.mods.find(m=>m.x===x&&m.y===y);
function act(s,a){if(s.over)return{err:"GAME_OVER"};s=clone(s);
 if(a.k==="build"){const d=C.mod[a.type];if(!d)return{err:"BAD_MODULE"};const{x,y}=a;
  if(x<0||y<0||x>=C.cols||y>=C.rows)return{err:"OUT_OF_BOUNDS"};if(find(s,x,y))return{err:"TILE_OCCUPIED"};
  if(!s.mods.some(m=>Math.abs(m.x-x)+Math.abs(m.y-y)===1))return{err:"NOT_ADJACENT"};
  if(a.type==="med"&&s.mods.some(m=>m.type==="med"))return{err:"MED_LIMIT"};if(s.mc<d.c)return{err:"NOT_ENOUGH_MC"};
  s.mc-=d.c;s.mods.push({id:s.nid++,type:a.type,x,y,t:d.tt});s.undo=s.mods[s.mods.length-1].id;return{s}}
 if(a.k==="undo"){const m=s.mods.find(m=>m.id===s.undo);if(!m)return{err:"NOTHING_TO_UNDO"};s.mc+=C.mod[m.type].c;s.mods=s.mods.filter(q=>q!==m);s.undo=null;return{s}}
 if(a.k==="demolish"){const m=find(s,a.x,a.y);if(!m)return{err:"TILE_EMPTY"};if(m.type==="hab")return{err:"CANT_DEMOLISH_HABITAT"};
  s.mc+=Math.floor(C.mod[m.type].c/2);s.mods=s.mods.filter(q=>q!==m);return{s}}
 if(a.k==="ration"){s.ration=a.v;return{s}}if(a.k==="shelter"){s.shelter=!s.shelter;return{s}}
 if(a.k==="repair"){if(!s.fail)return{err:"NO_FAILURE"};if(s.mc<20)return{err:"NOT_ENOUGH_MC"};s.mc-=20;s.fail.until=Math.min(s.fail.until,s.sol);return{s}}
 if(a.k==="patch"){if(s.leak<s.sol)return{err:"NO_LEAK"};if(s.mc<25)return{err:"NOT_ENOUGH_MC"};s.mc-=25;s.leak=0;return{s}}
 return{err:"UNKNOWN_ACTION"}}
const act_=m=>m.t<=0;
function endSol(s0){let s=clone(s0);if(s.over)return s;const sol=s.sol,L=[],ev=[];s.undo=null;
 s.mods.forEach(m=>{if(m.t>0)m.t--});s.flare=false;
 for(const e of s.sched[sol]||[]){ev.push(e.t);
  if(e.t==="storm"){s.storm=sol+e.d-1;L.push(`Dust storm begins for ${e.d} sols. Solar output drops to 25%.`)}
  else if(e.t==="flare"){s.flare=true;L.push("Solar flare hits.")}
  else if(e.t==="fail"){const c=s.mods.filter(m=>m.type!=="hab"&&act_(m));if(c.length){const m=c[(sol*7+s.seed)%c.length];s.fail={id:m.id,until:sol+2};L.push(`Equipment failure: ${C.mod[m.type].n} offline for 3 sols.`)}}
  else if(e.t==="leak"){s.leak=sol+2;L.push("Habitat leak: oxygen loss x5 for 3 sols.")}
  else if(e.t==="blight"){s.blight=sol+5;L.push("Crop blight: greenhouse output halved for 6 sols.")}
  else if(e.t==="ice"){s.water+=40;L.push("Ice discovered: +40 L water.")}
  else if(e.t==="resupply"){s.mc+=80;s.food+=10;L.push("Resupply: +80 MC, +10 kg food.")}}
 const storm=s.storm>=sol,d=storm?.25:1,blight=s.blight>=sol?.5:1,shel=s.shelter?.5:1,leakOn=s.leak>=sol;
 if(s.fail&&s.fail.until<sol)s.fail=null;
 const live=s.mods.filter(m=>act_(m)&&!(s.fail&&s.fail.id===m.id)),of=t=>live.filter(m=>m.type===t);
 const G=of("solar").length*14*d,cap=100+50*of("battery").length;let rem=s.bat+G;const f={},fs=(t)=>f[t]||0;
 const take=(k,dem)=>{const r=Math.min(dem,rem);rem-=r;return dem?r/dem:1};
 f.hab=take("hab",12);let short=f.hab<1;
 for(const t of C.prio){f[t]=0;for(const m of of(t)){const x=take(t,C.mod[t].p);f[t]+=x;if(x<1&&t!=="green"&&t!=="water")short=true}}
 const wasted=Math.max(0,rem-cap);s.bat=Math.min(cap,Math.max(0,rem));s.wasted=wasted;if(short)s.powerShort++;
 const alive=s.hp.filter(h=>h>0).length;
 const o2p=4.5*fs("o2")+.6*fs("green"),wp=12*fs("water"),fp=1.1*fs("green")*blight*shel;
 const R=Math.min(.95,.6+.25*fs("recy")),ou=.84*alive+(leakOn?.75:.15),wu=3*alive*(1-R)+2.5*fs("green"),fu=.62*alive*(s.ration===1?1:.6);
 const fsh={};const upd=(k,p,u)=>{let n=s[k]+p-u;fsh[k]=0;if(n<0){fsh[k]=u?-n/u:0;n=0;s.zero+=0}s[k]=n;return n===0};
 const z=[upd("o2",o2p,ou),upd("water",wp,wu),upd("food",fp,fu)];if(z.some(Boolean))s.zero++;
 s.lastUse={o2:ou,water:wu,food:fu};
 if(s.o2<s.lastUse.o2*7&&s.o2Low===null)s.o2Low=sol;
 const shields=of("shield").length,sm=1-Math.min(.8,.2+.12*shields);let dose=sm;
 if(s.flare){const fd=25*sm*(s.shelter?.2:1);dose+=fd;s.flares.push({sol,dose:fd,sheltered:s.shelter})}
 s.dose+=dose;const med=of("med").length>0,rp=.05*Math.max(0,s.dose-60)*(1-.3*(med?1:0));
 s.hp=s.hp.map(h=>{if(h<=0)return 0;const p=40*fsh.o2+20*fsh.water+10*fsh.food+8*(1-f.hab)+rp+(s.ration===1?0:1.5);
  return Math.max(0,Math.min(100,p===0?h+2+(med?3:0):h-p))});
 const r2=v=>Math.round(v*100)/100;["o2","water","food","bat","dose","mc"].forEach(k=>{s[k]=r2(s[k]);if(!Number.isFinite(s[k]))s[k]=0});s.hp=s.hp.map(r2);
 s.hist.push({sol,o2:s.o2,water:s.water,food:s.food,bat:s.bat});
 s.log.unshift(`Sol ${sol}: ${L.concat(short?["Power fell short."]:[],fsh.o2?["Oxygen ran out!"]:[],fsh.water?["Water ran out!"]:[],fsh.food?["Food ran out!"]:[]).join(" ")||"Quiet sol."}`);
 s.ev=ev;const dead=s.hp.filter(h=>h<=0).length;
 if(dead>=2){s.over=true;s.won=false}else if(sol>=100){s.over=true;s.won=s.hp.filter(h=>h>0).length>=3}else s.sol++;
 return s}
function score(s){const al=s.hp.filter(h=>h>0),av=al.length?al.reduce((a,b)=>a+b,0)/al.length:0,u=s.lastUse;
 const res=Math.min(s.o2/u.o2,s.water/u.water,s.food/u.food);
 const p={surv:Math.min(400,100*al.length),hp:av/100*150,rad:150*(1-Math.min(1,s.dose/120)),res:150*Math.min(1,res/30),sup:s.zero===0?150:Math.max(0,150*(1-s.zero/20))};
 let t=Math.round(Object.values(p).reduce((a,b)=>a+b,0));const rank=!s.won?"Mission Lost":t>=850?"Mars Pioneer":t>=650?"Outpost Commander":t>=400?"Survivor":"Mission Lost";return{t,rank,res}}

export{C,FACT,newGame,act,endSol,score,schedule,find};
