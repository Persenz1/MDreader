import React, { useCallback, useEffect, useRef, useState } from 'react';
import { renderMarkdown } from '../lib/markdown';
import { typesetMathProgressive, cancelTypesetting } from '../lib/mathjax';
import { renderMermaidBlocks } from '../lib/mermaid';
import type { SourceBlock, BlockKind } from '../lib/blocks';

export interface BlockArticleProps {
  blocks: SourceBlock[];
  docDir: string | null;
  width: 'normal' | 'wide' | 'full';
  fontSize: number;
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  onBlockChange: (id: string, source: string) => void;
  onBlockDelete: (id: string) => void;
  onInsertAfter: (id: string | null) => void;
  onScrollTop?: (top: number) => void;
  onHeadings?: (items: { id: string; text: string; level: number }[]) => void;
  readOnly?: boolean;
}

const KIND_LABEL: Record<BlockKind, string> = {
  frontmatter: 'YAML',
  heading: '标题',
  paragraph: '段落',
  math: '公式',
  code: '代码',
  list: '列表',
  table: '表格',
  blockquote: '引用',
  hr: '分隔线',
  html: 'HTML',
  other: '块',
};

/**
 * Obsidian-style in-place block editor.
 * Click a block to edit its Markdown source; math expands to TeX.
 */
export function BlockArticle(props: BlockArticleProps): React.ReactElement {
  const {
    blocks,
    docDir,
    width,
    fontSize,
    editingId,
    onEditingChange,
    onBlockChange,
    onBlockDelete,
    onInsertAfter,
    onScrollTop,
    readOnly,
  } = props;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlCache = useRef(new Map<string, string>());

  useEffect(() => {
    htmlCache.current.clear();
  }, [docDir]);

  const renderBlockHtml = useCallback(
    (src: string) => {
      const key = (docDir || '') + "\u0000" + src;
      const hit = htmlCache.current.get(key);
      if (hit !== undefined) return hit;
      const { html } = renderMarkdown(src, docDir);
      htmlCache.current.set(key, html);
      return html;
    },
    [docDir]
  );

  // Collect headings for TOC
  useEffect(() => {
    const items: { id: string; text: string; level: number }[] = [];
    const seen = new Map<string, number>();
    for (const b of blocks) {
      if (b.kind !== 'heading') continue;
      const m = b.source.match(/^(#{1,6})\s+(.*)$/);
      if (!m) continue;
      const level = m[1].length;
      let base = m[2]
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (!base) base = 'section';
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      items.push({ id: `${b.id}--${id}`, text: m[2].trim(), level });
    }
    props.onHeadings?.(items);
  }, [blocks]);

  // Typeset non-editing blocks
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    cancelTypesetting();
    let cancel: (() => void) | null = null;
    const raf = requestAnimationFrame(() => {
      cancel = typesetMathProgressive(el);
      // Mermaid after a paint so math/layout is not blocked
      requestAnimationFrame(() => {
        void renderMermaidBlocks(el);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      cancel?.();
    };
  }, [blocks, editingId, docDir]);

  // Focus editor when entering edit mode
  useEffect(() => {
    if (!editingId || !editRef.current) return;
    const ta = editRef.current;
    ta.focus();
    // Place caret at end
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, [editingId]);

  const commit = useCallback(
    (id: string, source: string) => {
      onBlockChange(id, source);
      onEditingChange(null);
    },
    [onBlockChange, onEditingChange]
  );

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    const ta = e.currentTarget;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onEditingChange(null);
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      commit(id, ta.value);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      ta.value = val.slice(0, start) + '  ' + val.slice(end);
      ta.setSelectionRange(start + 2, start + 2);
      return;
    }
  };

  const renderBlockContent = (b: SourceBlock) => {
    if (b.kind === 'hr') {
      return (
        <div className="block-html">
          <hr />
        </div>
      );
    }
    const html = renderBlockHtml(b.source);
    if (b.kind === 'heading') {
      const m = b.source.match(/^(#{1,6})\s+(.*)$/);
      const text = m ? m[2] : b.source;
      const withId = html.replace(/<h([1-6])/, (full, lv) => {
        const slug = text
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s\-_]/gu, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') || 'section';
        return `<h${lv} id="${b.id}--${slug}"`;
      });
      return <div className="block-html" dangerouslySetInnerHTML={{ __html: withId }} />;
    }
    return <div className="block-html" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const onScroll = () => {
    if (scrollRef.current) onScrollTop?.(scrollRef.current.scrollTop);
  };

  return (
    <div
      className="content-area block-article-root"
      ref={scrollRef}
      tabIndex={0}
      onScroll={onScroll}
      style={{ ['--article-size' as string]: `${fontSize}px` } as React.CSSProperties}
    >
      <article className="article" data-width={width}>
        <div className="article-inner blocks">
          {blocks.map((b) => {
            const editing = editingId === b.id;
            if (editing) {
              return (
                <div key={b.id} className={`block-editing kind-${b.kind}`}>
                  <div className="block-edit-bar">
                    <span className="block-kind">{KIND_LABEL[b.kind]}</span>
                    <span className="block-edit-hint">Ctrl+Enter 完成 · Esc 取消 · 公式编辑 TeX</span>
                    <span className="block-edit-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          const ta = editRef.current;
                          if (ta) commit(b.id, ta.value);
                        }}
                      >
                        完成
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onBlockDelete(b.id)}
                        title="删除此块"
                      >
                        删除
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onEditingChange(null)}
                      >
                        取消
                      </button>
                    </span>
                  </div>
                  <textarea
                    ref={editRef}
                    className="block-editor"
                    defaultValue={b.source}
                    spellCheck={false}
                    rows={Math.min(28, Math.max(3, b.lines + 2))}
                    onKeyDown={(e) => onEditorKeyDown(e, b.id)}
                    onBlur={(e) => {
                      // Don't commit if focus moved to toolbar buttons inside edit bar
                      const related = e.relatedTarget as HTMLElement | null;
                      if (related?.closest('.block-edit-bar')) return;
                      // Auto-commit on blur for snappy Obsidian-like feel
                      commit(b.id, e.currentTarget.value);
                    }}
                    aria-label={`编辑${KIND_LABEL[b.kind]}`}
                  />
                </div>
              );
            }

            return (
              <div
                key={b.id}
                className={`block-view kind-${b.kind} ${hoverId === b.id ? 'hovered' : ''} ${
                  readOnly ? '' : 'editable'
                }`}
                data-block-id={b.id}
                onMouseEnter={() => setHoverId(b.id)}
                onMouseLeave={() => setHoverId((h) => (h === b.id ? null : h))}
                onClick={(e) => {
                  if (readOnly) return;
                  // Let links/images work
                  const t = e.target as HTMLElement;
                  if (t.closest('a') || t.closest('img') || t.closest('input')) return;
                  e.stopPropagation();
                  onEditingChange(b.id);
                }}
                title={readOnly ? undefined : `点击编辑 · ${KIND_LABEL[b.kind]}`}
              >
                {!readOnly && (
                  <div className="block-gutter" aria-hidden>
                    <span className="block-kind-chip">{KIND_LABEL[b.kind]}</span>
                  </div>
                )}
                <div className="block-body">{renderBlockContent(b)}</div>
              </div>
            );
          })}

          {!readOnly && (
            <button
              type="button"
              className="block-add"
              onClick={() => onInsertAfter(blocks[blocks.length - 1]?.id ?? null)}
            >
              + 新段落
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
