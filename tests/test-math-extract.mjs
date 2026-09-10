/**
 * Node smoke tests for math extraction (no DOM).
 * Run: node tests/test-math-extract.mjs
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

const fixture = readFileSync(
  join(root, 'tests/fixtures/latex_compatibility_test.md'),
  'utf8'
);

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  OK  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

console.log('Fixture checks');
check('has $...$', fixture.includes('$E = mc^2$'));
check('has $$...$$', /\$\$\s*\n?E = mc\^2\s*\n?\$\$/.test(fixture));
check('has \\(...\\)', fixture.includes('\\(F = ma\\)'));
check('has \\[...\\]', /\\\[\s*\n?F = ma\s*\n?\\\]/.test(fixture));
check('has equation env', fixture.includes('\\begin{equation}'));
check('has align env', fixture.includes('\\begin{align}'));
check('has aligned', fixture.includes('\\begin{aligned}'));
check('has gather', fixture.includes('\\begin{gather}'));
check('has split', fixture.includes('\\begin{split}'));
check('has cases', fixture.includes('\\begin{cases}'));
check('has matrix', fixture.includes('\\begin{matrix}'));
check('has pmatrix', fixture.includes('\\begin{pmatrix}'));
check('has bmatrix', fixture.includes('\\begin{bmatrix}'));
check('has Bmatrix', fixture.includes('\\begin{Bmatrix}'));
check('has vmatrix', fixture.includes('\\begin{vmatrix}'));
check('has Vmatrix', fixture.includes('\\begin{Vmatrix}'));
check('has label', fixture.includes('\\label{eq:newton}'));
check('has eqref', fixture.includes('\\eqref{eq:newton}'));
check('has newcommand', fixture.includes('\\newcommand'));
check('has DeclareMathOperator', fixture.includes('\\DeclareMathOperator'));
check('has mhchem', fixture.includes('\\ce{H2O}'));
check('has Chinese text math', fixture.includes('F_{\\text{法向}}'));
check('protects $ in code fence', fixture.includes('price = "$100"'));
check('inline code $x$', fixture.includes('`$x$`'));
check('malformed formula present', fixture.includes('\\frac{abc'));
check('inline code $PATH present', fixture.includes('`$PATH`'));

// Bundle extractor for Node
const esbuild = require('esbuild');
const outfile = join(root, 'tests', '.math-extract.cjs');
esbuild.buildSync({
  entryPoints: [join(root, 'src/lib/math-extract.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
});
const mod = require(outfile);

function extract(src) {
  return mod.extractMath(src);
}

console.log('\nExtractor unit checks');

{
  const src = '```python\nprice = "$100"\n```\n\nMath $E=mc^2$ ok\n';
  const { text, map } = extract(src);
  check('code fence keeps $100', text.includes('$100'));
  check(
    'code fence not extracted as math',
    ![...map.values()].some((m) => m.tex.includes('100'))
  );
  check(
    'inline math extracted',
    [...map.values()].some((m) => m.tex.includes('E=mc^2'))
  );
}

{
  const { map } = extract('Use $PATH carefully.');
  check('$PATH not treated as math', map.size === 0, `got ${map.size}`);
}

{
  const { map } = extract('Costs $100 dollars.');
  check('$100 not treated as math', map.size === 0, `got ${map.size}`);
}

{
  const src = 'a $x$ b \\(y\\) c\n\n$$u$$\n\n\\[v\\]\n';
  const { map } = extract(src);
  check('four delimiters extract 4', map.size === 4, `got ${map.size}`);
}

{
  const src = '\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}\n';
  const { map } = extract(src);
  check('align env extracted', map.size === 1);
  const item = [...map.values()][0];
  check('align is display+numbered', item.kind === 'display' && item.numbered);
}

{
  const src = '$$\nf(x)=\\begin{cases}x, & x>0\\\\0,&else\\end{cases}\n$$\n';
  const { map } = extract(src);
  check('cases inside $$ extracted', map.size === 1);
}

{
  const src = '$$\n\\frac{abc\n$$\n\nGood $a^2+b^2=c^2$\n';
  const { map } = extract(src);
  check('malformed + good both extracted', map.size === 2, `got ${map.size}`);
}

{
  const { map } = extract('$F_{\\text{法向}}$');
  check('Chinese in math', map.size === 1);
}

{
  const src = '| a | $k_n$ | $100 |\n';
  const { map } = extract(src);
  check('table $k_n$ extracted, $100 not', map.size === 1, `got ${map.size}`);
}

{
  const { map } = extract(fixture);
  check('full fixture extracts many math nodes', map.size > 30, `got ${map.size}`);
  console.log(`  (fixture math nodes: ${map.size})`);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
