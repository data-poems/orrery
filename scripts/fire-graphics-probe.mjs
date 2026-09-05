// Run the isolated debug tour; retain raw device evidence, never certify a release.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [serial, output, duration = '600'] = process.argv.slice(2);
if (!serial || !output || !/^\d+$/.test(duration)) throw new Error('Usage: node scripts/fire-graphics-probe.mjs SERIAL OUTPUT [SECONDS]');
const adb = process.env.ANDROID_ADB || '/Users/luke/Library/Android/sdk/platform-tools/adb';
const dir = resolve(output);
mkdirSync(dir, { recursive: true });
const shell = (...args) => execFileSync(adb, ['-s', serial, 'shell', ...args], { encoding: 'utf8', timeout: 15000 });
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
    appendFileSync(`${dir}/memory.txt`, '\n' + entry.at + '\n' + memory);
    console.log(JSON.stringify(entry));
  } catch (error) { console.error(error.message); }
};
const timer = setInterval(sample, 30000);
run.on('close', code => {
  clearInterval(timer);
  writeFileSync(`${dir}/result.json`, JSON.stringify({ code, passed: /OK \(1 test\)/.test(transcript), finished: new Date().toISOString() }));
  process.exitCode = code || (/OK \(1 test\)/.test(transcript) ? 0 : 1);
});
