// Browser-side companion to fire-graphics-probe.mjs: no device, no certification.
// Usage: node scripts/web-tour-probe.mjs <url> <seconds> <out.json> [cpuThrottle=1] [port=9333]
// Serve a build first (VITE_ORRERY_GRAPHICS_PROBE=true gives a repeatable tour),
// e.g. VITE_CAPACITOR=true VITE_ORRERY_GRAPHICS_PROBE=true npx vite build --base=./ --outDir dist/probe
// then python3 -m http.server 5051 --bind 127.0.0.1 --directory dist.
// Starts headless Chrome with web-gl-ledger.js, turns on the ambient tour, and
// samples WebGL object counts and creation rates, React commits, JS heap, DOM
// nodes and GPU-process RSS every 10 s.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, secondsArg, out, throttleArg = '1', portArg = '9333'] = process.argv.slice(2);
const seconds = Number(secondsArg), throttle = Number(throttleArg), port = Number(portArg);
const here = dirname(fileURLToPath(import.meta.url));
const ledger = readFileSync(join(here, 'web-gl-ledger.js'), 'utf8');
const profile = mkdtempSync(join(tmpdir(), 'orrery-probe-'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--enable-precise-memory-info',
  '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--window-size=1280,800',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', (d) => { chromeErr += d; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ver;
for (let i = 0; i < 50; i++) {
  try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(200); }
}
if (!ver) { console.error('chrome did not start', chromeErr.slice(-2000)); process.exit(1); }
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
const pageErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description?.slice(0, 600) || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) pageErrors.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 600));
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const mid = ++id; pending.set(mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable'); await S('Performance.enable');
await S('Page.addScriptToEvaluateOnNewDocument', { source: ledger });
await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1.5, mobile: false });
await S('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 11; KFRASWI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36' });
if (throttle > 1) await S('Emulation.setCPUThrottlingRate', { rate: throttle });
await S('Page.navigate', { url });
const evalJS = async (expr) => (await S('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

// Wait for the tour control, then start the ambient tour.
let started = false;
for (let i = 0; i < 240 && !started; i++) {
  await sleep(500);
  started = await evalJS(`(() => { const b = document.querySelector('[aria-label="Start ambient tour"]'); if (!b) return false; b.click(); return true; })()`);
}
if (!started) { console.error('tour control never appeared'); }
await sleep(1500);
const renderer = await evalJS(`(() => { const c = document.querySelector('canvas'); const g = c && (c.getContext('webgl2') || c.getContext('webgl')); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; })()`);
const tourOn = await evalJS(`!!document.querySelector('[aria-label="Stop ambient tour"]')`);
const pageText = await evalJS(`document.body.innerText.slice(0, 400)`);
console.log('started', started, 'tourOn', tourOn, 'text:', JSON.stringify(pageText.slice(0, 120)), 'errors:', JSON.stringify(pageErrors.slice(0, 8)));

const gpuPids = () => {
  try {
    return execFileSync('pgrep', ['-f', `type=gpu-process.*${profile.split('/').pop()}|${profile.split('/').pop()}.*type=gpu-process`]).toString().trim().split('\n').filter(Boolean);
  } catch { return []; }
};
const rssKB = (pid) => { try { return Number(execFileSync('ps', ['-o', 'rss=', '-p', pid]).toString().trim()); } catch { return null; } };
const samples = [];
const t0 = Date.now();
while (Date.now() - t0 <= seconds * 1000) {
  const s = await evalJS(`(() => ({
    t: performance.now(), ledger: JSON.parse(JSON.stringify(window.__glLedger)),
    heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    dom: document.getElementsByTagName('*').length,
    tour: !!document.querySelector('[aria-label="Stop ambient tour"]'),
  }))()`);
  const m = await S('Performance.getMetrics');
  const metric = (n) => (m.metrics.find((x) => x.name === n) || {}).value;
  const pids = gpuPids();
  s.gpuRssKB = pids.length ? rssKB(pids[0]) : null;
  s.jsEventListeners = metric('JSEventListeners');
  s.elapsed = (Date.now() - t0) / 1000;
  samples.push(s);
  process.stdout.write(`t=${s.elapsed.toFixed(0)}s frames=${s.ledger.frames} buf live=${s.ledger.live.buffer} created=${s.ledger.created.buffer} prog live=${s.ledger.live.program} links=${s.ledger.links} commits=${JSON.stringify(s.ledger.commits)} vao live=${s.ledger.live.vao} tex live=${s.ledger.live.texture} bufKB=${(s.ledger.bufferBytes/1024).toFixed(0)} heapMB=${(s.heap/1048576).toFixed(1)} dom=${s.dom} gpuRSS=${s.gpuRssKB} tour=${s.tour}\n`);
  await sleep(10000);
}
writeFileSync(out, JSON.stringify({ url, seconds, throttle, renderer, tourOn, pageText, pageErrors, samples }, null, 1));
await send('Target.closeTarget', { targetId }).catch(() => {});
ws.close(); chrome.kill('SIGTERM');
await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 5000); });
try { execFileSync('rm', ['-rf', profile]); } catch (e) { console.error('profile cleanup failed', profile); }
