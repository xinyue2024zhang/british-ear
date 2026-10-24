const $ = s => document.querySelector(s);
const storeKey = "british-ear-progress-v1";
const defaultStats = () => ({attempts:0,correct:0,mistakes:[],completed:0,streak:0,lastDay:""});
function loadStats(){
 try{
  const saved=JSON.parse(localStorage.getItem(storeKey)||"null");
  if(!saved||typeof saved!=="object"||Array.isArray(saved))return defaultStats();
  return {
   attempts:Number.isFinite(saved.attempts)&&saved.attempts>=0?saved.attempts:0,
   correct:Number.isFinite(saved.correct)&&saved.correct>=0?saved.correct:0,
   mistakes:Array.isArray(saved.mistakes)?saved.mistakes.filter(id=>typeof id==="string"):[],
   completed:Number.isFinite(saved.completed)&&saved.completed>=0?saved.completed:0,
   streak:Number.isFinite(saved.streak)&&saved.streak>=0?saved.streak:0,
   lastDay:typeof saved.lastDay==="string"?saved.lastDay:""
  };
 }catch{return defaultStats()}
}
const state = {mode:"dictation",source:"all",level:"all",session:[],index:0,checked:false,attempted:false,revealed:false,repeatsLeft:0,repeatIndex:0,repeatTimer:null,stats:loadStats()};
const audio = $("#audioPlayer");

function classifyTopic(text){
 const s=text.toLowerCase();
 const groups={
  "Food & drink":["food","tea","egg","beef","lamb","rice","juice","lemon","dish","farm","corn","fish"],
  "Nature & weather":["wind","cloud","sea","rain","snow","sun","river","spring","leaf","leaves","birch","fire"],
  "People & relationships":["girl","boy","woman","man","friend","people","rider","navy","she ","he ","her ","his "],
  "Everyday life":["clothes","money","game","news","note","carpet","screen","ring","wash","wear","morning","evening"],
  "Objects & actions":["stick","chart","lock","coin","force","move","write","paste","soap","hoist","weave","struck"]
 };
 const tokens=new Set(s.match(/[a-z']+/g)||[]);
 for(const [topic,words] of Object.entries(groups))if(words.some(word=>tokens.has(word.trim())))return topic;
 return "Everyday life";
}
function classifyLength(text){const n=normalise(text).split(" ").filter(Boolean).length;return n<=6?"Short":n<=9?"Medium":"Long"}
window.SENTENCES=window.SENTENCES.map(q=>({...q,topic:q.topic||classifyTopic(q.text),length:q.length||classifyLength(q.text)}));

function normalise(text){return text.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g," ").trim().replace(/\s+/g," ")}
function shuffle(items){return [...items].sort(()=>Math.random()-.5)}
function save(){localStorage.setItem(storeKey,JSON.stringify(state.stats));renderStats()}
function current(){return state.session[state.index]}
function makeSession(){
  let pool=window.SENTENCES.filter(x=>state.level==="all"||x.level===state.level);
  const topic=$("#topicSelect").value,length=$("#lengthSelect").value;
  if(state.source!=="all")pool=pool.filter(x=>x.source===state.source);
  if(topic!=="all")pool=pool.filter(x=>x.topic===topic);
  if(length!=="all")pool=pool.filter(x=>x.length===length);
  if($("#mistakesOnly").checked) pool=pool.filter(x=>state.stats.mistakes.includes(x.id));
  if(!pool.length){alert("No sentences match your current filters.");return}
  state.session=shuffle(pool).slice(0,Math.min(Number($("#sessionSize").value),pool.length));state.index=0;state.checked=false;renderQuestion();
}
function renderQuestion(){
  const q=current(); if(!q)return;
  clearTimeout(state.repeatTimer);audio.pause();state.repeatsLeft=0;audio.src=q.audio;audio.playbackRate=Number($("#speedSelect").value);
  $("#questionMeta").textContent=`${q.level} · ${q.topic} · ${q.length} · ${q.accent.toUpperCase()}`;$("#currentNumber").textContent=state.index+1;$("#sessionTotal").textContent=state.session.length;
  $("#progressBar").style.width=`${((state.index+1)/state.session.length)*100}%`;$("#answerInput").value="";$("#answerInput").disabled=false;
  $("#feedback").className="feedback hidden";$("#submitButton").textContent="Check answer";$("#revealButton").textContent=state.mode==="listening"?"Show transcript":"Show answer";state.checked=false;state.attempted=false;state.revealed=false;
  const listening=state.mode==="listening";
  $("#answerSection").classList.toggle("hidden",listening);$("#listeningPanel").classList.toggle("hidden",!listening);$("#submitButton").classList.toggle("hidden",listening);$("#nextButton").classList.toggle("hidden",!listening);
  $("#shortcutText").textContent=listening?"Enter: next · Space: play · F2: transcript":"Enter: check · Space outside the text box: play · F2: answer";
  $("#audioHint").textContent=listening?"Listen at your own pace. Show the transcript when you need it.":"Press Space outside the text box to play";
  setTimeout(()=>play(),250);if(!listening)$("#answerInput").focus();
}
function play(){
 clearTimeout(state.repeatTimer);const total=Number($("#repeatSelect").value);state.repeatsLeft=total;state.repeatIndex=1;playCurrent(total);
}
function playCurrent(total){
 audio.playbackRate=Number($("#speedSelect").value);audio.currentTime=0;
 $("#playIcon").textContent="❚❚";$("#audioTitle").textContent=total>1?`Playing ${state.repeatIndex}/${total}`:"Playing";
 const started=audio.play();
 if(started)started.catch(()=>{clearTimeout(state.repeatTimer);state.repeatsLeft=0;$("#playIcon").textContent="▶";$("#audioTitle").textContent="Click to play audio"});
}
audio.addEventListener("ended",()=>{const total=Number($("#repeatSelect").value);state.repeatsLeft--;if(state.repeatsLeft>0){state.repeatIndex++;$("#audioTitle").textContent=`Replaying shortly ${state.repeatIndex}/${total}`;state.repeatTimer=setTimeout(()=>playCurrent(total),650)}else{$("#playIcon").textContent="▶";$("#audioTitle").textContent="Listen again"}});
function escapeHtml(text){return text.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}
function diff(answer,target){
 const a=normalise(answer).split(" ").filter(Boolean),t=normalise(target).split(" ").filter(Boolean);
 const table=Array.from({length:a.length+1},()=>Array(t.length+1).fill(0));
 for(let i=a.length-1;i>=0;i--)for(let j=t.length-1;j>=0;j--)table[i][j]=a[i]===t[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
 const html=[];let i=0,j=0;
 while(i<a.length||j<t.length){
  if(i<a.length&&j<t.length&&a[i]===t[j]){html.push(`<span class="word-good">${escapeHtml(t[j])}</span>`);i++;j++}
  else if(j<t.length&&(i===a.length||table[i][j+1]>=table[i+1][j])){html.push(`<span class="word-missing">${escapeHtml(t[j])}</span>`);j++}
  else{html.push(`<span class="word-bad">${escapeHtml(a[i])}</span>`);i++}
 }
 return html.join(" ");
}
function check(reveal=false){
 if(state.checked)return;const q=current(),answer=$("#answerInput").value.trim();if(!answer&&!reveal){$("#answerInput").focus();return}
 const ok=!reveal&&normalise(answer)===normalise(q.text);state.checked=ok;$("#answerInput").disabled=ok;
 const box=$("#feedback");box.className=`feedback ${ok?"":"bad"}`;box.innerHTML=ok?`<strong>All correct. Well done!</strong>${q.text}`:`<strong>${reveal?"Correct answer":"Check the highlighted words"}</strong><div>${diff(answer,q.text)}</div><div style="margin-top:8px;color:var(--muted)">${q.text}</div>`;
 state.revealed=true;$("#revealButton").textContent="Hide answer";
 if(!reveal&&!state.attempted){state.stats.attempts++;state.stats.completed++;state.attempted=true;if(ok){state.stats.correct++;state.stats.mistakes=state.stats.mistakes.filter(id=>id!==q.id)}else if(!state.stats.mistakes.includes(q.id))state.stats.mistakes.push(q.id);save()}
 if(ok){$("#submitButton").classList.add("hidden")}else{$("#submitButton").classList.remove("hidden");$("#submitButton").textContent="Check again";$("#answerInput").disabled=false;$("#answerInput").focus()}
 $("#nextButton").classList.remove("hidden");
}
function toggleAnswer(){
 const box=$("#feedback");
 if(!state.revealed){
  const q=current();
  box.className="feedback";
  box.innerHTML=`<strong>${state.mode==="listening"?"Transcript":"Correct answer"}</strong><div>${q.text}</div>`;
  state.revealed=true;
  $("#revealButton").textContent=state.mode==="listening"?"Hide transcript":"Hide answer";
  if(state.mode!=="listening"){$("#answerInput").disabled=false;$("#answerInput").focus()}
  return;
 }
 const hiding=!box.classList.contains("hidden");
 box.classList.toggle("hidden",hiding);
 $("#revealButton").textContent=hiding?(state.mode==="listening"?"Show transcript":"Show answer"):(state.mode==="listening"?"Hide transcript":"Hide answer");
 if(state.mode!=="listening"&&!state.checked){$("#answerInput").disabled=false;$("#answerInput").focus()}
}
function next(){if(state.index<state.session.length-1){state.index++;renderQuestion()}else{const day=new Date().toISOString().slice(0,10);if(state.stats.lastDay!==day){state.stats.streak++;state.stats.lastDay=day;save()}alert("Session complete!");makeSession()}}
function renderStats(){const s=state.stats;$("#completedTotal").textContent=s.completed;$("#accuracyTotal").textContent=s.attempts?`${Math.round(s.correct/s.attempts*100)}%`:"—";$("#mistakeTotal").textContent=s.mistakes.length;$("#streakCount").textContent=s.streak}

$("#playButton").onclick=play;$("#replayButton").onclick=play;$("#submitButton").onclick=()=>check(false);$("#revealButton").onclick=toggleAnswer;$("#nextButton").onclick=next;$("#newSessionButton").onclick=makeSession;
$("#speedSelect").onchange=()=>audio.playbackRate=Number($("#speedSelect").value);
$("#modePicker").onclick=e=>{const button=e.target.closest("button[data-mode]");if(!button)return;state.mode=button.dataset.mode;document.querySelectorAll("#modePicker button").forEach(b=>{const active=b===button;b.classList.toggle("active",active);b.setAttribute("aria-pressed",active)});renderQuestion()};
$("#sourcePicker").onclick=e=>{const button=e.target.closest("button[data-source]");if(!button)return;state.source=button.dataset.source;document.querySelectorAll("#sourcePicker button").forEach(b=>{const active=b===button;b.classList.toggle("active",active);b.setAttribute("aria-pressed",active)});makeSession()};
$("#levelFilter").onclick=e=>{if(!e.target.dataset.value)return;document.querySelectorAll("#levelFilter button").forEach(b=>b.classList.remove("active"));e.target.classList.add("active");state.level=e.target.dataset.value;makeSession()};
$("#topicSelect").onchange=makeSession;
$("#lengthSelect").onchange=makeSession;
$("#sessionSize").onchange=makeSession;
$("#mistakesOnly").onchange=makeSession;
$("#themeButton").onclick=()=>document.body.classList.toggle("dark");
$("#resetButton").onclick=()=>{if(confirm("Clear all your practice records?")){localStorage.removeItem(storeKey);state.stats=defaultStats();save();makeSession()}};
document.addEventListener("keydown",e=>{
 if(e.key==="F2"||(e.key==="/"&&(e.metaKey||e.ctrlKey))){e.preventDefault();toggleAnswer();return}
 if(e.code==="Space"&&document.activeElement!==$("#answerInput")){e.preventDefault();play()}
 if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();state.mode==="listening"?next():(state.checked?next():check(false))}
});
renderStats();makeSession();
