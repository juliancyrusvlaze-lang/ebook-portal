let currentGrade = "Grade 7";
let currentSlideIndex = 0;

const lectureAudio = new Audio();
const voiceCorrect = new Audio("audio/feedback/tama_voice.mp3");
const voiceWrong = new Audio("audio/feedback/mali_voice.mp3");

function openGrade(gradeName) {
  currentGrade = gradeName;
  document.getElementById("dashboardView").classList.add("hidden");
  document.getElementById("moduleView").classList.remove("hidden");
  document.getElementById("currentGradeTitle").textContent = gradeName;

  loadAralin();
  loadSlides();
  loadExercises();
}

function goBack() {
  pauseVoice();
  document.getElementById("moduleView").classList.add("hidden");
  document.getElementById("dashboardView").classList.remove("hidden");
}

function switchTab(tabName, btn) {
  pauseVoice();
  document.getElementById("aralinPptTab").classList.add("hidden");
  document.getElementById("exerciseTab").classList.add("hidden");
  document.querySelectorAll(".nav-bar .tab-btn").forEach(b => b.classList.remove("active"));

  document.getElementById(tabName + "Tab").classList.remove("hidden");
  btn.classList.add("active");
}

// ARALIN COMPONENT
function loadAralin() {
  const data = modulesData[currentGrade].aralin;
  document.getElementById("aralinTitle").textContent = data.title;
  lectureAudio.src = data.audioSrc;

  const container = document.getElementById("lectureContainer");
  container.innerHTML = "";

  if (!data.segments || data.segments.length === 0) {
    container.innerHTML = "<p>Wala pang teksto na nakalagay para sa baitang na ito.</p>";
    return;
  }

  data.segments.forEach(item => {
    const span = document.createElement("span");
    span.className = "voice-word";
    span.textContent = item.word + " ";
    span.dataset.start = item.start;
    span.dataset.end = item.end;

    span.addEventListener("click", () => {
      lectureAudio.currentTime = item.start;
      lectureAudio.play().catch(() => {});
    });

    container.appendChild(span);
  });
}

function playVoice() {
  lectureAudio.play().catch(() => {
    alert("Hindi nahanap ang audio file sa folder na audio/lectures/.");
  });
}

function pauseVoice() {
  lectureAudio.pause();
}

lectureAudio.addEventListener("timeupdate", () => {
  const curTime = lectureAudio.currentTime;
  const words = document.querySelectorAll("#lectureContainer .voice-word");

  words.forEach(span => {
    const start = parseFloat(span.dataset.start);
    const end = parseFloat(span.dataset.end);

    if (curTime >= start && curTime <= end) {
      if (!span.classList.contains("active-word")) {
        document.querySelectorAll(".voice-word.active-word").forEach(w => w.classList.remove("active-word"));
        span.classList.add("active-word");
        span.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (curTime > end) {
      span.classList.remove("active-word");
    }
  });
});

// PPT SLIDE VIEWER
function loadSlides() {
  currentSlideIndex = 0;
  updateSlideDisplay();
}

function updateSlideDisplay() {
  const slides = modulesData[currentGrade].slides;
  if (!slides || slides.length === 0) {
    document.getElementById("slideTitle").textContent = "Walang Slides";
    document.getElementById("slideBody").textContent = "";
    document.getElementById("slideCounter").textContent = "0 sa 0";
    return;
  }
  const slide = slides[currentSlideIndex];
  document.getElementById("slideTitle").textContent = slide.title;
  document.getElementById("slideBody").textContent = slide.content;
  document.getElementById("slideCounter").textContent = `Slide ${currentSlideIndex + 1} sa ${slides.length}`;
}

function changeSlide(step) {
  const slides = modulesData[currentGrade].slides;
  if (!slides || slides.length === 0) return;
  currentSlideIndex = (currentSlideIndex + step + slides.length) % slides.length;
  updateSlideDisplay();
}

// EXERCISE COMPONENT
function loadExercises() {
  const questions = modulesData[currentGrade].exercises;
  const container = document.getElementById("quizContainer");
  container.innerHTML = "";

  if (!questions || questions.length === 0) {
    container.innerHTML = "<p>Wala pang pagsasanay na nakalagay para sa baitang na ito.</p>";
    return;
  }

  questions.forEach(q => {
    const card = document.createElement("div");
    card.className = "question-card";

    const title = document.createElement("strong");
    title.textContent = q.question;
    card.appendChild(title);

    const optGrid = document.createElement("div");
    optGrid.className = "options-grid";

    q.options.forEach((optText, optIndex) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = optText;

      btn.addEventListener("click", () => {
        optGrid.querySelectorAll(".option-btn").forEach(b => b.classList.remove("correct", "wrong"));

        voiceCorrect.pause();
        voiceCorrect.currentTime = 0;
        voiceWrong.pause();
        voiceWrong.currentTime = 0;

        const isCorrect = (optIndex === q.answerIndex);
        const feedback = card.querySelector(".feedback-msg");

        if (isCorrect) {
          btn.classList.add("correct");
          feedback.textContent = "[TAMA] Magaling! Nakuha mo ang tamang sagot.";
          feedback.style.color = "#15803d";
          voiceCorrect.play().catch(() => {});
        } else {
          btn.classList.add("wrong");
          feedback.textContent = "[MALI] Subukang pumili muli.";
          feedback.style.color = "#b91c1c";
          voiceWrong.play().catch(() => {});
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