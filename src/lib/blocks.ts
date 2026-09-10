/**
 * Split Markdown source into editable blocks for in-place editing.
 * Mirrors Obsidian Live Preview: click a block → edit its source; blur → re-render.
 */

export type BlockKind =
  | 'frontmatter'
  | 'heading'
  | 'paragraph'
  | 'math'
  | 'code'
  | 'list'
  | 'table'
  | 'blockquote'
  | 'hr'
  | 'html'
  | 'other';

export interface SourceBlock {
  id: string;
  kind: BlockKind;
  /** Raw markdown source of this block (may include trailing newline) */
  source: string;
  /** Estimated line count (for layout hints) */
  lines: number;
}

const FENCE_OPEN = /^[ \t]*(```|~~~)/;
const MATH_ENV_START = /^[ \t]*\\begin\{/;
const MATH_ENV_END = /^[ \t]*\\end\{/;
const DISPLAY_DOLLAR = /^[ \t]*\$\$/;
const HEADING = /^#{1,6}\s/;
const HR = /^(\*{3,}|-{3,}|_{3,})\s*$/;
const TABLE_ROW = /^\|/;
const LIST = /^(\s*)([-*+]|\d+[.)])\s+/;
const BLOCKQUOTE = /^[ \t]*>/;
const FRONT = /^---\s*$/;

function kindOfBlock(src: string): BlockKind {
  const t = src.trim();
  if (!t) return 'other';
  if (t.startsWith('---')) {
    const inner = t.split('\n');
    if (inner.length >= 2 && inner[0].trim() === '---') {
      const hasKeys = inner.slice(1).some((l) => /^[A-Za-z0-9_-]+\s*:/.test(l));
      if (hasKeys) return 'frontmatter';
    }
  }
  if (t === '---' || t === '...') return 'hr';
  if (HR.test(t.split('\n')[0]) && t.length < 20) return 'hr';
  const first = t.split('\n', 1)[0];
  if (HEADING.test(first)) return 'heading';
  if (FENCE_OPEN.test(first)) return 'code';
  if (DISPLAY_DOLLAR.test(first) || MATH_ENV_START.test(first)) return 'math';
  if (first.startsWith('$$') || first.startsWith('\\[')) return 'math';
  if (BLOCKQUOTE.test(first)) return 'blockquote';
  if (TABLE_ROW.test(first)) return 'table';
  if (LIST.test(first)) return 'list';
  if (/^<[a-zA-Z]/.test(first)) return 'html';
  if (/^\\\(.*\\\)$/.test(t) && !t.includes('\n')) return 'math';
  if (/^\$\$[\s\S]*\$\$$/.test(t)) return 'math';
  return 'paragraph';
}

/**
 * Parse markdown into blocks.
 * Front matter is one block. Fenced code / $$ / \begin{} are atomic.
 */
export function parseBlocks(source: string): SourceBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: SourceBlock[] = [];
  let i = 0;
  let id = 0;

  const push = (raw: string) => {
    if (!raw.trim() && blocks.length === 0) return;
    // Keep blank-line-only chunks as spacer only if non-empty content exists
    if (!raw.trim()) {
      // skip pure blanks between blocks (we rejoin with \n\n)
      return;
    }
    const src = raw.replace(/\n+$/, '\n').replace(/^\n+/, '');
    blocks.push({
      id: `b${id++}`,
      kind: kindOfBlock(src),
      source: src.endsWith('\n') ? src.slice(0, -1) : src,
      lines: src.split('\n').length,
    });
  };

  // Front matter
  if (lines[0] === '---') {
    let j = 1;
    while (j < lines.length && lines[j] !== '---') j++;
    if (j < lines.length) {
      push(lines.slice(0, j + 1).join('\n'));
      i = j + 1;
    }
  }

  let buf: string[] = [];
  const flush = () => {
    if (buf.length) {
      push(buf.join('\n'));
      buf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // blank line ends current buffer
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }

    // fenced code — atomic
    if (FENCE_OPEN.test(line)) {
      flush();
      const start = i;
      const fence = line.trim().startsWith('```') ? '```' : '~~~';
      i += 1;
      while (i < lines.length) {
        if (lines[i].trim().startsWith(fence)) {
          i += 1;
          break;
        }
        i += 1;
      }
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // $$ ... $$ display math — atomic
    if (DISPLAY_DOLLAR.test(line)) {
      flush();
      const start = i;
      i += 1;
      while (i < lines.length) {
        if (DISPLAY_DOLLAR.test(lines[i]) || lines[i].trim() === '$$') {
          i += 1;
          break;
        }
        i += 1;
      }
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // \begin{env} ... \end{env}
    if (MATH_ENV_START.test(line)) {
      flush();
      const start = i;
      const envMatch = line.match(/\\begin\{([^}]+)\}/);
      const env = envMatch?.[1] ?? '';
      i += 1;
      while (i < lines.length) {
        if (env && lines[i].includes(`\\end{${env}}`)) {
          i += 1;
          break;
        }
        i += 1;
      }
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // \[ ... \] single-line or multi
    if (/^[ \t]*\\\[/.test(line)) {
      flush();
      const start = i;
      i += 1;
      while (i < lines.length && !lines[i].includes('\\]')) i += 1;
      if (i < lines.length) i += 1;
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // list: consume contiguous list lines (incl. indented)
    if (LIST.test(line)) {
      flush();
      const start = i;
      i += 1;
      while (i < lines.length && (LIST.test(lines[i]) || /^\s{2,}\S/.test(lines[i]) || !lines[i].trim())) {
        if (!lines[i].trim()) {
          // blank inside list only continues if next is still list
          if (i + 1 < lines.length && (LIST.test(lines[i + 1]) || /^\s{2,}\S/.test(lines[i + 1]))) {
            i += 1;
            continue;
          }
          break;
        }
        i += 1;
      }
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // table: contiguous | rows
    if (TABLE_ROW.test(line)) {
      flush();
      const start = i;
      i += 1;
      while (i < lines.length && TABLE_ROW.test(lines[i])) i += 1;
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // blockquote: contiguous >
    if (BLOCKQUOTE.test(line)) {
      flush();
      const start = i;
      i += 1;
      while (i < lines.length && BLOCKQUOTE.test(lines[i])) i += 1;
      push(lines.slice(start, i).join('\n'));
      continue;
    }

    // heading is its own block
    if (HEADING.test(line)) {
      flush();
      push(line);
      i += 1;
      continue;
    }

    // hr alone
    if (HR.test(line.trim())) {
      flush();
      push(line);
      i += 1;
      continue;
    }

    // paragraph: accumulate until blank
    buf.push(line);
    i += 1;
  }
  flush();

  return blocks;
}

/** Reassemble full source from blocks */
export function blocksToSource(blocks: SourceBlock[]): string {
  return blocks.map((b) => b.source).join('\n\n') + '\n';
}

export function replaceBlockSource(
  blocks: SourceBlock[],
  id: string,
  nextSource: string
): SourceBlock[] {
  return blocks.map((b) => {
    if (b.id !== id) return b;
    const src = nextSource.replace(/\r\n/g, '\n');
    return {
      ...b,
      source: src,
      kind: kindOfBlock(src),
      lines: src.split('\n').length,
    };
  });
}

export function deleteBlock(blocks: SourceBlock[], id: string): SourceBlock[] {
  return blocks.filter((b) => b.id !== id);
}

export function insertBlockAfter(
  blocks: SourceBlock[],
  afterId: string | null,
  source = ''
): { blocks: SourceBlock[]; newId: string } {
  const id = `b${Date.now().toString(36)}`;
  const nb: SourceBlock = {
    id,
    kind: kindOfBlock(source) || 'paragraph',
    source,
    lines: source.split('\n').length || 1,
  };
  if (!afterId) return { blocks: [...blocks, nb], newId: id };
  const idx = blocks.findIndex((b) => b.id === afterId);
  if (idx < 0) return { blocks: [...blocks, nb], newId: id };
  const next = [...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)];
  return { blocks: next, newId: id };
}
