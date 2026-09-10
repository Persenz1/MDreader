/**
 * MathJax 3 loader + progressive typesetting.
 *
 * Critical performance rules (learned from 200KB / 1000-formula papers):
 * 1. NEVER call startup.document.updateDocument() per formula — only per batch.
 * 2. Yield to the event loop between batches so scrolling stays responsive.
 * 3. Typeset visible formulas first; remaining on idle.
 * 4. One bad formula must not abort the rest.
 */

declare global {
  interface Window {
    MathJax?: any;
  }
}

let loading: Promise<void> | null = null;
let ready = false;
let typesetGeneration = 0;

function mathJaxBaseUrl(): string {
  try {
    return new URL('mathjax/es5', document.baseURI).href.replace(/\/$/, '');
  } catch {
    return './mathjax/es5';
  }
}

export function loadMathJax(): Promise<void> {
  if (ready && window.MathJax?.tex2chtmlPromise) return Promise.resolve();
  if (loading) return loading;

  const base = mathJaxBaseUrl();

  loading = new Promise<void>((resolve, reject) => {
    window.MathJax = {
      tex: {
        inlineMath: [
          ['$', '$'],
          ['\\(', '\\)'],
        ],
        displayMath: [
          ['$$', '$$'],
          ['\\[', '\\]'],
        ],
        processEscapes: true,
        processEnvironments: true,
        packages: {
          '[+]': [
            'ams',
            'newcommand',
            'boldsymbol',
            'physics',
            'mhchem',
            'color',
            'noundefined',
            'noerrors',
          ],
        },
        macros: {
          R: '\\mathbb{R}',
          N: '\\mathbb{N}',
          Z: '\\mathbb{Z}',
          C: '\\mathbb{C}',
          norm: ['\\left\\lVert #1 \\right\\rVert', 1],
          abs: ['\\left\\lvert #1 \\right\\rvert', 1],
        },
      },
      options: {
        skipHtmlTags: [
          'script',
          'noscript',
          'style',
          'textarea',
          'pre',
          'code',
          'annotation',
          'mjx-container',
        ],
        enableMenu: true,
      },
      loader: {
        load: [
          '[tex]/ams',
          '[tex]/newcommand',
          '[tex]/boldsymbol',
          '[tex]/physics',
          '[tex]/mhchem',
          '[tex]/color',
          '[tex]/noundefined',
          '[tex]/noerrors',
        ],
        paths: { mathjax: base },
      },
      startup: { typeset: false },
      chtml: {
        scale: 1,
        matchFontHeight: true,
      },
    };

    const script = document.createElement('script');
    script.src = `${base}/tex-chtml.js`;
    script.async = true;
    script.onload = () => {
      const done = () => {
        ready = true;
        resolve();
      };
      if (window.MathJax?.startup?.promise) {
        window.MathJax.startup.promise.then(done).catch(reject);
      } else {
        const t = setInterval(() => {
          if (window.MathJax?.tex2chtmlPromise) {
            clearInterval(t);
            done();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(t);
          reject(new Error('MathJax startup timeout'));
        }, 20000);
      }
    };
    script.onerror = () => reject(new Error(`MathJax failed to load from ${base}`));
    document.head.appendChild(script);
  });

  return loading;
}

export function isMathJaxReady(): boolean {
  return ready && !!window.MathJax?.tex2chtmlPromise;
}

function flushStyles(): void {
  try {
    window.MathJax?.startup?.document?.clear?.();
    window.MathJax?.startup?.document?.updateDocument?.();
  } catch {
    /* ignore */
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    // Double rAF = after next paint; keeps scroll/input alive
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeAttr(s: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

function showFormulaError(node: HTMLElement, tex: string): void {
  node.classList.add('math-error');
  if (node.querySelector('.math-error-msg')) return;
  const label = node.classList.contains('math-block') ? 'Display' : 'Inline';
  const err = document.createElement('div');
  err.className = 'math-error-msg';
  err.innerHTML = `<span class="math-error-badge">${label} formula error</span><code class="math-error-src"></code>`;
  err.querySelector('code')!.textContent = tex;
  node.appendChild(err);
}

/** Lightweight placeholder so layout height is reserved before CHTML arrives. */
function showPlaceholder(node: HTMLElement, tex: string, display: boolean): void {
  if (node.querySelector('mjx-container') || node.querySelector('.math-error-msg')) return;
  const code = document.createElement('code');
  code.className = display ? 'math-placeholder math-placeholder-block' : 'math-placeholder';
  const short = tex.length > 80 ? tex.slice(0, 77) + '…' : tex;
  code.textContent = display ? `\\[${short}\\]` : `\\(${short}\\)`;
  node.appendChild(code);
}

function typesetNode(node: HTMLElement): Promise<void> {
  const tex = decodeAttr(node.dataset.tex || '');
  const display = node.classList.contains('math-block');
  showPlaceholder(node, tex, display);

  return window.MathJax.tex2chtmlPromise(tex, { display }).then((chtml: HTMLElement) => {
    node.innerHTML = '';
    node.appendChild(chtml);
    node.dataset.typeset = 'done';
    node.classList.remove('math-error');
  });
}

export interface TypesetProgress {
  done: number;
  total: number;
}

/**
 * Progressive typeset. Returns a cancel function.
 * Call cancel() when the document is replaced.
 */
export function typesetMathProgressive(
  container: HTMLElement,
  onProgress?: (p: TypesetProgress) => void
): () => void {
  const gen = ++typesetGeneration;
  let cancelled = false;

  (async () => {
    try {
      await loadMathJax();
    } catch (e) {
      console.error(e);
      return;
    }
    if (cancelled || gen !== typesetGeneration) return;

    const all = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.math-inline[data-tex]:not([data-typeset="done"]), .math-block[data-tex]:not([data-typeset="done"])'
      )
    );
    const total = all.length;
    if (!total) return;

    // Order: visible first, then the rest
    const scroller = container.closest('.content-area') || container;
    const viewTop = 0;
    const viewH = (scroller as HTMLElement).clientHeight || window.innerHeight;
    const visible: HTMLElement[] = [];
    const rest: HTMLElement[] = [];
    for (const n of all) {
      const r = n.getBoundingClientRect();
      const sr = (scroller as HTMLElement).getBoundingClientRect?.() ?? { top: 0 };
      const top = r.top - (sr.top || 0);
      const inView = top < viewH + 400 && top > -400;
      (inView ? visible : rest).push(n);
    }

    const BATCH = 24;
    let done = 0;

    const runBatch = async (batch: HTMLElement[], heavy: boolean) => {
      if (cancelled || gen !== typesetGeneration) return;
      for (const node of batch) {
        if (cancelled || gen !== typesetGeneration) return;
        try {
          await typesetNode(node);
        } catch (e) {
          console.warn('MathJax formula error (isolated):', node.dataset.tex, e);
          node.dataset.typeset = 'done';
          showFormulaError(node, decodeAttr(node.dataset.tex || ''));
        }
        done += 1;
      }
      // ONE style flush per batch — not per formula
      if (heavy) flushStyles();
      onProgress?.({ done, total });
      await yieldToUi();
    };

    // Visible first (urgent)
    for (let i = 0; i < visible.length; i += BATCH) {
      if (cancelled || gen !== typesetGeneration) return;
      await runBatch(visible.slice(i, i + BATCH), true);
    }
    flushStyles();

    // Background: remaining formulas in small batches
    for (let i = 0; i < rest.length; i += BATCH) {
      if (cancelled || gen !== typesetGeneration) return;
      // Extra idle yield every few batches so long docs never lock the UI
      if (i > 0 && i % (BATCH * 4) === 0) await sleep(0);
      await runBatch(rest.slice(i, i + BATCH), true);
    }

    flushStyles();
    onProgress?.({ done: total, total });
  })();

  return () => {
    cancelled = true;
  };
}

/** One-shot typeset (tests / small docs). Prefer progressive for real papers. */
export async function typesetMath(container: HTMLElement): Promise<void> {
  const cancel = typesetMathProgressive(container);
  // Wait until generation is satisfied or timeout
  const gen = typesetGeneration;
  const start = Date.now();
  while (gen === typesetGeneration && Date.now() - start < 120000) {
    const pending = container.querySelectorAll(
      '.math-inline[data-tex]:not([data-typeset="done"]), .math-block[data-tex]:not([data-typeset="done"])'
    );
    if (!pending.length) return;
    await sleep(50);
  }
  void cancel;
}

export function clearMathJaxTypeset(container: HTMLElement): void {
  container.querySelectorAll('mjx-container').forEach((el) => el.remove());
}

/** Cancel any in-flight progressive typeset (call before swapping documents). */
export function cancelTypesetting(): void {
  typesetGeneration += 1;
}
