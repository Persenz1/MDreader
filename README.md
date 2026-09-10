# ResearchMD

面向科研 Markdown 文档的轻量桌面阅读器。第一优先级是 **LaTeX 数学公式兼容性** 与 **接近论文/ PDF 的阅读视觉效果**。

不是 Markdown IDE，不是笔记软件，不是云同步工具。打开本地 `.md`，把公式和长文读好。

## 技术架构

| 层 | 选型 | 原因 |
|---|---|---|
| 桌面壳 | **Tauri 2** + WebView2 | 体积小、内存低、系统 WebView，真桌面应用 |
| 前端 | React 18 + TypeScript + Vite | 组件化 UI，类型安全 |
| Markdown | markdown-it + footnote + anchor | 成熟、可扩展、可控 |
| 数学 | **MathJax 3**（本地打包） | 最大化科研 LaTeX 兼容性（不用 KaTeX） |
| 代码高亮 | highlight.js | 覆盖 Python/C/C++/Rust/JS/TS/MATLAB 等 |
| 安全 | DOMPurify | 消毒 HTML，禁止脚本 |

### 为什么不是 Electron / KaTeX

- **Tauri vs Electron**：安装包约 10MB vs 80MB+；运行内存更低（复用系统 WebView2）。
- **MathJax vs KaTeX**：本项目目标是「公式兼容性优先」，不是「最快渲染」。MathJax 3 对 `align`/`cases`/`physics`/`mhchem`/`\label`/`\eqref`/自定义宏的支持远好于 KaTeX。

## 快速开始

### 环境要求（Windows）

- Node.js 20+
- Rust stable（MSVC）
- Visual Studio Build Tools 2022（C++ 工作负载）
- WebView2 Runtime（Win10/11 通常自带）

### 开发

```powershell
npm install
npm run dev          # 仅浏览器预览渲染
npm run dev:desktop  # Tauri 桌面开发模式（需 MSVC 环境）
```

Windows 下若 `link.exe` 不在 PATH，使用：

```powershell
node scripts/tauri-build.mjs --dev
```

### 构建 Release

```powershell
npm run typecheck
node scripts/tauri-build.mjs
```

产物：

- `src-tauri/target/release/researchmd.exe`
- `src-tauri/target/release/bundle/nsis/ResearchMD_0.1.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/ResearchMD_0.1.0_x64_en-US.msi`

### 测试

```powershell
node tests/test-math-extract.mjs
node tests/generate-long-doc.mjs
```

测试文档：

- `tests/fixtures/latex_compatibility_test.md` — LaTeX 兼容性全集
- `tests/fixtures/markdown_visual_test.md` — Markdown 视觉
- `tests/fixtures/research_paper_demo.md` — 模拟科研论文
- `tests/fixtures/long_doc_5k.md` / `long_doc_10k.md` — 长文压测

## 功能

- 打开文件 / 打开文件夹（文件树）
- 拖放 `.md` 打开
- 右侧 TOC（层级、滚动高亮、点击跳转）
- Light / Dark / 跟随系统
- 现代模式 / **Paper Mode**（论文纸感排版）
- 正文宽度：标准 / 宽 / 全宽
- 缩放（Ctrl +/- / 0）
- Ctrl+F 文档内查找（上/下一处、计数）
- 滚动位置记忆
- 相对路径图片解析 + 点击放大
- 表格横向滚动、代码块语法高亮
- Mermaid 图（模块化，失败不影响公式）

### 快捷键

| 快捷键 | 动作 |
|---|---|
| Ctrl+O | 打开文件 |
| Ctrl+Shift+O | 打开文件夹 |
| Ctrl+F | 查找 |
| Ctrl+= / Ctrl+- | 放大 / 缩小 |
| Ctrl+0 | 重置缩放 |
| Ctrl+B | 侧栏 |
| Ctrl+T | 目录 |
| Ctrl+P | 切换论文模式 |
| Esc | 关闭查找 / 灯箱 |

## LaTeX 支持矩阵

基于 `tests/fixtures/latex_compatibility_test.md` 与单元测试（`node tests/test-math-extract.mjs`，39 项通过）：

| Syntax | Support | Notes |
|---|---|---|
| `$...$` | Yes | 保守规则：不匹配 `$100`、`$PATH`、行内代码 |
| `$$...$$` | Yes | 块级 |
| `\(...\)` | Yes | 行内 |
| `\[...\]` | Yes | 块级 |
| `equation` / `equation*` | Yes | 编号 / 不编号 |
| `align` / `align*` | Yes | 多行对齐 |
| `aligned` | Yes | 常包在 `\[ \]` 内 |
| `gather` | Yes | |
| `split` | Yes | 常包在 `equation` 内 |
| `cases` | Yes | |
| `matrix` / `pmatrix` / `bmatrix` / `Bmatrix` / `vmatrix` / `Vmatrix` | Yes | |
| fractions / integrals / sums / limits | Yes | |
| Greek letters | Yes | |
| `\mathbf` / `\boldsymbol` / accents | Yes | |
| `\text{}` / 中文 | Yes | |
| `\label` / `\ref` / `\eqref` / `\tag` | Yes/Partial | 依赖 MathJax 文档级上下文；单公式 `tag` 可靠 |
| custom macros (`\newcommand`, `\DeclareMathOperator`) | Yes/Partial | 文档内宏由 MathJax 处理；预置了少量常用宏 |
| mhchem (`\ce{}`) | Yes | 已加载 `[tex]/mhchem` |
| physics (`\dv`, `\pdv`, `\qty`) | Yes/Optional | 已加载 `[tex]/physics` |
| malformed formula isolation | Yes | 单公式错误不影响全文 |

## 已知限制

- MathJax 自动编号跨文件不共享（按单文档 typeset）。
- 极端嵌套宏（数十层 `\newcommand` 链）可能较慢。
- Mermaid 失败时显示错误块，不阻塞公式。
- 本版本无编辑器、无 Git、无云同步（有意为之）。

## 项目结构

```
ResearchMD/
  src/                    # React 前端
    components/           # Toolbar / FileTree / TocPanel / ArticleView
    lib/                  # math-extract / markdown / mathjax / store
    styles/               # theme / typography / math / code / table / app
  src-tauri/              # Tauri 2 Rust 壳
    src/lib.rs            # 读文件、列目录等 IPC
    tauri.conf.json
  public/mathjax/         # 本地 MathJax 3 es5
  tests/fixtures/         # 验收文档
  scripts/tauri-build.mjs # Windows MSVC 环境构建入口
```

## 架构说明（渲染管线）

1. **代码保护**：先抽出 fenced / inline code，避免 `$` 被误判。
2. **数学抽取**：按优先级抽取 `\[ \]` → `$$` → 环境 → `\( \)` → `$...$`，替换为不可见占位符。
3. **Markdown 渲染**：markdown-it 输出 HTML（标题 anchor、脚注、表格、高亮）。
4. **注入数学节点**：占位符 → `.math-block` / `.math-inline`（带 `data-tex`）。
5. **DOMPurify** 消毒。
6. **MathJax typesetPromise** 异步排版；单公式失败时显示错误提示，其它公式继续。

## 安全

- 不执行 Markdown 中的 `<script>`、事件处理器。
- DOMPurify 白名单 MathJax 所需标签/属性。
- 原生侧只通过明确 IPC 命令读文件，前端不直接接触任意 FS API（除 dialog 选定路径）。

## License

MIT
