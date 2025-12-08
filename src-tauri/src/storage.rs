use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

/// 全局存储目录状态
pub struct StorageState {
    pub custom_dir: Mutex<Option<PathBuf>>,
}

/// 获取应用配置目录
/// 如果设置了自定义目录，使用自定义目录    
/// 否则使用默认的应用配置目录
/// Windows: C:\Users\[username]\AppData\Roaming\chat-app
/// macOS: /Users/[username]/Library/Application Support/chat-app
/// Linux: /home/[username]/.config/chat-app
pub fn get_config_dir(app: &AppHandle) -> Result<PathBuf, std::io::Error> {
    let storage_state = app.state::<StorageState>();
    let custom_dir = storage_state.custom_dir.lock().unwrap();

    let config_dir = if let Some(dir) = custom_dir.as_ref() {
        dir.clone()
    } else {
        app.path()
            .app_config_dir()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?
    };

    // 确保目录存在
    fs::create_dir_all(&config_dir)?;

    Ok(config_dir)
}

/// 设置自定义存储目录
pub fn set_custom_dir(app: &AppHandle, dir_path: &str) -> Result<String, String> {
    let path = PathBuf::from(dir_path);

    // 验证路径是否有效
    if !path.is_absolute() {
        return Err("路径必须是绝对路径".to_string());
    }

    // 创建目录
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;

    let storage_state = app.state::<StorageState>();
    *storage_state.custom_dir.lock().unwrap() = Some(path.clone());

    Ok(path.to_string_lossy().to_string())
}

/// 获取当前存储目录
pub fn get_current_dir(app: &AppHandle) -> Result<String, String> {
    let config_dir = get_config_dir(app).map_err(|e| e.to_string())?;
    Ok(config_dir.to_string_lossy().to_string())
}

/// 重置为默认存储目录
pub fn reset_to_default(app: &AppHandle) -> Result<String, String> {
    let storage_state = app.state::<StorageState>();
    *storage_state.custom_dir.lock().unwrap() = None;

    let config_dir = get_config_dir(app).map_err(|e| e.to_string())?;
    Ok(config_dir.to_string_lossy().to_string())
}

/// 保存数据到文件
pub fn save_data(app: &AppHandle, filename: &str, data: &str) -> Result<String, String> {
    let config_dir = get_config_dir(app).map_err(|e| e.to_string())?;
    let file_path = config_dir.join(filename);

    fs::write(&file_path, data).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 读取数据文件
pub fn load_data(app: &AppHandle, filename: &str) -> Result<String, String> {
    let config_dir = get_config_dir(app).map_err(|e| e.to_string())?;
    let file_path = config_dir.join(filename);

    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}
