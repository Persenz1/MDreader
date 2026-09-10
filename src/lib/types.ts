/** Types shared across the reader */

export type ThemeMode = 'light' | 'dark' | 'system';
export type WidthMode = 'normal' | 'wide' | 'full';
export type ReadingMode = 'modern' | 'paper';

export interface TocItem {
  id: string;
  text: string;
  level: number; // 1-6
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  isMd: boolean;
  size: number;
  children?: FileNode[];
  expanded?: boolean;
}

export interface OpenDocument {
  path: string;
  name: string;
  content: string;
}

export interface ReaderSettings {
  theme: ThemeMode;
  width: WidthMode;
  mode: ReadingMode;
  showSidebar: boolean;
  showToc: boolean;
  fontSize: number; // px
  zoom: number; // percent 80-150
}

export interface ScrollMemory {
  [path: string]: number;
}
