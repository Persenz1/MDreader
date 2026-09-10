const { createRequire } = require('node:module');
const require2 = createRequire('file:///D:/Code/MDreader/');
const esbuild = require2('esbuild');
const { readFileSync } = require('node:fs');

esbuild.buildSync({
  entryPoints: ['D:/Code/MDreader/src/lib/blocks.ts'],
  outfile: 'D:/Code/MDreader/tests/.blocks.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
});
const { parseBlocks, blocksToSource } = require('D:/Code/MDreader/tests/.blocks.cjs');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('OK ', name); }
  else { fail++; console.error('FAIL', name, extra); }
}

const sample = `---
title: Demo
---

# Title

Hello **world** and $E=mc^2$.

$$
F = ma
$$

\\begin{align}
a &= b \\\\
c &= d
\\end{align}

\`\`\`python
print("hi")
\`\`\`

| a | b |
|---|---|
| 1 | 2 |

- item1
- item2

> quote

---

Last para.
`;

const blocks = parseBlocks(sample);
console.log('blocks:', blocks.map((b) => b.kind + ':' + b.source.slice(0, 20).replace(/\n/g, ' ')));
check('has frontmatter', blocks.some((b) => b.kind === 'frontmatter'));
check('has heading', blocks.some((b) => b.kind === 'heading'));
check('has paragraph', blocks.some((b) => b.kind === 'paragraph'));
check('has $$ math', blocks.some((b) => b.kind === 'math' && b.source.includes('F = ma')));
check('has align env', blocks.some((b) => b.kind === 'math' && b.source.includes('\\begin{align}')));
check('has code', blocks.some((b) => b.kind === 'code'));
check('has table', blocks.some((b) => b.kind === 'table'));
check('has list', blocks.some((b) => b.kind === 'list'));
check('has blockquote', blocks.some((b) => b.kind === 'blockquote'));
check('has hr', blocks.some((b) => b.kind === 'hr'));

const rebuilt = blocksToSource(blocks);
check('roundtrip keeps math', rebuilt.includes('\\begin{align}'));
check('roundtrip keeps code', rebuilt.includes('print("hi")'));
check('roundtrip keeps title', rebuilt.includes('# Title'));

const real = readFileSync('D:/Pdrive/Document/论文/IJMS/理论依据/钩爪式爬壁机器人抓附机理与多尺度力学模型_最终理论母稿.md', 'utf8');
const t0 = Date.now();
const rb = parseBlocks(real);
const t1 = Date.now();
const rs = blocksToSource(rb);
check('real paper parse < 100ms', t1 - t0 < 100, `${t1 - t0}ms`);
check('real paper block count > 50', rb.length > 50, String(rb.length));
check('real paper roundtrip similar size', Math.abs(rs.length - real.length) < real.length * 0.15, `${rs.length} vs ${real.length}`);
console.log(`real: ${rb.length} blocks, parse ${t1 - t0}ms, src ${rs.length}/${real.length}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
