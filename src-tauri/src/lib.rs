use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirEntryInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_md: bool,
    pub size: u64,
}

fn is_markdown(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
}

fn list_dir_sorted(dir: &Path) -> Vec<DirEntryInfo> {
    let mut entries: Vec<DirEntryInfo> = Vec::new();
    let Ok(read) = std::fs::read_dir(dir) else {
        return entries;
    };
    for item in read.flatten() {
        let path = item.path();
        let name = item.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let is_dir = path.is_dir();
        let is_md = !is_dir && is_markdown(&name);
        // Hide noisy non-md files in tree (still allow folders)
        if !is_dir && !is_md {
            let lower = name.to_ascii_lowercase();
            let keep = lower.ends_with(".png")
                || lower.ends_with(".jpg")
                || lower.ends_with(".jpeg")
                || lower.ends_with(".gif")
                || lower.ends_with(".webp")
                || lower.ends_with(".svg")
                || lower.ends_with(".txt");
            if !keep {
                continue;
            }
        }
        let size = if is_dir {
            0
        } else {
            item.metadata().map(|m| m.len()).unwrap_or(0)
        };
        entries.push(DirEntryInfo {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            is_md,
            size,
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    entries
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(format!("文件不存在: {path}"));
    }
    if p.is_dir() {
        return Err(format!("路径是目录，不是文件: {path}"));
    }
    let bytes = std::fs::read(&p).map_err(|e| format!("读取失败: {e}"))?;
    // Handle UTF-8 BOM
    let text = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        String::from_utf8_lossy(&bytes[3..]).into_owned()
    } else {
        // Fallback to lossy UTF-8; also try UTF-16LE BOM
        if bytes.starts_with(&[0xFF, 0xFE]) {
            let u16s: Vec<u16> = bytes[2..]
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            String::from_utf16_lossy(&u16s)
        } else {
            String::from_utf8_lossy(&bytes).into_owned()
        }
    };
    Ok(text)
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err(format!("不是有效目录: {path}"));
    }
    Ok(list_dir_sorted(&p))
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    PathBuf::from(&path).exists()
}

#[tauri::command]
fn canonicalize(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let c = p.canonicalize().map_err(|e| e.to_string())?;
    // Windows canonicalize may produce \\?\ prefix
    let s = c.to_string_lossy().to_string();
    let clean = s.strip_prefix(r"\\?\").unwrap_or(&s).to_string();
    Ok(clean)
}

#[tauri::command]
fn join_path(base: String, relative: String) -> Result<String, String> {
    let rel = relative.replace('/', "\\");
    let combined = PathBuf::from(&base).join(rel);
    // Normalize .. and .
    let mut parts: Vec<String> = Vec::new();
    for component in combined.components() {
        match component {
            std::path::Component::ParentDir => {
                parts.pop();
            }
            std::path::Component::CurDir => {}
            std::path::Component::Normal(s) => parts.push(s.to_string_lossy().to_string()),
            std::path::Component::RootDir => parts.push(String::new()),
            std::path::Component::Prefix(p) => parts.push(p.as_os_str().to_string_lossy().to_string()),
        }
    }
    Ok(parts.join("\\"))
}

#[tauri::command]
fn get_startup_path() -> Option<String> {
    // args_os handles non-UTF8 on some platforms; on Windows paths are Unicode
    std::env::args_os()
        .nth(1)
        .map(|s| s.to_string_lossy().into_owned())
        .filter(|a| !a.starts_with('-') && !a.is_empty())
}

/// Write UTF-8 text (optional BOM) to disk. Used by the editor.
#[tauri::command]
fn write_text_file(path: String, content: String, with_bom: Option<bool>) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {e}"))?;
        }
    }
    let mut bytes: Vec<u8> = Vec::with_capacity(content.len() + 3);
    if with_bom.unwrap_or(false) {
        bytes.extend_from_slice(&[0xEF, 0xBB, 0xBF]);
    }
    bytes.extend_from_slice(content.as_bytes());
    std::fs::write(&p, bytes).map_err(|e| format!("写入失败: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            write_text_file,
            list_dir,
            path_exists,
            canonicalize,
            join_path,
            get_startup_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running ResearchMD");
}
