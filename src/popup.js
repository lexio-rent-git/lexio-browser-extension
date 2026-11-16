import { LexioClient, isoDate, shortDateTime, money, customerName, splitToday } from "./api.js";
import { t, LOCALE, VEHICLE_TYPES, errorMessage } from "./i18n.js";

const $ = (sel) => document.querySelector(sel);
let client;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(c ?? ""));
  return node;
}

function setStatus(text, isError = false) {
  const s = $("#status");
  s.textContent = text || "";
  s.classList.toggle("error", isError);
}

function rentalItem(r) {
  const v = r.vehicle || {};
  return el(
    "li",
    {},
    el("div", { class: "row" }, el("strong", {}, r.number || ""), el("span", { class: `badge ${r.status}` }, t.status[r.status] || r.status)),
    el("div", {}, `${v.name || v.model || ""} · ${v.plate || ""}`),
    el("div", { class: "muted" }, `${customerName(r.customer)} · ${shortDateTime(r.period?.startAt, LOCALE)} → ${shortDateTime(r.period?.endAt, LOCALE)}`),
  );
}

function fill(list, items, render, emptyText) {
  list.replaceChildren(...(items.length ? items.map(render) : [el("li", { class: "muted" }, emptyText)]));
}

async function loadToday() {
  const today = isoDate(new Date());
  setStatus(t.loading);
  const rentals = await client.rentals({ from: today, to: today, status: "RESERVED,IN_PROGRESS" }, 100);
  const { pickups, returns } = splitToday(rentals, today);
  fill($("#pickups"), pickups, rentalItem, t.noPickups);
  fill($("#returns"), returns, rentalItem, t.noReturns);
  setStatus("");
}

async function checkAvailability(event) {
  event.preventDefault();
  const startAt = $("#startAt").value;
  const endAt = $("#endAt").value;
  if (endAt <= startAt) return setStatus(t.errorDates, true);
  setStatus(t.loading);
  const offers = await client.availability({
    startAt: `${startAt}:00`.slice(0, 19),
    endAt: `${endAt}:00`.slice(0, 19),
    vehicleType: $("#vehicleType").value || undefined,
  });
  offers.sort((a, b) => (a.totalTTC ?? 0) - (b.totalTTC ?? 0));
  fill(
    $("#offers"),
    offers,
    (o) => {
      const v = o.vehicle || {};
      return el(
        "li",
        {},
        el("div", { class: "row" }, el("strong", {}, v.name || `${v.brand || ""} ${v.model || ""}`), el("span", {}, money(o.totalTTC, o.currency, LOCALE))),
        el("div", { class: "muted" }, `${v.plate || ""} · ${o.period?.billedDays ?? ""} ${t.days}${o.mileage?.name ? ` · ${o.mileage.name}` : ""}`),
      );
    },
    t.noVehicle,
  );
  setStatus("");
}

async function search(event) {
  event.preventDefault();
  const q = $("#query").value.trim();
  const box = $("#results");
  setStatus(t.loading);
  box.replaceChildren();
  if (q.includes("@")) {
    const customers = await client.customers({ email: q });
    for (const c of customers) {
      const rentals = await client.rentals({ customerId: c.id }, 10);
      box.append(
        el("h2", {}, `${t.customer}${customerName(c)}`),
        el("p", { class: "muted" }, [c.email, c.phone].filter(Boolean).join(" · ")),
        el("h2", {}, t.rentalsOf),
      );
      const ul = el("ul", { class: "list" });
      fill(ul, rentals, rentalItem, t.nothingFound);
      box.append(ul);
    }
    if (!customers.length) box.append(el("p", { class: "muted" }, t.nothingFound));
  } else {
    const rentals = await client.rentals({ number: q }, 5);
    const ul = el("ul", { class: "list" });
    fill(ul, rentals, rentalItem, t.nothingFound);
    box.append(ul);
  }
  setStatus("");
}

function selectTab(name) {
  for (const b of document.querySelectorAll("[role=tab]")) b.setAttribute("aria-selected", String(b.dataset.tab === name));
  for (const p of document.querySelectorAll("[data-panel]")) p.hidden = p.dataset.panel !== name;
  setStatus("");
}

function guard(fn) {
  return (...args) => fn(...args).catch((err) => setStatus(errorMessage(err), true));
}

function defaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const local = (d) => `${isoDate(d)}T${String(d.getHours()).padStart(2, "0")}:00`;
  $("#startAt").value = local(start);
  $("#endAt").value = local(end);
}

async function main() {
  document.documentElement.lang = LOCALE;
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t[node.dataset.t];
  const labels = { today: t.tabToday, availability: t.tabAvailability, search: t.tabSearch };
  for (const b of document.querySelectorAll("[role=tab]")) {
    b.textContent = labels[b.dataset.tab];
    b.addEventListener("click", () => selectTab(b.dataset.tab));
  }
  $("#settings").textContent = t.settings;
  $("#query").placeholder = t.searchPlaceholder;
  const sel = $("#vehicleType");
  sel.append(el("option", { value: "" }, t.anyType), ...VEHICLE_TYPES.map((v) => el("option", { value: v }, v)));
  defaultDates();
  const openSettings = () => chrome.runtime.openOptionsPage();
  $("#settings").addEventListener("click", openSettings);
  $("#opensettings").addEventListener("click", openSettings);

  const { apiKey, orgName } = await chrome.storage.local.get(["apiKey", "orgName"]);
  if (!apiKey) {
    $("#needkey").hidden = false;
    for (const p of document.querySelectorAll("[data-panel], nav")) p.hidden = true;
    return;
  }
  if (orgName) $("#org").textContent = orgName;
  client = new LexioClient(apiKey);
  $("#availform").addEventListener("submit", guard(checkAvailability));
  $("#searchform").addEventListener("submit", guard(search));
  await guard(loadToday)();
}

main();
