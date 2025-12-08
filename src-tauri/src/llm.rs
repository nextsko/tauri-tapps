use rig::completion::Prompt;
use rig::providers::openai;
use rig::client::CompletionClient;

/// LLM 配置
#[derive(Clone)]
pub struct LLMConfig {
    pub base_url: String,
    pub api_key: String,
    pub models: Vec<String>,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            base_url: "https://api.longcat.chat/openai/v1".to_string(),
            api_key: String::new(),
            models: vec![
                "LongCat-Flash-Chat".to_string(),
                "LongCat-Flash-Thinking".to_string(),
            ],
        }
    }
}

/// 提示 LLM 模型
pub async fn prompt_model(config: &LLMConfig, prompt: &str) -> String {
    if config.api_key.is_empty() {
        return "Error: API key not configured".to_string();
    }

    let client = openai::Client::builder(&config.api_key)
        .base_url(&config.base_url)
        .build();

    let last_model_index = config.models.len().saturating_sub(1);

    for (index, model_name) in config.models.iter().enumerate() {
        let agent = client
            .completion_model(model_name)
            .completions_api()
            .into_agent_builder()
            .build();

        match agent.prompt(prompt).await {
            Ok(response) => return response,
            Err(e) => {
                if index == last_model_index {
                    return format!("Error prompting model with all attempts: {}", e);
                }
                continue;
            }
        }
    }

    "All model attempts failed".to_string()
}


