import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface EditorHandle {
  focus: () => void;
  getEl: () => HTMLTextAreaElement | null;
}

export interface EditorProps {
  value: string;
  onChange: (next: string) => void;
  fileName: string;
  dirty: boolean;
  onSave: () => void;
  docPath: string | null;
}

export const MarkdownEditor = forwardRef<EditorHandle, EditorProps>(function MarkdownEditor(
  { value, onChange, fileName, dirty, onSave, docPath },
  ref
) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    getEl: () => taRef.current,
  }));

  useEffect(() => {
    if (taRef.current) taRef.current.scrollTop = 0;
  }, [docPath]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    const ta = e.currentTarget;

    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      e.stopPropagation();
      onSave();
      return;
    }

    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      e.stopPropagation();
      wrap(ta, '**', '**');
      return;
    }

    if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      e.stopPropagation();
      wrap(ta, '*', '*');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end) {
        const next = value.slice(0, start) + '  ' + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => ta.setSelectionRange(start + 2, start + 2));
      } else {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const block = value.slice(lineStart, end);
        const indented = block
          .split('\n')
          .map((l) => (l.startsWith('  ') ? l : '  ' + l))
          .join('\n');
        const next = value.slice(0, lineStart) + indented + value.slice(end);
        onChange(next);
        requestAnimationFrame(() => ta.setSelectionRange(lineStart, lineStart + indented.length));
      }
    }
  };

  const wrap = (ta: HTMLTextAreaElement, before: string, after: string) => {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || 'text';
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const a = start + before.length;
      ta.setSelectionRange(a, a + selected.length);
    });
  };

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <span className="editor-title" title={fileName}>
          {dirty ? '● ' : '○ '}
          {fileName || '未命名'}
        </span>
        <span className="editor-hint">Ctrl+S 保存 · Tab 缩进 · Ctrl+B/I</span>
      </div>
      <textarea
        ref={taRef}
        className="editor-textarea"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="在此编辑 Markdown 源码…"
        aria-label="Markdown source"
      />
    </div>
  );
});
