const $ = s => document.querySelector(s);
const defaults = {memes:['我的刀盾','闪身步','胆子肥嘟嘟','中国人能飞','胡迪渲染大赛','春秋肠','OMG你吓到我了'],formats:['PPT','个人网站','小工具','小程序','视频','小游戏','表情包','海报']};
const validPool = a => Array.isArray(a)&&a.length>=4&&a.length<=50&&new Set(a).size===a.length&&a.every(s=>typeof s==='string'&&s.trim()&&s.length<=16);
let pools = structuredClone(defaults), busy=false, count=0, sound=false, audio, result=null, stopRequested=false, jackpotTimer;
try { const p=JSON.parse(localStorage.getItem('idea-pools-2026-09'));if(p&&validPool(p.memes)&&validPool(p.formats)) pools=p;}catch{}
// Preserve short custom pools while adding enough distinct entries for safe spacing.
try {
 const saved=JSON.parse(localStorage.getItem('idea-pools-2026-09'));
 if(saved) for(const key of ['memes','formats']) {
  if(Array.isArray(saved[key])&&saved[key].length>=2&&saved[key].length<=50&&saved[key].every(x=>typeof x==='string'&&x.trim()&&x.length<=16)) {
   const entries=[...new Set(saved[key].map(x=>x.trim()))];
   for(const entry of defaults[key]) {if(entries.length>=4)break;if(!entries.includes(entry))entries.push(entry);}
   if(validPool(entries)) pools[key]=entries;
  }
 }
}catch{}
function item(text){const el=document.createElement('div');el.className='reel-item';el.textContent=text; if(text.length>4) el.style.fontSize=`min(var(--reel-font, 29px), calc((100cqw - 24px) / ${text.length}))`;return el;}
function display(reel,arr,index){const strip=$(reel+' .strip');strip.replaceChildren(...[-1,0,1].map(n=>item(arr[(index+n+arr.length)%arr.length])));strip.style.transform='translateY(0)';$(reel).dataset.current=arr[index];}
function reset(){display('#memeReel',pools.memes,0);display('#formatReel',pools.formats,0);}
function beep(freq=440,duration=.045,vol=.025){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(vol,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function randomIndex(length){const a=new Uint32Array(1);const limit=Math.floor(4294967296/length)*length;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%length;}
// A cyclic strip has no patched tail: even the target and its neighbours follow
// the same order, so a repeated entry always has at least three entries between.
function buildSequence(arr,start,steps){
 return Array.from({length:steps+5},(_,i)=>arr[(start+i-2+arr.length)%arr.length]);
}
function roll(reel,arr,target,duration){
 return new Promise(resolve=>{
  const root=$(reel),strip=$(reel+' .strip');
  const startIndex=Math.max(0,arr.indexOf(root.dataset.current));
  let steps=Math.ceil(36/arr.length)*arr.length+(target-startIndex+arr.length)%arr.length;
  strip.replaceChildren(...buildSequence(arr,startIndex,steps).map(item));
  root.dataset.phase='rolling';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started=performance.now(),from=0,position=0,last=-1,shortened=false;
  let travelDuration=reduced?180:duration;
  const paint=pos=>{strip.style.transform=`translateY(${-(1+pos)*root.clientHeight/3}px)`;};
  paint(0);
  function finish(){display(reel,arr,target);root.dataset.phase='idle';beep(reel==='#memeReel'?523:784,.13,.035);resolve();}
  function settle(){
   if(reduced){finish();return;}
   root.dataset.phase='settling';
   // Three diminishing forward/backward oscillations, measured in row heights.
   const points=[[0,0],[.15,.19],[.32,-.10],[.49,.057],[.65,-.030],[.79,.014],[.90,-.006],[1,0]];
   const began=performance.now();let segment=0;
   beep(95,.07,.025);
   function bounce(now){
    const t=Math.min((now-began)/760,1);
    while(segment<points.length-2&&t>points[segment+1][0]){segment++;if(segment<5)beep(100+segment*20,.025,.018/(segment+1));}
    const [t0,v0]=points[segment],[t1,v1]=points[segment+1];
    const u=Math.max(0,Math.min((t-t0)/(t1-t0),1));
    const easing=(1-Math.cos(Math.PI*u))/2;
    paint(steps+v0+(v1-v0)*easing);
    if(t<1)requestAnimationFrame(bounce);else finish();
   }
   requestAnimationFrame(bounce);
  }
  function frame(now){
   if(stopRequested&&!shortened&&!reduced&&travelDuration-(now-started)>1000){
    shortened=true;from=position;started=now;travelDuration=reel==='#memeReel'?1600:2100;
    const minimum=Math.ceil(position)+4;
    const delta=(target-startIndex+arr.length)%arr.length;
    steps=minimum+((delta-minimum)%arr.length+arr.length)%arr.length;
    strip.replaceChildren(...buildSequence(arr,startIndex,steps).map(item));
   }
   const t=Math.min((now-started)/travelDuration,1);
   // A quadratic ease lowers the speed steadily instead of revealing the
   // destination through an abrupt last-second brake.
   position=from+(steps-from)*(1-Math.pow(1-t,2));paint(position);
   const step=Math.floor(position);
   if(step!==last){if(reel==='#memeReel')beep(140+(step%20)*5,.025,.009);last=step;}
   if(t<1)requestAnimationFrame(frame);else settle();
  }
  requestAnimationFrame(frame);
 });
}
// Optional target indexes allow a future control panel to select exact outcomes.
async function spin(target={}){if(busy)return false;const memes=[...pools.memes], formats=[...pools.formats];
const preset=target.memeIndex==null&&target.formatIndex==null&&count<2 ? ['我的刀盾','闪身步'][count] : null;
if(preset){if(!memes.includes(preset))memes.push(preset);if(!formats.includes('个人网站'))formats.push('个人网站');}
const m=target.memeIndex??(preset?memes.indexOf(preset):randomIndex(memes.length)),f=target.formatIndex??(preset?formats.indexOf('个人网站'):randomIndex(formats.length));if(!Number.isInteger(m)||m<0||m>=memes.length||!Number.isInteger(f)||f<0||f>=formats.length)throw new RangeError('目标索引超出词库范围');busy=true;stopRequested=false;clearTimeout(jackpotTimer);$('.arcade').classList.remove('jackpot');$('#spin').disabled=false;$('#spin').setAttribute('aria-label','暂停滚轮');$('.machine').classList.remove('landed');$('.machine').classList.add('spinning');$('#status').textContent='灵感碰撞中…';$('#spin strong').textContent='暂停';$('#spin small').textContent='STOP';await Promise.all([roll('#memeReel',memes,m,4200),roll('#formatReel',formats,f,5200)]);result={meme:memes[m],format:formats[f]};count++;$('#status').textContent=result.meme+' + '+result.format;$('.machine').classList.add('landed');$('.arcade').classList.add('jackpot');jackpotTimer=setTimeout(()=>$('.arcade').classList.remove('jackpot'),2300);busy=false;$('#spin').disabled=false;$('.machine').classList.remove('spinning');$('#spin strong').textContent='开始';$('#spin small').textContent='START';$('#spin').setAttribute('aria-label','开始抽取');return result;}
function handleSpin(){if(!busy){spin();return;}stopRequested=true;$('#spin').disabled=true;$('#spin strong').textContent='停靠';$('#status').textContent='正在减速…';}
$('#spin').addEventListener('click',handleSpin);document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','TEXTAREA','BUTTON','A'].includes(document.activeElement.tagName)){e.preventDefault();handleSpin();}});
$('#sound').onclick=()=>{sound=!sound;$('#sound').innerHTML='<span>♪</span> 音效'+(sound?'开':'关');$('#sound').setAttribute('aria-pressed',sound);if(sound)beep(660,.08);};
window.ideaMachine={spin,getOptions:()=>structuredClone(pools)};reset();
// Keep each row exactly one third of the window at every viewport size.
const syncReelSize=()=>$('.machine').style.setProperty('--row-height',`${$('#memeReel').clientHeight/3}px`);
new ResizeObserver(syncReelSize).observe($('#memeReel'));syncReelSize();

// A single clockwise index continues through all four sides. Because the
// animation repeats every 44 bulbs across an 88-bulb perimeter, two light
// heads chase each other around the cabinet like paired arcade snakes.
let perimeterIndex=0;
for(const side of ['top','right','bottom','left']){
 const holder=$('.bulbs.'+side),total=['top','bottom'].includes(side)?28:16;
 for(let i=0;i<total;i++){const bulb=document.createElement('i');bulb.className='bulb';bulb.style.setProperty('--i',perimeterIndex++);holder.append(bulb);}
}
