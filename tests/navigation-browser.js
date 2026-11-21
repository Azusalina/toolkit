import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright-core';
import { createToolkit } from '../src/server.js';
import { findChromium } from '../src/core/pdf.js';

const app = await createToolkit({ port: 0 });
const launcher = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`<a id="open" href="${app.url}" target="_blank" rel="noopener noreferrer">Open Toolkit</a>`);
});
launcher.listen(0, '127.0.0.1'); await once(launcher, 'listening');
let browser;
try {
  browser = await chromium.launch({ executablePath: await findChromium(), headless: true });
  const context = await browser.newContext();
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  await page.goto(`http://localhost:${launcher.address().port}/`);
  const initialized = context.waitForEvent('response', response => response.url() === `${app.url}api/views` && response.status() === 200);
  const popupEvent = page.waitForEvent('popup');
  await page.locator('#open').click();
  const popup = await popupEvent;
  await initialized;
  assert.equal(popup.url(), app.url);
  assert.equal(await popup.evaluate(async () => (await fetch('/api/info')).status), 200);
  assert.equal(await popup.evaluate(() => document.cookie), '');
  const cookie = (await context.cookies(app.url)).find(cookie => cookie.name.startsWith('toolkit_session_'));
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'Strict');
  await popup.reload();
  assert.equal(await popup.evaluate(async () => (await fetch('/api/info')).status), 200);
  await page.bringToFront();
  const rejected = await page.evaluate(async url => { try { await fetch(url + 'api/info'); return false; } catch { return true; } }, app.url);
  assert.equal(rejected, true);
  assert.deepEqual(errors, []);
  console.log('PASS navigation: localhost launcher → 127.0.0.1 Toolkit, page bootstrap, HttpOnly Strict cookie, authenticated API, reload, and blocked foreign fetch.');
} finally {
  await browser?.close();
  await new Promise(resolve => launcher.close(resolve));
  await app.close();
}
