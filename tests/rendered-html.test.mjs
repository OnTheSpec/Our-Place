import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    DB: {},
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Our Place experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Our Place/);
  assert.match(html, /A warm place to stay close/);
  assert.match(html, /Good morning/);
  assert.match(html, /Talk about my day/);
  assert.match(html, /You were understood/);
  assert.match(html, /Call my family/);
  assert.match(html, /still-here-family-mark\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps safety and extraction boundaries in server code", async () => {
  const [route, client, css, layout] = await Promise.all([
    readFile(new URL("../app/api/extract/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/still-here-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /urgentLanguage/);
  assert.match(route, /json_schema/);
  assert.match(route, /Never diagnose/);
  assert.match(route, /person-centered reflection/);
  assert.match(client, /I’d rather type/);
  assert.match(client, /I want to understand you as you mean it/);
  assert.match(client, /Am I staying close to what you mean/);
  assert.match(client, /Come close before you act/);
  assert.match(client, /will take care of this/);
  assert.match(client, /Create this space together/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.match(css, /--clay:#a44735/);
  assert.match(css, /--violet:#75639d/);
  assert.match(css, /Klee-inspired color dialogue/);
  assert.match(layout, /still-here-family-mark\.png/);
});
