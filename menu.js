// Shared config
const WS_PATH = "/ws";
const DEMO_MODE = true;

// Profile helpers (same structure as script.js)
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

// Connection stub (for future WebSocket)
let ws = null;
let isConnected = false;
let selfId = null;
let connectionDotEl, connectionTextEl;

function randomId() {
  return "u_" + Math.random().toString(36).slice(2, 10);
}

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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

function connectWebSocket() {
  if (DEMO_MODE) {
    setConnection(false);
    return;
  }

  const loc = window.location;
  const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${loc.host}${WS_PATH}`;

  try {
    ws = new WebSocket(wsUrl);
  } catch {
    setConnection(false);
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

  ws.onclose = () => {
    if (!DEMO_MODE) setConnection(false);
  };
}

// Menu data
const signatureItems = [
  {
    id: "neon_fox",
    name: "Neon Fox Cocktail",
    desc: "Bright citrus, galaxy glitter, foxfire finish.",
    price: 14,
    tags: "🦊✨ signature, citrus, sparkling",
    badge: "House Favorite"
  },
  {
    id: "plasma_shot",
    name: "Plasma Shot",
    desc: "Electric sour shot, UV reactive glow.",
    price: 9,
    tags: "⚡ high energy, sour",
    badge: "High Voltage"
  },
  {
    id: "starfall_spritz",
    name: "Starfall Spritz",
    desc: "Light, floral, starlit bubbles.",
    price: 13,
    tags: "🌌 light, floral, bubbly",
    badge: "Easy Mode"
  },
  {
    id: "void_mocktail",
    name: "Voidwalker Mocktail",
    desc: "Zero proof, dark berry, cosmic herbs.",
    price: 11,
    tags: "🖤 mocktail, zero proof",
    badge: "No Alcohol"
  }
];

const standardItems = [
  {
    id: "beer_draft",
    name: "Draft Beer",
    desc: "Rotating local tap.",
    price: 8,
    tags: "🍺 classic"
  },
  {
    id: "wine_glass",
    name: "Glass of Wine",
    desc: "Red, white, or rosé.",
    price: 10,
    tags: "🍷"
  },
  {
    id: "well_mixed",
    name: "Well Mixed Drink",
    desc: "Rum & coke, vodka soda, etc.",
    price: 12,
    tags: "🥃 mixed"
  },
  {
    id: "sparkling_water",
    name: "Sparkling Water",
    desc: "Chilled, lime wedge.",
    price: 5,
    tags: "💧 non-alcoholic"
  }
];

const foodItems = [
  {
    id: "cyber_fries",
    name: "Cyber Fries",
    desc: "Loaded neon sauce, spice dust.",
    price: 11,
    tags: "🍟 shareable"
  },
  {
    id: "mask_wings",
    name: "Masked Wings",
    desc: "Pick your heat, gloves recommended.",
    price: 14,
    tags: "🍗 spicy"
  },
  {
    id: "cosplay_bites",
    name: "Cosplay Bites",
    desc: "Assorted finger foods, photo ready.",
    price: 13,
    tags: "🧀 shareable"
  },
  {
    id: "sweet_stims",
    name: "Sweet Stims",
    desc: "Assorted sweets for late‑night energy.",
    price: 9,
    tags: "🍰 sweet"
  }
];

// Render menu lists
function createMenuItemRow(item) {
  const row = document.createElement("div");
  row.className = "menu-item";
  row.dataset.itemId = item.id;

  const left = document.createElement("div");
  left.className = "menu-item-left";

  const title = document.createElement("p");
  title.className = "menu-item-title";
  title.textContent = item.name;

  const sub = document.createElement("p");
  sub.className = "menu-item-sub";
  sub.textContent = item.desc;

  const tags = document.createElement("div");
  tags.className = "menu-item-tags";
  tags.textContent = item.tags;

  left.appendChild(title);
  left.appendChild(sub);
  left.appendChild(tags);

  const right = document.createElement("div");
  right.className = "menu-item-right";
  const price = document.createElement("div");
  price.className = "menu-price";
  price.textContent = `$${item.price.toFixed(2)}`;

  right.appendChild(price);

  if (item.badge) {
    const badge = document.createElement("div");
    badge.className = "menu-badge";
    badge.textContent = item.badge;
    right.appendChild(badge);
  }

  row.appendChild(left);
  row.appendChild(right);

  return row;
}

// Order state
let orderItems = {}; // itemId -> { item, qty }

let orderSummaryEmptyEl, orderItemsEl, orderTotalValueEl, submitOrderBtn, orderStatusEl;

// Order helpers
function updateOrderUI() {
  const entries = Object.values(orderItems);
  if (entries.length === 0) {
    orderSummaryEmptyEl.style.display = "block";
    orderItemsEl.innerHTML = "";
    orderTotalValueEl.textContent = "$0.00";
    submitOrderBtn.disabled = true;
    return;
  }

  orderSummaryEmptyEl.style.display = "none";
  orderItemsEl.innerHTML = "";

  let total = 0;

  entries.forEach(({ item, qty }) => {
    total += item.price * qty;

    const row = document.createElement("li");
    row.className = "order-item-row";

    const main = document.createElement("div");
    main.className = "order-item-main";

    const nameEl = document.createElement("p");
    nameEl.className = "order-item-name";
    nameEl.textContent = item.name;

    const metaEl = document.createElement("p");
    metaEl.className = "order-item-meta";
    metaEl.textContent = `$${item.price.toFixed(2)} each · ${item.tags}`;

    main.appendChild(nameEl);
    main.appendChild(metaEl);

    const controls = document.createElement("div");
    controls.className = "order-item-controls";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "btn-circle";
    minusBtn.textContent = "−";

    const qtyEl = document.createElement("span");
    qtyEl.className = "order-qty";
    qtyEl.textContent = String(qty);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "btn-circle";
    plusBtn.textContent = "+";

    minusBtn.addEventListener("click", () => {
      if (orderItems[item.id]) {
        orderItems[item.id].qty -= 1;
        if (orderItems[item.id].qty <= 0) delete orderItems[item.id];
        updateOrderUI();
      }
    });

    plusBtn.addEventListener("click", () => {
      if (!orderItems[item.id]) {
        orderItems[item.id] = { item, qty: 1 };
      } else {
        orderItems[item.id].qty += 1;
      }
      updateOrderUI();
    });

    controls.appendChild(minusBtn);
    controls.appendChild(qtyEl);
    controls.appendChild(plusBtn);

    row.appendChild(main);
    row.appendChild(controls);

    orderItemsEl.appendChild(row);
  });

  orderTotalValueEl.textContent = `$${total.toFixed(2)}`;
  submitOrderBtn.disabled = false;
}

function addToOrder(item) {
  if (!orderItems[item.id]) {
    orderItems[item.id] = { item, qty: 1 };
  } else {
    orderItems[item.id].qty += 1;
  }
  updateOrderUI();
}

// Profile modal
let profileModalEl,
  profileForm,
  profileNameEl,
  profileCosplayEl,
  profileMoodEl,
  profileDrinkEl,
  profileAllergiesEl,
  profileBioEl,
  profileEmojiEl;

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

    if (ws && isConnected && selfId) {
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

// Sending order
function sendOrder() {
  const profile = getProfile();
  const items = Object.values(orderItems).map(({ item, qty }) => ({
    id: item.id,
    name: item.name,
    qty,
    price: item.price
  }));

  if (items.length === 0) return;

  const payload = {
    type: "order",
    id: selfId || randomId(),
    profile,
    items,
    time: nowTime()
  };

  if (ws && isConnected) {
    ws.send(JSON.stringify(payload));
    orderStatusEl.textContent = "Order sent to bar. Watch for your name on the screen.";
  } else {
    // demo
    orderStatusEl.textContent =
      "Demo mode: order stored locally only. When the node is live, this will ping the bar.";
  }
}

// Init
window.addEventListener("load", () => {
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");

  const signatureMenuEl = document.getElementById("signature-menu");
  const standardMenuEl = document.getElementById("standard-menu");
  const foodMenuEl = document.getElementById("food-menu");

  orderSummaryEmptyEl = document.getElementById("order-summary-empty");
  orderItemsEl = document.getElementById("order-items");
  orderTotalValueEl = document.getElementById("order-total-value");
  submitOrderBtn = document.getElementById("submit-order-btn");
  orderStatusEl = document.getElementById("order-status");

  profileModalEl = document.getElementById("profile-modal");
  profileForm = document.getElementById("profile-form");
  profileNameEl = document.getElementById("profile-name");
  profileCosplayEl = document.getElementById("profile-cosplay");
  profileMoodEl = document.getElementById("profile-mood");
  profileDrinkEl = document.getElementById("profile-drink");
  profileAllergiesEl = document.getElementById("profile-allergies");
  profileBioEl = document.getElementById("profile-bio");
  profileEmojiEl = document.getElementById("profile-emoji");

  // Render menu
  signatureItems.forEach((item) => {
    const row = createMenuItemRow(item);
    row.addEventListener("click", () => addToOrder(item));
    signatureMenuEl.appendChild(row);
  });

  standardItems.forEach((item) => {
    const row = createMenuItemRow(item);
    row.addEventListener("click", () => addToOrder(item));
    standardMenuEl.appendChild(row);
  });

  foodItems.forEach((item) => {
    const row = createMenuItemRow(item);
    row.addEventListener("click", () => addToOrder(item));
    foodMenuEl.appendChild(row);
  });

  submitOrderBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendOrder();
  });

  setupProfileModal();
  connectWebSocket();
  updateOrderUI();
});
