import React, { useEffect, useRef } from 'react';
import type { TocItem } from '../lib/types';

export interface TocPanelProps {
  items: TocItem[];
  activeId: string | null;
  onJump: (id: string) => void;
}

export function TocPanel({ items, activeId, onJump }: TocPanelProps): React.ReactElement {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [activeId]);

  return (
    <aside className="toc-panel">
      <div className="toc-header">
        <span>目录</span>
      </div>
      <div className="toc-list">
        {items.length === 0 ? (
          <div className="toc-empty">打开文档后自动生成目录</div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              ref={item.id === activeId ? activeRef : undefined}
              type="button"
              className={`toc-item ${item.id === activeId ? 'active' : ''}`}
              data-level={item.level}
              onClick={() => onJump(item.id)}
              title={item.text}
            >
              {item.text || '(未命名)'}
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
