// app.js — Tech N Chill Global Wiring

const ADMIN_PIN = "4242";

let connectionDotEl, connectionTextEl;
let modalBackdropEl, modalInputEl, modalErrorEl;

// -----------------------------
// CONNECTION STATUS
// -----------------------------
function setConnection(connected) {
  if (!connectionDotEl || !connectionTextEl) return;

  if (connected) {
    connectionDotEl.classList.remove("status-disconnected");
    connectionDotEl.classList.add("status-connected");
    connectionTextEl.textContent = "Linked to Local Node";
  } else {
    connectionDotEl.classList.remove("status-connected");
    connectionDotEl.classList.add("status-disconnected");
    connectionTextEl.textContent = "Offline demo mode";
  }
}

// -----------------------------
// ADMIN HOTSPOT (4 CLICKS)
// -----------------------------
let tapCount = 0;
let tapTimer = null;

function setupAdminHotspot() {
  let hotspot = document.getElementById("admin-hotspot");

  if (!hotspot) {
    hotspot = document.createElement("div");
    hotspot.id = "admin-hotspot";
    document.body.appendChild(hotspot);
  }

  hotspot.addEventListener("click", () => {
    tapCount++;

    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => (tapCount = 0), 800);

    if (tapCount >= 4) {
      tapCount = 0;
      openAdminPinModal();
    }
  });
}

// -----------------------------
// PIN MODAL (FIXED)
// -----------------------------
function createPinModalIfNeeded() {
  // FIX: Only block creation if *admin* modal exists
  if (document.querySelector(".admin-pin-modal")) return;

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop admin-pin-modal"; // FIXED CLASS
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Admin Access</h2>
        <button class="btn-icon" id="admin-modal-close">✕</button>
      </div>

      <div class="modal-body">
        <label>
          PIN Code
          <input type="password" id="admin-pin-input" autocomplete="off" />
        </label>
        <div id="admin-pin-error" style="font-size:11px;color:#f97373;min-height:14px;"></div>
      </div>

      <div class="modal-footer">
        <button class="btn-ghost btn-ghost-sm" id="admin-modal-cancel">Cancel</button>
        <button class="btn-primary btn-ghost-sm" id="admin-modal-submit">Unlock</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  modalBackdropEl = backdrop;
  modalInputEl = backdrop.querySelector("#admin-pin-input");
  modalErrorEl = backdrop.querySelector("#admin-pin-error");

  backdrop.querySelector("#admin-modal-close").addEventListener("click", closeAdminPinModal);
  backdrop.querySelector("#admin-modal-cancel").addEventListener("click", closeAdminPinModal);
  backdrop.querySelector("#admin-modal-submit").addEventListener("click", submitAdminPin);

  modalInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitAdminPin();
  });
}

function openAdminPinModal() {
  createPinModalIfNeeded();
  modalBackdropEl.classList.add("visible");
  modalErrorEl.textContent = "";
  modalInputEl.value = "";
  modalInputEl.focus();
}

function closeAdminPinModal() {
  if (!modalBackdropEl) return;
  modalBackdropEl.classList.remove("visible");
}

function submitAdminPin() {
  const value = modalInputEl.value.trim();
  if (value === ADMIN_PIN) {
    modalErrorEl.textContent = "";
    setTimeout(() => {
      window.location.href = "admin.html";
    }, 150);
  } else {
    modalErrorEl.textContent = "Incorrect PIN. Try again.";
    modalInputEl.value = "";
    modalInputEl.focus();
  }
}

// -----------------------------
// INIT
// -----------------------------
window.addEventListener("load", () => {
  connectionDotEl = document.getElementById("connection-dot");
  connectionTextEl = document.getElementById("connection-text");

  setConnection(false);
  setupAdminHotspot();
});
