import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { readDir, readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import { TocPanel } from './components/TocPanel';
import { BlockArticle } from './components/BlockArticle';
import { MarkdownEditor } from './components/MarkdownEditor';
import { parseFrontMatter } from './lib/markdown';
import { loadMathJax } from './lib/mathjax';
import {
  parseBlocks,
  blocksToSource,
  replaceBlockSource,
  deleteBlock as removeBlock,
  insertBlockAfter,
  type SourceBlock,
} from './lib/blocks';
import {
  applyThemeToDom,
  loadScrollMemory,
  loadSettings,
  pushRecent,
  saveScrollMemory,
  saveSettings,
  type ReaderSettings,
  type ScrollMemory,
} from './lib/store';
import type { FileNode, TocItem } from './lib/types';

const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
};

export default function App(): React.ReactElement {
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [docPath, setDocPath] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [blocks, setBlocks] = useState<SourceBlock[]>([]);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [folderRoot, setFolderRoot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findCount, setFindCount] = useState(0);
  const [findIndex, setFindIndex] = useState(-1);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mathReady, setMathReady] = useState(false);
  const [pendingDir, setPendingDir] = useState<string | null>(null);

  /** read = click-to-edit (Obsidian-like); source = full-file textarea */
  const [layout, setLayout] = useState<'read' | 'source'>('read');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [savedSource, setSavedSource] = useState('');
  const dirty = source !== savedSource;

  const scrollMemRef = useRef<ScrollMemory>(loadScrollMemory());
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const docDir = useMemo(() => {
    if (!docPath) return null;
    return docPath.replace(/[\\/][^\\/]+$/, '');
  }, [docPath]);

  // Theme
  useEffect(() => {
    applyThemeToDom(settings.theme, settings.mode);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDom('system', settings.mode);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme, settings.mode]);

  useEffect(() => {
    loadMathJax()
      .then(() => setMathReady(true))
      .catch((e) => console.warn('MathJax preload failed', e));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--zoom-factor', String(settings.zoom / 100));
  }, [settings.zoom]);

  /** Rebuild source buffer whenever blocks change (in read/in-place mode) */
  const syncSourceFromBlocks = useCallback((next: SourceBlock[]) => {
    const text = blocksToSource(next);
    setSource(text);
  }, []);

  const openDocumentFromText = useCallback(
    async (path: string, text: string) => {
      const name = path.replace(/\\/g, '/').split('/').pop() || path;
      setLoading(true);
      setError(null);
      try {
        if (docPath) {
          scrollMemRef.current[docPath] = contentScrollRef.current?.scrollTop ?? 0;
          saveScrollMemory(scrollMemRef.current);
        }

        const parsed = parseBlocks(text);
        setBlocks(parsed);
        setSource(text);
        setSavedSource(text);
        setDocPath(path);
        setDocName(name);
        setEditingBlockId(null);
        pushRecent(path);
        if (path.replace(/[\\/][^\\/]+$/, '')) setPendingDir(path.replace(/[\\/][^\\/]+$/, ''));

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const sc =
              document.querySelector('.content-area') as HTMLElement | null;
            if (sc) sc.scrollTop = scrollMemRef.current[path] ?? 0;
          });
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBlocks([]);
      } finally {
        setLoading(false);
      }
    },
    [docPath]
  );

  const openFile = useCallback(
    async (path?: string) => {
      if (dirty) {
        const ok = window.confirm('当前文档有未保存修改，确定丢弃并打开其它文件？');
        if (!ok) return;
      }
      try {
        let target = path;
        if (!target) {
          const picked = await dialogOpen({
            multiple: false,
            filters: [
              { name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] },
              { name: 'All', extensions: ['*'] },
            ],
          });
          if (!picked) return;
          target = Array.isArray(picked) ? picked[0] : String(picked);
        }
        if (!target) return;
        let text: string;
        try {
          text = await invoke<string>('read_text_file', { path: target });
        } catch {
          const bin = await readFile(target);
          text = new TextDecoder('utf-8').decode(bin);
          if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        }
        await openDocumentFromText(target, text);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [openDocumentFromText, dirty]
  );

  const openedCliRef = useRef(false);
  useEffect(() => {
    if (openedCliRef.current) return;
    openedCliRef.current = true;
    (async () => {
      try {
        const p = await invoke<string | null>('get_startup_path');
        if (p) await openFile(p);
      } catch {
        /* not in tauri */
      }
    })();
  }, [openFile]);

  const loadChildren = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await invoke<
        { name: string; path: string; isDir: boolean; isMd: boolean; size: number }[]
      >('list_dir', { path: dirPath });
      return entries.map((e) => ({
        name: e.name,
        path: e.path,
        isDir: e.isDir,
        isMd: e.isMd,
        size: e.size,
        children: e.isDir ? [] : undefined,
      }));
    } catch {
      const entries = await readDir(dirPath);
      const nodes: FileNode[] = [];
      for (const e of entries) {
        if (e.name?.startsWith('.')) continue;
        const full = dirPath.replace(/[\\/]$/, '') + '\\' + e.name;
        const isDir = e.isDirectory;
        const isMd = !!e.name?.toLowerCase().endsWith('.md');
        if (!isDir && !isMd && !/\.(png|jpe?g|gif|webp|svg|txt)$/i.test(e.name || '')) continue;
        nodes.push({
          name: e.name || '',
          path: full,
          isDir,
          isMd,
          size: 0,
          children: isDir ? [] : undefined,
        });
      }
      nodes.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return nodes;
    }
  }, []);

  useEffect(() => {
    if (!pendingDir || fileTree.length > 0) return;
    let cancelled = false;
    loadChildren(pendingDir)
      .then((nodes) => {
        if (cancelled) return;
        setFileTree(nodes);
        setFolderRoot(pendingDir);
        setPendingDir(null);
      })
      .catch(() => setPendingDir(null));
    return () => {
      cancelled = true;
    };
  }, [pendingDir, fileTree.length, loadChildren]);

  const openFolder = useCallback(
    async (path?: string) => {
      try {
        let target = path;
        if (!target) {
          const picked = await dialogOpen({ directory: true, multiple: false });
          if (!picked) return;
          target = Array.isArray(picked) ? picked[0] : String(picked);
        }
        if (!target) return;
        setLoading(true);
        const nodes = await loadChildren(target);
        setFileTree(nodes);
        setFolderRoot(target);
        setSettings((s) => ({ ...s, showSidebar: true }));
        const firstMd = findFirstMd(nodes);
        if (firstMd) await openFile(firstMd);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [loadChildren, openFile]
  );

  const handleTreeOpen = useCallback(
    async (path: string) => {
      if (/\.(md|markdown|mdx)$/i.test(path)) {
        await openFile(path);
        return;
      }
      const kids = await loadChildren(path);
      const update = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) => {
          if (n.path === path) return { ...n, children: kids };
          if (n.children) return { ...n, children: update(n.children) };
          return n;
        });
      setFileTree((prev) => update(prev));
    },
    [loadChildren, openFile]
  );

  const saveFile = useCallback(async () => {
    if (!docPath) return;
    try {
      // Prefer current source buffer (blocks stay in sync)
      const withBom = source.charCodeAt(0) === 0xfeff;
      const body = withBom ? source.slice(1) : source;
      await invoke('write_text_file', { path: docPath, content: body, withBom });
      setSavedSource(source);
      // Re-parse so ids/kinds stay consistent after save
      setBlocks(parseBlocks(withBom ? source : source));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [docPath, source]);

  const onBlockChange = useCallback(
    (id: string, nextSource: string) => {
      setBlocks((prev) => {
        const next = replaceBlockSource(prev, id, nextSource);
        syncSourceFromBlocks(next);
        return next;
      });
    },
    [syncSourceFromBlocks]
  );

  const onBlockDelete = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        const next = removeBlock(prev, id);
        syncSourceFromBlocks(next);
        return next;
      });
      setEditingBlockId(null);
    },
    [syncSourceFromBlocks]
  );

  const onInsertAfter = useCallback(
    (id: string | null) => {
      setBlocks((prev) => {
        const { blocks: next, newId } = insertBlockAfter(prev, id, '');
        syncSourceFromBlocks(next);
        setEditingBlockId(newId);
        return next;
      });
    },
    [syncSourceFromBlocks]
  );

  // Drag & drop
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    (async () => {
      try {
        const webview = getCurrentWebview();
        const un = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'over') setDragging(true);
          else if (event.payload.type === 'leave') setDragging(false);
          else if (event.payload.type === 'drop') {
            setDragging(false);
            const paths = event.payload.paths;
            const md = paths.find((p) => /\.(md|markdown|mdx)$/i.test(p));
            if (md) void openFile(md);
            else if (paths[0]) void openFolder(paths[0]);
          }
        });
        if (disposed) un();
        else unlisten = un;
      } catch {
        /* browser fallback */
      }
    })();
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) f.text().then((text) => openDocumentFromText(f.name, text));
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [openFile, openFolder, openDocumentFromText]);

  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) {
        if (e.key === 'Escape') {
          setShowFind(false);
          setLightbox(null);
          setEditingBlockId(null);
        }
        return;
      }
      // Don't steal shortcuts from textareas except global ones
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === 'TEXTAREA' || tag === 'INPUT';

      const k = e.key.toLowerCase();
      if (k === 'o' && !e.shiftKey) {
        e.preventDefault();
        void openFile();
      } else if (k === 'o' && e.shiftKey) {
        e.preventDefault();
        void openFolder();
      } else if (k === 'f' && !inField) {
        e.preventDefault();
        setShowFind(true);
        setTimeout(() => findInputRef.current?.focus(), 10);
      } else if (k === 's') {
        e.preventDefault();
        void saveFile();
      } else if (k === 'e' && !inField) {
        e.preventDefault();
        setLayout((l) => (l === 'read' ? 'source' : 'read'));
        setEditingBlockId(null);
      } else if ((k === '=' || k === '+') && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, zoom: Math.min(160, s.zoom + 10) }));
      } else if (k === '-' && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, zoom: Math.max(70, s.zoom - 10) }));
      } else if (k === '0' && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, zoom: 100 }));
      } else if (k === 'b' && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, showSidebar: !s.showSidebar }));
      } else if (k === 't' && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, showToc: !s.showToc }));
      } else if (k === 'p' && !inField) {
        e.preventDefault();
        setSettings((s) => ({ ...s, mode: s.mode === 'paper' ? 'modern' : 'paper' }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openFile, openFolder, saveFile]);

  // When switching source textarea → read mode, re-parse blocks
  useEffect(() => {
    if (layout === 'read' && source) {
      // only reparse if source changed without block sync (source mode edits)
      setBlocks((prev) => {
        const rebuilt = blocksToSource(prev);
        if (rebuilt.trim() === source.trim()) return prev;
        return parseBlocks(source);
      });
    }
  }, [layout, source]);

  // Simple find: search source text and highlight via window.find is limited;
  // we keep a lightweight count on source for now.
  const runFind = useCallback((q: string) => {
    setFindQuery(q);
    if (!q) {
      setFindCount(0);
      setFindIndex(-1);
      return;
    }
    const n = source.split(q).length - 1;
    setFindCount(n);
    setFindIndex(n > 0 ? 0 : -1);
  }, [source]);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const welcome = useMemo(() => {
    if (blocks.length || source) return null;
    return (
      <div className="empty-state">
        <h1 style={{ marginTop: 0, fontSize: '1.6em', border: 'none' }}>ResearchMD</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          面向科研文档的 Markdown + LaTeX 桌面阅读器。
          <br />
          点击任意段落 / 公式即可就地编辑。
        </p>
        <p style={{ marginTop: '1.5em' }}>
          <strong>开始：</strong>打开文件 / 打开文件夹 / 拖入 .md
        </p>
        <p style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>
          Ctrl+O 打开 · Ctrl+S 保存 · Ctrl+E 源码模式
          <br />
          点击块编辑 · Ctrl+Enter 完成 · Esc 取消
        </p>
        <p style={{ marginTop: '2em', fontSize: '0.85em', color: 'var(--text-muted)' }}>
          MathJax: {mathReady ? '已就绪' : '加载中…'}
        </p>
      </div>
    );
  }, [blocks.length, source, mathReady]);

  return (
    <div className="app-root">
      <div
        className={`app-shell ${settings.showSidebar ? '' : 'no-sidebar'} ${
          settings.showToc ? '' : 'no-toc'
        }`}
      >
        <Toolbar
          title={docName}
          dirty={dirty}
          layout={layout === 'source' ? 'edit' : 'read'}
          showSidebar={settings.showSidebar}
          showToc={settings.showToc}
          theme={settings.theme}
          width={settings.width}
          mode={settings.mode}
          zoom={settings.zoom}
          onToggleSidebar={() => patchSettings({ showSidebar: !settings.showSidebar })}
          onToggleToc={() => patchSettings({ showToc: !settings.showToc })}
          onOpenFile={() => void openFile()}
          onOpenFolder={() => void openFolder()}
          onLayoutChange={(l) => {
            if (l === 'edit') setLayout('source');
            else setLayout('read');
            setEditingBlockId(null);
          }}
          onSave={() => void saveFile()}
          onThemeChange={(t) => patchSettings({ theme: t })}
          onWidthChange={(w) => patchSettings({ width: w })}
          onModeChange={(m) => patchSettings({ mode: m })}
          onZoomIn={() => patchSettings({ zoom: Math.min(160, settings.zoom + 10) })}
          onZoomOut={() => patchSettings({ zoom: Math.max(70, settings.zoom - 10) })}
          onZoomReset={() => patchSettings({ zoom: 100 })}
          onFind={() => {
            setShowFind(true);
            setTimeout(() => findInputRef.current?.focus(), 10);
          }}
        />

        <FileTree
          nodes={fileTree}
          activePath={docPath}
          onOpen={(p) => void handleTreeOpen(p)}
          rootLabel={
            folderRoot ? folderRoot.replace(/\\/g, '/').split('/').pop() || '工作区' : '最近'
          }
        />

        <div className="content-stack layout-read">
          {welcome}

          {layout === 'source' ? (
            <MarkdownEditor
              value={source}
              onChange={setSource}
              fileName={docName}
              dirty={dirty}
              onSave={() => void saveFile()}
              docPath={docPath}
            />
          ) : (
            docPath && (
              <BlockArticle
                blocks={blocks}
                docDir={docDir}
                width={settings.width}
                fontSize={settings.fontSize}
                editingId={editingBlockId}
                onEditingChange={setEditingBlockId}
                onBlockChange={onBlockChange}
                onBlockDelete={onBlockDelete}
                onInsertAfter={onInsertAfter}
                onHeadings={(items) => setToc(items as TocItem[])}
              />
            )
          )}

          {loading && (
            <div className="loading-overlay">
              <div className="spinner" />
              正在渲染…
            </div>
          )}
        </div>

        <TocPanel
          items={toc}
          activeId={activeHeading}
          onJump={(id) => {
            setActiveHeading(id);
            const el = document.getElementById(id);
            el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }}
        />
      </div>

      {showFind && (
        <div className="find-bar" style={{ position: 'fixed', top: 54, right: 24 }}>
          <input
            ref={findInputRef}
            value={findQuery}
            placeholder="在源码中查找…"
            onChange={(e) => runFind(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowFind(false);
                setFindQuery('');
              }
            }}
          />
          <span className="count">{findQuery ? `${findIndex + 1}/${findCount}` : '0/0'}</span>
          <button
            className="btn btn-icon"
            onClick={() => setShowFind(false)}
            title="关闭"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          className="error-banner"
          style={{ position: 'fixed', bottom: 20, left: 20, maxWidth: 420, zIndex: 50 }}
        >
          <h3>出错了</h3>
          <p style={{ margin: '0 0 8px', color: 'var(--text-secondary)' }}>{error}</p>
          <button className="btn" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      )}

      {dragging && (
        <div className="drop-overlay">
          <span>松开以打开 Markdown 文件</span>
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="preview" />
        </div>
      )}

      {docName && (
        <div className="status-bar">
          {docName}
          {dirty ? ' · 未保存' : ''}
          {layout === 'read' ? ' · 点击块编辑' : ' · 源码模式'}
        </div>
      )}
    </div>
  );
}

function findFirstMd(nodes: FileNode[]): string | null {
  for (const n of nodes) {
    if (n.isMd) return n.path;
    if (n.children) {
      const f = findFirstMd(n.children);
      if (f) return f;
    }
  }
  return null;
}
