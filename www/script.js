"use strict";

const $ = id => document.getElementById(id);

const challenges = [
  { emoji:"😂", title:"ضحكة الميم", desc:"أطلق أظرف ضحكة تستطيعها!", type:"sounds" },
  { emoji:"🐸", title:"صوت الضفدع", desc:"قلّد نقيق الضفدع!", type:"sounds" },
  { emoji:"🤖", title:"الروبوت المجنون", desc:"تحدث مثل روبوت تعطّل!", type:"sounds" },
  { emoji:"👹", title:"ضحكة الشرير", desc:"اصنع ضحكة شريرة مضحكة!", type:"sounds" },
  { emoji:"🐔", title:"الدجاجة الغاضبة", desc:"قلّد صوت دجاجة غاضبة!", type:"sounds" },
  { emoji:"👶", title:"صوت الطفل", desc:"قلّد صوت طفل يتذمر!", type:"sounds" },
  { emoji:"👽", title:"كائن فضائي", desc:"تحدث بلغة فضائية مضحكة!", type:"sounds" },
  { emoji:"🐒", title:"القرد المشاغب", desc:"قلّد أصوات القردة!", type:"sounds" },
  { emoji:"🎤", title:"المذيع العجيب", desc:"قدّم نشرة أخبار بصوت مضحك!", type:"sounds" },
  { emoji:"🦁", title:"ملك الغابة", desc:"أطلق زئيرًا مميزًا!", type:"sounds" },
  { emoji:"⚡", title:"تحدي السرعة", desc:"أكمل تقليد الصوت بسرعة!", type:"speed" },
  { emoji:"🧠", title:"ذاكرة الرموز", desc:"تذكر الرموز بالترتيب!", type:"memory" },
  { emoji:"🔍", title:"خمن الميم", desc:"اختر الإجابة الصحيحة!", type:"guess" }
];

const state = {
  coins:100,
  best:0,
  played:0,
  level:1,
  round:0,
  score:0,
  mode:"sounds",
  recording:false,
  recorder:null,
  stream:null,
  chunks:[],
  timer:null,
  deadline:0,
  dailyClaimed:false,
  questionAnswered:false,
  memorySequence:[],
  memoryInput:[],
  memoryActive:false,
  memoryBox:null,
  guessBox:null,
  challenge:null
};

function loadSaved(){
  try{
    const data=JSON.parse(localStorage.getItem("mememix_save")||"{}");
    if(Number.isFinite(data.coins)) state.coins=data.coins;
    if(Number.isFinite(data.best)) state.best=data.best;
    if(Number.isFinite(data.played)) state.played=data.played;
    if(Number.isFinite(data.level)) state.level=data.level;
    state.dailyClaimed=data.dailyDate===new Date().toDateString();
  }catch(e){
    console.warn("تعذر تحميل الحفظ",e);
  }
  updateStats();
}

function save(){
  try{
    localStorage.setItem("mememix_save",JSON.stringify({
      coins:state.coins,
      best:state.best,
      played:state.played,
      level:state.level,
      dailyDate:state.dailyClaimed?new Date().toDateString():""
    }));
  }catch(e){
    console.warn("تعذر حفظ التقدم",e);
  }
}

function updateStats(){
  $("coins").textContent=state.coins;
  $("best").textContent=state.best;
  $("played").textContent=state.played;
  $("level").textContent=state.level;
  $("dailyBtn").disabled=state.dailyClaimed;
  $("dailyBtn").textContent=state.dailyClaimed?"تم الاستلام ✓":"استلم";
}

function toast(message){
  const el=$("toast");
  el.textContent=message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout=setTimeout(()=>el.classList.remove("show"),2400);
}

function cleanRoundUI(){
  if(state.memoryBox){
    state.memoryBox.remove();
    state.memoryBox=null;
  }
  if(state.guessBox){
    state.guessBox.remove();
    state.guessBox=null;
  }
  $("result").classList.add("hidden");
  $("recordBtn").classList.remove("hidden");
  $("recordBtn").disabled=false;
  $("recordBtn").textContent="🎤 ابدأ التقليد";
  $("recordTitle").textContent="دورك الآن!";
  $("recordDesc").textContent="اضغط وابدأ التحدي";
  $("timer").textContent="";
}

function startGame(mode="sounds"){
  stopRecording();
  clearInterval(state.timer);
  state.mode=mode;
  state.round=0;
  state.score=0;
  $("game").classList.remove("hidden");
  $("game").scrollIntoView({behavior:"smooth",block:"start"});
  nextRound();
}

function selectMode(mode){
  startGame(mode);
}

function getChallenge(){
  const list=challenges.filter(c=>c.type===state.mode);
  return list[(state.round-1)%list.length]||challenges[0];
}

function nextRound(){
  stopRecording();
  clearInterval(state.timer);
  cleanRoundUI();

  state.round++;
  state.questionAnswered=false;
  state.memoryActive=false;
  state.challenge=getChallenge();

  const c=state.challenge;

  $("roundLabel").textContent="التحدي "+state.round;
  $("roundScore").textContent=state.score;
  $("progressFill").style.width=((state.round-1)%10+1)*10+"%";
  $("challengeEmoji").textContent=c.emoji;
  $("challengeTitle").textContent=c.title;
  $("challengeDesc").textContent=c.desc;

  if(state.mode==="memory"){
    setupMemory();
  }else if(state.mode==="guess"){
    setupGuess();
  }else if(state.mode==="speed"){
    $("challengeDesc").textContent="اضغط ابدأ التقليد وقلّد الصوت خلال 5 ثوانٍ!";
  }
}

function playChallenge(){
  if(state.mode==="memory"){
    showMemorySequence();
    return;
  }

  if(state.mode==="guess"){
    toast("اختر الرمز الذي تعتقد أنه الإجابة الصحيحة.");
    return;
  }

  if(!("speechSynthesis" in window)){
    toast("ميزة الصوت غير مدعومة في هذا المتصفح.");
    return;
  }

  window.speechSynthesis.cancel();

  const voices=[
    "ها ها ها! ههههه!",
    "كواك كواك! كواك!",
    "بيب بوب، أنا روبوت!",
    "موهاهاها! أنا الشرير!",
    "كوكو كوكو! أنا الدجاجة!"
  ];

  const utterance=new SpeechSynthesisUtterance(
    voices[(state.round-1)%voices.length]
  );
  utterance.lang="ar";
  utterance.rate=0.8+Math.random()*0.6;
  window.speechSynthesis.speak(utterance);
  toast("استمع إلى الصوت ثم قلّده!");
}

async function toggleRecording(){
  if(state.recording){
    stopRecording();
    finishChallenge(50,"انتهى التسجيل! هذه نتيجة تجريبية.");
    return;
  }

  if(!navigator.mediaDevices||
     !navigator.mediaDevices.getUserMedia||
     !window.MediaRecorder){
    toast("التسجيل يحتاج متصفحًا حديثًا واتصال HTTPS.");
    return;
  }

  try{
    state.stream=await navigator.mediaDevices.getUserMedia({audio:true});

    const options={};
    if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")){
      options.mimeType="audio/webm;codecs=opus";
    }

    state.chunks=[];
    state.recorder=new MediaRecorder(state.stream,options);

    state.recorder.ondataavailable=e=>{
      if(e.data&&e.data.size>0) state.chunks.push(e.data);
    };

    state.recorder.start();
    state.recording=true;
    $("recordBtn").textContent="⏹️ إنهاء التسجيل";
    $("recordTitle").textContent="🎙️ نحن نستمع!";
    $("recordDesc").textContent="قلّد الصوت الآن!";

    const duration=state.mode==="speed"?5000:5000;
    state.deadline=Date.now()+duration;

    state.timer=setInterval(()=>{
      const left=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));
      $("timer").textContent=left+" ث";

      if(left<=0){
        stopRecording();
        finishChallenge(50,"أكملت التحدي! النتيجة تجريبية وليست تحليلًا للصوت.");
      }
    },200);

  }catch(e){
    console.error(e);
    releaseMicrophone();
    toast("تعذر فتح الميكروفون. اسمح للمتصفح باستخدامه.");
  }
}

function stopRecording(){
  clearInterval(state.timer);
  state.timer=null;

  if(state.recorder&&state.recorder.state!=="inactive"){
    try{state.recorder.stop();}catch(e){}
  }

  state.recording=false;
  releaseMicrophone();

  if($("recordBtn")){
    $("recordBtn").textContent="🎤 ابدأ التقليد";
    $("recordBtn").disabled=false;
  }
}

function releaseMicrophone(){
  if(state.stream){
    state.stream.getTracks().forEach(track=>track.stop());
    state.stream=null;
  }
}

function finishChallenge(score,message){
  if(state.questionAnswered)return;
  state.questionAnswered=true;
  stopRecording();

  score=Math.max(0,Math.min(100,Math.round(score)));
  state.score+=score;
  state.played++;

  const reward=Math.max(1,Math.floor(score/10));
  state.coins+=reward;
  state.best=Math.max(state.best,state.score);

  if(state.played%5===0)state.level++;

  $("roundScore").textContent=state.score;
  $("scoreNumber").textContent=score;
  $("resultMessage").textContent=message+" ربحت "+reward+" عملات!";
  $("resultTitle").textContent=
    score>=80?"أداء أسطوري!":score>=50?"أداء رائع!":"حاول مرة أخرى!";
  $("resultEmoji").textContent=
    score>=80?"🏆":score>=50?"🎉":"😂";

  $("recordBtn").classList.add("hidden");
  $("result").classList.remove("hidden");

  updateStats();
  save();
}

function setupMemory(){
  $("recordBtn").classList.add("hidden");
  $("recordTitle").textContent="🧠 تحدي الذاكرة";
  $("recordDesc").textContent="شاهد الرموز ثم اخترها بالترتيب";

  const symbols=["😂","🐸","🤖","👹","🐔","👽"];
  const count=Math.min(3+Math.floor((state.round-1)/3),6);

  state.memorySequence=Array.from({length:count},()=>
    symbols[Math.floor(Math.random()*symbols.length)]
  );
  state.memoryInput=[];
}

function showMemorySequence(){
  if(state.memoryActive)return;
  state.memoryActive=true;

  const emoji=$("challengeEmoji");
  let i=0;

  const interval=setInterval(()=>{
    if(i>=state.memorySequence.length){
      clearInterval(interval);
      emoji.textContent="❓";
      showMemoryOptions();
      return;
    }
    emoji.textContent=state.memorySequence[i++];
  },850);
}

function showMemoryOptions(){
  $("recordDesc").textContent="اضغط الرموز بالترتيب الذي شاهدته";

  const box=document.createElement("div");
  box.className="memory-options";

  ["😂","🐸","🤖","👹","🐔","👽"].forEach(symbol=>{
    const btn=document.createElement("button");
    btn.textContent=symbol;
    btn.style.cssText=
      "font-size:25px;padding:12px;margin:4px;border-radius:12px;background:#49306a";

    btn.onclick=()=>{
      if(state.questionAnswered)return
