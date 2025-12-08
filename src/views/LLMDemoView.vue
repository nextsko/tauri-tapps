<template>
  <n-message-provider>
    <div class="llm-demo">
      <div class="header">
        <h1>LLM 演示</h1>
        <p>配置并测试 LLM 模型</p>
      </div>

      <div class="main-content">
        <!-- 配置卡片 -->
        <n-card class="config-card">
          <template #header>
            <span>LLM 配置</span>
          </template>

          <n-form
            ref="configFormRef"
            :model="llmConfig"
            :rules="configRules"
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
              <n-input
                v-model:value="llmConfig.baseUrl"
                placeholder="输入 API 基础 URL"
              />
            </n-form-item>

            <n-form-item label="模型列表" path="models">
              <n-dynamic-input
                v-model:value="llmConfig.models"
                placeholder="输入模型名称"
                @create="() => ''"
              />
            </n-form-item>

            <n-form-item>
              <n-button type="primary" @click="handleSetConfig">
                保存配置
              </n-button>
              <n-button @click="handleResetConfig" style="margin-left: 8px">
                重置为默认
              </n-button>
            </n-form-item>
          </n-form>
        </n-card>

        <!-- 提示词卡片 -->
        <n-card class="prompt-card">
          <template #header>
            <span>提示 LLM</span>
          </template>

          <n-form
            ref="promptFormRef"
            :model="promptData"
            :rules="promptRules"
            label-placement="left"
            label-width="80"
          >
            <n-form-item label="提示词" path="prompt">
              <n-input
                v-model:value="promptData.prompt"
                type="textarea"
                placeholder="输入你的提示词"
                :autosize="{
                  minRows: 4,
                  maxRows: 8,
                }"
              />
            </n-form-item>

            <n-form-item>
              <n-button
                type="primary"
                @click="handlePrompt"
                :loading="isLoading"
              >
                {{ isLoading ? "等待响应..." : "发送提示" }}
              </n-button>
            </n-form-item>
          </n-form>

          <!-- 响应显示 -->
          <div v-if="response" class="response-container">
            <n-divider />
            <div class="response-header">
              <span>LLM 响应</span>
              <n-button text type="primary" size="small" @click="copyResponse">
                复制
              </n-button>
            </div>
            <n-alert
              :type="responseType"
              :title="responseTitle"
              closable
              @close="response = ''"
            >
              <div class="response-content">{{ response }}</div>
            </n-alert>
          </div>
        </n-card>
      </div>
    </div>
  </n-message-provider>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";
import { reactive, ref } from "vue";
import { promptLLM, setLLMConfig } from "../utils/llm";

const message = useMessage();
const configFormRef = ref<any>(null);
const promptFormRef = ref<any>(null);

const llmConfig = reactive({
  apiKey: "",
  baseUrl: "https://api.longcat.chat/openai/v1",
  models: ["LongCat-Flash-Chat", "LongCat-Flash-Thinking"],
});

const promptData = reactive({
  prompt: "",
});

const response = ref("");
const isLoading = ref(false);
const responseType = ref<"success" | "error">("success");
const responseTitle = ref("");

const configRules = {
  apiKey: {
    required: true,
    message: "请输入 API 密钥",
    trigger: ["blur", "input"],
  },
  baseUrl: {
    required: true,
    message: "请输入基础 URL",
    trigger: ["blur", "input"],
  },
};

const promptRules = {
  prompt: {
    required: true,
    message: "请输入提示词",
    trigger: ["blur", "input"],
  },
};

const handleSetConfig = (e: MouseEvent) => {
  e.preventDefault();
  configFormRef.value?.validate((errors: any) => {
    if (!errors) {
      const params = {
        base_url: llmConfig.baseUrl,
        api_key: llmConfig.apiKey,
        models: llmConfig.models,
      };
      console.log("Sending params:", params);

      setLLMConfig({
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        models: llmConfig.models,
      })
        .then(() => {
          message.success("LLM 配置已保存！");
        })
        .catch((err) => {
          message.error(`配置失败: ${err}`);
        });
    } else {
      message.error("请填写完整的配置信息");
    }
  });
};

const handleResetConfig = () => {
  llmConfig.apiKey = "";
  llmConfig.baseUrl = "https://api.longcat.chat/openai/v1";
  llmConfig.models = ["LongCat-Flash-Chat", "LongCat-Flash-Thinking"];
  message.info("已重置为默认配置");
};

const handlePrompt = (e: MouseEvent) => {
  e.preventDefault();
  promptFormRef.value?.validate((errors: any) => {
    if (!errors) {
      if (!llmConfig.apiKey) {
        message.error("请先配置 API 密钥");
        return;
      }

      isLoading.value = true;
      response.value = "";

      promptLLM(promptData.prompt)
        .then((res) => {
          response.value = res;
          if (res.includes("Error")) {
            responseType.value = "error";
            responseTitle.value = "错误";
          } else {
            responseType.value = "success";
            responseTitle.value = "成功";
          }
        })
        .catch((err) => {
          response.value = `请求失败: ${err}`;
          responseType.value = "error";
          responseTitle.value = "错误";
          message.error("请求失败");
        })
        .finally(() => {
          isLoading.value = false;
        });
    } else {
      message.error("请输入提示词");
    }
  });
};

const copyResponse = async () => {
  try {
    await navigator.clipboard.writeText(response.value);
    message.success("已复制到剪贴板");
  } catch (err) {
    message.error("复制失败");
  }
};
</script>

<style scoped>
.llm-demo {
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
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
  width: 100%;
  max-width: 900px;
}

@media (min-width: 768px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }
}

.config-card,
.prompt-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  background-color: #ffffff;
}

.response-container {
  margin-top: 20px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #2c3e50;
}

.response-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  color: #333;
}

.n-button {
  border-radius: 8px;
}
</style>
