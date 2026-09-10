import React from 'react';

export interface ToolbarProps {
  title: string;
  dirty: boolean;
  layout: 'read' | 'split' | 'edit';
  showSidebar: boolean;
  showToc: boolean;
  theme: 'light' | 'dark' | 'system';
  width: 'normal' | 'wide' | 'full';
  mode: 'modern' | 'paper';
  zoom: number;
  onToggleSidebar: () => void;
  onToggleToc: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onLayoutChange: (l: 'read' | 'split' | 'edit') => void;
  onSave: () => void;
  onThemeChange: (t: 'light' | 'dark' | 'system') => void;
  onWidthChange: (w: 'normal' | 'wide' | 'full') => void;
  onModeChange: (m: 'modern' | 'paper') => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onFind: () => void;
}

export function Toolbar(props: ToolbarProps): React.ReactElement {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="logo">MD</span>
        <span>ResearchMD</span>
        <span className="brand-ver">v0.1.1</span>
        {props.dirty && (
          <span className="dirty-dot" title="有未保存修改">
            ●
          </span>
        )}
      </div>

      <div className="toolbar-divider" />

      <button className="btn" onClick={props.onOpenFile} title="打开文件 (Ctrl+O)">
        打开
      </button>
      <button className="btn" onClick={props.onOpenFolder} title="打开文件夹 (Ctrl+Shift+O)">
        文件夹
      </button>

      <div className="toolbar-divider" />

      <button
        className={`btn ${props.layout === 'read' ? 'active' : ''}`}
        onClick={() => props.onLayoutChange('read')}
        title="阅读 + 点击就地编辑"
      >
        阅读
      </button>
      <button
        className={`btn ${props.layout === 'edit' ? 'active' : ''}`}
        onClick={() => props.onLayoutChange('edit')}
        title="整篇源码 (Ctrl+E)"
      >
        源码
      </button>
      <button
        className="btn primary"
        onClick={props.onSave}
        title="保存 (Ctrl+S)"
        disabled={!props.title}
      >
        保存{props.dirty ? ' *' : ''}
      </button>

      <div className="toolbar-divider" />

      <button
        className={`btn ${props.showSidebar ? 'active' : ''}`}
        onClick={props.onToggleSidebar}
        title="侧栏 (Ctrl+B，编辑器内为加粗)"
      >
        树
      </button>
      <button
        className={`btn ${props.showToc ? 'active' : ''}`}
        onClick={props.onToggleToc}
        title="目录 (Ctrl+T)"
      >
        目录
      </button>
      <button className="btn" onClick={props.onFind} title="查找 (Ctrl+F)">
        查找
      </button>

      <div className="toolbar-divider" />

      <select
        className="select"
        value={props.width}
        onChange={(e) => props.onWidthChange(e.target.value as 'normal' | 'wide' | 'full')}
        title="正文宽度"
      >
        <option value="normal">标准</option>
        <option value="wide">宽版</option>
        <option value="full">全宽</option>
      </select>

      <select
        className="select"
        value={props.mode}
        onChange={(e) => props.onModeChange(e.target.value as 'modern' | 'paper')}
        title="阅读模式"
      >
        <option value="modern">现代</option>
        <option value="paper">论文</option>
      </select>

      <select
        className="select"
        value={props.theme}
        onChange={(e) => props.onThemeChange(e.target.value as 'light' | 'dark' | 'system')}
        title="主题"
      >
        <option value="system">系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>

      <div className="toolbar-spacer" />

      {props.title && (
        <span className="doc-title" title={props.title}>
          {props.title}
        </span>
      )}

      <button className="btn btn-icon" onClick={props.onZoomOut} title="缩小 (Ctrl+-)">
        −
      </button>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, textAlign: 'center' }}>
        {props.zoom}%
      </span>
      <button className="btn btn-icon" onClick={props.onZoomIn} title="放大 (Ctrl++)">
        +
      </button>
      <button className="btn btn-icon" onClick={props.onZoomReset} title="重置 (Ctrl+0)">
        ⟲
      </button>
    </header>
  );
}
