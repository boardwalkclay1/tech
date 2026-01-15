const DEMO_MODE = true;
const WS_PATH = "/ws";

let ws = null;
let isConnected = false;
let selfId = null;

let connectionDotEl, connectionTextEl;
let quizContainerEl, leaderboardEl;

// Utility
function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function setConnection(connected) {
  isConnected = connected;
  if (connected) {
    connectionDotEl.classList.remove("status-disconnected");
    connectionDotEl.classList.add("status-connected");
    connectionTextEl.textContent = "Linked to Quiz Node";
  } else {
    connectionDotEl.classList.remove("status-connected");
    connectionDotEl.classList.add("status-disconnected");
    connectionTextEl.textContent = "Offline demo mode";
  }
}

function connectWebSocket() {
  if (DEMO_MODE) {
    setConnection(false);
    return;
  }
}

// ----------------------------
// ADVANCED QUESTION BANK
// ----------------------------
const questions = [
  // Cosplay
  {
    q: "Which material is most commonly used for lightweight armor cosplay?",
    options: ["EVA Foam", "Steel", "Wood", "Fiberglass"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Which tool is essential for foam crafting?",
    options: ["Heat Gun", "Chainsaw", "Soldering Iron", "Paint Roller"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Which paint type bonds best to sealed EVA foam?",
    options: ["Acrylic", "Oil Paint", "Watercolor", "Ink Wash"],
    answer: 0,
    difficulty: "Medium"
  },

  // Anime
  {
    q: "Which anime features the character Zero Two?",
    options: ["Darling in the Franxx", "Naruto", "Bleach", "One Piece"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Who is known as the 'Copy Ninja'?",
    options: ["Kakashi", "Levi", "Gojo", "Aizen"],
    answer: 0,
    difficulty: "Medium"
  },
  {
    q: "Which anime introduced the term 'Bankai'?",
    options: ["Bleach", "Attack on Titan", "Jujutsu Kaisen", "Trigun"],
    answer: 0,
    difficulty: "Easy"
  },

  // Gaming
  {
    q: "What year was the original PlayStation released?",
    options: ["1994", "1998", "1990", "2000"],
    answer: 0,
    difficulty: "Hard"
  },
  {
    q: "Which game popularized the phrase 'Do a barrel roll!'?",
    options: ["Star Fox 64", "Halo", "Metroid Prime", "F-Zero"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Which engine powers Fortnite?",
    options: ["Unreal Engine", "Unity", "CryEngine", "Source"],
    answer: 0,
    difficulty: "Medium"
  },

  // Tech
  {
    q: "What does GPU stand for?",
    options: ["Graphics Processing Unit", "General Power Unit", "Graphical Performance Utility", "Grid Processing Unit"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Which company created the CUDA architecture?",
    options: ["NVIDIA", "AMD", "Intel", "Qualcomm"],
    answer: 0,
    difficulty: "Medium"
  },
  {
    q: "Which protocol does WebSocket upgrade from?",
    options: ["HTTP", "FTP", "SSH", "SMTP"],
    answer: 0,
    difficulty: "Medium"
  },

  // Maker / Craft
  {
    q: "Which tool is best for smoothing 3D prints?",
    options: ["Sanding Block", "Hammer", "Wire Brush", "Chisel"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "PLA filament melts at approximately what temperature?",
    options: ["180–220°C", "80–100°C", "300–350°C", "120–150°C"],
    answer: 0,
    difficulty: "Medium"
  },

  // Pop Culture
  {
    q: "Which movie features the quote 'There is no spoon'?",
    options: ["The Matrix", "Inception", "Blade Runner", "Ghost in the Shell"],
    answer: 0,
    difficulty: "Easy"
  },
  {
    q: "Who directed 'Spirited Away'?",
    options: ["Hayao Miyazaki", "Makoto Shinkai", "Satoshi Kon", "Mamoru Hosoda"],
    answer: 0,
    difficulty: "Medium"
  },

  // Harder Trivia
  {
    q: "Which programming language introduced the concept of 'Promises' first?",
    options: ["JavaScript", "Python", "Lisp", "Smalltalk"],
    answer: 3,
    difficulty: "Hard"
  },
  {
    q: "Which console used mini optical discs?",
    options: ["GameCube", "PS2", "Dreamcast", "Xbox"],
    answer: 0,
    difficulty: "Medium"
  },
  {
    q: "Which cyberpunk author wrote 'Neuromancer'?",
    options: ["William Gibson", "Neal Stephenson", "Philip K. Dick", "Isaac Asimov"],
    answer: 0,
    difficulty: "Hard"
  }
];

// Shuffle for fairness
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

let currentQuestion = 0;
let score = 0;
let leaderboard = {};

const shuffledQuestions = shuffle([...questions]);

// ----------------------------
// RENDER QUESTION
// ----------------------------
function renderQuestion() {
  const q = shuffledQuestions[currentQuestion];

  quizContainerEl.innerHTML = `
    <div class="quiz-progress">
      Question ${currentQuestion + 1} / ${shuffledQuestions.length}
    </div>

    <div class="quiz-question">
      <p class="quiz-q">${q.q}</p>
      <p class="quiz-diff">Difficulty: <strong>${q.difficulty}</strong></p>

      <div class="quiz-options">
        ${q.options
          .map(
            (opt, i) =>
              `<button class="quiz-option" data-index="${i}">${opt}</button>`
          )
          .join("")}
      </div>
    </div>
  `;

  document.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);

      if (idx === q.answer) {
        score++;
        btn.classList.add("correct");
      } else {
        btn.classList.add("incorrect");
      }

      setTimeout(() => {
        currentQuestion++;
        if (currentQuestion < shuffledQuestions.length) {
          renderQuestion();
        } else {
          finishQuiz();
        }
      }, 500);
    });
  });
}

// ----------------------------
// FINISH QUIZ
// ----------------------------
function finishQuiz() {
  quizContainerEl.innerHTML = `
    <div class="quiz-finish">
      <p>You scored <strong>${score}</strong> out of ${shuffledQuestions.length}</p>
    </div>
  `;

  leaderboard[selfId] = score;
  renderLeaderboard();
}

// ----------------------------
// LEADERBOARD
// ----------------------------
function renderLeaderboard() {
  const sorted = Object.entries(leaderboard).sort((a, b) => b[1] - a[1]);

  leaderboardEl.innerHTML = `
    <h3>Leaderboard</h3>
    <ul>
      ${sorted
        .map(
          ([id, sc]) =>
            `<li>${id === selfId ? "You" : id}: <strong>${sc}</strong></li>`
        )
        .join("")}
    </ul>
  `;
}

// ----------------------------
// INIT
// ----------------------------
window.addEventListener("load", () => {
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");
  quizContainerEl = document.getElementById("quiz-container");
  leaderboardEl = document.getElementById("quiz-leaderboard");

  selfId = randomId();

  connectWebSocket();
  renderQuestion();
});
