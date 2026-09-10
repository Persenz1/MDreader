import hljs from 'highlight.js/lib/common';
import matlab from 'highlight.js/lib/languages/matlab';
import powershell from 'highlight.js/lib/languages/powershell';
import latex from 'highlight.js/lib/languages/latex';
import 'highlight.js/styles/github.css';

hljs.registerLanguage('matlab', matlab);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('latex', latex);
hljs.registerLanguage('tex', latex);

const LANG_ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  tex: 'latex',
  'c++': 'cpp',
  ps1: 'powershell',
  powershell: 'powershell',
  matlab: 'matlab',
  octave: 'matlab',
};

export function highlightCode(code: string, lang?: string): { html: string; language: string } {
  const normalized = (lang || '').toLowerCase().trim();
  const resolved = LANG_ALIASES[normalized] || normalized;

  if (resolved && hljs.getLanguage(resolved)) {
    try {
      const result = hljs.highlight(code, { language: resolved, ignoreIllegals: true });
      return { html: result.value, language: resolved };
    } catch {
      /* fall through */
    }
  }
  try {
    const result = hljs.highlightAuto(code);
    return { html: result.value, language: result.language || 'text' };
  } catch {
    return { html: escapeHtml(code), language: 'text' };
  }
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
