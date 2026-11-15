import{C,FACT,newGame,act,endSol,score,find}from"./engine.js";
const $=document.getElementById("app");
let G=null,tool="solar",msg="",title=true,diff="normal",fact="",delta="";
const ERR={NOT_ENOUGH_MC:"Not enough mission credits (MC).",TILE_OCCUPIED:"That tile is taken. Pick an empty one.",NOT_ADJACENT:"New modules must touch the Habitat or another module.",MED_LIMIT:"Only one Med bay is allowed.",OUT_OF_BOUNDS:"That tile is off the map.",CANT_DEMOLISH_HABITAT:"The Habitat can't be demolished.",TILE_EMPTY:"Nothing to demolish there.",NO_FAILURE:"No equipment is failing right now.",NO_LEAK:"There is no leak to patch.",NOTHING_TO_UNDO:"Nothing to undo. You can only undo a build before ending the sol.",GAME_OVER:"The mission is over."};
const INFO={solar:"Makes 14 kWh per sol (25% in storms)",battery:"Stores +50 kWh for storms and nights",o2:"Makes 4.5 kg oxygen. Uses 18 kWh",green:"Makes food and a little oxygen. Uses 14 kWh and water",water:"Makes 12 L water. Uses 16 kWh",recy:"Recycles more water. Uses 6 kWh",shield:"Cuts radiation. Uses no power",med:"Heals crew and softens radiation harm. Uses 6 kWh"};
const save=()=>{try{localStorage.setItem("mars_v2",JSON.stringify(G))}catch(e){}};
const load=()=>{try{const j=JSON.parse(localStorage.getItem("mars_v2"));if(j&&j.sol>=1&&j.sol<=100&&Array.isArray(j.mods)&&Array.isArray(j.hp)&&typeof j.mc==="number"&&j.sched)return j}catch(e){}return null};
const pct=(v,m)=>Math.max(0,Math.min(100,v/m*100));
function run(a){const r=act(G,a);if(r.err)msg=ERR[r.err]||r.err;else{G=r.s;msg="";save()}draw()}
function advance(n){const b=G;let s=G;for(let i=0;i<n&&!s.over;i++){s=endSol(s);const low=[s.o2/150,s.water/350,s.food/120].some(v=>v<.2);if(i<n-1&&(s.ev&&s.ev.some(e=>e!=="resupply")||low))break}
 const f=(a,c)=>{const d=Math.round((a-c)*10)/10;return(d>0?"+":"")+d};G=s;msg="";fact="";
 delta=`Since last time: oxygen ${f(s.o2,b.o2)} kg · water ${f(s.water,b.water)} L · food ${f(s.food,b.food)} kg`;
 for(const e of G.ev||[])if(FACT[e]&&!G.facts[e]){G.facts[e]=1;fact=FACT[e]}save();draw();$.querySelector("#e1")?.focus()}
function power(){const live=G.mods.filter(m=>m.t<=0&&!(G.fail&&G.fail.id===m.id)),n=t=>live.filter(m=>m.type===t).length,d=G.storm>=G.sol?.25:1;
 const gen=n("solar")*14*d,use=12+n("o2")*18+n("recy")*6+n("med")*6+n("water")*16+n("green")*14;return{gen,use}}
function forecast(){const o=[];for(let k=1;k<=3;k++)(G.sched[G.sol+k]||[]).forEach(x=>{if(x.t==="storm")o.push({k,t:"storm"});if(x.t==="flare"&&k<=2)o.push({k,t:"flare"})});return o}
function coach(){const fc=forecast(),has=t=>G.mods.some(m=>m.type===t),u=G.lastUse,days=(v,x)=>x>0?v/x:99;const p=power();
 const st=fc.find(f=>f.t==="storm");if(st)return["alert",`Dust storm in ${st.k} sol${st.k>1?"s":""}. Solar output will drop to 25%. Build batteries or extra solar now.`];
 const fl=fc.find(f=>f.t==="flare");if(fl)return["alert",`Solar flare in ${fl.k} sol${fl.k>1?"s":""}. Turn on Shelter the sol before it hits (it halves greenhouse food, so turn it off after).`];
 if(G.o2<150&&days(G.o2,u.o2)<4||G.water<350&&days(G.water,u.water)<4||days(G.food,u.food)<4)return["alert","A supply will run out in under 4 sols. Check the red or yellow bars and build what makes it."];
 if(G.fail)return["alert","Equipment failed. It stays offline 3 sols, or pay 20 MC to repair it in 1."];
 if(G.leak>=G.sol)return["alert","Habitat leak: oxygen is draining 5x faster. Patch it for 25 MC."];
 if(G.sol<=8&&!has("o2"))return["","Step 1: choose Oxygen generator below, then tap an empty tile touching the H in the middle. It takes 3 sols to build."];
 if(G.sol<=8&&p.gen<p.use+18)return["","Step 2: power. Your arrays make "+p.gen+" kWh but life support needs more. Build another Solar array next to a module."];
 if(p.gen<p.use)return["alert",`Power is short: making ${p.gen}, using ${p.use} kWh per sol. Add Solar arrays or the lowest-priority machines will shut down.`];
 if(G.sol<=15&&!has("green"))return["","Food will run out eventually. A Greenhouse makes food and a little oxygen, but needs power and water."];
 if(!has("shield")&&G.sol>8)return["","Radiation builds up slowly all game. A Regolith shield costs no power and cuts it."];
 return["","Things look steady. Press End sol, or Fast-forward 5 to skip quiet days. It stops when something happens."]}
function stock(n,v,max,use,unit,why){const dl=use>0?Math.floor(v/use):99,c=dl<=3?"cr":dl<=7?"lo":"",ic=dl<=3?"⚠ ":dl<=7?"▲ ":"";
 return`<div class="st" title="${why}"><span>${n}</span><span class="meter ${c}" role="img" aria-label="${n}: ${Math.round(v)} ${unit}, ${dl} days left"><i style="width:${pct(v,max)}%"></i></span><span>${ic}${Math.round(v)} ${unit}<small> (${dl>98?"safe":dl+"d left"})</small></span></div>`}
function report(){const sc=score(G),fl=G.flares.slice().sort((a,b)=>b.dose-a.dose)[0],W=560,H=160,ln=(k,mx,c)=>`<polyline fill="none" stroke="${c}" stroke-width="2" points="${G.hist.map(h=>`${h.sol/100*W},${H-pct(h[k],mx)/100*H}`).join(" ")}"/>`;
 const cs=[["Power",`Power fell short on ${G.powerShort} sols.`,"Add solar and batteries before storms. Shortfalls cascade.",FACT.storm],["Oxygen",G.o2Low?`Oxygen first dropped under 7 days of supply on Sol ${G.o2Low}.`:"Oxygen stayed above 7 days of supply.","Reserves beat perfect efficiency.",FACT.o2],["Radiation",fl?`Largest radiation hit: the Sol ${fl.sol} flare (${fl.sheltered?"you sheltered":"you were not sheltering"}). Total dose ${G.dose}.`:`Total dose ${G.dose}. No flare hit.`,"Radiation is cumulative. Shield early and shelter during flares.",FACT.flare]];
 const tip=G.powerShort>10?"Build two more solar arrays and a battery before Sol 30.":G.dose>60?"Add regolith shields earlier.":"Build a Med bay and bigger reserves.";
 return`<div class="card"><h2>${G.won?"Mission complete":"Mission failed"}: ${sc.rank}</h2><p style="font-size:1.4rem;margin:.2em 0"><b>${sc.t}</b> / 1000 · ${G.hp.filter(h=>h>0).length} of 4 crew alive</p>${cs.map(c=>`<div class="fact"><b>${c[0]}.</b> ${c[1]}<br><small>${c[2]} ${c[3]}</small></div>`).join("")}
 <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Oxygen, water, food and battery over the mission"><rect width="${W}" height="${H}" fill="none" stroke="var(--line)"/>${ln("o2",150,"#2a7fbf")}${ln("water",350,"#2d6a4f")}${ln("food",120,"#b8431f")}${ln("bat",100,"#a86a00")}</svg>
 <small>Oxygen (blue), water (green), food (rust), battery (gold).</small><p><b>Try next time:</b> ${tip}</p><button class="p" id="again">Play again</button></div>`}
function draw(){
 if(title){$.innerHTML=`<div class="card"><h2>Keep four astronauts alive for 100 sols</h2><ol class="steps"><li>Build modules next to your Habitat to make power, oxygen, water and food.</li><li>Press <b>End sol</b> to run one Martian day. Watch the bars.</li><li>Prepare for storms and flares shown in the forecast.</li></ol>
 <p><small>Every choice costs something elsewhere. A power shortage becomes an oxygen shortage. About 10 to 15 minutes. Your game saves automatically.</small></p>
 <label>Difficulty <select id="diff"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label> <label>Seed <input id="seed" inputmode="numeric" placeholder="random" size="8"></label> <button class="p" id="play">Start mission</button>${load()?' <button id="cont">Continue saved game</button>':""}</div>`;
  $.querySelector("#diff").value=diff;$.querySelector("#play").onclick=()=>{diff=$.querySelector("#diff").value;const v=parseInt($.querySelector("#seed").value);G=newGame(Number.isFinite(v)?v:Math.floor(Date.now()%100000),diff);title=false;fact="";delta="";save();draw()};
  const c=$.querySelector("#cont");if(c)c.onclick=()=>{G=load();title=false;draw()};return}
 if(G.over){$.innerHTML=report();$.querySelector("#again").onclick=()=>{title=true;draw()};return}
 const al=G.hp.filter(h=>h>0).length,u=G.lastUse,storm=G.storm>=G.sol,p=power(),[ck,ct]=coach(),cost=C.mod[tool]?.c;
 let tiles="";for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){const m=find(G,x,y);let inner="+",cl="t";
  if(m){const hab=m.type==="hab",d=hab?{n:"Habitat",i:"H"}:C.mod[m.type],off=G.fail&&G.fail.id===m.id;cl+=" m"+(m.t>0?" b":"")+(off?" x":"");inner=`<b aria-hidden="true">${d.i}</b>${d.n.split(" ")[0]}${m.t>0?` (${m.t})`:""}${off?" OFFLINE":""}`}
  else if(tool!=="demo"&&G.mods.some(q=>Math.abs(q.x-x)+Math.abs(q.y-y)===1))cl+=" ok";else inner="";
  tiles+=`<button class="${cl}" data-x="${x}" data-y="${y}" aria-label="Tile ${x+1},${y+1}: ${m?(m.type==="hab"?"Habitat":C.mod[m.type].n):"empty"}">${inner}</button>`}
 $.innerHTML=`<div class="coach ${ck}" role="status">${ck?"⚠ ":"💡 "}${ct}</div>
 <div class="card bar"><b>Sol ${G.sol} / 100</b><span title="Mission credits to spend on modules">MC ${G.mc}</span><span title="Battery charge">🔋 ${Math.round(G.bat)} kWh${G.wasted>0?` (${Math.round(G.wasted)} wasted: build a battery)`:""}</span>
  <label>Rations <select id="rat"><option value="1">Full</option><option value="0.6">Half (less food, slight health cost)</option></select></label><button id="sh" aria-pressed="${G.shelter}" title="Cuts flare radiation by 80% but halves greenhouse food">${G.shelter?"🛡 Sheltering (on)":"Shelter: off"}</button>${storm?"<b>⚠ Dust storm</b>":""}</div>
 <div class="lay"><div class="card"><h2>Outpost map</h2><div class="grid">${tiles}</div>
  <h2 style="margin-top:12px">Build ${C.mod[tool]?C.mod[tool].n:"(demolish mode)"}</h2><div class="mods" role="group" aria-label="Build tool">${Object.entries(C.mod).map(([k,d])=>`<button data-tool="${k}" aria-pressed="${tool===k}" ${G.mc<d.c?"disabled":""}>${d.i} ${d.n} · ${d.c} MC<small>${INFO[k]}</small></button>`).join("")}<button data-tool="demo" aria-pressed="${tool==="demo"}">✕ Demolish<small>Refunds half</small></button></div>
  <p class="msg" role="alert">${msg}</p></div>
 <div class="card"><h2>Status</h2>${stock("Oxygen",G.o2,150,u.o2,"kg","Oxygen lasts this many sols at today's use.")}${stock("Water",G.water,350,u.water,"L","Water lasts this many sols. Recyclers reduce use.")}${stock("Food",G.food,120,u.food,"kg","Food lasts this many sols at your ration level.")}
  <p class="mono" style="font-size:.88rem;margin:6px 0" title="Solar output vs. what your machines need">Power: making ${p.gen} · using ${p.use} kWh/sol ${p.gen<p.use?"▲ short":"✓"}</p>
  <p class="mono" style="font-size:.88rem;margin:6px 0">Crew ${al}/4 · Health ${G.hp.map(Math.round).join(", ")} · Radiation dose ${G.dose}</p>
  <p><small>Coming: ${forecast().map(f=>`${f.t==="storm"?"dust storm":"solar flare"} in ${f.k}`).join("; ")||"nothing in the next 3 sols"}</small></p>
  <div style="display:flex;flex-wrap:wrap;gap:6px"><button class="p" id="e1">End sol <span class="kbd">E</span></button><button id="e5" title="Skips up to 5 sols. Stops early when an event starts or a supply drops below 20%.">Fast-forward 5</button><button id="un">Undo build</button>
  ${G.fail?'<button id="rp">Repair 20 MC</button>':""}${G.leak>=G.sol?'<button id="pt">Patch leak 25 MC</button>':""}<button id="rs">Menu</button></div><p class="delta">${delta}</p></div></div>
 ${fact?`<div class="card fact">${fact}</div>`:""}<div class="card"><h2>Log</h2><ol class="log" aria-live="polite" reversed>${G.log.slice(0,12).map(l=>`<li>${l}</li>`).join("")}</ol></div>`;
 $.querySelector("#rat").value=String(G.ration);$.querySelector("#rat").onchange=e=>run({k:"ration",v:parseFloat(e.target.value)});$.querySelector("#sh").onclick=()=>run({k:"shelter"});
 $.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{tool=b.dataset.tool;draw()});
 $.querySelectorAll(".t").forEach(b=>b.onclick=()=>{const x=+b.dataset.x,y=+b.dataset.y;run(tool==="demo"?{k:"demolish",x,y}:{k:"build",type:tool,x,y})});
 $.querySelector("#e1").onclick=()=>advance(1);$.querySelector("#e5").onclick=()=>advance(5);$.querySelector("#un").onclick=()=>run({k:"undo"});
 const rp=$.querySelector("#rp");if(rp)rp.onclick=()=>run({k:"repair"});const pt=$.querySelector("#pt");if(pt)pt.onclick=()=>run({k:"patch"});
 $.querySelector("#rs").onclick=()=>{if(confirm("Go to the menu? Your game stays saved."))  {title=true;draw()}}}
addEventListener("keydown",e=>{if(!title&&G&&!G.over&&e.key.toLowerCase()==="e"&&!/SELECT|INPUT|TEXTAREA/.test(e.target.tagName)&&!e.ctrlKey&&!e.metaKey)advance(1)});
const s=load();if(s){G=s}draw();
