use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use std::io::Cursor;
use std::path::{Path, PathBuf};

use remotefs::fs::{Metadata, UnixPex};
use remotefs::RemoteFs;
use remotefs_webdav::WebDAVFs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebDavConfig {
    pub url: String,
    pub username: String,
    pub password: String,
    pub root_dir: String,
}

fn normalize_root_dir(root_dir: &str) -> String {
    let trimmed = root_dir.trim();
    if trimmed.is_empty() {
        "".to_string()
    } else {
        trimmed.trim_matches('/').to_string()
    }
}

fn base_dir(config: &WebDavConfig) -> PathBuf {
    let root = normalize_root_dir(&config.root_dir);
    if root.is_empty() {
        PathBuf::from("/chat-app")
    } else {
        PathBuf::from(format!("/{}/chat-app", root))
    }
}

fn ensure_dirs(client: &mut WebDAVFs, abs_dir: &Path) -> Result<(), String> {
    // Create directories segment by segment.
    let mut current = PathBuf::from("/");
    for comp in abs_dir.components() {
        let c = comp.as_os_str().to_string_lossy();
        if c == "/" {
            continue;
        }
        current.push(comp.as_os_str());
        match client.create_dir(&current, UnixPex::from(0o755)) {
            Ok(_) => {}
            Err(e) => {
                // Directory already exists is fine.
                if matches!(e.kind, remotefs::RemoteErrorType::DirectoryAlreadyExists) {
                    continue;
                }
                // Some servers return "Already exists" as protocol error; if stat works, accept.
                if client.stat(&current).is_ok() {
                    continue;
                }
                return Err(format!("mkdir {} failed: {}", current.display(), e));
            }
        }
    }
    Ok(())
}

async fn with_client<T, F>(config: WebDavConfig, f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(&mut WebDAVFs, PathBuf) -> Result<T, String> + Send + 'static,
{
    tokio::task::spawn_blocking(move || {
        let mut client = WebDAVFs::new(&config.username, &config.password, &config.url);
        client.connect().map_err(|e| e.to_string())?;
        let base = base_dir(&config);
        // ensure base exists
        ensure_dirs(&mut client, &base)?;
        f(&mut client, base)
    })
    .await
    .map_err(|e| e.to_string())?
}

pub async fn test(app: AppHandle, config: WebDavConfig) -> Result<String, String> {
    let _ = app;
    with_client(config, |client, base| {
        // a real request to validate credentials
        client.list_dir(Path::new("/")).map_err(|e| e.to_string())?;
        ensure_dirs(client, &base)?;
        Ok("WebDAV ok".to_string())
    })
    .await
}

pub async fn backup(app: AppHandle, config: WebDavConfig) -> Result<String, String> {
    let config_dir = crate::storage::get_config_dir(&app).map_err(|e| e.to_string())?;

    let files = vec![
        ("prompts/prompts.json", "prompts.json"),
        ("settings/llm-config.json", "llm-config.json"),
        ("settings/embedding-config.json", "embedding-config.json"),
        ("settings/webdav-config.json", "webdav-config.json"),
        ("agent-temple/agent-temple.json", "agent-temple.json"),
        ("agent-hub/agent-hub.json", "agent-hub.json"),
        ("agent-hub/rag-index.json", "rag-index.json"),
        ("webchat/webchat-data.json", "webchat-data.json"),
    ];

    with_client(config, move |client, base| {
        let mut uploaded = 0usize;
        for (remote_rel, local_name) in files {
            let local_path = config_dir.join(local_name);
            if !local_path.exists() {
                continue;
            }
            let bytes = std::fs::read(&local_path).map_err(|e| e.to_string())?;

            let mut remote_path = base.clone();
            remote_path.push(remote_rel);

            if let Some(parent) = remote_path.parent() {
                ensure_dirs(client, parent)?;
            }

            let mut metadata = Metadata::default();
            metadata.size = bytes.len() as u64;
            let reader = Cursor::new(bytes);
            client
                .create_file(&remote_path, &metadata, Box::new(reader))
                .map_err(|e| e.to_string())?;
            uploaded += 1;
        }
        Ok(format!("Backup ok: {} files", uploaded))
    })
    .await
}

pub async fn restore(app: AppHandle, config: WebDavConfig) -> Result<String, String> {
    let config_dir = crate::storage::get_config_dir(&app).map_err(|e| e.to_string())?;

    let files = vec![
        ("prompts/prompts.json", "prompts.json"),
        ("settings/llm-config.json", "llm-config.json"),
        ("settings/embedding-config.json", "embedding-config.json"),
        ("settings/webdav-config.json", "webdav-config.json"),
        ("agent-temple/agent-temple.json", "agent-temple.json"),
        ("agent-hub/agent-hub.json", "agent-hub.json"),
        ("agent-hub/rag-index.json", "rag-index.json"),
        ("webchat/webchat-data.json", "webchat-data.json"),
    ];

    with_client(config, move |client, base| {
        let mut restored = 0usize;
        for (remote_rel, local_name) in files {
            let mut remote_path = base.clone();
            remote_path.push(remote_rel);

            if client.stat(&remote_path).is_err() {
                continue;
            }

            let local_path = config_dir.join(local_name);
            let file = std::fs::File::create(&local_path).map_err(|e| e.to_string())?;
            client
                .open_file(&remote_path, Box::new(file))
                .map_err(|e| e.to_string())?;
            restored += 1;
        }
        Ok(format!("Restore ok: {} files", restored))
    })
    .await
}
