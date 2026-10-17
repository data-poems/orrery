// Usage: node scripts/web-layer-probe.mjs <url> [port=9381]
// Turns on the asteroid belt (b), comets (c), meteors (r) and satellites (i)
// layers with keyboard shortcuts and counts data requests for 10 s. CelesTrak
// requests are intercepted and answered locally with 503, so nothing leaves
// this machine.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const [url, portArg = '9381'] = process.argv.slice(2);
const port = Number(portArg);
const here = dirname(fileURLToPath(import.meta.url));
const ledger = readFileSync(join(here, 'web-gl-ledger.js'), 'utf8');
const profile = mkdtempSync(join(tmpdir(), 'orrery-layer-probe-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1280,800', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver; for (let i = 0; i < 50 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let id = 0; const pending = new Map(); const counts = {}; let counting = false; let sessionId;
const send = (method, params = {}, sid) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent' && counting) {
    const u = m.params.request.url; const key = u.includes('celestrak') ? 'celestrak' : u.split('/').pop().split('?')[0];
    if (/json|tle|celestrak/.test(key)) counts[key] = (counts[key] || 0) + 1;
  }
  if (m.method === 'Fetch.requestPaused') {
    send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 503, body: '' }, sessionId);
  }
};
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Network.enable');
await S('Network.setCacheDisabled', { cacheDisabled: false });
await S('Fetch.enable', { patterns: [{ urlPattern: '*celestrak.org*' }] });
await S('Page.addScriptToEvaluateOnNewDocument', { source: ledger });
await S('Page.navigate', { url });
const ev = async (e) => (await S('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
for (let i = 0; i < 120; i++) { await sleep(500); if (await ev(`!!document.querySelector('[aria-label="Start ambient tour"]')`)) break; }
await sleep(3000);
const key = async (k) => { for (const type of ['keyDown', 'keyUp']) await S('Input.dispatchKeyEvent', { type, key: k, text: type === 'keyDown' ? k : undefined, code: 'Key' + k.toUpperCase() }); };
counting = true;
for (const k of ['b', 'c', 'r', 'i']) { await key(k); await sleep(200); }
await sleep(10000);
counting = false;
const labels = await ev(`(() => { const t = document.body.innerText; return { halley: /Halley/.test(t), perseids: /Perseid/i.test(t), geminids: /Geminid/i.test(t), iss: /ISS|ZARYA/.test(t) }; })()`);
const d0 = await ev('window.__glLedger.draws'); const f0 = await ev('window.__glLedger.frames'); await sleep(2000); const d1 = await ev('window.__glLedger.draws'); const f1 = await ev('window.__glLedger.frames');
const heap = await ev('performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null');
console.log(JSON.stringify({ url, requestsIn10s: counts, labels, drawsPerFrame: Math.round((d1 - d0) / Math.max(1, f1 - f0)), heapMB: heap }));
ws.close(); chrome.kill('SIGTERM'); await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 5000); });
try { execFileSync('rm', ['-rf', profile]); } catch {}
