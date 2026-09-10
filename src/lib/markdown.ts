import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import footnote from 'markdown-it-footnote';
import DOMPurify from 'dompurify';
import { extractMath, injectMathHtml } from './math-extract';
import { highlightCode, escapeHtml } from './highlight';
import type { TocItem } from './types';

export type { TocItem };

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
  highlight: (code: string, lang: string) => {
    const { html, language } = highlightCode(code, lang);
    return `<pre class="code-block" data-lang="${escapeHtml(language)}"><code class="hljs language-${escapeHtml(language)}">${html}</code></pre>`;
  },
});

md.use(footnote);

// Collect headings for TOC while rendering
const headingStore: { items: TocItem[]; slugger: (text: string, level: number) => string } = {
  items: [],
  slugger: () => 'h',
};

function resetToc(): void {
  headingStore.items = [];
  const seen = new Map<string, number>();
  headingStore.slugger = (text: string) => {
    let base = text
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!base) base = 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

md.use(anchor, {
  level: [1, 2, 3, 4, 5, 6],
  slugify: (s: string) => headingStore.slugger(s, 0),
  permalink: anchor.permalink.linkInsideHeader({
    symbol: '#',
    renderHref: (slug: string) => `#${slug}`,
    placement: 'before',
    class: 'heading-anchor',
  }),
  callback: (_token, { slug, title }) => {
    // level is on the token — handled via rule below
    void slug;
    void title;
  },
});

// Capture heading level + text for TOC
const defaultHeadingOpen = md.renderer.rules.heading_open;
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const level = Number(token.tag.slice(1));
  const inline = tokens[idx + 1];
  const text = inline && inline.type === 'inline' ? inline.content : '';
  const id = token.attrGet('id') || headingStore.slugger(text, level);
  token.attrSet('id', id);
  headingStore.items.push({ id, text: stripInline(text), level });
  if (defaultHeadingOpen) {
    return defaultHeadingOpen(tokens, idx, options, env, self);
  }
  return self.renderToken(tokens, idx, options);
};

function stripInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\(.)/g, '$1')
    .trim();
}

/** Resolve relative image paths against the document directory */
export function resolveImages(html: string, docDir: string | null): string {
  if (!docDir) return html;
  return html.replace(/<img\b([^>]*?)src=["']([^"']+)["']/gi, (full, attrs: string, src: string) => {
    if (/^(https?:|data:|file:|asset:)/i.test(src)) return full;
    // Join with doc directory using file protocol / convertPath helper later in component
    const joined = joinPath(docDir, src);
    const url = pathToFileUrl(joined);
    return `<img${attrs}src="${url}" data-raw-src="${src}"`;
  });
}

function joinPath(base: string, rel: string): string {
  const normRel = rel.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normRel) || normRel.startsWith('/')) return normRel;
  const baseParts = base.replace(/\\/g, '/').split('/').filter(Boolean);
  // drop filename
  if (!base.endsWith('/') && baseParts.length) {
    // if base is a file path, drop last; if dir keep
    // callers pass directory
  }
  const relParts = normRel.split('/');
  const out = [...baseParts];
  for (const part of relParts) {
    if (part === '.' || part === '') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  // preserve windows drive
  return out.join('/');
}

function pathToFileUrl(p: string): string {
  let norm = p.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(norm)) {
    return `file:///${norm}`;
  }
  if (!norm.startsWith('/')) norm = `/${norm}`;
  return `file://${norm}`;
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
}

const SANITIZE_CONFIG = {
  ADD_TAGS: [
    'mjx-container',
    'mjx-assistive-mml',
    'math',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'msubsup',
    'mfrac',
    'msqrt',
    'mroot',
    'mtable',
    'mtr',
    'mtd',
    'mtext',
    'mspace',
    'mstyle',
    'merror',
    'semantics',
    'annotation',
    'annotation-xml',
  ],
  ADD_ATTR: [
    'xmlns',
    'display',
    'displaystyle',
    'scriptlevel',
    'stretchy',
    'fence',
    'separator',
    'accent',
    'accentunder',
    'linebreak',
    'width',
    'height',
    'depth',
    'voffset',
    'lspace',
    'rspace',
    'mathvariant',
    'mathcolor',
    'mathbackground',
    'mathsize',
    'dir',
    'columnalign',
    'columnspacing',
    'rowspacing',
    'open',
    'close',
    'data-tex',
    'data-math-id',
    'data-numbered',
    'data-lang',
    'data-raw-src',
    'lang',
  ],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

export function renderMarkdown(source: string, docDir?: string | null): RenderResult {
  resetToc();
  const { text, map } = extractMath(source);
  let html = md.render(text);
  html = injectMathHtml(html, map);
  if (docDir) {
    html = resolveImages(html, docDir);
  }
  const clean = DOMPurify.sanitize(html, SANITIZE_CONFIG as never) as unknown as string;
  return { html: clean, toc: headingStore.items.slice() };
}

/** Extract YAML front matter (simple) */
export function parseFrontMatter(source: string): { content: string; data: Record<string, string> } {
  if (!source.startsWith('---')) {
    return { content: source, data: {} };
  }
  const end = source.indexOf('\n---', 3);
  if (end === -1) return { content: source, data: {} };
  const block = source.slice(3, end).trim();
  const rest = source.slice(end + 4).replace(/^\r?\n/, '');
  const data: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { content: rest, data };
}
