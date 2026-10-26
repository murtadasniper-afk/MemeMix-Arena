"use strict";

const $ = id => document.getElementById(id);

const challenges = [
  { emoji: "😂", title: "ضحكة الميم", desc: "أطلق أظرف ضحكة تستطيعها!", type: "sounds" },
  { emoji: "🐸", title: "صوت الضفدع", desc: "قلّد نقيق الضفدع!", type: "sounds" },
  { emoji: "🤖", title: "الروبوت المجنون", desc: "تحدث مثل روبوت تعطّل!", type: "sounds" },
  { emoji: "👹", title: "ضحكة الشرير", desc: "اصنع ضحكة شريرة مضحكة!", type: "sounds" },
  { emoji: "🐔", title: "الدجاجة الغاضبة", desc: "قلّد صوت دجاجة غاضبة!", type: "sounds" },
  { emoji: "👶", title: "صوت الطفل", desc: "قلّد صوت طفل يتذمر!", type: "sounds" },
  { emoji: "👽", title: "كائن فضائي", desc: "تحدث بلغة فضائية مضحكة!", type: "sounds" },
  { emoji: "🐒", title: "القرد المشاغب", desc: "قلّد أصوات القردة!", type: "sounds" },
  { emoji: "🎤", title: "المذيع العجيب", desc: "قدّم نشرة أخبار بصوت مضحك!", type: "sounds" },
  { emoji: "🦁", title: "ملك الغابة", desc: "أطلق زئيرًا مميزًا!", type: "sounds" },
  { emoji: "⚡", title: "تحدي السرعة", desc: "قلّد الصوت بأسرع ما يمكنك!", type: "speed" },
  { emoji: "🧠", title: "ذاكرة الرموز", desc: "تذكّر الرموز التي تظهر أمامك!", type: "memory" },
  { emoji: "🔍", title: "خمن الميم", desc: "اختر الإجابة الصحيحة!", type: "guess" }
];

const state = {
  coins: 100,
  best: 0,
  played: 0,
  level: 1,
  round: 0,
  score: 0,
  mode: "sounds",
  recording: false,
  recorder: null,
  stream: null,
  chunks: [],
  timer: null,
  deadline: 0,
  dailyClaimed: false,
  memorySequence: [],
  memoryInput: [],
  memoryActive: false,
  questionAnswered: false
};

function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem("mememix_save") || "{}");
    state.coins = Number.isFinite(data.coins) ? data.coins : 100;
    state.best = Number.isFinite(data.best) ? data.best : 0;
    state.played = Number.isFinite(data.played) ? data.played : 0;
    state.level = Number.isFinite(data.level) ? data.level : 1;
    state.dailyClaimed = data.dailyDate === new Date().toDateString();
  } catch (_) {}
  updateStats();
}

function save() {
  try {
    localStorage.setItem("mememix_save", JSON.stringify({
      coins: state.coins,
      best: state.best,
      played: state.played,
      level: state.level,
      dailyDate: state.dailyClaimed ? new Date().toDateString() : ""
    }));
  } catch (_) {}
}

function updateStats() {
  $("coins").textContent = state.coins;
  $("best").textContent = state.best;
  $("played").textContent = state.played;
  $("level").textContent = state.level;
  $("dailyBtn").disabled = state.dailyClaimed;
  $("dailyBtn").textContent = state.dailyClaimed ? "تم الاستلام ✓" : "استلم";
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2300);
}

function startGame(mode = "sounds") {
  stopRecording();
  clearInterval(state.timer);
  state.mode = mode;
  state.round = 0;
  state.score = 0;

  $("game").classList.remove("hidden");
  $("result").class
