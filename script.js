// ---------------------
// Config
// ---------------------
const WS_PATH = "/ws"; // for future ESP32 WebSocket
const QUICK_EMOJIS = ["🤖", "🦊✨", "🗡️", "🕸️", "🌌", "😈", "💜", "🔥", "🎭", "✨"];
const DEMO_MODE = true; // set false when you hook up a real node

// ---------------------
// Stats / badges helpers
// ---------------------
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

// derive badges from stats
function getBadges() {
  const stats = loadStats();
  const badges = [];

  if (stats.quizHighScore >= 4) badges.push("Lore Master");
  else if (stats.quizHighScore >= 2) badges.push("Quiz Initiate");

  if (stats.pongWins >= 5) badges.push("Pong Champion");
  else if (stats.pongWins >= 1) badges.push("Pong Rookie");

  if (stats.visits >= 10) badges.push("Resident");
  else if (stats.visits >= 3) badges.push("Regular");

  return badges;
}

// ---------------------
// State
// ---------------------
let ws = null;
let isConnected = false;
let selfId = null;
let users = {};
let radarZoom = 1.0;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.2;

let chatLogEl,
  peopleListEl,
  radarCanvas,
  radarCtx,
  connectionDotEl,
  connectionTextEl,
  profileModalEl,
  profileForm,
  profileNameEl,
  profileCosplayEl,
  profileMoodEl,
  profileDrinkEl,
  profileAllergiesEl,
  profileBioEl,
  profileEmojiEl,
  chatForm,
  chatInputEl,
  quickEmojiBarEl;

// ---------------------
// Shared profile helpers
// ---------------------
function loadProfile() {
  try {
    const stored = localStorage.getItem("tnc_profile");
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem("tnc_profile", JSON.stringify(profile));
}

function getProfile() {
  let profile = loadProfile();
  if (!profile) {
    profile = {
      name: "Neon Newcomer",
      cosplay: "Mystery Cosplayer",
      mood: "Chill orbit",
      favoriteDrink: "Water",
      allergies: "",
      bio: "First time at Tech N Chill.",
      emoji: "🎭"
    };
    saveProfile(profile);
  }
  return profile;
}

function avatarSymbol(profile) {
  const txt = profile.emoji && profile.emoji.trim();
  if (txt) return txt;
  const n = (profile.name || "").trim();
  return n ? n[0].toUpperCase() : "🕶️";
}

function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------------------
// Radar
// ---------------------
function drawRadar() {
  if (!radarCanvas || !radarCtx) return;
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  radarCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const baseMaxR = Math.min(w, h) / 2 - 6;
  const maxR = baseMaxR * radarZoom;

  radarCtx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  radarCtx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, (maxR * i) / 3, 0, Math.PI * 2);
    radarCtx.stroke();
  }
  radarCtx.beginPath();
  radarCtx.moveTo(cx - maxR, cy);
  radarCtx.lineTo(cx + maxR, cy);
  radarCtx.moveTo(cx, cy - maxR);
  radarCtx.lineTo(cx, cy + maxR);
  radarCtx.stroke();

  Object.values(users).forEach((u) => {
    const ux = u.x ?? Math.random();
    const uy = u.y ?? Math.random();
    const angle = ux * Math.PI * 2;
    const radius = uy * (maxR * 0.95);
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;

    const isSelf = u.id === selfId;
    radarCtx.beginPath();
    radarCtx.fillStyle = isSelf ? "#4cc9f0" : "#f72585";
    radarCtx.shadowColor = isSelf ? "rgba(76, 201, 240, 0.9)" : "rgba(247, 37, 133, 0.9)";
    radarCtx.shadowBlur = 12;
    radarCtx.arc(px, py, isSelf ? 6 : 4, 0, Math.PI * 2);
    radarCtx.fill();
    radarCtx.shadowBlur = 0;
  });
}

function adjustZoom(delta) {
  radarZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, radarZoom + delta));
  drawRadar();
}

// ---------------------
// People + chat
// ---------------------
function renderPeopleList() {
  peopleListEl.innerHTML = "";
  const sorted = Object.values(users).sort((a, b) => {
    if (a.id === selfId) return -1;
    if (b.id === selfId) return 1;
    return (a.name || "").localeCompare(b.name || "");
  });

  sorted.forEach((u) => {
    const row = document.createElement("div");
    row.className = "person-row" + (u.id === selfId ? " self" : "");
    const avatar = document.createElement("div");
    avatar.className = "person-avatar";
    avatar.textContent = avatarSymbol(u);

    const main = document.createElement("div");
    main.className = "person-main";

    const nameEl = document.createElement("p");
    nameEl.className = "person-name";
    nameEl.textContent = u.name || "Unknown";

    const mood = u.mood || "Chill orbit";
    const drink = u.favoriteDrink || "Water";
    const metaEl = document.createElement("p");
    metaEl.className = "person-meta";
    metaEl.textContent =
      (u.cosplay || "Unknown cosplay") + " · " + mood + " · Fav: " + drink;

    main.appendChild(nameEl);
    main.appendChild(metaEl);

    // show badges for self
    if (u.id === selfId) {
      const badges = getBadges();
      if (badges.length) {
        const badgesEl = document.createElement("div");
        badgesEl.className = "person-meta";
        badgesEl.textContent = "Badges: " + badges.join(" · ");
        main.appendChild(badgesEl);
      }
    }

    const tag = document.createElement("div");
    tag.className = "person-tag";
    tag.textContent = u.id === selfId ? "You" : "In the club";

    row.appendChild(avatar);
    row.appendChild(main);
    row.appendChild(tag);

    peopleListEl.appendChild(row);
  });
}

function appendChatMessage(msg, isSelf) {
  const row = document.createElement("div");
  row.className = "chat-message" + (isSelf ? " self" : "");
  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = avatarSymbol(msg.profile || getProfile());

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.textContent = `${msg.profile?.name || "Unknown"} · ${msg.time || nowTime()}`;

  const text = document.createElement("div");
  text.className = "chat-text";
  text.textContent = msg.text || "";

  bubble.appendChild(meta);
  bubble.appendChild(text);

  row.appendChild(avatar);
  row.appendChild(bubble);

  chatLogEl.appendChild(row);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

// ---------------------
// Connection / demo
// ---------------------
function setConnection(connected) {
  isConnected = connected;
  if (connected) {
    connectionDotEl.classList.remove("status-disconnected");
    connectionDotEl.classList.add("status-connected");
    connectionTextEl.textContent = "Linked to Tech N Chill node";
  } else {
    connectionDotEl.classList.remove("status-connected");
    connectionDotEl.classList.add("status-disconnected");
    connectionTextEl.textContent = "Offline demo mode";
  }
}

function startDemoMode() {
  setConnection(false);
  selfId = selfId || randomId();
  const profile = getProfile();
  users = {
    [selfId]: {
      id: selfId,
      name: profile.name,
      cosplay: profile.cosplay,
      mood: profile.mood,
      favoriteDrink: profile.favoriteDrink,
      allergies: profile.allergies,
      bio: profile.bio,
      emoji: profile.emoji,
      x: Math.random(),
      y: Math.random()
    },
    demo1: {
      id: "demo1",
      name: "Cyber Kitsune",
      cosplay: "Neo fox rogue",
      mood: "On the hunt",
      favoriteDrink: "Neon Fox",
      bio: "Stalking the bassline.",
      emoji: "🦊✨",
      x: 0.2,
      y: 0.7
    },
    demo2: {
      id: "demo2",
      name: "Mecha Oracle",
      cosplay: "Mecha priestess",
      mood: "Chill orbit",
      favoriteDrink: "Plasma Shot",
      bio: "Predicting drops and plot twists.",
      emoji: "🤖💜",
      x: 0.8,
      y: 0.3
    },
    demo3: {
      id: "demo3",
      name: "Starlit Blade",
      cosplay: "Space knight",
      mood: "Dancefloor only",
      favoriteDrink: "Starfall Spritz",
      bio: "Guarding the dance floor.",
      emoji: "🗡️🌌",
      x: 0.5,
      y: 0.9
    }
  };
  renderPeopleList();
  drawRadar();

  appendChatMessage(
    {
      profile: { name: "Club System", emoji: "✨" },
      text: "You’re in offline demo mode. When the Tech N Chill node is online, this will sync with live people.",
      time: nowTime()
    },
    false
  );
}

// ---------------------
// Profile modal
// ---------------------
function setupProfileModal() {
  const openBtn = document.getElementById("edit-profile-btn");
  const closeBtn = document.getElementById("close-profile-btn");
  const resetBtn = document.getElementById("reset-profile-btn");

  openBtn.addEventListener("click", () => {
    const profile = getProfile();
    profileNameEl.value = profile.name;
    profileCosplayEl.value = profile.cosplay;
    profileMoodEl.value = profile.mood || "Chill orbit";
    profileDrinkEl.value = profile.favoriteDrink || "";
    profileAllergiesEl.value = profile.allergies || "";
    profileBioEl.value = profile.bio;
    profileEmojiEl.value = profile.emoji;
    profileModalEl.classList.add("visible");
  });

  closeBtn.addEventListener("click", () => {
    profileModalEl.classList.remove("visible");
  });

  resetBtn.addEventListener("click", () => {
    localStorage.removeItem("tnc_profile");
    const profile = getProfile();
    profileNameEl.value = profile.name;
    profileCosplayEl.value = profile.cosplay;
    profileMoodEl.value = profile.mood;
    profileDrinkEl.value = profile.favoriteDrink;
    profileAllergiesEl.value = profile.allergies;
    profileBioEl.value = profile.bio;
    profileEmojiEl.value = profile.emoji;
  });

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const profile = {
      name: profileNameEl.value.trim() || "Neon Newcomer",
      cosplay: profileCosplayEl.value.trim() || "Mystery Cosplayer",
      mood: profileMoodEl.value || "Chill orbit",
      favoriteDrink: profileDrinkEl.value.trim() || "Water",
      allergies: profileAllergiesEl.value.trim(),
      bio: profileBioEl.value.trim(),
      emoji: profileEmojiEl.value.trim() || "🎭"
    };
    saveProfile(profile);
    profileModalEl.classList.remove("visible");

    if (!selfId) selfId = randomId();
    users[selfId] = {
      ...(users[selfId] || { id: selfId }),
      id: selfId,
      name: profile.name,
      cosplay: profile.cosplay,
      mood: profile.mood,
      favoriteDrink: profile.favoriteDrink,
      allergies: profile.allergies,
      bio: profile.bio,
      emoji: profile.emoji,
      x: users[selfId]?.x ?? Math.random(),
      y: users[selfId]?.y ?? Math.random()
    };
    renderPeopleList();
    drawRadar();

    if (ws && isConnected) {
      ws.send(
        JSON.stringify({
          type: "update_profile",
          id: selfId,
          profile
        })
      );
    }
  });
}

// ---------------------
// Chat + emojis
// ---------------------
function setupChat() {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInputEl.value.trim();
    if (!text) return;

    const profile = getProfile();
    const msg = {
      type: "chat",
      id: selfId || randomId(),
      profile,
      text,
      time: nowTime()
    };

    if (ws && isConnected) {
      ws.send(JSON.stringify(msg));
    } else {
      appendChatMessage(msg, true);
    }

    chatInputEl.value = "";
  });
}

function setupQuickEmojis() {
  QUICK_EMOJIS.forEach((em) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "emoji-pill";
    pill.textContent = em;
    pill.addEventListener("click", () => {
      if (chatInputEl.value.length) {
        chatInputEl.value += " " + em;
      } else {
        chatInputEl.value = em + " ";
      }
      chatInputEl.focus();
    });
    quickEmojiBarEl.appendChild(pill);
  });
}

// ---------------------
// WebSocket (future ESP32)
// ---------------------
function connectWebSocket() {
  if (DEMO_MODE) {
    startDemoMode();
    return;
  }

  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${loc.host}${WS_PATH}`;

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    startDemoMode();
    return;
  }

  ws.onopen = () => {
    setConnection(true);
    const profile = getProfile();
    selfId = selfId || randomId();
    ws.send(
      JSON.stringify({
        type: "join",
        id: selfId,
        profile
      })
    );
  };

  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "presence" && Array.isArray(data.users)) {
      users = {};
      data.users.forEach((u) => {
        users[u.id] = {
          id: u.id,
          name: u.profile?.name,
          cosplay: u.profile?.cosplay,
          mood: u.profile?.mood,
          favoriteDrink: u.profile?.favoriteDrink,
          allergies: u.profile?.allergies,
          bio: u.profile?.bio,
          emoji: u.profile?.emoji,
          x: u.x,
          y: u.y
        };
      });
      renderPeopleList();
      drawRadar();
    }

    if (data.type === "user" && data.user) {
      const u = data.user;
      users[u.id] = {
        id: u.id,
        name: u.profile?.name,
        cosplay: u.profile?.cosplay,
        mood: u.profile?.mood,
        favoriteDrink: u.profile?.favoriteDrink,
        allergies: u.profile?.allergies,
        bio: u.profile?.bio,
        emoji: u.profile?.emoji,
        x: u.x,
        y: u.y
      };
      renderPeopleList();
      drawRadar();
    }

    if (data.type === "leave" && data.id) {
      delete users[data.id];
      renderPeopleList();
      drawRadar();
    }

    if (data.type === "chat") {
      appendChatMessage(data, data.id === selfId);
    }
  };

  ws.onerror = () => {
    startDemoMode();
  };

  ws.onclose = () => {
    if (!DEMO_MODE) setConnection(false);
  };
}

// ---------------------
// Init
// ---------------------
window.addEventListener("load", () => {
  chatLogEl = document.getElementById("chat-log");
  peopleListEl = document.getElementById("people-list");
  radarCanvas = document.getElementById("radar-canvas");
  radarCtx = radarCanvas.getContext("2d");
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");
  profileModalEl = document.getElementById("profile-modal");

  profileForm = document.getElementById("profile-form");
  profileNameEl = document.getElementById("profile-name");
  profileCosplayEl = document.getElementById("profile-cosplay");
  profileMoodEl = document.getElementById("profile-mood");
  profileDrinkEl = document.getElementById("profile-drink");
  profileAllergiesEl = document.getElementById("profile-allergies");
  profileBioEl = document.getElementById("profile-bio");
  profileEmojiEl = document.getElementById("profile-emoji");

  chatForm = document.getElementById("chat-form");
  chatInputEl = document.getElementById("chat-input");
  quickEmojiBarEl = document.getElementById("quick-emoji-bar");

  const zoomInBtn = document.getElementById("zoom-in");
  const zoomOutBtn = document.getElementById("zoom-out");

  function resizeCanvas() {
    const rect = radarCanvas.getBoundingClientRect();
    radarCanvas.width = rect.width * window.devicePixelRatio;
    radarCanvas.height = rect.height * window.devicePixelRatio;
    radarCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    drawRadar();
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  zoomInBtn.addEventListener("click", () => adjustZoom(0.2));
  zoomOutBtn.addEventListener("click", () => adjustZoom(-0.2));

  radarCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    adjustZoom(delta);
  });

  let lastTouchDist = null;
  radarCanvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist != null) {
        const diff = dist - lastTouchDist;
        adjustZoom(diff * 0.002);
      }
      lastTouchDist = dist;
    }
  });
  radarCanvas.addEventListener("touchend", () => {
    lastTouchDist = null;
  });

  setupProfileModal();
  setupChat();
  setupQuickEmojis();
  connectWebSocket();

  // increment visits for badges
  const stats = loadStats();
  stats.visits = (stats.visits || 0) + 1;
  saveStats(stats);
});
