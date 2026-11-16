import { LexioClient } from "./api.js";
import { t, LOCALE, errorMessage } from "./i18n.js";

const $ = (sel) => document.querySelector(sel);

function setStatus(text, isError = false) {
  $("#status").textContent = text;
  $("#status").classList.toggle("error", isError);
}

async function save(event) {
  event.preventDefault();
  const apiKey = $("#apiKey").value.trim();
  setStatus("…");
  try {
    const org = await new LexioClient(apiKey).organization();
    await chrome.storage.local.set({ apiKey, orgName: org?.name || "" });
    setStatus(`${t.optSaved} ${org?.name || "Lexio"}.`);
  } catch (err) {
    setStatus(errorMessage(err), true);
  }
}

async function remove() {
  await chrome.storage.local.remove(["apiKey", "orgName"]);
  $("#apiKey").value = "";
  setStatus(t.optRemoved);
}

async function main() {
  document.documentElement.lang = LOCALE;
  for (const node of document.querySelectorAll("[data-t]")) node.textContent = t[node.dataset.t];
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) $("#apiKey").value = apiKey;
  $("#keyform").addEventListener("submit", save);
  $("#remove").addEventListener("click", remove);
}

main();
