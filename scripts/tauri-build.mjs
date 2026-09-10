/**
 * Build with MSVC environment on Windows (vcvars64).
 * Usage: node scripts/tauri-build.mjs [--dev|--release]
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const isRelease = !isDev;

const vcvarsCandidates = [
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat',
];

const vcvars = vcvarsCandidates.find((p) => existsSync(p));
if (!vcvars) {
  console.error('vcvars64.bat not found. Install VS Build Tools with C++ workload.');
  process.exit(1);
}

const tauriCli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Run: vcvars && npx tauri build
const tauriArgs = isDev ? ['tauri', 'dev'] : ['tauri', 'build'];
const cmdLine = `call "${vcvars}" && "${process.execPath}" "${tauriCli}" ${isDev ? 'dev' : 'build'}`;

console.log('Using:', vcvars);
console.log(cmdLine);

const child = spawn(cmdLine, {
  cwd: root,
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.join(process.env.USERPROFILE || '', '.cargo', 'bin')};${process.env.PATH}`,
  },
});

child.on('exit', (code) => process.exit(code ?? 1));
