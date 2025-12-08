use tauri::AppHandle;

mod storage;
use storage::StorageState;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_config_dir(app: AppHandle) -> Result<String, String> {
    storage::get_config_dir(&app)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn save_data(app: AppHandle, filename: &str, data: &str) -> Result<String, String> {
    storage::save_data(&app, filename, data)
}

#[tauri::command]
fn load_data(app: AppHandle, filename: &str) -> Result<String, String> {
    storage::load_data(&app, filename)
}

#[tauri::command]
fn set_storage_dir(app: AppHandle, dir_path: &str) -> Result<String, String> {
    storage::set_custom_dir(&app, dir_path)
}

#[tauri::command]
fn get_storage_dir(app: AppHandle) -> Result<String, String> {
    storage::get_current_dir(&app)
}

#[tauri::command]
fn reset_storage_dir(app: AppHandle) -> Result<String, String> {
    storage::reset_to_default(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(StorageState {
            custom_dir: std::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_config_dir,
            save_data,
            load_data,
            set_storage_dir,
            get_storage_dir,
            reset_storage_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
