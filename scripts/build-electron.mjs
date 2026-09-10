import { spawnSync } from 'node:child_process';
import { mkdirSync, cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const electronDir = path.join(root, 'electron');
const outDir = path.join(root, 'dist-electron');

mkdirSync(outDir, { recursive: true });

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'esbuild',
    path.join(electronDir, 'main.ts'),
    path.join(electronDir, 'preload.ts'),
    '--outdir',
    outDir,
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--external:electron',
    '--sourcemap',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

// Copy a default icon if present
const iconSrc = path.join(root, 'assets', 'icon.png');
if (existsSync(iconSrc)) {
  cpSync(iconSrc, path.join(outDir, 'icon.png'));
}

console.log('Electron main/preload built to dist-electron/');
