/**
 * Generate long Markdown stress-test documents.
 * Usage: node tests/generate-long-doc.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'tests', 'fixtures');
mkdirSync(outDir, { recursive: true });

function section(i, kind) {
  const lines = [];
  lines.push(`## ${i}. Section ${i}`);
  lines.push('');
  lines.push(
    `这是第 ${i} 个章节的压力测试段落。It mixes 中文 and English text repeatedly to stress line-breaking, CJK metrics, and paragraph rhythm. $x_{${i}} = ${i}^2 + \\alpha_{${i}}$ should stay inline without jumping.`
  );
  lines.push('');
  if (i % 3 === 0) {
    lines.push(`### ${i}.1 Subsection`);
    lines.push('');
    lines.push(`子章节内容，检查 TOC 层级。极限：$\\lim_{n\\to\\infty}\\frac{1}{n}=0$。`);
    lines.push('');
  }
  if (kind === 'math' || i % 2 === 0) {
    lines.push('$$');
    lines.push(`\\frac{d}{dt} F_{n,${i}}(t) = k_{n,${i}} \\, v_{n,${i}}(t) + c_{n,${i}} \\, a_{n,${i}}`);
    lines.push('$$');
    lines.push('');
    lines.push(`\\begin{align}`);
    lines.push(`F_x^{(${i})} &= F^{(${i})}\\cos\\theta_{${i}} \\\\`);
    lines.push(`F_y^{(${i})} &= F^{(${i})}\\sin\\theta_{${i}}`);
    lines.push(`\\end{align}`);
    lines.push('');
  }
  if (i % 5 === 0) {
    lines.push('```python');
    lines.push(`def compute_${i}(x):`);
    lines.push(`    return x ** 2 + ${i}`);
    lines.push('```');
    lines.push('');
  }
  if (i % 7 === 0) {
    lines.push('| k | value | unit |');
    lines.push('|---:|---:|---|');
    lines.push(`| ${i} | ${(i * 1.13).toFixed(3)} | N/m |`);
    lines.push('');
  }
  if (i % 11 === 0) {
    lines.push(`![fig ${i}](./images/placeholder_${i}.png)`);
    lines.push('');
  }
  return lines.join('\n');
}

function build(targetLines, file) {
  const parts = [];
  parts.push(`# Long Document Stress Test (${file})`);
  parts.push('');
  parts.push('本文件由脚本生成，用于打开速度、滚动与 MathJax 压力测试。');
  parts.push('');
  let i = 0;
  while (parts.join('\n').split('\n').length < targetLines) {
    i += 1;
    parts.push(section(i, 'math'));
  }
  const content = parts.join('\n') + '\n';
  writeFileSync(join(outDir, file), content, 'utf8');
  const lines = content.split('\n').length;
  const mathCount = (content.match(/\$\$|\\begin\{align\}/g) || []).length;
  console.log(`${file}: ${lines} lines, ~${mathCount} math blocks`);
}

build(5000, 'long_doc_5k.md');
build(10000, 'long_doc_10k.md');
console.log('done');
