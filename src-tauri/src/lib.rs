use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};

mod storage;
mod llm;
mod web_scraper;

use storage::StorageState;
use llm::{LLMConfig, ChatMessage};

/// LLM 配置请求
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LLMConfigRequest {
    pub base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
}

/// LLM 全局配置状态
pub struct LLMState {
    pub config: Mutex<LLMConfig>,
}

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

#[tauri::command]
async fn set_llm_config(
    app: AppHandle,
    config_req: LLMConfigRequest,
) -> Result<String, String> {    
    let llm_state = app.state::<LLMState>();
    let mut config = llm_state.config.lock().await;
    config.base_url = config_req.base_url;
    config.api_key = config_req.api_key;
    config.models = config_req.models;
    Ok("LLM config updated".to_string())
}

#[tauri::command]
async fn prompt_llm(app: AppHandle, prompt: String) -> Result<String, String> {
    let llm_state = app.state::<LLMState>();
    let config = llm_state.config.lock().await.clone();

    let response = llm::prompt_model(&config, &prompt).await;
    Ok(response)
}

#[tauri::command]
async fn chat_with_context(
    app: AppHandle,
    model: String,
    context: String,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let llm_state = app.state::<LLMState>();
    let config = llm_state.config.lock().await.clone();

    let response = llm::chat_with_context(&config, &model, &context, messages).await;
    Ok(response)
}

#[tauri::command]
async fn fetch_url_to_markdown(url: String) -> Result<String, String> {
    web_scraper::fetch_and_convert_to_markdown(&url).await
}

#[tauri::command]
fn convert_html_to_markdown(html: String) -> Result<String, String> {
    Ok(web_scraper::html_to_markdown(&html))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(StorageState {
            custom_dir: std::sync::Mutex::new(None),
        })
        .manage(LLMState {
            config: Mutex::new(LLMConfig::default()),
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_config_dir,
            save_data,
            load_data,
            set_storage_dir,
            get_storage_dir,
            reset_storage_dir,
            set_llm_config,
            prompt_llm,
            chat_with_context,
            fetch_url_to_markdown,
            convert_html_to_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
