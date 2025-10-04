let questions = [];
let currentQuestionIndex = 0;
let score = 0;

// Elements
const themeSelect = document.getElementById("themeSelect");
const startBtn = document.getElementById("start");
const nextBtn = document.getElementById("next");
const qcmDiv = document.getElementById("qcm");
const h1Title = document.querySelector("h1"); // <- déclaration ici

// Mélange un tableau
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Affiche la question courante avec radio buttons
function showQuestion() {
  if (currentQuestionIndex >= questions.length) {
     showResults(); // délègue l'affichage à la fonction dédiée

    return;
  }

  const q = questions[currentQuestionIndex];

  let optionsHtml = q.options.map((opt, i) => `
    <label>
      <input type="radio" name="answer" value="${i}"> ${opt}
    </label><br>
  `).join("");

  qcmDiv.innerHTML = `
    <h3>${q.question}</h3>
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
  }
  else { wrongAnswers.push({
            question: questions[currentQuestionIndex].question,
            yourAnswer: questions[currentQuestionIndex].options[answer],
    correctAnswer: questions[currentQuestionIndex].options[questions[currentQuestionIndex].answer]
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
  if (!theme) {
    alert("Choisissez un thème !");
    return;
  }
// console.log("Theme choisi " + theme);
  try {
    const response = await fetch(`questions/${theme}.json`);
    questions = await response.json();

    shuffleArray(questions); // mélanger les questions
    currentQuestionIndex = 0;
    score = 0;

    // Cacher le select et le bouton start
    themeSelect.style.display = "none";
    startBtn.style.display = "none";
    label.style.display = "none";
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
    qcmDiv.innerHTML = `<h2>Test terminé !</h2><p>Score : ${score}/${questions.length}</p><br><h3 id="appel"> Appel Fabrice pour validation</h3>`;

    if (wrongAnswers.length === 0) {
        qcmDiv.innerHTML += "<p>🎉 Bravo ! Vous avez tout juste !</p>";
    } else {
        qcmDiv.innerHTML += `<p>Vous avez ${wrongAnswers.length} erreur(s) :</p>`;
        let list = "<ul>";
        wrongAnswers.forEach(item => {
            list += `<li><strong>${item.question}</strong><br>
                     Votre réponse : ${item.yourAnswer}<br>
                     Réponse correcte : ${item.correctAnswer}</li>`;
        });
        list += "</ul>";
        qcmDiv.innerHTML += list;
    }

    nextBtn.style.display = "none"; // cacher le bouton
}

