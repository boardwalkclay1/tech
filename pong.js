const DEMO_MODE = true;
const WS_PATH = "/ws";

let ws = null;
let isConnected = false;
let selfId = null;

let canvas, ctx;
let paddleLeft = 0.4;
let paddleRight = 0.4;
let ballX = 0.5;
let ballY = 0.5;
let ballVX = 0.004;
let ballVY = 0.003;
let scoreL = 0;
let scoreR = 0;

let connectionDotEl, connectionTextEl, pongStatusEl;

function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function setConnection(connected) {
  isConnected = connected;
  if (connected) {
    connectionDotEl.classList.remove("status-disconnected");
    connectionDotEl.classList.add("status-connected");
    connectionTextEl.textContent = "Linked to Pong Node";
  } else {
    connectionDotEl.classList.remove("status-connected");
    connectionDotEl.classList.add("status-disconnected");
    connectionTextEl.textContent = "Offline demo mode";
  }
}

function startDemoMode() {
  setConnection(false);
  pongStatusEl.textContent = "Demo mode: AI opponent active.";
  animate();
}

function connectWebSocket() {
  if (DEMO_MODE) {
    startDemoMode();
    return;
  }
}

function animate() {
  updateBall();
  draw();
  requestAnimationFrame(animate);
}

function updateBall() {
  ballX += ballVX;
  ballY += ballVY;

  if (ballY < 0 || ballY > 1) ballVY *= -1;

  if (ballX < 0.05) {
    if (Math.abs(ballY - paddleLeft) < 0.15) {
      ballVX *= -1;
    } else {
      scoreR++;
      resetBall();
    }
  }

  if (ballX > 0.95) {
    if (Math.abs(ballY - paddleRight) < 0.15) {
      ballVX *= -1;
    } else {
      scoreL++;
      resetBall();
    }
  }

  // AI opponent (demo)
  paddleRight += (ballY - paddleRight) * 0.03;
}

function resetBall() {
  ballX = 0.5;
  ballY = 0.5;
  ballVX = (Math.random() > 0.5 ? 1 : -1) * 0.004;
  ballVY = (Math.random() > 0.5 ? 1 : -1) * 0.003;
}

function draw() {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#4cc9f0";
  ctx.fillRect(20, paddleLeft * h - 40, 10, 80);

  ctx.fillStyle = "#f72585";
  ctx.fillRect(w - 30, paddleRight * h - 40, 10, 80);

  ctx.beginPath();
  ctx.arc(ballX * w, ballY * h, 10, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText(scoreL, w * 0.25, 30);
  ctx.fillText(scoreR, w * 0.75, 30);
}

window.addEventListener("load", () => {
  canvas = document.getElementById("pong-canvas");
  ctx = canvas.getContext("2d");
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");
  pongStatusEl = document.getElementById("pong-status");

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  document.getElementById("pong-up").addEventListener("click", () => {
    paddleLeft -= 0.05;
  });

  document.getElementById("pong-down").addEventListener("click", () => {
    paddleLeft += 0.05;
  });

  connectWebSocket();
});
