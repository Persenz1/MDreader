const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const require2 = createRequire('file:///D:/Code/MDreader/');
const esbuild = require2('esbuild');
esbuild.buildSync({
  entryPoints: ['D:/Code/MDreader/src/lib/math-extract.ts'],
  outfile: 'D:/Code/MDreader/tests/.mx.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
});
const { extractMath } = require('D:/Code/MDreader/tests/.mx.cjs');
const files = [
  'D:/Pdrive/Document/论文/IJMS/理论依据/共同背板轴向定向柔顺爪刺阵列_理论母稿.md',
  'D:/Pdrive/Document/论文/IJMS/理论依据/钩爪式爬壁机器人抓附机理与多尺度力学模型_最终理论母稿.md',
  'D:/Pdrive/Document/论文/IJMS/理论依据/钩爪式爬壁机器人抓附机理与多尺度力学模型.md',
];
for (const f of files) {
  const t0 = Date.now();
  const src = readFileSync(f, 'utf8');
  const t1 = Date.now();
  const { text, map } = extractMath(src);
  const t2 = Date.now();
  const name = f.split(/[/\\]/).pop();
  console.log(name, '| read', t1 - t0, 'ms | extract', t2 - t1, 'ms | math', map.size, '| out', text.length);
}
