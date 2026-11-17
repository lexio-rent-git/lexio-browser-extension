// Minimal read-only client for the Lexio Rent API v1 (https://docs.lexio.rent).
// No dependency, no build step: the same file runs in the extension and in Node tests.

export const DEFAULT_BASE_URL = "https://api.lexio.rent/api/external/v1";

export class LexioError extends Error {
  constructor(status, code, detail, requestId) {
    super(detail || code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.requestId = requestId;
  }
}

export class LexioClient {
  constructor(apiKey, { baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
    if (!apiKey) throw new LexioError(0, "MISSING_API_KEY", "No API key");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetch = fetchImpl;
  }

  async get(path, params = {}) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
    }
    const qs = query.toString();
    const res = await this.fetch(`${this.baseUrl}${path}${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    if (!res.ok) throw new LexioError(res.status, body.code, body.detail, body.requestId);
    return body;
  }

  // Follows nextCursor; stops on a short page or after `max` items.
  async list(path, params = {}, max = 100) {
    const out = [];
    let cursor;
    const limit = Math.min(100, max);
    for (;;) {
      const page = await this.get(path, { ...params, limit, cursor });
      const data = page.data || [];
      out.push(...data);
      if (out.length >= max) return out.slice(0, max);
      if (!page.nextCursor || data.length < limit || page.nextCursor === cursor) return out;
      cursor = page.nextCursor;
    }
  }

  organization() {
    return this.get("/organization").then((r) => r.data);
  }

  availability({ startAt, endAt, vehicleType }) {
    return this.list("/availability", { startAt, endAt, vehicleType, isAvailable: true }, 50);
  }

  rentals(params, max = 50) {
    return this.list("/rentals", params, max);
  }

  customers(params) {
    return this.list("/customers", params, 10);
  }
}

// --- helpers used by the popup (pure, tested) ---------------------------------------

export function isoDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// "2026-11-30T09:00:00+01:00" -> "30/11 09:00" in the agency's time (the offset is kept as sent).
export function shortDateTime(value, locale = "en") {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return value;
  return locale.startsWith("fr") ? `${m[3]}/${m[2]} ${m[4]}:${m[5]}` : `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
}

export function money(amount, currency = "EUR", locale = "en") {
  if (amount === null || amount === undefined) return "";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function customerName(c) {
  if (!c) return "";
  if (c.isCompany && c.companyName) return c.companyName;
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.email || "";
}

// Today's movements: reserved rentals starting today, rentals in progress ending today.
export function splitToday(rentals, today) {
  const day = (v) => (v || "").slice(0, 10);
  const pickups = rentals.filter((r) => r.status === "RESERVED" && day(r.period?.startAt) === today);
  const returns = rentals.filter((r) => r.status === "IN_PROGRESS" && day(r.period?.endAt) === today);
  const byTime = (field) => (a, b) => (a.period?.[field] || "").localeCompare(b.period?.[field] || "");
  return { pickups: pickups.sort(byTime("startAt")), returns: returns.sort(byTime("endAt")) };
}

// "Hugo Robert <hugo.robert@example.com>" -> "hugo.robert@example.com" (lower case); null if none.
export function parseAddress(value) {
  if (!value) return null;
  const m = /<([^<>\s]+@[^<>\s]+)>/.exec(value) || /([^\s<>,;"]+@[^\s<>,;"]+)/.exec(value);
  return m ? m[1].toLowerCase() : null;
}
