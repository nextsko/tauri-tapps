import { defineStore } from 'pinia';
import { ref } from 'vue';
import { setLLMConfig, type LLMConfig } from '../utils/llm';
import { setStorageDir, getStorageDir, saveJSON, loadJSON } from '../utils/storage';
import { embedTextWithFallback } from '../utils/embedding';

const LLM_CONFIG_FILE = 'llm-config.json';
const EMBEDDING_CONFIG_FILE = 'embedding-config.json';
const WEBDAV_CONFIG_FILE = 'webdav-config.json';

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  rootDir: string;
}

export interface EmbeddingConfig {
  provider: 'ollama';
  baseUrls: string[];
  activeBaseUrl: string;
  model: string;
  vectorStore: 'local-json';
}

export const useSettingsStore = defineStore('settings', () => {
  // LLM 配置
  const llmConfig = ref<LLMConfig>({
    baseUrl: 'https://api.longcat.chat/openai/v1',
    apiKey: '',
    models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
  });

  const embeddingConfig = ref<EmbeddingConfig>({
    provider: 'ollama',
    baseUrls: ['http://192.168.192.2:11434', 'http://192.168.192.3:11434'],
    activeBaseUrl: 'http://192.168.192.2:11434',
    model: 'qwen3-embedding:4b',
    vectorStore: 'local-json',
  });

  // WebDAV 配置
  const webdavConfig = ref<WebDavConfig>({
    url: '',
    username: '',
    password: '',
    rootDir: '',
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

  const loadEmbeddingConfig = async () => {
    try {
      const config = await loadJSON(EMBEDDING_CONFIG_FILE);
      const baseUrls = Array.isArray(config.baseUrls)
        ? config.baseUrls.filter((u: unknown) => typeof u === 'string')
        : embeddingConfig.value.baseUrls;

      const activeBaseUrl =
        typeof config.activeBaseUrl === 'string' && config.activeBaseUrl.trim()
          ? config.activeBaseUrl
          : baseUrls[0] || embeddingConfig.value.activeBaseUrl;

      embeddingConfig.value = {
        provider: 'ollama',
        baseUrls,
        activeBaseUrl,
        model: typeof config.model === 'string' && config.model.trim() ? config.model : embeddingConfig.value.model,
        vectorStore: 'local-json',
      };

      return embeddingConfig.value;
    } catch (error) {
      console.log('No saved embedding config found, using defaults');
      return embeddingConfig.value;
    }
  };

  // 从文件加载 WebDAV 配置
  const loadWebDavConfig = async () => {
    try {
      const config = await loadJSON(WEBDAV_CONFIG_FILE);
      webdavConfig.value = {
        url: config.url || '',
        username: config.username || '',
        password: config.password || '',
        rootDir: config.rootDir || '',
      };
      return webdavConfig.value;
    } catch (error) {
      console.log('No saved WebDAV config found, using defaults');
      return webdavConfig.value;
    }
  };

  // 保存 WebDAV 配置到文件
  const saveWebDavConfig = async (config: WebDavConfig) => {
    try {
      await saveJSON(WEBDAV_CONFIG_FILE, config);
    } catch (error) {
      console.error('Failed to save WebDAV config:', error);
      throw error;
    }
  };

  // 设置 WebDAV 配置
  const setWebDav = async (config: WebDavConfig) => {
    webdavConfig.value = { ...config };
    await saveWebDavConfig(config);
  };

  const saveWebDav = async (config: WebDavConfig) => {
    await setWebDav(config);
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

  const saveEmbeddingConfig = async (config: EmbeddingConfig) => {
    try {
      await saveJSON(EMBEDDING_CONFIG_FILE, config);
    } catch (error) {
      console.error('Failed to save embedding config:', error);
      throw error;
    }
  };

  const setEmbedding = async (config: EmbeddingConfig) => {
    embeddingConfig.value = { ...config };
    await saveEmbeddingConfig(config);
  };

  const testEmbedding = async (text: string) => {
    const cfg = embeddingConfig.value;
    const result = await embedTextWithFallback(
      {
        model: cfg.model,
        prompt: text,
      },
      {
        baseUrls: cfg.baseUrls,
        activeBaseUrl: cfg.activeBaseUrl,
      }
    );

    if (result.usedBaseUrl !== cfg.activeBaseUrl) {
      embeddingConfig.value = { ...cfg, activeBaseUrl: result.usedBaseUrl };
      await saveEmbeddingConfig(embeddingConfig.value);
    }

    return result;
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
    embeddingConfig,
    webdavConfig,
    storageDir,
    isConfigLoaded,
    loadLLMConfig,
    loadEmbeddingConfig,
    loadWebDavConfig,
    saveLLMConfig,
    saveEmbeddingConfig,
    saveWebDavConfig,
    setLLM,
    setEmbedding,
    testEmbedding,
    setWebDav,
    saveWebDav,
    setStorage,
    getStorage,
  };
}, {
  persist: {
    key: 'settings-v2',
    pick: ['storageDir'],
  },
});
