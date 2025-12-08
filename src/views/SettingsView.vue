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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { useSettingsStore } from '../stores/settings';
import { resetStorageDir } from '../utils/storage';

const message = useMessage();
const settingsStore = useSettingsStore();
const llmFormRef = ref<any>(null);

const llmConfig = reactive({
  apiKey: '',
  baseUrl: 'https://api.longcat.chat/openai/v1',
  models: ['LongCat-Flash-Chat', 'LongCat-Flash-Thinking'],
});

const currentStorageDir = ref('');
const customStorageDir = ref('');

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
