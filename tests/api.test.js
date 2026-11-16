import { test } from "node:test";
import assert from "node:assert/strict";
import { LexioClient, LexioError, isoDate, shortDateTime, customerName, splitToday, money } from "../src/api.js";

function fakeFetch(pages, calls = []) {
  let i = 0;
  return async (url, init) => {
    calls.push({ url, init });
    const page = pages[Math.min(i++, pages.length - 1)];
    return { ok: page.status === undefined || page.status < 400, status: page.status ?? 200, json: async () => page.body };
  };
}

test("sends the bearer key and drops empty params", async () => {
  const calls = [];
  const c = new LexioClient("lck_x", { fetchImpl: fakeFetch([{ body: { data: { name: "Demo" } } }], calls) });
  assert.equal((await c.organization()).name, "Demo");
  assert.equal(calls[0].init.headers.Authorization, "Bearer lck_x");
  await c.get("/rentals", { status: "RESERVED", number: "", cursor: undefined });
  assert.ok(calls[1].url.endsWith("/rentals?status=RESERVED"));
});

test("follows nextCursor and stops on a short page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const calls = [];
  const c = new LexioClient("k", { fetchImpl: fakeFetch([{ body: { data: full, nextCursor: "a" } }, { body: { data: [{ id: 100 }], nextCursor: "b" } }], calls) });
  const items = await c.list("/vehicles", {}, 500);
  assert.equal(items.length, 101);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].url.includes("cursor=a"));
});

test("caps results at max", async () => {
  const c = new LexioClient("k", { fetchImpl: fakeFetch([{ body: { data: Array.from({ length: 10 }, (_, i) => ({ id: i })), nextCursor: "a" } }]) });
  assert.equal((await c.list("/rentals", {}, 10)).length, 10);
});

test("maps problem+json errors", async () => {
  const c = new LexioClient("k", { fetchImpl: fakeFetch([{ status: 403, body: { code: "INSUFFICIENT_SCOPE", detail: "offers.read", requestId: "r1" } }]) });
  await assert.rejects(c.get("/availability"), (e) => e instanceof LexioError && e.status === 403 && e.detail === "offers.read" && e.requestId === "r1");
  assert.throws(() => new LexioClient(""), LexioError);
});

test("formatting helpers", () => {
  assert.equal(isoDate(new Date(2026, 10, 5)), "2026-11-05");
  assert.equal(shortDateTime("2026-11-30T09:00:00+01:00", "fr"), "30/11 09:00");
  assert.equal(shortDateTime("2026-11-30T09:00:00+01:00", "en"), "11/30 09:00");
  assert.equal(customerName({ isCompany: true, companyName: "ACME" }), "ACME");
  assert.equal(customerName({ firstName: "Hugo", lastName: "ROBERT" }), "Hugo ROBERT");
  assert.match(money(411.6, "EUR", "fr"), /411,60/);
});

test("splitToday keeps reserved starts and in-progress ends of the day, sorted", () => {
  const r = (status, startAt, endAt, n) => ({ status, number: n, period: { startAt, endAt } });
  const { pickups, returns } = splitToday(
    [
      r("RESERVED", "2026-11-16T14:00:00+01:00", "2026-11-18T09:00:00+01:00", "B"),
      r("RESERVED", "2026-11-16T08:00:00+01:00", "2026-11-17T09:00:00+01:00", "A"),
      r("RESERVED", "2026-11-17T08:00:00+01:00", "2026-11-19T09:00:00+01:00", "X"),
      r("IN_PROGRESS", "2026-11-10T08:00:00+01:00", "2026-11-16T18:00:00+01:00", "C"),
      r("IN_PROGRESS", "2026-11-10T08:00:00+01:00", "2026-11-20T18:00:00+01:00", "Y"),
    ],
    "2026-11-16",
  );
  assert.deepEqual(pickups.map((x) => x.number), ["A", "B"]);
  assert.deepEqual(returns.map((x) => x.number), ["C"]);
});
