/**
 * Lazy Mermaid renderer. Failures stay as source; never blocks math.
 */

let ready: Promise<any> | null = null;

async function loadMermaid(): Promise<any> {
  if (ready) return ready;
  ready = import('mermaid').then(async (mod) => {
    const mermaid = (mod as any).default ?? mod;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'neutral',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      flowchart: { htmlLabels: true, curve: 'basis' },
    });
    return mermaid;
  });
  return ready;
}

let seq = 0;

export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>('.mermaid-block[data-mermaid]')
  );
  if (!nodes.length) return;

  let mermaid: any;
  try {
    mermaid = await loadMermaid();
  } catch (e) {
    console.warn('Mermaid load failed', e);
    return;
  }

  for (const node of nodes) {
    if (node.dataset.mmd === 'done' || node.dataset.mmd === 'pending') continue;
    const src = decodeAttr(node.dataset.mermaid || '');
    node.dataset.mmd = 'pending';
    try {
      const id = `mmd-${++seq}`;
      const { svg } = await mermaid.render(id, src);
      node.innerHTML = svg;
      node.dataset.mmd = 'done';
      node.classList.remove('mermaid-error-wrap');
    } catch (e) {
      console.warn('Mermaid render error', e);
      node.dataset.mmd = 'done';
      node.classList.add('mermaid-error-wrap');
      node.innerHTML = `<div class="mermaid-error">Mermaid 渲染失败（源码保留）\n</div><pre class="mermaid-src">${escapeHtml(src)}</pre>`;
    }
  }
}

function decodeAttr(s: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
