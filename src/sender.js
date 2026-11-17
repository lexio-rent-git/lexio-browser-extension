// Thunderbird only: shows the Lexio customer behind the sender of the displayed email.
import { LexioClient, customerName, shortDateTime, parseAddress } from "./api.js";
import { t, LOCALE, errorMessage } from "./i18n.js";

const $ = (sel) => document.querySelector(sel);
const api = globalThis.messenger || globalThis.browser;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k === "class" ? "class" : k, v);
  for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(c ?? ""));
  return node;
}

function setStatus(text, isError = false) {
  $("#status").textContent = text || "";
  $("#status").classList.toggle("error", isError);
}

function rentalItem(r) {
  const v = r.vehicle || {};
  return el(
    "li",
    {},
    el("div", { class: "row" }, el("strong", {}, r.number || ""), el("span", { class: `badge ${r.status}` }, t.status[r.status] || r.status)),
    el("div", {}, `${v.name || v.model || ""} · ${v.plate || ""}`),
    el("div", { class: "muted" }, `${shortDateTime(r.period?.startAt, LOCALE)} → ${shortDateTime(r.period?.endAt, LOCALE)}`),
  );
}

// The sender, or the first recipient when the email was sent by the agency itself.
export async function displayedAddress() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  const msg = await api.messageDisplay.getDisplayedMessage(tab.id);
  if (!msg) return null;
  const identities = new Set();
  try {
    for (const acc of await api.accounts.list()) for (const id of acc.identities || []) identities.add((id.email || "").toLowerCase());
  } catch {
    // accountsRead not granted: fall back to the author.
  }
  const author = parseAddress(msg.author);
  if (author && !identities.has(author)) return author;
  return parseAddress((msg.recipients || [])[0]) || author;
}

async function main() {
  document.documentElement.lang = LOCALE;
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t[node.dataset.t];
  $("#settings").textContent = t.settings;
  const openSettings = () => api.runtime.openOptionsPage();
  $("#settings").addEventListener("click", openSettings);
  $("#opensettings").addEventListener("click", openSettings);

  const { apiKey, orgName } = await api.storage.local.get(["apiKey", "orgName"]);
  if (!apiKey) {
    $("#needkey").hidden = false;
    return;
  }
  if (orgName) $("#org").textContent = orgName;
  const email = await displayedAddress();
  if (!email) return setStatus(t.senderNoMessage);
  setStatus(`${t.senderLookup} ${email}…`);
  const client = new LexioClient(apiKey);
  const customers = await client.customers({ email });
  const box = $("#results");
  if (!customers.length) {
    box.append(el("p", { class: "muted" }, t.senderNone), el("p", {}, email));
    return setStatus("");
  }
  for (const c of customers) {
    const rentals = await client.rentals({ customerId: c.id }, 10);
    const ul = el("ul", { class: "list" });
    ul.replaceChildren(...(rentals.length ? rentals.map(rentalItem) : [el("li", { class: "muted" }, t.nothingFound)]));
    box.append(
      el("h2", {}, `${t.customer}${customerName(c)}`),
      el("p", { class: "muted" }, [c.email, c.phone].filter(Boolean).join(" · ")),
      el("h2", {}, t.rentalsOf),
      ul,
    );
  }
  setStatus("");
}

main().catch((err) => setStatus(errorMessage(err), true));
