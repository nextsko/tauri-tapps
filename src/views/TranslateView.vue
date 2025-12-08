<template>
  <div class="translate-view">
    <div class="header">
      <h1>快捷翻译</h1>
      <p>快速翻译文本，支持多种语言</p>
    </div>

    <div class="main-content">
      <n-card class="translate-card">
        <n-form ref="formRef" :model="translateData" label-placement="top">
          <n-form-item label="源语言">
            <n-select
              v-model:value="translateData.sourceLang"
              :options="langOptions"
              placeholder="选择源语言"
            />
          </n-form-item>

          <n-form-item label="目标语言">
            <n-select
              v-model:value="translateData.targetLang"
              :options="langOptions"
              placeholder="选择目标语言"
            />
          </n-form-item>

          <n-form-item label="输入文本">
            <n-input
              v-model:value="translateData.sourceText"
              type="textarea"
              placeholder="输入要翻译的文本"
              :autosize="{ minRows: 5, maxRows: 10 }"
            />
          </n-form-item>

          <n-form-item>
            <n-button
              type="primary"
              @click="handleTranslate"
              :loading="isTranslating"
              block
            >
              {{ isTranslating ? "翻译中..." : "翻译" }}
            </n-button>
          </n-form-item>
        </n-form>
      </n-card>

      <n-card v-if="translatedText" class="result-card">
        <template #header>
          <div class="result-header">
            <span>翻译结果</span>
            <n-button text type="primary" size="small" @click="copyResult">
              复制
            </n-button>
          </div>
        </template>
        <div class="result-content">{{ translatedText }}</div>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";
import { onMounted, reactive, ref } from "vue";
import { useSettingsStore } from "../stores/settings";
import { promptLLM } from "../utils/llm";

const message = useMessage();
const settingsStore = useSettingsStore();

// 在组件挂载时加载配置
onMounted(async () => {
  if (!settingsStore.isConfigLoaded) {
    try {
      await settingsStore.loadLLMConfig();
    } catch (error) {
      console.error("Failed to load LLM config:", error);
    }
  }
});

const translateData = reactive({
  sourceLang: "英文",
  targetLang: "中文",
  sourceText: "",
});

const translatedText = ref("");
const isTranslating = ref(false);

const langOptions = [
  { label: "中文", value: "中文" },
  { label: "英文", value: "英文" },
  { label: "日文", value: "日文" },
  { label: "韩文", value: "韩文" },
  { label: "法文", value: "法文" },
  { label: "德文", value: "德文" },
  { label: "西班牙文", value: "西班牙文" },
  { label: "俄文", value: "俄文" },
];

const handleTranslate = async () => {
  if (!translateData.sourceText.trim()) {
    message.error("请输入要翻译的文本");
    return;
  }

  if (!settingsStore.llmConfig.apiKey) {
    message.error("请先在设置中配置 API 密钥");
    return;
  }

  isTranslating.value = true;
  translatedText.value = "";

  try {
    const prompt = `请将以下${translateData.sourceLang}文本翻译成${translateData.targetLang}。只需要给出翻译结果即可，无需任何其他回复或解释。

原文：
${translateData.sourceText}`;

    const result = await promptLLM(prompt);
    translatedText.value = result;
    message.success("翻译完成");
  } catch (error) {
    message.error(`翻译失败: ${error}`);
    console.error("Translation error:", error);
  } finally {
    isTranslating.value = false;
  }
};

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(translatedText.value);
    message.success("已复制到剪贴板");
  } catch (err) {
    message.error("复制失败");
  }
};
</script>

<style scoped>
.translate-view {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif;
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

.translate-card,
.result-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  background-color: #ffffff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.8;
  color: #333;
  font-size: 1rem;
}

.n-button {
  border-radius: 8px;
}
</style>
