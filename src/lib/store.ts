import type { ReaderSettings, ScrollMemory, ThemeMode, WidthMode, ReadingMode } from './types';

const SETTINGS_KEY = 'researchmd.settings.v1';
const SCROLL_KEY = 'researchmd.scroll.v1';
const RECENT_KEY = 'researchmd.recent.v1';

export const defaultSettings: ReaderSettings = {
  theme: 'system',
  width: 'normal',
  mode: 'modern',
  showSidebar: true,
  showToc: true,
  fontSize: 16,
  zoom: 100,
};

export function loadSettings(): ReaderSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: ReaderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadScrollMemory(): ScrollMemory {
  try {
    const raw = localStorage.getItem(SCROLL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ScrollMemory;
  } catch {
    return {};
  }
}

export function saveScrollMemory(mem: ScrollMemory): void {
  try {
    // Cap size
    const entries = Object.entries(mem);
    if (entries.length > 200) {
      // drop oldest-ish arbitrarily
      const trimmed = Object.fromEntries(entries.slice(-200));
      localStorage.setItem(SCROLL_KEY, JSON.stringify(trimmed));
      return;
    }
    localStorage.setItem(SCROLL_KEY, JSON.stringify(mem));
  } catch {
    /* ignore */
  }
}

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushRecent(path: string): string[] {
  const list = loadRecent().filter((p) => p !== path);
  list.unshift(path);
  const trimmed = list.slice(0, 20);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function resolveSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemeToDom(theme: ThemeMode, mode: ReadingMode): void {
  const resolved = theme === 'system' ? resolveSystemTheme() : theme;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.mode = mode;
  root.dataset.colorScheme = resolved;
}

export type { ThemeMode, WidthMode, ReadingMode, ReaderSettings, ScrollMemory };
