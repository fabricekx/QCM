let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let testStartTime=0;

// Elements
const themeSelect = document.getElementById("themeSelect");
const form_debut=document.getElementById("formulaire");
const eleve = document.getElementById("eleve");
const startBtn = document.getElementById("start");
const nextBtn = document.getElementById("next");
const qcmDiv = document.getElementById("qcm");
const h1Title = document.querySelector("h1"); // <- déclaration ici
const time=document.getElementById("time");
// Mélange un tableau
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Calcul du temps
function calculateTime(testStartTime) {
  let testEndTime = Date.now();
let elapsedMs = testEndTime - testStartTime;
let seconds = Math.floor(elapsedMs / 1000);
let minutes = Math.floor(seconds / 60);
seconds = seconds % 60;
  return { minutes, seconds, elapsedMs };
}

// Timer
function startTimer() {
  testStartTime = Date.now();
time.style.display = "block";
  timerInterval = setInterval(() => {
    const { minutes, seconds } = calculateTime(testStartTime);
    document.getElementById("timer").textContent =
      `${minutes} min ${seconds} s`;
  }, 1000);
}

// Affiche la question courante avec radio buttons
function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
    showResults(); // délègue l'affichage à la fonction dédiée

    return;
  }

  const q = questions[currentQuestionIndex];

  let optionsHtml = q.options
    .map(
      (opt, i) => `
    <label>
      <input type="radio" name="answer" value="${i}"> ${opt}
    </label><br>
  `
    )
    .join("");

  qcmDiv.innerHTML = `
    <h3>${currentQuestionIndex+1}/${questions.length} ${q.question}</h3>
    <form id="qcmForm">
      ${optionsHtml}
    </form>
  `;
  qcmDiv.style.display = "block";
  nextBtn.style.display = "inline-block";
}

// Vérifie la réponse et passe à la suivante
let wrongAnswers = []; // stockage des mauvaises réponses

nextBtn.addEventListener("click", () => {
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) {
    alert("Veuillez sélectionner une réponse !");
    return;
  }
  let answer = parseInt(selected.value);
  if (answer === questions[currentQuestionIndex].answer) {
    score++;
  } else {
    wrongAnswers.push({
      question: questions[currentQuestionIndex].question,
      yourAnswer: questions[currentQuestionIndex].options[answer],
      correctAnswer:
        questions[currentQuestionIndex].options[
          questions[currentQuestionIndex].answer
        ],
    });
  }

  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    showResults();
  }
});

// Démarrer le quiz
startBtn.addEventListener("click", async () => {
  const theme = themeSelect.value;
  const nomEleve = eleve.value;
 startTimer()  // initialise testStartTime et affiche le timer dans la div
  if (!theme) {
    alert("Choisissez un thème !");
    return;
  }
  if (!nomEleve) {
    alert("Choisissez un étudiant !");
    return;
  }
  // console.log("Theme choisi " + theme);
  try {
    const response = await fetch(`questions/${theme}.json`);
    questions = await response.json();

    shuffleArray(questions); // mélanger les questions
    currentQuestionIndex = 0;
    score = 0;

    // Cacher le formulaire de début: selects (theme et nom) et le bouton start
  
    form_debut.style.display="none"
    // Changer le titre pour le thème sélectionné
    let themeText = themeSelect.options[themeSelect.selectedIndex].text;
    h1Title.textContent = `QCM : ${themeText}`;

    showQuestion();
  } catch (err) {
    console.error("Erreur chargement JSON :", err);
    alert("Impossible de charger le fichier de questions !");
  }
});



function showResults() {
  time.style.display = "none";
  const nomEleve = eleve.value;
  const theme= themeSelect.value; // récupération de la value, pas du texte
const { minutes, seconds, elapsedMs } = calculateTime(testStartTime);
  qcmDiv.innerHTML = `<h2>Test terminé en ${minutes} min ${seconds} s !</h2><p>Score de ${nomEleve}: ${score}/${questions.length}</p><br><h3 id="appel"> Appel Fabrice pour validation</h3>`;

  if (wrongAnswers.length === 0) {
    qcmDiv.innerHTML += "<p>🎉 Bravo ! Vous avez tout juste !</p>";
  } else {
    qcmDiv.innerHTML += `<p>Vous avez ${wrongAnswers.length} erreur(s) :</p>`;
    let list = "<ul>";
    wrongAnswers.forEach((item) => {
      list += `<li><strong>${item.question}</strong><br>
                     Votre réponse : ${item.yourAnswer}<br>
                     Réponse correcte : ${item.correctAnswer}</li>`;
    });
    list += "</ul>";
    qcmDiv.innerHTML += list;
  }

  nextBtn.style.display = "none"; // cacher le bouton

  // script pour envoyer les notes sur ma google sheet:
  fetch("https://script.google.com/macros/s/AKfycbxTQJ4KUPYOgsMbiO2eSO6FyPDS4C_sZLaLC0Ii57SAws3KnJzJN8pu1Bu7mB0VRZ-ulg/exec", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded" // on ne passe pas un json car ca bloque
  },
  body: new URLSearchParams({
    key: "123SECRETnotes1apg",
    theme : theme,
    nom: nomEleve,
    duree: elapsedMs,
    note: score
  })
})
.then(r => r.text())
.then(console.log);

  
}
