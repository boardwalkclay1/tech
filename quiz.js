const DEMO_MODE = true;
const WS_PATH = "/ws";

let ws = null;
let isConnected = false;
let selfId = null;

let connectionDotEl, connectionTextEl;
let quizContainerEl, leaderboardEl;

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

const questions = [
  {
    q: "Which material is most commonly used for lightweight armor cosplay?",
    options: ["EVA Foam", "Steel", "Wood", "Fiberglass"],
    answer: 0
  },
  {
    q: "Which anime features the character Zero Two?",
    options: ["Darling in the Franxx", "Naruto", "Bleach", "One Piece"],
    answer: 0
  },
  {
    q: "What is the term for posing dramatically in cosplay?",
    options: ["Kigurumi", "Kamehameha", "Tokusatsu", "Dramatic Posing"],
    answer: 3
  },
  {
    q: "Which tool is essential for foam crafting?",
    options: ["Heat Gun", "Chainsaw", "Soldering Iron", "Paint Roller"],
    answer: 0
  }
];

let currentQuestion = 0;
let score = 0;

let leaderboard = {};

function renderQuestion() {
  const q = questions[currentQuestion];

  quizContainerEl.innerHTML = `
    <div class="quiz-question">
      <p class="quiz-q">${q.q}</p>
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
      if (idx === q.answer) score++;

      currentQuestion++;
      if (currentQuestion < questions.length) {
        renderQuestion();
      } else {
        finishQuiz();
      }
    });
  });
}

function finishQuiz() {
  quizContainerEl.innerHTML = `
    <div class="quiz-finish">
      <p>You scored <strong>${score}</strong> out of ${questions.length}</p>
    </div>
  `;

  leaderboard[selfId] = score;
  renderLeaderboard();
}

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

window.addEventListener("load", () => {
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");
  quizContainerEl = document.getElementById("quiz-container");
  leaderboardEl = document.getElementById("quiz-leaderboard");

  selfId = randomId();

  connectWebSocket();
  renderQuestion();
});
