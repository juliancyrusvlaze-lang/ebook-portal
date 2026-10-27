let currentGrade = "Grade 7";
let currentSlideIndex = 0;
let lectureFontSize = 1.2; // rem
let simTimer = null;
let simCurrentTime = 0;
let simMaxTime = 0;
let isUsingSimulation = false;

const lectureAudio = new Audio();
const voiceCorrect = new Audio("audio/feedback/tama_voice.mp3");
const voiceWrong = new Audio("audio/feedback/mali_voice.mp3");

// Initialize Dashboard previews and Splash Loader on load
document.addEventListener("DOMContentLoaded", () => {
  runSplashLoader();

  const gradeMap = {
    "Grade 7": "previewTopicGr7",
    "Grade 8": "previewTopicGr8",
    "Grade 9": "previewTopicGr9",
    "Grade 10": "previewTopicGr10"
  };

  Object.keys(gradeMap).forEach(grade => {
    const el = document.getElementById(gradeMap[grade]);
    if (el && modulesData[grade] && modulesData[grade].aralin) {
      el.textContent = modulesData[grade].aralin.title;
    }
  });

  // Keyboard support for 3D book volumes
  document.querySelectorAll(".book-volume, .grade-card").forEach(card => {
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Keyboard navigation for slides when moduleView is open
  document.addEventListener("keydown", e => {
    const moduleView = document.getElementById("moduleView");
    const aralinTab = document.getElementById("aralinPptTab");
    if (!moduleView.classList.contains("hidden") && !aralinTab.classList.contains("hidden")) {
      if (e.key === "ArrowLeft") changeSlide(-1);
      if (e.key === "ArrowRight") changeSlide(1);
    }
  });
});

function formatGradeLabel(gradeName) {
  return gradeName.replace("Grade", "Baitang");
}

function setSoundwavePlaying(isPlaying) {
  const wave = document.getElementById("soundwaveAnim");
  if (wave) {
    wave.classList.toggle("playing", isPlaying);
  }
}

function openGrade(gradeName) {
  currentGrade = gradeName;
  document.getElementById("dashboardView").classList.add("hidden");
  document.getElementById("moduleView").classList.remove("hidden");
  document.getElementById("currentGradeTitle").textContent = formatGradeLabel(gradeName);

  // Reset to first tab
  const firstTabBtn = document.querySelector(".tab-group .tab-btn");
  if (firstTabBtn) {
    switchTab("aralinPpt", firstTabBtn);
  }

  loadAralin();
  loadSlides();
  loadExercises();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  pauseVoice();
  document.getElementById("moduleView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabName, btn) {
  pauseVoice();
  document.getElementById("aralinPptTab").classList.add("hidden");
  document.getElementById("exerciseTab").classList.add("hidden");
  document.querySelectorAll(".nav-bar .tab-btn").forEach(b => b.classList.remove("active"));

  document.getElementById(tabName + "Tab").classList.remove("hidden");
  if (btn) btn.classList.add("active");
}

function adjustFontSize(delta) {
  lectureFontSize = Math.min(1.7, Math.max(0.95, +(lectureFontSize + delta * 0.1).toFixed(2)));
  const container = document.getElementById("lectureContainer");
  if (container) {
    container.style.fontSize = `${lectureFontSize}rem`;
  }
}

// =========================================
// ARALIN (READ-ALOUD LECTURE) COMPONENT
// =========================================
function loadAralin() {
  pauseVoice();
  simCurrentTime = 0;
  simMaxTime = 0;

  const data = modulesData[currentGrade].aralin;
  document.getElementById("aralinTitle").textContent = data.title;
  lectureAudio.src = data.audioSrc || "";

  const statusText = document.getElementById("audioStatusText");
  if (statusText) {
    statusText.textContent = "Pindutin ang alinmang salita upang simulan ang sabayang pagbasa.";
  }

  const container = document.getElementById("lectureContainer");
  container.innerHTML = "";

  // Support explicit word segments OR paragraph objects
  if (data.segments && data.segments.length > 0) {
    const pBlock = document.createElement("div");
    pBlock.className = "lecture-paragraph";
    pBlock.dataset.section = "§ 01";
    data.segments.forEach(item => {
      const span = createWordSpan(item.word, item.start, item.end);
      pBlock.appendChild(span);
      if (item.end > simMaxTime) simMaxTime = item.end;
    });
    container.appendChild(pBlock);
    return;
  }

  if (data.paragraphs && data.paragraphs.length > 0) {
    data.paragraphs.forEach((para, pIdx) => {
      const pBlock = document.createElement("div");
      pBlock.className = "lecture-paragraph";
      pBlock.dataset.start = para.start;
      pBlock.dataset.end = para.end;
      pBlock.dataset.section = `§ ${String(pIdx + 1).padStart(2, "0")}`;

      const words = para.text.trim().split(/\s+/);
      const duration = Math.max(0.5, para.end - para.start);
      const wordDuration = duration / words.length;

      words.forEach((wordText, idx) => {
        const wStart = +(para.start + idx * wordDuration).toFixed(2);
        const wEnd = +(idx === words.length - 1 ? para.end : para.start + (idx + 1) * wordDuration).toFixed(2);
        const span = createWordSpan(wordText, wStart, wEnd);
        pBlock.appendChild(span);
      });

      if (para.end > simMaxTime) simMaxTime = para.end;
      container.appendChild(pBlock);
    });
    return;
  }

  container.innerHTML = "<p>Wala pang teksto na nakalagay para sa baitang na ito.</p>";
}

function createWordSpan(wordText, start, end) {
  const span = document.createElement("span");
  span.className = "voice-word";
  span.textContent = wordText + " ";
  span.dataset.start = start;
  span.dataset.end = end;

  span.addEventListener("click", () => {
    seekAndPlay(start);
  });

  return span;
}

function seekAndPlay(targetTime) {
  simCurrentTime = targetTime;
  highlightAtTime(targetTime);

  if (isUsingSimulation) {
    startSimulatedPlayback(targetTime);
    return;
  }

  lectureAudio.currentTime = targetTime;
  lectureAudio.play().then(() => {
    setSoundwavePlaying(true);
  }).catch(() => {
    startSimulatedPlayback(targetTime);
  });
}

function playVoice() {
  const statusText = document.getElementById("audioStatusText");
  lectureAudio.play().then(() => {
    isUsingSimulation = false;
    setSoundwavePlaying(true);
    if (statusText) {
      statusText.textContent = "Nagpe-play ang tinig ng aralin...";
    }
  }).catch(() => {
    startSimulatedPlayback(simCurrentTime);
  });
}

function startSimulatedPlayback(fromTime = 0) {
  isUsingSimulation = true;
  clearInterval(simTimer);
  simCurrentTime = fromTime >= simMaxTime ? 0 : fromTime;
  setSoundwavePlaying(true);

  const statusText = document.getElementById("audioStatusText");
  if (statusText) {
    statusText.textContent = "Sabayang Pagbasa (Interactive Highlight Mode)...";
  }

  highlightAtTime(simCurrentTime);

  simTimer = setInterval(() => {
    simCurrentTime = +(simCurrentTime + 0.1).toFixed(2);
    highlightAtTime(simCurrentTime);

    if (simCurrentTime > simMaxTime) {
      pauseVoice();
      simCurrentTime = 0;
      if (statusText) {
        statusText.textContent = "Tapos na ang pagbabasa. Pindutin ang Ulitin upang basahin muli.";
      }
    }
  }, 100);
}

function pauseVoice() {
  lectureAudio.pause();
  setSoundwavePlaying(false);
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  const statusText = document.getElementById("audioStatusText");
  if (statusText && simCurrentTime > 0 && simCurrentTime < simMaxTime) {
    statusText.textContent = "Nakahinto ang pagbabasa. Pindutin ang Patugtugin upang magpatuloy.";
  }
}

function restartVoice() {
  pauseVoice();
  simCurrentTime = 0;
  lectureAudio.currentTime = 0;
  document.querySelectorAll(".voice-word.active-word").forEach(w => w.classList.remove("active-word"));
  document.querySelectorAll(".lecture-paragraph.active-paragraph").forEach(p => p.classList.remove("active-paragraph"));
  playVoice();
}

function highlightAtTime(curTime) {
  const paragraphs = document.querySelectorAll("#lectureContainer .lecture-paragraph");
  paragraphs.forEach(p => {
    const pStart = parseFloat(p.dataset.start);
    const pEnd = parseFloat(p.dataset.end);
    if (!isNaN(pStart) && !isNaN(pEnd)) {
      if (curTime >= pStart && curTime <= pEnd) {
        p.classList.add("active-paragraph");
      } else {
        p.classList.remove("active-paragraph");
      }
    }
  });

  const words = document.querySelectorAll("#lectureContainer .voice-word");
  words.forEach(span => {
    const start = parseFloat(span.dataset.start);
    const end = parseFloat(span.dataset.end);

    if (curTime >= start && curTime <= end) {
      if (!span.classList.contains("active-word")) {
        document.querySelectorAll(".voice-word.active-word").forEach(w => w.classList.remove("active-word"));
        span.classList.add("active-word");
        span.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      span.classList.remove("active-word");
    }
  });
}

lectureAudio.addEventListener("timeupdate", () => {
  if (!isUsingSimulation) {
    simCurrentTime = lectureAudio.currentTime;
    highlightAtTime(lectureAudio.currentTime);
  }
});

lectureAudio.addEventListener("ended", () => {
  setSoundwavePlaying(false);
  const statusText = document.getElementById("audioStatusText");
  if (statusText) {
    statusText.textContent = "Tapos na ang pagbabasa ng aralin.";
  }
});

// =========================================
// PPT SLIDE VIEWER COMPONENT
// =========================================
function loadSlides() {
  currentSlideIndex = 0;
  renderSlideDots();
  updateSlideDisplay();
}

function renderSlideDots() {
  const dotsContainer = document.getElementById("slideDots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";

  const slides = modulesData[currentGrade].slides || [];
  slides.forEach((_, idx) => {
    const dot = document.createElement("button");
    dot.className = "slide-dot" + (idx === currentSlideIndex ? " active" : "");
    dot.setAttribute("aria-label", `Pumunta sa Slide ${idx + 1}`);
    dot.addEventListener("click", () => {
      currentSlideIndex = idx;
      updateSlideDisplay();
    });
    dotsContainer.appendChild(dot);
  });
}

function updateSlideDisplay() {
  const slides = modulesData[currentGrade].slides;
  const topCounter = document.getElementById("slideCounterTop");
  const watermark = document.getElementById("slideWatermark");

  if (!slides || slides.length === 0) {
    document.getElementById("slideTitle").textContent = "Walang Slides";
    document.getElementById("slideBody").textContent = "";
    document.getElementById("slideCounter").textContent = "0 / 0";
    if (topCounter) topCounter.textContent = "SLIDE 00";
    if (watermark) watermark.textContent = "00";
    return;
  }

  const slide = slides[currentSlideIndex];
  const formattedNum = String(currentSlideIndex + 1).padStart(2, "0");

  document.getElementById("slideTitle").textContent = slide.title;
  document.getElementById("slideBody").textContent = slide.content;
  document.getElementById("slideCounter").textContent = `SLIDE ${formattedNum} / ${String(slides.length).padStart(2, "0")}`;
  if (topCounter) topCounter.textContent = `SLIDE ${formattedNum} NG ${String(slides.length).padStart(2, "0")}`;
  if (watermark) watermark.textContent = formattedNum;

  const dots = document.querySelectorAll("#slideDots .slide-dot");
  dots.forEach((d, idx) => {
    d.classList.toggle("active", idx === currentSlideIndex);
  });
}

function changeSlide(step) {
  const slides = modulesData[currentGrade].slides;
  if (!slides || slides.length === 0) return;
  currentSlideIndex = (currentSlideIndex + step + slides.length) % slides.length;
  updateSlideDisplay();
}

// =========================================
// SANAYAN (WORKBOOK EXERCISE) COMPONENT
// =========================================
function loadExercises() {
  const questions = modulesData[currentGrade].exercises || [];
  const container = document.getElementById("quizContainer");
  const badge = document.getElementById("quizCountBadge");
  const scoreDisplay = document.getElementById("quizScoreDisplay");

  container.innerHTML = "";
  if (badge) badge.textContent = questions.length;
  if (scoreDisplay) scoreDisplay.textContent = `0 / ${questions.length}`;

  if (questions.length === 0) {
    container.innerHTML = "<p>Wala pang pagsasanay na nakalagay para sa baitang na ito.</p>";
    return;
  }

  const letters = ["A", "B", "C", "D", "E", "F"];
  const answeredCorrectly = new Set();

  questions.forEach((q, qIndex) => {
    const card = document.createElement("div");
    card.className = "question-card";

    const itemTag = document.createElement("span");
    itemTag.className = "question-item-tag";
    itemTag.textContent = `AYTEM BLG. ${String(qIndex + 1).padStart(2, "0")}`;
    card.appendChild(itemTag);

    const title = document.createElement("strong");
    title.textContent = q.question;
    card.appendChild(title);

    const optGrid = document.createElement("div");
    optGrid.className = "options-grid";

    q.options.forEach((optText, optIndex) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";

      const letterSpan = document.createElement("span");
      letterSpan.className = "opt-letter";
      letterSpan.textContent = letters[optIndex] || (optIndex + 1);

      const textSpan = document.createElement("span");
      textSpan.textContent = optText;

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);

      btn.addEventListener("click", () => {
        optGrid.querySelectorAll(".option-btn").forEach(b => b.classList.remove("correct", "wrong"));

        voiceCorrect.pause();
        voiceCorrect.currentTime = 0;
        voiceWrong.pause();
        voiceWrong.currentTime = 0;

        const isCorrect = (optIndex === q.answerIndex);
        const feedback = card.querySelector(".feedback-msg");
        feedback.className = "feedback-msg";

        if (isCorrect) {
          btn.classList.add("correct");
          feedback.textContent = "[ TAMA • MAHUSAY ] Nakuha mo ang wastong kasagutan!";
          feedback.classList.add("show-correct");
          answeredCorrectly.add(qIndex);
          voiceCorrect.play().catch(() => {});
        } else {
          btn.classList.add("wrong");
          feedback.textContent = "[ MALI • SUBUKANG MULI ] Pumili ng ibang titik.";
          feedback.classList.add("show-wrong");
          answeredCorrectly.delete(qIndex);
          voiceWrong.play().catch(() => {});
        }

        if (scoreDisplay) {
          scoreDisplay.textContent = `${answeredCorrectly.size} / ${questions.length}`;
        }
      });

      optGrid.appendChild(btn);
    });

    const msg = document.createElement("div");
    msg.className = "feedback-msg";

    card.appendChild(optGrid);
    card.appendChild(msg);
    container.appendChild(card);
  });
}
