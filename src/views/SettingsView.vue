<template>
  <div class="settings-view">
    <div class="header">
      <h1>设置</h1>
      <p>配置应用参数</p>
    </div>

    <div class="main-content">
      <!-- LLM 配置 -->
      <n-card class="settings-card">
        <template #header>
          <span>LLM 配置</span>
        </template>

        <n-form
          ref="llmFormRef"
          :model="llmConfig"
          :rules="llmRules"
          label-placement="left"
          label-width="100"
        >
          <n-form-item label="API 密钥" path="apiKey">
            <n-input
              v-model:value="llmConfig.apiKey"
              type="password"
              placeholder="输入你的 API 密钥"
              show-password-on="click"
            />
          </n-form-item>

          <n-form-item label="基础 URL" path="baseUrl">
            <n-input v-model:value="llmConfig.baseUrl" placeholder="输入 API 基础 URL" />
          </n-form-item>

          <n-form-item label="模型列表" path="models">
            <n-dynamic-input
              v-model:value="llmConfig.models"
              placeholder="输入模型名称"
              @create="() => ''"
            />
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click="handleSaveLLMConfig">
              保存 LLM 配置
            </n-button>
            <n-button @click="handleResetLLMConfig" style="margin-left: 8px">
              重置为默认
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <n-card class="settings-card">
        <template #header>
          <span>嵌入模型 / 向量数据库</span>
        </template>

        <n-form label-placement="left" label-width="120">
          <n-form-item label="服务地址列表">
            <n-dynamic-input
              v-model:value="embeddingCfg.baseUrls"
              placeholder="例如 http://192.168.192.2:11434"
              @create="() => ''"
            />
          </n-form-item>

          <n-form-item label="当前地址">
            <n-select
              v-model:value="embeddingCfg.activeBaseUrl"
              filterable
              placeholder="选择当前 embedding 服务"
              :options="embeddingBaseUrlOptions"
            />
          </n-form-item>

          <n-form-item label="模型">
            <n-input v-model:value="embeddingCfg.model" placeholder="例如 qwen3-embedding:4b" />
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click="handleSaveEmbedding">保存嵌入配置</n-button>
            <n-button @click="handleResetEmbedding" style="margin-left: 8px">重置为默认</n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <!-- 存储配置 -->
      <n-card class="settings-card">
        <template #header>
          <span>存储配置</span>
        </template>

        <n-form label-placement="left" label-width="120">
          <n-form-item label="当前存储目录">
            <n-input :value="currentStorageDir" readonly />
          </n-form-item>

          <n-form-item label="自定义存储目录">
            <n-input
              v-model:value="customStorageDir"
              placeholder="输入自定义存储目录（绝对路径）"
            />
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click="handleSetStorageDir">
              设置存储目录
            </n-button>
            <n-button @click="handleResetStorageDir" style="margin-left: 8px">
              重置为默认
            </n-button>
            <n-button @click="handleRefreshStorageDir" style="margin-left: 8px">
              刷新
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <n-card class="settings-card">
        <template #header>
          <span>WebDAV 备份</span>
        </template>

        <n-form
          :model="webdavConfig"
          label-placement="left"
          label-width="120"
        >
          <n-form-item label="WebDAV URL">
            <n-input v-model:value="webdavConfig.url" placeholder="https://example.com/dav" />
          </n-form-item>
          <n-form-item label="用户名">
            <n-input v-model:value="webdavConfig.username" placeholder="username" />
          </n-form-item>
          <n-form-item label="密码">
            <n-input
              v-model:value="webdavConfig.password"
              type="password"
              placeholder="password"
              show-password-on="click"
            />
          </n-form-item>
          <n-form-item label="根目录">
            <n-input v-model:value="webdavConfig.rootDir" placeholder="可选，例如 backups" />
          </n-form-item>

          <n-form-item>
            <n-button type="primary" @click="handleSaveWebDav">
              保存 WebDAV 配置
            </n-button>
            <n-button
              style="margin-left: 8px"
              @click="handleTestWebDav"
              :loading="isTestingWebDav"
            >
              连接检测
            </n-button>
            <n-button
              style="margin-left: 8px"
              @click="handleBackupWebDav"
              :loading="isBackingUp"
            >
              备份到 WebDAV
            </n-button>
            <n-button
              style="margin-left: 8px"
              @click="handleRestoreWebDav"
              :loading="isRestoring"
            >
              从 WebDAV 恢复
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { resetStorageDir } from '../utils/storage';
import { saveJSON } from '../utils/storage';
import { backupToWebDav, restoreFromWebDav, testWebDav } from '../utils/webdav';

const message = useMessage();
const settingsStore = useSettingsStore();
const llmFormRef = ref<any>(null);

const llmConfig = reactive({
  apiKey: '',
  baseUrl: 'https://api.longcat.chat/openai/v1',
  models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
});

const embeddingCfg = reactive({
  provider: 'ollama' as const,
  baseUrls: ['http://192.168.192.2:11434', 'http://192.168.192.3:11434'],
  activeBaseUrl: 'http://192.168.192.2:11434',
  model: 'qwen3-embedding:4b',
  vectorStore: 'local-json' as const,
});

const embeddingBaseUrlOptions = computed(() =>
  embeddingCfg.baseUrls
    .filter((u) => typeof u === 'string' && u.trim())
    .map((u) => ({ label: u, value: u }))
);

const currentStorageDir = ref('');
const customStorageDir = ref('');

const webdavConfig = reactive({
  url: '',
  username: '',
  password: '',
  rootDir: '',
});

const isTestingWebDav = ref(false);
const isBackingUp = ref(false);
const isRestoring = ref(false);

const llmRules = {
  apiKey: {
    required: true,
    message: '请输入 API 密钥',
    trigger: ['blur', 'input'],
  },
  baseUrl: {
    required: true,
    message: '请输入基础 URL',
    trigger: ['blur', 'input'],
  },
};

const handleSaveWebDav = async () => {
  try {
    const payload = {
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      rootDir: webdavConfig.rootDir,
    };

    await saveJSON('webdav-config.json', payload);

    if ((settingsStore as any).webdavConfig) {
      (settingsStore as any).webdavConfig = payload;
    }

    message.success('WebDAV 配置已保存');
  } catch (error) {
    message.error(`保存失败: ${error}`);
  }
};

const handleTestWebDav = async () => {
  isTestingWebDav.value = true;
  try {
    const res = await testWebDav({
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      rootDir: webdavConfig.rootDir,
    });
    message.success(res);
  } catch (error) {
    message.error(`连接检测失败: ${error}`);
  } finally {
    isTestingWebDav.value = false;
  }
};

const handleBackupWebDav = async () => {
  isBackingUp.value = true;
  try {
    const res = await backupToWebDav({
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      rootDir: webdavConfig.rootDir,
    });
    message.success(res);
  } catch (error) {
    message.error(`备份失败: ${error}`);
  } finally {
    isBackingUp.value = false;
  }
};

const handleRestoreWebDav = async () => {
  const confirmed = confirm('将从 WebDAV 覆盖本地配置文件，确定继续？');
  if (!confirmed) return;

  isRestoring.value = true;
  try {
    const res = await restoreFromWebDav({
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      rootDir: webdavConfig.rootDir,
    });
    message.success(res);
    message.info('恢复完成后建议重启应用以重新加载配置');
  } catch (error) {
    message.error(`恢复失败: ${error}`);
  } finally {
    isRestoring.value = false;
  }
};

const handleSaveLLMConfig = (e: MouseEvent) => {
  e.preventDefault();
  llmFormRef.value?.validate((errors: any) => {
    if (!errors) {
      settingsStore
        .setLLM({
          baseUrl: llmConfig.baseUrl,
          apiKey: llmConfig.apiKey,
          models: [...llmConfig.models],
        })
        .then(() => {
          message.success('LLM 配置已保存！');
        })
        .catch((err) => {
          message.error(`配置失败: ${err}`);
        });
    } else {
      message.error('请填写完整的配置信息');
    }
  });
};

const handleResetLLMConfig = () => {
  llmConfig.apiKey = '';
  llmConfig.baseUrl = 'https://api.longcat.chat/openai/v1';
  llmConfig.models = ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'];
  message.info('已重置为默认配置');
};

const handleSaveEmbedding = async (e: MouseEvent) => {
  e.preventDefault();
  try {
    const baseUrls = embeddingCfg.baseUrls
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter((u) => u);

    const activeBaseUrl = (embeddingCfg.activeBaseUrl || baseUrls[0] || '').trim();
    if (!activeBaseUrl) {
      message.error('请选择或填写当前地址');
      return;
    }

    if (!embeddingCfg.model.trim()) {
      message.error('请输入模型名称');
      return;
    }

    await settingsStore.setEmbedding({
      provider: 'ollama',
      baseUrls,
      activeBaseUrl,
      model: embeddingCfg.model.trim(),
      vectorStore: 'local-json',
    });
    message.success('嵌入配置已保存');
  } catch (error) {
    message.error(`保存失败: ${error}`);
  }
};

const handleResetEmbedding = () => {
  embeddingCfg.baseUrls = ['http://192.168.192.2:11434', 'http://192.168.192.3:11434'];
  embeddingCfg.activeBaseUrl = 'http://192.168.192.2:11434';
  embeddingCfg.model = 'qwen3-embedding:4b';
  message.info('已重置为默认嵌入配置');
};

const handleSetStorageDir = async () => {
  if (!customStorageDir.value.trim()) {
    message.error('请输入存储目录');
    return;
  }

  try {
    const result = await settingsStore.setStorage(customStorageDir.value);
    currentStorageDir.value = result;
    message.success('存储目录已设置');
  } catch (error) {
    message.error(`设置失败: ${error}`);
  }
};

const handleResetStorageDir = async () => {
  try {
    const result = await resetStorageDir();
    currentStorageDir.value = result;
    customStorageDir.value = '';
    message.success('已重置为默认存储目录');
  } catch (error) {
    message.error(`重置失败: ${error}`);
  }
};

const handleRefreshStorageDir = async () => {
  try {
    const dir = await settingsStore.getStorage();
    currentStorageDir.value = dir;
    message.success('已刷新');
  } catch (error) {
    message.error(`刷新失败: ${error}`);
  }
};

onMounted(async () => {
  // 加载当前存储目录
  try {
    const dir = await settingsStore.getStorage();
    currentStorageDir.value = dir;
  } catch (error) {
    console.error('Failed to load storage dir:', error);
  }

  // 加载 LLM 配置
  try {
    if (!settingsStore.isConfigLoaded) {
      await settingsStore.loadLLMConfig();
    }
    llmConfig.apiKey = settingsStore.llmConfig.apiKey;
    llmConfig.baseUrl = settingsStore.llmConfig.baseUrl;
    llmConfig.models = [...settingsStore.llmConfig.models];
  } catch (error) {
    console.error('Failed to load LLM config:', error);
  }

  // 加载嵌入配置
  try {
    const cfg = await settingsStore.loadEmbeddingConfig();
    embeddingCfg.baseUrls = [...cfg.baseUrls];
    embeddingCfg.activeBaseUrl = cfg.activeBaseUrl;
    embeddingCfg.model = cfg.model;
  } catch (error) {
    console.error('Failed to load embedding config:', error);
  }

  // 加载 WebDAV 配置
  try {
    const cfg = await settingsStore.loadWebDavConfig();
    webdavConfig.url = cfg.url;
    webdavConfig.username = cfg.username;
    webdavConfig.password = cfg.password;
    webdavConfig.rootDir = cfg.rootDir;
  } catch (error) {
    console.error('Failed to load WebDAV config:', error);
  }
});
</script>

<style scoped>
.settings-view {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #f0f2f5;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin: 0;
}

.header p {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin-top: 8px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 800px;
}

.settings-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  background-color: #ffffff;
}

.n-button {
  border-radius: 8px;
}
</style>
