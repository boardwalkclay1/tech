// Simple stats increment for visits
function loadStats() {
  try {
    const raw = localStorage.getItem("tnc_stats");
    return raw ? JSON.parse(raw) : { visits: 0, pongWins: 0, quizHighScore: 0 };
  } catch {
    return { visits: 0, pongWins: 0, quizHighScore: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem("tnc_stats", JSON.stringify(stats));
}

window.addEventListener("load", () => {
  const dot = document.getElementById("connection-dot");
  const text = document.getElementById("connection-text");
  dot.classList.remove("status-connected");
  dot.classList.add("status-disconnected");
  text.textContent = "Offline demo mode";

  const stats = loadStats();
  stats.visits = (stats.visits || 0) + 1;
  saveStats(stats);
});
