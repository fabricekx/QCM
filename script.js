let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let testStartTime = 0;
let timerInterval = null;
let questionInterval = null;
let quizStarted = false;
let quizEnded = false;
let questionStartTime = 0;
let isSubmittingAnswer = false;
let isQuizPausedForFullscreen = false;
let pauseStartedAt = 0;

const QUESTION_TIME_LIMIT_SEC = 20;
const MAX_FULLSCREEN_EXITS = 3;

// Elements
const themeSelect = document.getElementById("themeSelect");
const form_debut = document.getElementById("formulaire");
const eleve = document.getElementById("eleve");
const startBtn = document.getElementById("start");
const nextBtn = document.getElementById("next");
const qcmDiv = document.getElementById("qcm");
const h1Title = document.querySelector("h1");
const time = document.getElementById("time");

const blockedShortcuts = new Set(["c", "v", "x", "a", "s", "p", "u"]);
const antiCheatEventOptions = { capture: true };
const antiCheatAttempts = {
  copy: 0,
  cut: 0,
  paste: 0,
  contextmenu: 0,
  dragstart: 0,
  keyboard: 0,
  fullscreenExit: 0,
  focusLoss: 0
};

function resetAntiCheatAttempts() {
  antiCheatAttempts.copy = 0;
  antiCheatAttempts.cut = 0;
  antiCheatAttempts.paste = 0;
  antiCheatAttempts.contextmenu = 0;
  antiCheatAttempts.dragstart = 0;
  antiCheatAttempts.keyboard = 0;
  antiCheatAttempts.fullscreenExit = 0;
  antiCheatAttempts.focusLoss = 0;
}

function getAntiCheatTotalAttempts() {
  return antiCheatAttempts.copy
    + antiCheatAttempts.cut
    + antiCheatAttempts.paste
    + antiCheatAttempts.contextmenu
    + antiCheatAttempts.dragstart
    + antiCheatAttempts.keyboard
    + antiCheatAttempts.fullscreenExit
    + antiCheatAttempts.focusLoss;
}

function ensureToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", durationMs = 2200) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
  }, Math.max(400, durationMs - 300));

  setTimeout(() => {
    toast.remove();
  }, durationMs);
}

// Melange un tableau
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Calcul du temps
function calculateTime(startTime) {
  const elapsedMs = Date.now() - startTime;
  let seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;
  return { minutes, seconds, elapsedMs };
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes} min ${seconds} s`;
}

function getQuizTimeLimitSec() {
  return questions.length * QUESTION_TIME_LIMIT_SEC;
}

function updateTimerDisplay() {
  const elapsedSec = Math.floor((Date.now() - testStartTime) / 1000);
  const globalRemaining = getQuizTimeLimitSec() - elapsedSec;
  const questionElapsed = Math.floor((Date.now() - questionStartTime) / 1000);
  const questionRemaining = QUESTION_TIME_LIMIT_SEC - questionElapsed;

  document.getElementById("timer").textContent =
    `Global restant: ${formatClock(globalRemaining)} | Question restante: ${formatClock(questionRemaining)}`;
}

function stopAllTimers() {
  clearInterval(timerInterval);
  clearInterval(questionInterval);
}

function startGlobalTimer(resetStart = true) {
  if (resetStart) {
    testStartTime = Date.now();
  }
  clearInterval(timerInterval);
  time.style.display = "block";
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (quizEnded) {
      return;
    }

    const elapsedSec = Math.floor((Date.now() - testStartTime) / 1000);
    if (elapsedSec >= getQuizTimeLimitSec()) {
      finishQuiz("Temps global depasse.");
      return;
    }

    updateTimerDisplay();
  }, 1000);
}

function startQuestionTimer(resetStart = true) {
  clearInterval(questionInterval);
  if (resetStart) {
    questionStartTime = Date.now();
  }
  updateTimerDisplay();

  questionInterval = setInterval(() => {
    if (quizEnded) {
      return;
    }

    const questionElapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    if (questionElapsed >= QUESTION_TIME_LIMIT_SEC) {
      submitCurrentAnswer({ forcedTimeout: true });
      return;
    }

    updateTimerDisplay();
  }, 1000);
}

// Affiche la question courante
function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    showResults();
    return;
  }

  const q = questions[currentQuestionIndex];

  const optionsHtml = q.options
    .map(
      (opt, i) => `
    <label>
      <input type="radio" name="answer" value="${i}"> ${opt}
    </label><br>
  `
    )
    .join("");

  qcmDiv.innerHTML = `
    <h3>${currentQuestionIndex + 1}/${questions.length} ${q.question}</h3>
    <form id="qcmForm">
      ${optionsHtml}
    </form>
  `;
  qcmDiv.style.display = "block";
  nextBtn.style.display = "inline-block";
  startQuestionTimer();
}

let wrongAnswers = [];

function submitCurrentAnswer({ forcedTimeout = false } = {}) {
  if (quizEnded || isQuizPausedForFullscreen || currentQuestionIndex >= questions.length || isSubmittingAnswer) {
    return;
  }
  isSubmittingAnswer = true;

  // Evite une course entre le clic manuel et l'expiration du timer.
  if (!forcedTimeout) {
    clearInterval(questionInterval);
  }

  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected && !forcedTimeout) {
    showToast("Veuillez selectionner une reponse.", "warning");
    isSubmittingAnswer = false;
    startQuestionTimer();
    return;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answer = selected ? parseInt(selected.value, 10) : -1;

  if (!forcedTimeout && answer === currentQuestion.answer) {
    score++;
  } else {
    wrongAnswers.push({
      question: currentQuestion.question,
      yourAnswer: forcedTimeout
        ? "Aucune reponse (temps ecoule)"
        : currentQuestion.options[answer],
      correctAnswer: currentQuestion.options[currentQuestion.answer]
    });
  }

  currentQuestionIndex++;
  isSubmittingAnswer = false;
  showQuestion();
}

nextBtn.addEventListener("click", () => {
  submitCurrentAnswer();
});

function antiCheatHandler(event) {
  if (!quizStarted || quizEnded) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(antiCheatAttempts, event.type)) {
    antiCheatAttempts[event.type] += 1;
  }
  event.preventDefault();
  event.stopPropagation();
}

function keydownAntiCheatHandler(event) {
  if (!quizStarted || quizEnded) {
    return;
  }

  const key = event.key.toLowerCase();
  const isShortcut = (event.ctrlKey || event.metaKey) && blockedShortcuts.has(key);
  const isDevtoolsShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey
    && (key === "i" || key === "j" || key === "c");
  const isF12 = key === "f12";

  if (isShortcut || isDevtoolsShortcut || isF12) {
    antiCheatAttempts.keyboard += 1;
    event.preventDefault();
    event.stopPropagation();
  }
}

function installAntiCheatGuards() {
  document.addEventListener("copy", antiCheatHandler, antiCheatEventOptions);
  document.addEventListener("cut", antiCheatHandler, antiCheatEventOptions);
  document.addEventListener("paste", antiCheatHandler, antiCheatEventOptions);
  document.addEventListener("contextmenu", antiCheatHandler, antiCheatEventOptions);
  document.addEventListener("dragstart", antiCheatHandler, antiCheatEventOptions);
  document.addEventListener("keydown", keydownAntiCheatHandler, antiCheatEventOptions);
  window.addEventListener("contextmenu", antiCheatHandler, antiCheatEventOptions);
}

function removeAntiCheatGuards() {
  document.removeEventListener("copy", antiCheatHandler, antiCheatEventOptions);
  document.removeEventListener("cut", antiCheatHandler, antiCheatEventOptions);
  document.removeEventListener("paste", antiCheatHandler, antiCheatEventOptions);
  document.removeEventListener("contextmenu", antiCheatHandler, antiCheatEventOptions);
  document.removeEventListener("dragstart", antiCheatHandler, antiCheatEventOptions);
  document.removeEventListener("keydown", keydownAntiCheatHandler, antiCheatEventOptions);
  window.removeEventListener("contextmenu", antiCheatHandler, antiCheatEventOptions);
}

function removeFullscreenRestorePrompt() {
  const existing = document.getElementById("fullscreenRestorePrompt");
  if (existing) {
    existing.remove();
  }
}

function showFullscreenRestorePrompt() {
  removeFullscreenRestorePrompt();

  const prompt = document.createElement("div");
  prompt.id = "fullscreenRestorePrompt";
  prompt.innerHTML = `
    <div class="toast toast-warning">
      Plein ecran requis. Cliquez pour reprendre le QCM.
      <button id="fullscreenRestoreBtn" type="button">Revenir en plein ecran</button>
    </div>
  `;
  document.body.appendChild(prompt);

  const restoreBtn = document.getElementById("fullscreenRestoreBtn");
  restoreBtn.addEventListener("click", async () => {
    await requestQuizFullscreen();
  });
}

function pauseQuizForFullscreenRestore() {
  if (isQuizPausedForFullscreen || quizEnded) {
    return;
  }
  isQuizPausedForFullscreen = true;
  pauseStartedAt = Date.now();
  stopAllTimers();
  nextBtn.disabled = true;
  showToast("Plein ecran quitte. Revenez en plein ecran pour continuer.", "warning", 3000);
  showFullscreenRestorePrompt();
}

function resumeQuizAfterFullscreenRestore() {
  if (!isQuizPausedForFullscreen || quizEnded) {
    return;
  }
  const pauseDuration = Date.now() - pauseStartedAt;
  testStartTime += pauseDuration;
  questionStartTime += pauseDuration;
  isQuizPausedForFullscreen = false;
  nextBtn.disabled = false;
  removeFullscreenRestorePrompt();
  showToast("Quiz repris.", "info", 1200);
  startGlobalTimer(false);
  startQuestionTimer(false);
}

function fullscreenChangeHandler() {
  if (!quizStarted || quizEnded) {
    return;
  }

  if (!document.fullscreenElement) {
    antiCheatAttempts.fullscreenExit += 1;
    if (antiCheatAttempts.fullscreenExit >= MAX_FULLSCREEN_EXITS) {
      finishQuiz("Trop de sorties du plein ecran detectees.");
      return;
    }
    pauseQuizForFullscreenRestore();
    return;
  }
  resumeQuizAfterFullscreenRestore();
}

function visibilityChangeHandler() {
  if (!quizStarted || quizEnded) {
    return;
  }
  if (document.visibilityState === "hidden") {
    antiCheatAttempts.focusLoss += 1;
    finishQuiz("Changement de fenetre detecte.");
  }
}

async function requestQuizFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch (err) {
    showToast("Le mode plein ecran est obligatoire pour commencer le QCM.", "error");
    return false;
  }
}

async function exitFullscreenIfNeeded() {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (err) {
      console.warn("Impossible de quitter le plein ecran:", err);
    }
  }
}

function finishQuiz(reason) {
  if (quizEnded) {
    return;
  }

  if (reason) {
    showToast(reason, "error");
  }

  showResults();
}

// Demarrer le quiz
startBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  const nomEleve = eleve.value;

  if (!theme) {
    showToast("Choisissez un theme.", "warning");
    return;
  }
  if (!nomEleve) {
    showToast("Choisissez un etudiant.", "warning");
    return;
  }

  const fullscreenOk = await requestQuizFullscreen();
  if (!fullscreenOk) {
    return;
  }

  try {
    const response = await fetch(`questions/${theme}.json`);
    questions = await response.json();

    shuffleArray(questions);
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    resetAntiCheatAttempts();
    quizStarted = true;
    quizEnded = false;

    installAntiCheatGuards();
    document.addEventListener("fullscreenchange", fullscreenChangeHandler);
    document.addEventListener("visibilitychange", visibilityChangeHandler);
    startGlobalTimer();

    form_debut.style.display = "none";

    const themeText = themeSelect.options[themeSelect.selectedIndex].text;
    h1Title.textContent = `QCM : ${themeText}`;

    showQuestion();
  } catch (err) {
    console.error("Erreur chargement JSON :", err);
    showToast("Impossible de charger le fichier de questions.", "error");
  }
});

function showResults() {
  quizEnded = true;
  stopAllTimers();
  removeAntiCheatGuards();
  removeFullscreenRestorePrompt();
  isQuizPausedForFullscreen = false;
  document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
  document.removeEventListener("visibilitychange", visibilityChangeHandler);
  exitFullscreenIfNeeded();

  time.style.display = "none";

  const nomEleve = eleve.value;
  const theme = themeSelect.value;
  const { minutes, seconds } = calculateTime(testStartTime);

  qcmDiv.innerHTML = `<h2>Test termine en ${minutes} min ${seconds} s !</h2><p>Score de ${nomEleve}: ${score}/${questions.length}</p><br><h3 id="appel"> Appel Fabrice pour validation</h3>`;

  const completedAllQuestions = currentQuestionIndex >= questions.length;
  const allCorrect = score === questions.length;

  if (completedAllQuestions && allCorrect) {
    qcmDiv.innerHTML += "<p>Bravo ! Vous avez tout juste !</p>";
  } else {
    qcmDiv.innerHTML += `<p>Vous avez ${wrongAnswers.length} erreur(s) :</p>`;
    let list = "<ul>";
    wrongAnswers.forEach((item) => {
      list += `<li><strong>${item.question}</strong><br>
                     Votre reponse : ${item.yourAnswer}<br>
                     Reponse correcte : ${item.correctAnswer}</li>`;
    });
    list += "</ul>";
    qcmDiv.innerHTML += list;
  }

  nextBtn.style.display = "none";

  fetch("https://script.google.com/macros/s/AKfycbwAmitBnww8YIGC8_ON2avTnysxk4ftBK5ZYAbE0C9I3jZMoqbVLMpjtwgx72xN5oaw7A/exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      key: "123SECRETnotes1apg",
      theme: theme,
      nom: nomEleve,
      qcmStartAt: new Date(testStartTime).toISOString(),
      note: score,
      antiCheatTotal: getAntiCheatTotalAttempts(),
      antiCheatCopy: antiCheatAttempts.copy,
      antiCheatCut: antiCheatAttempts.cut,
      antiCheatPaste: antiCheatAttempts.paste,
      antiCheatContextMenu: antiCheatAttempts.contextmenu,
      antiCheatDragStart: antiCheatAttempts.dragstart,
      antiCheatKeyboard: antiCheatAttempts.keyboard,
      antiCheatFullscreenExit: antiCheatAttempts.fullscreenExit,
      antiCheatFocusLoss: antiCheatAttempts.focusLoss
    })
  })
    .then((r) => r.text())
    .then(console.log);
}
