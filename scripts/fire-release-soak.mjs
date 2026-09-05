// Observe an already-started signed tour. Completion is not release certification.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [serial, expectedHash, output] = process.argv.slice(2);
if (!serial || !/^[a-f0-9]{64}$/.test(expectedHash || '') || !output)
  throw new Error('Usage: node scripts/fire-release-soak.mjs SERIAL APK_SHA256 NEW_OUTPUT_DIRECTORY');
const adb = process.env.ANDROID_ADB || '/Users/luke/Library/Android/sdk/platform-tools/adb';
const pkg = 'solar.orrery.android';
const dir = resolve(output);
if (existsSync(dir)) throw new Error('Use a new evidence directory');
mkdirSync(dir, { recursive: true });
const command = (...args) => execFileSync(adb, ['-s', serial, ...args], { timeout: 25000, maxBuffer: 256 * 1024 * 1024 });
const shell = (...args) => command('shell', ...args).toString().trim();
const number = (pattern, text) => {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing metric: ${pattern}`);
  return Number(match[1]);
};
const emit = value => {
  const line = JSON.stringify({ ...value, utc: new Date().toISOString() });
  appendFileSync(`${dir}/samples.jsonl`, line + '\n');
  console.log(line);
};
let originalTimeout;
let interrupted = false;
process.on('SIGTERM', () => { interrupted = true; });
process.on('SIGINT', () => { interrupted = true; });
try {
  const installed = shell('pm', 'path', pkg).replace(/^package:/, '');
  if (!installed.startsWith('/data/app/') || installed.includes('\n')) throw new Error('Expected one installed base APK');
  const actual = createHash('sha256').update(command('exec-out', 'cat', installed)).digest('hex');
  if (actual !== expectedHash) throw new Error('Installed APK does not match the signed candidate');
  const identity = shell('dumpsys', 'package', pkg);
  writeFileSync(`${dir}/package.txt`, identity);
  const pid = shell('pidof', pkg);
  if (!/^\d+$/.test(pid)) throw new Error('Expected one running app process');
  originalTimeout = shell('settings', 'get', 'system', 'screen_off_timeout');
  const logStart = shell('date', "'+%m-%d %H:%M:%S.000'");
  const start = performance.now();
  let previous = start;
  let nextFrame = 0;
  const metadata = { package: pkg, versionCode: number(/versionCode=(\d+)/, identity),
    sha256: actual, serial, pid, durationSeconds: 3600, originalTimeout,
    deviceLogStart: logStart, startUtc: new Date().toISOString(),
    memoryGate: 'Review the complete PSS/graphics trend and final interaction; no automatic memory pass.' };
  writeFileSync(`${dir}/start.json`, JSON.stringify(metadata, null, 2));
  shell('settings', 'put', 'system', 'screen_off_timeout', '2147483647');
  emit({ event: 'start', ...metadata });
  while (true) {
    if (interrupted) throw new Error('Observation interrupted');
    const now = performance.now();
    const elapsed = (now - start) / 1000;
    if (now - previous > 90000) throw new Error('Observation gap exceeds 90 seconds');
    previous = now;
    const awake = shell('dumpsys', 'power').includes('mWakefulness=Awake');
    const foreground = shell('dumpsys', 'activity', 'activities').split('\n')
      .some(line => line.includes('mResumedActivity:') && line.includes(pkg + '/'));
    if (!awake || !foreground || shell('pidof', pkg) !== pid)
      throw new Error(`Continuity lost: awake=${awake}, foreground=${foreground}`);
    const memory = shell('dumpsys', 'meminfo', pkg);
    const events = shell('logcat', '-b', 'events', '-d', '-v', 'brief', '-T', `'${logStart}'`);
    const failures = events.split('\n').filter(line => line.includes(pkg) && /am_crash|am_anr/.test(line));
    const sample = { event: 'sample', elapsedSeconds: Math.round(elapsed * 10) / 10, pid, awake, foreground,
      pssKB: number(/TOTAL PSS:\s+(\d+)/, memory), graphicsKB: number(/Graphics:\s+(\d+)/, memory),
      batteryC: number(/temperature:\s+(\d+)/, shell('dumpsys', 'battery')) / 10,
      thermalStatus: number(/Thermal Status:\s+(\d+)/, shell('dumpsys', 'thermalservice')),
      crashAnrEvents: failures };
    emit(sample);
    appendFileSync(`${dir}/memory.txt`, '\n' + new Date().toISOString() + '\n' + memory);
    if (failures.length || sample.thermalStatus >= 3 || sample.batteryC >= 48)
      throw new Error('Crash/ANR or thermal safety gate failed');
    if (elapsed >= nextFrame || elapsed >= 3600) {
      writeFileSync(`${dir}/frame-${Math.floor(elapsed).toString().padStart(4, '0')}.png`, command('exec-out', 'screencap', '-p'));
      nextFrame += 600;
    }
    if (elapsed >= 3600) {
      const result = { status: 'completed_observation', elapsedSeconds: elapsed,
        nextGate: 'Review memory/frame evidence and final interaction before certification.' };
      writeFileSync(`${dir}/result.json`, JSON.stringify(result, null, 2));
      emit({ event: 'completed_observation', ...result });
      break;
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(60000, Math.max(1000, 3600000 - (performance.now() - start)))));
  }
} catch (error) {
  writeFileSync(`${dir}/result.json`, JSON.stringify({ status: 'invalidated', reason: error.message }));
  emit({ event: 'invalidated', reason: error.message });
  process.exitCode = 1;
} finally {
  try {
    if (originalTimeout !== undefined && shell('settings', 'get', 'system', 'screen_off_timeout') === '2147483647') {
      if (originalTimeout === 'null') shell('settings', 'delete', 'system', 'screen_off_timeout');
      else shell('settings', 'put', 'system', 'screen_off_timeout', originalTimeout);
    }
    emit({ event: 'cleanup', screenOffTimeout: shell('settings', 'get', 'system', 'screen_off_timeout') });
  } catch (error) { emit({ event: 'cleanup_pending', reason: error.message }); }
}
