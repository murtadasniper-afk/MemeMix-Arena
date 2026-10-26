"use strict";

const $ = id => document.getElementById(id);

const challenges = {
  sounds: [
    { emoji: "😂", title: "ضحكة الميم", text: "قلّد ضحكة مضحكة!" },
    { emoji: "🐸", title: "صوت الضفدع", text: "قلّد صوت الضفدع!" },
    { emoji: "🤖", title: "الروبوت المجنون", text: "تحدث مثل روبوت!" },
    { emoji: "👹", title: "ضحكة الشرير", text: "أطلق ضحكة شريرة!" },
    { emoji: "🐔", title: "الدجاجة الغاضبة", text: "قلّد صوت الدجاجة!" },
    { emoji: "👽", title: "الكائن الفضائي", text: "تحدث بصوت فضائي!" },
    { emoji: "🐒", title: "القرد المشاغب", text: "قلّد صوت القرد!" },
    { emoji: "🦁", title: "ملك الغابة", text: "أطلق زئير الأسد!" }
  ],
  speed: [
    { emoji: "⚡", title: "تحدي السرعة", text: "سجّل صوتك قبل انتهاء الوقت!" }
  ],
  memory: [
    { emoji: "🧠", title: "ذاكرة الرموز", text: "احفظ الرموز واضغط عليها بالترتيب!" }
  ],
  guess: [
    { emoji: "🔍", title: "خمن الميم", text: "اختر الرمز المطابق للرمز المعروض!" }
  ]
};

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
  questionAnswered: false,
  memorySequence: [],
  memoryInput: [],
  memoryActive: false,
  memoryBox: null,
  guessBox: null,
  dailyClaimed: false
};

function toast(message) {
  const el = $("toast");
  if (!el) {
    alert(message);
    return;
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2500);
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
  } catch (e) {
    console.warn("تعذر حفظ التقدم", e);
  }
}

function loadSaved() {
  try {
    const data = JSON.parse(localStorage.getItem("mememix_save") || "{}");
    if (Number.isFinite(data.coins)) state.coins = data.coins;
    if (Number.isFinite(data.best)) state.best = data.best;
    if (Number.isFinite(data.played)) state.played = data.played;
    if (Number.isFinite(data.level)) state.level = data.level;
    state.dailyClaimed = data.dailyDate === new Date().toDateString();
  } catch (e) {
    console.warn("تعذر تحميل الحفظ", e);
  }
  updateStats();
}

function updateStats() {
  if ($("coins")) $("coins").textContent = state.coins;
  if ($("best")) $("best").textContent = state.best;
  if ($("played")) $("played").textContent = state.played;
  if ($("level")) $("level").textContent = state.level;

  if ($("dailyBtn")) {
    $("dailyBtn").disabled = state.dailyClaimed;
    $("dailyBtn").textContent = state.dailyClaimed
      ? "تم الاستلام ✓" : "استلم";
  }
}

function cleanRoundUI() {
  if (state.memoryBox) state.memoryBox.remove();
  if (state.guessBox) state.guessBox.remove();
  state.memoryBox = null;
  state.guessBox = null;

  $("result").classList.add("hidden");
  $("recordBtn").classList.remove("hidden");
  $("recordBtn").disabled = false;
  $("recordBtn").textContent = "🎤 ابدأ التقليد";
  $("recordTitle").textContent = "دورك الآن!";
  $("recordDesc").textContent = "اضغط وابدأ التحدي";
  $("timer").textContent = "";
}

function startGame(mode = "sounds") {
  stopRecording();
  clearInterval(state.timer);

  if (!challenges[mode]) mode = "sounds";

  state.mode = mode;
  state.round = 0;
  state.score = 0;

  $("game").classList.remove("hidden");
  $("game").scrollIntoView({ behavior: "smooth", block: "start" });

  nextRound();
}

function selectMode(mode) {
  startGame(mode);
}

function getChallenge() {
  const list = challenges[state.mode];
  return list[(state.round - 1) % list.length];
}

function nextRound() {
  stopRecording();
  clearInterval(state.timer);
  cleanRoundUI();

  state.round++;
  state.questionAnswered = false;
  state.memoryActive = false;

  const challenge = getChallenge();

  $("roundLabel").textContent = "التحدي " + state.round;
  $("roundScore").textContent = state.score;
  $("progressFill").style.width =
    (((state.round - 1) % 10) + 1) * 10 + "%";

  $("challengeEmoji").textContent = challenge.emoji;
  $("challengeTitle").textContent = challenge.title;
  $("challengeDesc").textContent = challenge.text;

  if (state.mode === "memory") setupMemory();
  if (state.mode === "guess") setupGuess();

  if (state.mode === "speed") {
    $("challengeDesc").textContent =
      "اضغط ابدأ التقليد وسجّل صوتك خلال 5 ثوانٍ!";
  }
}

function playChallenge() {
  if (state.questionAnswered) return;

  if (state.mode === "memory") {
    showMemorySequence();
    return;
  }

  if (state.mode === "guess") {
    toast("اختر الرمز الصحيح أدناه.");
    return;
  }

  const messages = {
    "😂": "ها ها ها! ههههه!",
    "🐸": "كواك كواك! كواك!",
    "🤖": "بيب بوب، أنا روبوت!",
    "👹": "موهاهاها! أنا الشرير!",
    "🐔": "كوكو كوكو! أنا الدجاجة!",
    "👽": "زوب زوب! بلغة الفضاء!",
    "🐒": "أوو أوو! أوو أوو!",
    "🦁": "ررررررر! غراااار!"
  };

  if (!("speechSynthesis" in window)) {
    toast("الصوت غير مدعوم في هذا الجهاز.");
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      messages[$("challengeEmoji").textContent] || "ها ها ها!"
    );

    utterance.lang = "ar";
    utterance.rate = 0.85;
    utterance.volume = 1;

    utterance.onerror = () => toast("تعذر تشغيل الصوت على هذا الجهاز.");
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    toast("تعذر تشغيل الصوت.");
  }
}

async function toggleRecording() {
  if (state.recording) {
    stopRecording();
    finishChallenge(50, "انتهى التسجيل. النتيجة تجريبية.");
    return;
  }

  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !window.MediaRecorder) {
    toast("الميكروفون يحتاج إذنًا واتصال HTTPS أو WebView يدعمه.");
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    state.chunks = [];

    const options = {};
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      options.mimeType = "audio/webm;codecs=opus";
    }

    state.recorder = new MediaRecorder(state.stream, options);

    state.recorder.ondataavailable = event => {
      if (event.data && event.data.size) {
        state.chunks.push(event.data);
      }
    };

    state.recorder.start();
    state.recording = true;

    $("recordBtn").textContent = "⏹️ إنهاء التسجيل";
    $("recordTitle").textContent = "🎙️ نحن نستمع!";
    $("recordDesc").textContent = "قلّد الصوت الآن!";

    state.deadline = Date.now() + 5000;

    state.timer = setInterval(() => {
      const remaining = Math.max(
        0, Math.ceil((state.deadline - Date.now()) / 1000)
      );

      $("timer").textContent = remaining + " ث";

      if (remaining <= 0) {
        stopRecording();
        finishChallenge(50, "انتهى الوقت. النتيجة تجريبية.");
      }
    }, 200);

  } catch (error) {
    console.error("Microphone error:", error);
    stopRecording();
    toast("تعذر فتح الميكروفون. تحقق من إذن التسجيل في إعدادات التطبيق.");
  }
}

function stopRecording() {
  clearInterval(state.timer);
  state.timer = null;
  state.recording = false;

  if (state.recorder && state.recorder.state !== "inactive") {
    try {
      state.recorder.stop();
    } catch (e) {}
  }

  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }

  if ($("recordBtn")) {
