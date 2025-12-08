import { invoke } from "@tauri-apps/api/core";

/**
 * LLM 配置接口
 */
export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  models: string[];
}

/**
 * 设置 LLM 配置
 * @param config LLM 配置对象
 */
export async function setLLMConfig(config: LLMConfig): Promise<string> {
  const configReq = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    models: Array.isArray(config.models) ? [...config.models] : config.models,
  };
  console.log("setLLMConfig configReq:", configReq);
  return invoke("set_llm_config", { configReq });
}

/**
 * 提示 LLM 模型
 * @param prompt 提示词
 * @returns LLM 的响应
 */
export async function promptLLM(prompt: string): Promise<string> {
  return invoke("prompt_llm", { prompt });
}

/**
 * 使用默认配置提示 LLM
 * 默认配置：
 * - baseUrl: https://api.longcat.chat/openai/v1
 * - models: ["LongCat-Flash-Chat", "LongCat-Flash-Thinking"]
 */
export async function promptLLMWithDefault(prompt: string): Promise<string> {
  return promptLLM(prompt);
}
