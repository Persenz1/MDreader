import React, { useState } from 'react';
import type { FileNode } from '../lib/types';

export interface FileTreeProps {
  nodes: FileNode[];
  activePath: string | null;
  onOpen: (path: string) => void;
  rootLabel: string;
}

export function FileTree({ nodes, activePath, onOpen, rootLabel }: FileTreeProps): React.ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>{rootLabel || '文件'}</span>
      </div>
      <div className="file-tree">
        {nodes.length === 0 ? (
          <div className="tree-empty">
            点击「打开文件夹」或拖入 Markdown 文件开始阅读。
          </div>
        ) : (
          <TreeList nodes={nodes} activePath={activePath} onOpen={onOpen} depth={0} />
        )}
      </div>
    </aside>
  );
}

function TreeList({
  nodes,
  activePath,
  onOpen,
  depth,
}: {
  nodes: FileNode[];
  activePath: string | null;
  onOpen: (path: string) => void;
  depth: number;
}): React.ReactElement {
  return (
    <div>
      {nodes.map((node) => (
        <TreeRow
          key={node.path}
          node={node}
          activePath={activePath}
          onOpen={onOpen}
          depth={depth}
        />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  activePath,
  onOpen,
  depth,
}: {
  node: FileNode;
  activePath: string | null;
  onOpen: (path: string) => void;
  depth: number;
}): React.ReactElement {
  const [open, setOpen] = useState(depth < 1);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          className="tree-item"
          onClick={() => setOpen((v) => !v)}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <span className="chevron">{open ? '▾' : '▸'}</span>
          <span className="icon">📁</span>
          <span className="label">{node.name}</span>
        </button>
        {open && node.children && node.children.length > 0 && (
          <div className="tree-children">
            <TreeList nodes={node.children} activePath={activePath} onOpen={onOpen} depth={depth + 1} />
          </div>
        )}
        {open && node.children && node.children.length === 0 && (
          <div className="tree-empty" style={{ paddingLeft: 28 + depth * 12 }}>
            （空）
          </div>
        )}
      </div>
    );
  }

  const active = activePath === node.path;
  return (
    <button
      type="button"
      className={`tree-item ${active ? 'active' : ''}`}
      onClick={() => onOpen(node.path)}
      title={node.path}
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <span className="chevron" />
      <span className="icon">{node.isMd ? '📄' : '🖼'}</span>
      <span className="label">{node.name}</span>
    </button>
  );
}
