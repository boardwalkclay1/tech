// admin.js — Tech N Chill Admin CRM (modular + safe + complete)

/* ============================================================
   STORAGE
   ============================================================ */

const ADMIN_STORAGE = {
  events: "tnc_admin_events_v1",
  employees: "tnc_admin_employees_v1",
  promoters: "tnc_admin_promoters_v1",
  finances: "tnc_admin_finances_v1"
};

let adminEvents = [];
let adminEmployees = [];
let adminPromoters = [];
let adminFinances = { revenue: [], expenses: [], payouts: [] };

function adminUid() {
  return "id_" + Math.random().toString(36).slice(2, 10);
}

function adminLoad() {
  adminEvents = JSON.parse(localStorage.getItem(ADMIN_STORAGE.events) || "[]");
  adminEmployees = JSON.parse(localStorage.getItem(ADMIN_STORAGE.employees) || "[]");
  adminPromoters = JSON.parse(localStorage.getItem(ADMIN_STORAGE.promoters) || "[]");
  adminFinances = JSON.parse(
    localStorage.getItem(ADMIN_STORAGE.finances) ||
      '{"revenue":[],"expenses":[],"payouts":[]}'
  );
}

function adminSave() {
  localStorage.setItem(ADMIN_STORAGE.events, JSON.stringify(adminEvents));
  localStorage.setItem(ADMIN_STORAGE.employees, JSON.stringify(adminEmployees));
  localStorage.setItem(ADMIN_STORAGE.promoters, JSON.stringify(adminPromoters));
  localStorage.setItem(ADMIN_STORAGE.finances, JSON.stringify(adminFinances));
}

function adminFormatDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/* ============================================================
   PAGE DETECTION
   ============================================================ */

function onPage(id) {
  return document.getElementById(id) !== null;
}

/* ============================================================
   CALENDAR MODULE
   ============================================================ */

let adminCalMonth = new Date().getMonth();
let adminCalYear = new Date().getFullYear();

function renderCalendar() {
  const headerEl = document.getElementById("calendar-header");
  const gridEl = document.getElementById("calendar-grid");
  if (!headerEl || !gridEl) return;

  headerEl.innerHTML = "";
  gridEl.innerHTML = "";

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "8px";

  const label = document.createElement("div");
  label.textContent = new Date(adminCalYear, adminCalMonth).toLocaleString(
    undefined,
    { month: "long", year: "numeric" }
  );
  label.style.fontSize = "13px";
  label.style.fontWeight = "600";

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "4px";

  const prev = document.createElement("button");
  prev.textContent = "◀";
  prev.className = "btn-circle";
  prev.onclick = () => {
    adminCalMonth--;
    if (adminCalMonth < 0) {
      adminCalMonth = 11;
      adminCalYear--;
    }
    renderCalendar();
  };

  const next = document.createElement("button");
  next.textContent = "▶";
  next.className = "btn-circle";
  next.onclick = () => {
    adminCalMonth++;
    if (adminCalMonth > 11) {
      adminCalMonth = 0;
      adminCalYear++;
    }
    renderCalendar();
  };

  controls.append(prev, next);
  headerRow.append(label, controls);
  headerEl.appendChild(headerRow);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  days.forEach((d) => {
    const dn = document.createElement("div");
    dn.className = "admin-calendar-dayname";
    dn.textContent = d;
    gridEl.appendChild(dn);
  });

  const firstDay = new Date(adminCalYear, adminCalMonth, 1).getDay();
  const daysInMonth = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    gridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "admin-calendar-cell";

    const dayLabel = document.createElement("div");
    dayLabel.className = "admin-calendar-daylabel";
    dayLabel.textContent = day;
    cell.appendChild(dayLabel);

    const dateStr = new Date(adminCalYear, adminCalMonth, day)
      .toISOString()
      .slice(0, 10);

    const dayEvents = adminEvents.filter((e) => e.date === dateStr);
    dayEvents.forEach((ev) => {
      const pill = document.createElement("div");
      pill.className = "admin-calendar-pill";
      pill.textContent = ev.title;
      pill.title = ev.notes || "";
      cell.appendChild(pill);
    });

    cell.onclick = () => openEventDay(dateStr);
    gridEl.appendChild(cell);
  }
}

function openEventDay(dateStr) {
  const dayEvents = adminEvents.filter((e) => e.date === dateStr);
  if (!dayEvents.length) {
    if (confirm(`No events on ${adminFormatDate(dateStr)}. Add one?`)) {
      createOrEditEvent({ date: dateStr });
    }
    return;
  }

  const list = dayEvents
    .map(
      (e, i) =>
        `${i + 1}. ${e.title} @ ${e.time || "TBA"} (Promoter: ${
          e.promoter || "N/A"
        })`
    )
    .join("\n");

  const choice = prompt(
    `Events on ${adminFormatDate(dateStr)}:\n\n${list}\n\nType number to edit, 'n' to add new, or 'x' to cancel:`
  );
  if (!choice) return;
  if (choice.toLowerCase() === "n") {
    createOrEditEvent({ date: dateStr });
    return;
  }
  if (choice.toLowerCase() === "x") return;

  const idx = Number(choice) - 1;
  if (idx < 0 || idx >= dayEvents.length) return;

  const ev = dayEvents[idx];
  const action = prompt("Type 'e' to edit, 'd' to delete:", "e");
  if (!action) return;
  if (action.toLowerCase() === "e") {
    createOrEditEvent(ev);
  } else if (action.toLowerCase() === "d") {
    adminEvents = adminEvents.filter((e) => e.id !== ev.id);
    adminSave();
    renderCalendar();
  }
}

function createOrEditEvent(existing) {
  const isEdit = !!existing.id;
  const title = prompt("Show title:", existing.title || "");
  if (!title) return;

  const date = prompt(
    "Date (YYYY-MM-DD):",
    existing.date || new Date().toISOString().slice(0, 10)
  );
  if (!date) return;

  const time = prompt("Time (e.g. 10:00 PM):", existing.time || "");
  const promoter = prompt("Promoter name:", existing.promoter || "");
  const payoutStr = prompt("Payout amount:", existing.payout || "");
  const notes = prompt("Notes:", existing.notes || "");
  const payout = payoutStr ? Number(payoutStr) : 0;

  if (isEdit) {
    existing.title = title;
    existing.date = date;
    existing.time = time;
    existing.promoter = promoter;
    existing.payout = payout;
    existing.notes = notes;
  } else {
    adminEvents.push({
      id: adminUid(),
      title,
      date,
      time,
      promoter,
      payout,
      notes
    });
  }

  adminSave();
  renderCalendar();
}

/* ============================================================
   EMPLOYEES MODULE
   ============================================================ */

function renderEmployees() {
  const listEl = document.getElementById("employees-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!adminEmployees.length) {
    const empty = document.createElement("div");
    empty.className = "admin-row-meta";
    empty.textContent = "No employees yet.";
    listEl.appendChild(empty);
    return;
  }

  adminEmployees.forEach((emp) => {
    const row = document.createElement("div");
    row.className = "admin-row";

    const main = document.createElement("div");
    main.className = "admin-row-main";

    const title = document.createElement("div");
    title.className = "admin-row-title";
    title.textContent = `${emp.name} · ${emp.role}`;

    const meta = document.createElement("div");
    meta.className = "admin-row-meta";
    meta.textContent = `${emp.phone || "No phone"} · ${emp.email || "No email"}`;

    const tags = document.createElement("div");
    tags.className = "admin-row-tags";
    tags.textContent = `Rate: $${emp.rate || 0}/night · ${emp.status}`;

    main.append(title, meta, tags);

    const actions = document.createElement("div");
    actions.className = "admin-row-actions";

    const edit = document.createElement("button");
    edit.className = "btn-ghost btn-ghost-sm";
    edit.textContent = "Edit";
    edit.onclick = () => editEmployee(emp);

    const del = document.createElement("button");
    del.className = "btn-circle";
    del.textContent = "✕";
    del.onclick = () => {
      if (confirm("Remove this employee?")) {
        adminEmployees = adminEmployees.filter((e) => e.id !== emp.id);
        adminSave();
        renderEmployees();
      }
    };

    actions.append(edit, del);
    row.append(main, actions);
    listEl.appendChild(row);
  });
}

function editEmployee(existing) {
  const isEdit = !!existing;
  const name = prompt("Name:", existing?.name || "");
  if (!name) return;
  const role = prompt("Role:", existing?.role || "");
  const phone = prompt("Phone:", existing?.phone || "");
  const email = prompt("Email:", existing?.email || "");
  const rateStr = prompt("Pay rate per night:", existing?.rate || "");
  const status = prompt("Status (Active / Inactive):", existing?.status || "Active");
  const rate = rateStr ? Number(rateStr) : 0;

  if (isEdit) {
    existing.name = name;
    existing.role = role;
    existing.phone = phone;
    existing.email = email;
    existing.rate = rate;
    existing.status = status || "Active";
  } else {
    adminEmployees.push({
      id: adminUid(),
      name,
      role,
      phone,
      email,
      rate,
      status: status || "Active"
    });
  }

  adminSave();
  renderEmployees();
}

/* ============================================================
   PROMOTERS MODULE
   ============================================================ */

function renderPromoters() {
  const listEl = document.getElementById("promoters-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!adminPromoters.length) {
    const empty = document.createElement("div");
    empty.className = "admin-row-meta";
    empty.textContent = "No promoters yet.";
    listEl.appendChild(empty);
    return;
  }

  adminPromoters.forEach((pro) => {
    const row = document.createElement("div");
    row.className = "admin-row";

    const main = document.createElement("div");
    main.className = "admin-row-main";

    const title = document.createElement("div");
    title.className = "admin-row-title";
    title.textContent = `${pro.name} · ${pro.company || "Independent"}`;

    const meta = document.createElement("div");
    meta.className = "admin-row-meta";
    meta.textContent = `${pro.phone || "No phone"} · ${pro.email || "No email"}`;

    const tags = document.createElement("div");
    tags.className = "admin-row-tags";
    tags.textContent = `Terms: ${pro.terms || "N/A"}`;

    main.append(title, meta, tags);

    const actions = document.createElement("div");
    actions.className = "admin-row-actions";

    const edit = document.createElement("button");
    edit.className = "btn-ghost btn-ghost-sm";
    edit.textContent = "Edit";
    edit.onclick = () => editPromoter(pro);

    const del = document.createElement("button");
    del.className = "btn-circle";
    del.textContent = "✕";
    del.onclick = () => {
      if (confirm("Remove this promoter?")) {
        adminPromoters = adminPromoters.filter((p) => p.id !== pro.id);
        adminSave();
        renderPromoters();
      }
    };

    actions.append(edit, del);
    row.append(main, actions);
    listEl.appendChild(row);
  });
}

function editPromoter(existing) {
  const isEdit = !!existing;
  const name = prompt("Promoter name:", existing?.name || "");
  if (!name) return;
  const company = prompt("Company:", existing?.company || "");
  const phone = prompt("Phone:", existing?.phone || "");
  const email = prompt("Email:", existing?.email || "");
  const terms = prompt("Deal terms / notes:", existing?.terms || "");

  if (isEdit) {
    existing.name = name;
    existing.company = company;
    existing.phone = phone;
    existing.email = email;
    existing.terms = terms;
  } else {
    adminPromoters.push({
      id: adminUid(),
      name,
      company,
      phone,
      email,
      terms
    });
  }

  adminSave();
  renderPromoters();
}

/* ============================================================
   FINANCES MODULE
   ============================================================ */

function renderFinances() {
  const summaryEl = document.getElementById("finance-summary");
  const revList = document.getElementById("finance-revenue-list");
  const expList = document.getElementById("finance-expense-list");
  const payList = document.getElementById("finance-payout-list");

  if (!summaryEl || !revList || !expList || !payList) return;

  summaryEl.innerHTML = "";
  revList.innerHTML = "";
  expList.innerHTML = "";
  payList.innerHTML = "";

  const totalRev = adminFinances.revenue.reduce((s, r) => s + r.amount, 0);
  const totalExp = adminFinances.expenses.reduce((s, r) => s + r.amount, 0);
  const totalPay = adminFinances.payouts.reduce((s, r) => s + r.amount, 0);
  const net = totalRev - totalExp - totalPay;

  function makeSummary(label, value, color) {
    const card = document.createElement("div");
    card.className = "admin-summary-card";
    const l = document.createElement("div");
    l.className = "admin-summary-label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "admin-summary-value";
    v.style.color = color;
    v.textContent = `$${value.toFixed(2)}`;
    card.append(l, v);
    return card;
  }

  summaryEl.append(
    makeSummary("Revenue", totalRev, "#4ade80"),
    makeSummary("Expenses", totalExp, "#f97373"),
    makeSummary("Payouts", totalPay, "#fb923c"),
    makeSummary("Net", net, net >= 0 ? "#4ade80" : "#f97373")
  );

  function fillFinanceList(targetEl, items, key) {
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "admin-row-meta";
      empty.textContent = "None yet.";
      targetEl.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "admin-finance-row";

      const left = document.createElement("div");
      left.className = "admin-finance-label";
      left.textContent = `${adminFormatDate(item.date)} · ${item.label}`;

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";

      const amt = document.createElement("span");
      amt.className = "admin-finance-amt";
      amt.textContent = `$${item.amount.toFixed(2)}`;

      const del = document.createElement("button");
      del.className = "btn-circle";
      del.textContent = "✕";
      del.onclick = () => {
        if (confirm("Remove this entry?")) {
          adminFinances[key] = adminFinances[key].filter((f) => f.id !== item.id);
          adminSave();
          renderFinances();
        }
      };

      right.append(amt, del);
      row.append(left, right);
      targetEl.appendChild(row);
    });
  }

  fillFinanceList(revList, adminFinances.revenue, "revenue");
  fillFinanceList(expList, adminFinances.expenses, "expenses");
  fillFinanceList(payList, adminFinances.payouts, "payouts");
}

function add
