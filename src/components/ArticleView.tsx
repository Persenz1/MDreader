import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { typesetMathProgressive, cancelTypesetting } from '../lib/mathjax';
import type { TocItem } from '../lib/types';

export interface ArticleViewHandle {
  getScrollTop: () => number;
  setScrollTop: (top: number) => void;
  getRoot: () => HTMLDivElement | null;
  jumpToHeading: (id: string) => void;
  highlightFind: (query: string) => { total: number; index: number };
  navigateFind: (delta: number) => number;
  clearFind: () => void;
}

export interface ArticleViewProps {
  html: string;
  width: 'normal' | 'wide' | 'full';
  fontSize: number;
  onScroll?: (top: number) => void;
  onHeadings?: (items: TocItem[]) => void;
  onImageClick?: (src: string) => void;
  onTocHighlight?: (id: string | null) => void;
  headingItems: TocItem[];
}

export const ArticleView = forwardRef<ArticleViewHandle, ArticleViewProps>(function ArticleView(
  { html, width, fontSize, onScroll, onImageClick, headingItems },
  ref
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const findMarksRef = useRef<HTMLElement[]>([]);
  const findIndexRef = useRef(-1);

  // Progressive typeset after HTML inject — cancellable on document swap
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    cancelTypesetting();
    let cancel: (() => void) | null = null;
    const raf = requestAnimationFrame(() => {
      if (!innerRef.current) return;
      cancel = typesetMathProgressive(innerRef.current);
    });
    return () => {
      cancelAnimationFrame(raf);
      cancel?.();
      cancelTypesetting();
    };
  }, [html]);

  // Image click -> lightbox
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onImageClick) return;
    const handler = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG') {
        const img = t as HTMLImageElement;
        onImageClick(img.src);
      }
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [html, onImageClick]);

  // Broken images
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const imgs = el.querySelectorAll('img');
    imgs.forEach((img) => {
      img.addEventListener('error', () => {
        img.classList.add('img-broken');
        img.alt = img.alt || '图片加载失败';
      });
    });
  }, [html]);

  // Scroll spy for TOC
  useEffect(() => {
    const scroller = scrollRef.current;
    const root = innerRef.current;
    if (!scroller || !root || headingItems.length === 0) return;

    let raf = 0;
    const onScrollInternal = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollerTop = scroller.getBoundingClientRect().top;
        let current: string | null = null;
        for (const item of headingItems) {
          const el = document.getElementById(item.id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top - scrollerTop;
          if (top <= 80) current = item.id;
          else break;
        }
        // If none matched, use first
        if (!current && headingItems[0]) current = headingItems[0].id;
        onScroll?.(scroller.scrollTop);
        // dispatch custom for parent
        scroller.dispatchEvent(
          new CustomEvent('toc-active', { detail: current, bubbles: true })
        );
      });
    };
    scroller.addEventListener('scroll', onScrollInternal, { passive: true });
    onScrollInternal();
    return () => {
      scroller.removeEventListener('scroll', onScrollInternal);
      cancelAnimationFrame(raf);
    };
  }, [headingItems, html, onScroll]);

  useImperativeHandle(ref, () => ({
    getScrollTop: () => scrollRef.current?.scrollTop ?? 0,
    setScrollTop: (top: number) => {
      if (scrollRef.current) scrollRef.current.scrollTop = top;
    },
    getRoot: () => scrollRef.current,
    jumpToHeading: (id: string) => {
      const el = document.getElementById(id);
      const scroller = scrollRef.current;
      if (el && scroller) {
        const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
        scroller.scrollTo({ top, behavior: 'smooth' });
      }
    },
    highlightFind: (query: string) => {
      clearHighlights(innerRef.current);
      findMarksRef.current = [];
      findIndexRef.current = -1;
      if (!query || !innerRef.current) return { total: 0, index: -1 };
      const total = highlightText(innerRef.current, query);
      findMarksRef.current = Array.from(
        innerRef.current.querySelectorAll<HTMLElement>('mark.find-hit')
      );
      if (total > 0) {
        findIndexRef.current = 0;
        focusFindIndex(0);
        return { total, index: 0 };
      }
      return { total: 0, index: -1 };
    },
    navigateFind: (delta: number) => {
      const marks = findMarksRef.current;
      if (!marks.length) return -1;
      let idx = findIndexRef.current + delta;
      if (idx < 0) idx = marks.length - 1;
      if (idx >= marks.length) idx = 0;
      findIndexRef.current = idx;
      focusFindIndex(idx);
      return idx;
    },
    clearFind: () => {
      clearHighlights(innerRef.current);
      findMarksRef.current = [];
      findIndexRef.current = -1;
    },
  }));

  return (
    <div
      className="content-area"
      ref={scrollRef}
      tabIndex={0}
      style={
        {
          ['--article-size' as string]: `${fontSize}px`,
        } as React.CSSProperties
      }
    >
      <article className="article" data-width={width}>
        <div
          className="article-inner"
          ref={innerRef}
          // HTML is sanitized by DOMPurify in markdown.ts
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
});

function focusFindIndex(idx: number): void {
  const marks = document.querySelectorAll<HTMLElement>('mark.find-hit');
  marks.forEach((m, i) => m.classList.toggle('current', i === idx));
  const target = marks[idx];
  if (target) {
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function clearHighlights(root: HTMLElement | null): void {
  if (!root) return;
  root.querySelectorAll('mark.find-hit').forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ''), m);
    parent.normalize();
  });
}

/**
 * Text search that avoids math/code partially — still searches text nodes.
 * Skips script/mjx-container internals.
 */
function highlightText(root: HTMLElement, query: string): number {
  const needle = query.toLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'MARK') return NodeFilter.FILTER_REJECT;
      if (parent.closest('mjx-container') || parent.closest('.math-error-src')) {
        return NodeFilter.FILTER_REJECT;
      }
      if (!node.nodeValue || !node.nodeValue.toLowerCase().includes(needle)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    nodes.push(n as Text);
  }

  let count = 0;
  for (const textNode of nodes) {
    const text = textNode.nodeValue || '';
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let i = 0;
    let idx = lower.indexOf(needle, i);
    while (idx !== -1) {
      if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
      const mark = document.createElement('mark');
      mark.className = 'find-hit';
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      count += 1;
      i = idx + query.length;
      idx = lower.indexOf(needle, i);
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  return count;
}
