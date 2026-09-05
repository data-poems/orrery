// Run the isolated debug tour; retain raw device evidence, never certify a release.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, appendFileSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const [serial, output, duration = '600'] = process.argv.slice(2);
if (!serial || !output || !/^\d+$/.test(duration)) throw new Error('Usage: node scripts/fire-graphics-probe.mjs SERIAL OUTPUT [SECONDS]');
const adb = process.env.ANDROID_ADB || '/Users/luke/Library/Android/sdk/platform-tools/adb';
const dir = resolve(output);
mkdirSync(dir, { recursive: true });
if (existsSync(`${dir}/samples.jsonl`)) throw new Error('Use a new output directory for every run');
const shell = (...args) => execFileSync(adb, ['-s', serial, 'shell', ...args], { encoding: 'utf8', timeout: 15000 });
const installed = shell('pm', 'path', 'solar.orrery.android.debug').trim().replace(/^package:/, '');
if (!installed.startsWith('/data/app/') || installed.includes('\n')) throw new Error('Expected one installed base APK');
execFileSync(adb, ['-s', serial, 'pull', installed, `${dir}/installed.apk`], { timeout: 30000 });
writeFileSync(`${dir}/SHA256SUMS.txt`, createHash('sha256').update(readFileSync(`${dir}/installed.apk`)).digest('hex') + '  installed.apk\n');
writeFileSync(`${dir}/device.txt`, shell('getprop'));
writeFileSync(`${dir}/package.txt`, shell('dumpsys', 'package', 'solar.orrery.android.debug'));
const run = spawn(adb, ['-s', serial, 'shell', 'am', 'instrument', '-w', '-e', 'seconds', duration, '-e', 'class', 'solar.orrery.android.GraphicsTourTest', 'solar.orrery.android.debug.test/androidx.test.runner.AndroidJUnitRunner']);
let transcript = '';
for (const stream of [run.stdout, run.stderr]) stream.on('data', data => {
  transcript += data;
  appendFileSync(`${dir}/instrumentation.txt`, data);
  process.stdout.write(data);
});
const start = Date.now();
let lastPid;
let sampleCount = 0;
let routeStream;
let routeBuffer = '';
const sample = () => {
  try {
    const memory = shell('dumpsys', 'meminfo', 'solar.orrery.android.debug');
    const entry = { at: new Date().toISOString(), elapsed: (Date.now() - start) / 1000,
      pid: memory.match(/MEMINFO in pid (\d+)/)?.[1],
      pssKB: Number(memory.match(/TOTAL PSS:\s+(\d+)/)?.[1]) || null,
      graphicsKB: Number(memory.match(/Graphics:\s+(\d+)/)?.[1]) || null,
      awake: shell('dumpsys', 'power').match(/mWakefulness=(\w+)/)?.[1],
      foreground: shell('dumpsys', 'activity', 'activities').match(/mResumedActivity:.*$/m)?.[0],
      thermal: shell('dumpsys', 'thermalservice').match(/Thermal Status:.*$/m)?.[0] };
    appendFileSync(`${dir}/samples.jsonl`, JSON.stringify(entry) + '\n');
    lastPid = entry.pid;
    if (lastPid && !routeStream) {
      // Stream early entries too: a final logcat dump can lose them to ring eviction.
      routeStream = spawn(adb, ['-s', serial, 'logcat', '--pid', lastPid, '-s', 'Capacitor/Console:I']);
      routeStream.stdout.on('data', data => {
        routeBuffer += data;
        const lines = routeBuffer.split('\n');
        routeBuffer = lines.pop();
        for (const line of lines) if (line.includes('OrreryGraphicsRoute'))
          appendFileSync(`${dir}/route-stream.txt`, line + '\n');
      });
    }
    appendFileSync(`${dir}/memory.txt`, '\n' + entry.at + '\n' + memory);
    console.log(JSON.stringify(entry));
    if (sampleCount++ % 4 === 0) writeFileSync(`${dir}/frame-${sampleCount}.png`,
      execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p'], { timeout: 15000 }));
  } catch (error) { console.error(error.message); }
};
const timer = setInterval(sample, 30000);
run.on('close', code => {
  clearInterval(timer);
  routeStream?.kill();
  if (lastPid) {
    const route = shell('logcat', '-d', '--pid', lastPid).split('\n').filter(line => line.includes('OrreryGraphicsRoute'));
    writeFileSync(`${dir}/route.txt`, route.join('\n'));
  }
  writeFileSync(`${dir}/result.json`, JSON.stringify({ code, passed: /OK \(1 test\)/.test(transcript), finished: new Date().toISOString() }));
  process.exitCode = code || (/OK \(1 test\)/.test(transcript) ? 0 : 1);
});
