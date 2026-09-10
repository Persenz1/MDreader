/**
 * Math extraction pipeline.
 *
 * Protects LaTeX from Markdown parsing by replacing math regions with
 * opaque placeholders, then restores them as data-math nodes after HTML render.
 *
 * Supported:
 *   inline:  $...$   \(...\)
 *   display: $$...$$  \[...\]
 *   env:     \begin{equation|equation*|align|align*|aligned|gather|gather*|
 *                   split|cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix}...\end{...}
 */

export type MathKind = 'inline' | 'display';

export interface ExtractedMath {
  id: string;
  kind: MathKind;
  tex: string;
  /** true when it came from a numbered environment (equation/align/gather) */
  numbered: boolean;
}

export interface MathExtractResult {
  text: string;
  map: Map<string, ExtractedMath>;
}

/** Private-use sentinels that Markdown will not treat as special syntax. */
const SO = '\uE000';
const EO = '\uE001';

const NUMBERED_ENVS = new Set([
  'equation',
  'align',
  'gather',
  'eqnarray',
  'multline',
  'flalign',
  'alignat',
]);

const ALL_ENVS = [
  'equation',
  'equation*',
  'align',
  'align*',
  'aligned',
  'alignat',
  'alignat*',
  'gather',
  'gather*',
  'gathered',
  'multline',
  'multline*',
  'split',
  'cases',
  'matrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix',
  'smallmatrix',
  'array',
  'eqnarray',
  'eqnarray*',
  'flalign',
  'flalign*',
];

function envRegex(): RegExp {
  const names = ALL_ENVS.slice()
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[*\\]/g, (m) => `\\${m}`))
    .join('|');
  return new RegExp(
    `\\\\begin\\{(${names})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`,
    'g'
  );
}

/** Fenced code blocks */
const CODE_FENCE = /(^|\n)([ \t]*)(```|~~~)([^\n]*)\n([\s\S]*?)\n\2\3[ \t]*(?=\n|$)/g;
/** Inline code spans */
const CODE_INLINE = /(`+)([^`\n]|[^`][\s\S]*?[^`])\1/g;

/** \( ... \) */
const INLINE_PAREN = /\\\(([\s\S]+?)\\\)/g;
/** \[ ... \] */
const DISPLAY_BRACKET = /\\\[([\s\S]+?)\\\]/g;
/** $$ ... $$ */
const DISPLAY_DOLLAR = /\$\$([\s\S]+?)\$\$/g;

/**
 * Inline $...$ with conservative rules:
 * - opening $ not preceded by word char / $ / backslash
 * - opening $ not followed by space or $
 * - closing $ not preceded by space
 * - closing $ not followed by digit (avoids $100.50) or word char
 */
const INLINE_DOLLAR =
  /(?<![\\$A-Za-z0-9])\$(?!\$)(?!\s)((?:\\.|[^$\n\\])+?)(?<!\s)\$(?![\dA-Za-z$])/g;

function isNumberedEnv(name: string): boolean {
  return NUMBERED_ENVS.has(name.replace(/\*$/, ''));
}

function makePlaceholder(id: string, kind: MathKind): string {
  return `${SO}math${kind === 'display' ? 'D' : 'I'}${id}${EO}`;
}

export function extractMath(source: string): MathExtractResult {
  const map = new Map<string, ExtractedMath>();
  let counter = 0;
  let text = source;

  // 1) Protect fenced code blocks entirely (markers included)
  const codeSlots: string[] = [];
  text = text.replace(CODE_FENCE, (full: string) => {
    const slot = `${SO}code${codeSlots.length}${EO}`;
    codeSlots.push(full);
    return slot;
  });

  // 2) Protect inline code
  const inlineSlots: string[] = [];
  text = text.replace(CODE_INLINE, (full: string) => {
    const slot = `${SO}icode${inlineSlots.length}${EO}`;
    inlineSlots.push(full);
    return slot;
  });

  const push = (kind: MathKind, tex: string, numbered = false): string => {
    const id = `m${counter++}`;
    map.set(id, { id, kind, tex: tex.trim(), numbered });
    return makePlaceholder(id, kind);
  };

  // 3) Display \[...\]
  text = text.replace(DISPLAY_BRACKET, (_m, tex: string) => push('display', tex));

  // 4) $$...$$
  text = text.replace(DISPLAY_DOLLAR, (_m, tex: string) => push('display', tex));

  // 5) Environments (keep full \begin{}...\end{} for MathJax)
  text = text.replace(envRegex(), (full, envName: string) => {
    const numbered = isNumberedEnv(envName) && !envName.endsWith('*');
    return push('display', full, numbered);
  });

  // 6) Inline \(...\)
  text = text.replace(INLINE_PAREN, (_m, tex: string) => push('inline', tex));

  // 7) Inline $...$
  text = text.replace(INLINE_DOLLAR, (_m, tex: string) => push('inline', tex));

  // Restore protected code
  text = text.replace(new RegExp(`${SO}code(\\d+)${EO}`, 'g'), (_m, i: string) => codeSlots[Number(i)]);
  text = text.replace(new RegExp(`${SO}icode(\\d+)${EO}`, 'g'), (_m, i: string) => inlineSlots[Number(i)]);

  return { text, map };
}

/**
 * After markdown-it renders HTML, inject math placeholders back as
 * custom elements that MathJax can typeset.
 */
export function injectMathHtml(
  html: string,
  map: Map<string, ExtractedMath>
): string {
  const re = new RegExp(`${SO}math([DI])([A-Za-z0-9]+)${EO}`, 'g');
  return html.replace(re, (_full, kindCode: string, id: string) => {
    const item = map.get(id);
    if (!item) return '';
    const kind = kindCode === 'D' ? 'display' : 'inline';
    const numbered = item.numbered ? ' data-numbered="true"' : '';
    if (kind === 'display') {
      return `<div class="math-block" data-math-id="${id}"${numbered} data-tex="${escapeAttr(
        item.tex
      )}"></div>`;
    }
    return `<span class="math-inline" data-math-id="${id}" data-tex="${escapeAttr(
      item.tex
    )}"></span>`;
  });
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function unescapeAttr(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}
