import { defineStore } from 'pinia';
import { ref } from 'vue';
import { setLLMConfig, type LLMConfig } from '../utils/llm';
import { setStorageDir, getStorageDir, saveJSON, loadJSON } from '../utils/storage';

const LLM_CONFIG_FILE = 'llm-config.json';

export const useSettingsStore = defineStore('settings', () => {
  // LLM 配置
  const llmConfig = ref<LLMConfig>({
    baseUrl: 'https://api.longcat.chat/openai/v1',
    apiKey: '',
    models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
  });

  // 存储目录
  const storageDir = ref<string>('');

  // 是否已加载配置
  const isConfigLoaded = ref(false);

  // 从文件加载 LLM 配置
  const loadLLMConfig = async () => {
    try {
      const config = await loadJSON(LLM_CONFIG_FILE);
      llmConfig.value = {
        baseUrl: config.baseUrl || 'https://api.longcat.chat/openai/v1',
        apiKey: config.apiKey || '',
        models: config.models || ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
      };
      // 同步到后端
      await setLLMConfig(llmConfig.value);
      isConfigLoaded.value = true;
      return llmConfig.value;
    } catch (error) {
      console.log('No saved LLM config found, using defaults');
      isConfigLoaded.value = true;
      return llmConfig.value;
    }
  };

  // 保存 LLM 配置到文件
  const saveLLMConfig = async (config: LLMConfig) => {
    try {
      await saveJSON(LLM_CONFIG_FILE, config);
    } catch (error) {
      console.error('Failed to save LLM config:', error);
      throw error;
    }
  };

  // 设置 LLM 配置
  const setLLM = async (config: LLMConfig) => {
    // 先保存到后端
    await setLLMConfig(config);
    // 更新本地状态
    llmConfig.value = { ...config };
    // 持久化到文件
    await saveLLMConfig(config);
  };

  // 设置存储目录
  const setStorage = async (dir: string) => {
    const result = await setStorageDir(dir);
    storageDir.value = result;
    return result;
  };

  // 获取当前存储目录
  const getStorage = async () => {
    const dir = await getStorageDir();
    storageDir.value = dir;
    return dir;
  };

  return {
    llmConfig,
    storageDir,
    isConfigLoaded,
    loadLLMConfig,
    saveLLMConfig,
    setLLM,
    setStorage,
    getStorage,
  };
}, {
  persist: {
    pick: ['storageDir'],
  },
});
