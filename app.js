const $ = s => document.querySelector(s);
const storeKey = "british-ear-progress-v1";
const state = {level:"all",session:[],index:0,checked:false,attempted:false,revealed:false,repeatsLeft:0,repeatIndex:0,repeatTimer:null,stats:JSON.parse(localStorage.getItem(storeKey)||'{"attempts":0,"correct":0,"mistakes":[],"completed":0,"streak":0,"lastDay":""}')};
const audio = $("#audioPlayer");

function classifyTopic(text){
 const s=text.toLowerCase();
 const groups={
  "食物与饮品":["food","tea","egg","beef","lamb","rice","juice","lemon","dish","farm","corn","fish"],
  "自然与天气":["wind","cloud","sea","rain","snow","sun","river","spring","leaf","leaves","birch","fire"],
  "人与关系":["girl","boy","woman","man","friend","people","rider","navy","she ","he ","her ","his "],
  "日常生活":["clothes","money","game","news","note","carpet","screen","ring","wash","wear","morning","evening"],
  "物品与动作":["stick","chart","lock","coin","force","move","write","paste","soap","hoist","weave","struck"]
 };
 for(const [topic,words] of Object.entries(groups))if(words.some(word=>s.includes(word)))return topic;
 return "日常生活";
}
function classifyLength(text){const n=normalise(text).split(" ").filter(Boolean).length;return n<=6?"短句":n<=9?"中句":"长句"}
window.SENTENCES=window.SENTENCES.map(q=>({...q,topic:q.topic||classifyTopic(q.text),length:q.length||classifyLength(q.text)}));

function normalise(text){return text.toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9']+/g," ").trim().replace(/\s+/g," ")}
function shuffle(items){return [...items].sort(()=>Math.random()-.5)}
function save(){localStorage.setItem(storeKey,JSON.stringify(state.stats));renderStats()}
function current(){return state.session[state.index]}
function makeSession(){
  let pool=window.SENTENCES.filter(x=>state.level==="all"||x.level===state.level);
  const topic=$("#topicSelect").value,length=$("#lengthSelect").value;
  if(topic!=="all")pool=pool.filter(x=>x.topic===topic);
  if(length!=="all")pool=pool.filter(x=>x.length===length);
  if($("#mistakesOnly").checked) pool=pool.filter(x=>state.stats.mistakes.includes(x.id));
  if(!pool.length){alert("当前筛选条件下还没有题目。");return}
  state.session=shuffle(pool).slice(0,Math.min(Number($("#sessionSize").value),pool.length));state.index=0;state.checked=false;renderQuestion();
}
function renderQuestion(){
  const q=current(); if(!q)return;
  clearTimeout(state.repeatTimer);audio.pause();state.repeatsLeft=0;audio.src=q.audio;audio.playbackRate=Number($("#speedSelect").value);
  $("#questionMeta").textContent=`${q.level} · ${q.topic} · ${q.length} · ${q.accent.toUpperCase()}`;$("#currentNumber").textContent=state.index+1;$("#sessionTotal").textContent=state.session.length;
  $("#progressBar").style.width=`${((state.index+1)/state.session.length)*100}%`;$("#answerInput").value="";$("#answerInput").disabled=false;
  $("#feedback").className="feedback hidden";$("#submitButton").classList.remove("hidden");$("#submitButton").textContent="检查答案";$("#nextButton").classList.add("hidden");$("#revealButton").textContent="显示答案";state.checked=false;state.attempted=false;state.revealed=false;
  setTimeout(()=>play(),250);$("#answerInput").focus();
}
function play(){
 clearTimeout(state.repeatTimer);const total=Number($("#repeatSelect").value);state.repeatsLeft=total;state.repeatIndex=1;playCurrent(total);
}
function playCurrent(total){audio.playbackRate=Number($("#speedSelect").value);audio.currentTime=0;audio.play().catch(()=>{});$("#playIcon").textContent="❚❚";$("#audioTitle").textContent=total>1?`正在播放 ${state.repeatIndex}/${total}`:"正在播放"}
audio.addEventListener("ended",()=>{const total=Number($("#repeatSelect").value);state.repeatsLeft--;if(state.repeatsLeft>0){state.repeatIndex++;$("#audioTitle").textContent=`稍后重播 ${state.repeatIndex}/${total}`;state.repeatTimer=setTimeout(()=>playCurrent(total),650)}else{$("#playIcon").textContent="▶";$("#audioTitle").textContent="再听一遍"}});
function diff(answer,target){
 const a=normalise(answer).split(" ").filter(Boolean),t=normalise(target).split(" ").filter(Boolean);let html=[];
 for(let i=0;i<Math.max(a.length,t.length);i++){if(a[i]===t[i])html.push(`<span class="word-good">${t[i]}</span>`);else if(!a[i])html.push(`<span class="word-missing">${t[i]}</span>`);else if(!t[i])html.push(`<span class="word-bad">${a[i]}</span>`);else html.push(`<span class="word-bad">${a[i]}</span> <span class="word-missing">${t[i]}</span>`)}return html.join(" ");
}
function check(reveal=false){
 if(state.checked)return;const q=current(),answer=$("#answerInput").value.trim();if(!answer&&!reveal){$("#answerInput").focus();return}
 const ok=!reveal&&normalise(answer)===normalise(q.text);state.checked=ok;$("#answerInput").disabled=ok;
 const box=$("#feedback");box.className=`feedback ${ok?"":"bad"}`;box.innerHTML=ok?`<strong>完全正确，很好！</strong>${q.text}`:`<strong>${reveal?"正确答案":"再留意标出的词"}</strong><div>${diff(answer,q.text)}</div><div style="margin-top:8px;color:var(--muted)">${q.text}</div>`;
 state.revealed=true;$("#revealButton").textContent="隐藏答案";
 if(!reveal&&!state.attempted){state.stats.attempts++;state.stats.completed++;state.attempted=true;if(ok){state.stats.correct++;state.stats.mistakes=state.stats.mistakes.filter(id=>id!==q.id)}else if(!state.stats.mistakes.includes(q.id))state.stats.mistakes.push(q.id);save()}
 if(ok){$("#submitButton").classList.add("hidden")}else{$("#submitButton").classList.remove("hidden");$("#submitButton").textContent="再次检查";$("#answerInput").disabled=false;$("#answerInput").focus()}
 $("#nextButton").classList.remove("hidden");
}
function toggleAnswer(){
 const box=$("#feedback");
 if(!state.revealed){
  const q=current();
  box.className="feedback";
  box.innerHTML=`<strong>正确答案</strong><div>${q.text}</div>`;
  state.revealed=true;
  $("#revealButton").textContent="隐藏答案";
  $("#answerInput").disabled=false;
  $("#answerInput").focus();
  return;
 }
 const hiding=!box.classList.contains("hidden");
 box.classList.toggle("hidden",hiding);
 $("#revealButton").textContent=hiding?"显示答案":"隐藏答案";
 if(!state.checked){$("#answerInput").disabled=false;$("#answerInput").focus()}
}
function next(){if(state.index<state.session.length-1){state.index++;renderQuestion()}else{const day=new Date().toISOString().slice(0,10);if(state.stats.lastDay!==day){state.stats.streak++;state.stats.lastDay=day;save()}alert("本组练习完成！");makeSession()}}
function renderStats(){const s=state.stats;$("#completedTotal").textContent=s.completed;$("#accuracyTotal").textContent=s.attempts?`${Math.round(s.correct/s.attempts*100)}%`:"—";$("#mistakeTotal").textContent=s.mistakes.length;$("#streakCount").textContent=s.streak}

$("#playButton").onclick=play;$("#replayButton").onclick=play;$("#submitButton").onclick=()=>check(false);$("#revealButton").onclick=toggleAnswer;$("#nextButton").onclick=next;$("#newSessionButton").onclick=makeSession;
$("#speedSelect").onchange=()=>audio.playbackRate=Number($("#speedSelect").value);
$("#levelFilter").onclick=e=>{if(!e.target.dataset.value)return;document.querySelectorAll("#levelFilter button").forEach(b=>b.classList.remove("active"));e.target.classList.add("active");state.level=e.target.dataset.value;makeSession()};
$("#topicSelect").onchange=makeSession;
$("#lengthSelect").onchange=makeSession;
$("#sessionSize").onchange=makeSession;
$("#mistakesOnly").onchange=makeSession;
$("#themeButton").onclick=()=>document.body.classList.toggle("dark");
$("#resetButton").onclick=()=>{if(confirm("确定清空所有练习记录吗？")){localStorage.removeItem(storeKey);state.stats={attempts:0,correct:0,mistakes:[],completed:0,streak:0,lastDay:""};save();makeSession()}};
document.addEventListener("keydown",e=>{
 if(e.key==="F2"||(e.key==="/"&&(e.metaKey||e.ctrlKey))){e.preventDefault();toggleAnswer();return}
 if(e.code==="Space"&&document.activeElement!==$("#answerInput")){e.preventDefault();play()}
 if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();state.checked?next():check(false)}
});
renderStats();makeSession();
