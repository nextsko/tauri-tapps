<template>
  <div class="web-chat-container">
    <n-layout has-sider>
      <!-- 侧边栏：已解析的网页列表 -->
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed-width="0"
        :width="280"
        show-trigger="arrow-circle"
        content-style="padding: 16px;"
      >
        <n-space vertical :size="12">
          <n-text strong>已解析网页 ({{ parsedUrls.length }})</n-text>

          <n-button type="primary" block @click="showAddUrlModal = true">
            <template #icon>
              <n-icon><AddOutline /></n-icon>
            </template>
            添加网页
          </n-button>

          <n-button
            type="error"
            block
            secondary
            @click="handleClearUrls"
            :disabled="parsedUrls.length === 0"
          >
            清空列表
          </n-button>

          <n-divider style="margin: 8px 0" />

          <n-scrollbar style="max-height: calc(100vh - 240px)">
            <n-space vertical :size="8">
              <n-card
                v-for="parsed in parsedUrls"
                :key="parsed.id"
                size="small"
                :title="getUrlTitle(parsed.url)"
              >
                <template #header-extra>
                  <n-button
                    text
                    type="error"
                    @click="removeParsedUrl(parsed.id)"
                  >
                    <template #icon>
                      <n-icon><CloseOutline /></n-icon>
                    </template>
                  </n-button>
                </template>

                <n-space vertical :size="4">
                  <n-tag
                    :type="
                      parsed.status === 'success'
                        ? 'success'
                        : parsed.status === 'error'
                        ? 'error'
                        : 'info'
                    "
                    size="small"
                  >
                    {{
                      parsed.status === "success"
                        ? "成功"
                        : parsed.status === "error"
                        ? "失败"
                        : "解析中"
                    }}
                  </n-tag>

                  <n-ellipsis
                    style="max-width: 200px; font-size: 12px; color: #999"
                  >
                    {{ parsed.url }}
                  </n-ellipsis>

                  <n-text
                    v-if="parsed.error"
                    type="error"
                    depth="3"
                    style="font-size: 12px"
                  >
                    {{ parsed.error }}
                  </n-text>

                  <n-text
                    v-else-if="parsed.markdown"
                    depth="3"
                    style="font-size: 12px"
                  >
                    {{ parsed.markdown.length }} 字符
                  </n-text>
                </n-space>
              </n-card>
            </n-space>
          </n-scrollbar>
        </n-space>
      </n-layout-sider>

      <!-- 主聊天区域 -->
      <n-layout-content
        content-style="padding: 16px; display: flex; flex-direction: column; height: 100vh;"
      >
        <!-- 顶部工具栏 -->
        <n-space
          justify="space-between"
          align="center"
          style="margin-bottom: 16px"
        >
          <n-space align="center">
            <n-text strong>网页智能对话</n-text>
            <n-button text type="info" @click="showHtmlModal = true">
              <template #icon>
                <n-icon><CodeOutline /></n-icon>
              </template>
              HTML转Markdown
            </n-button>
          </n-space>

          <n-space align="center">
            <n-select
              v-model:value="currentModel"
              :options="modelOptions"
              placeholder="选择模型"
              style="width: 240px"
            />
            <n-button secondary type="warning" @click="handleClearChat">
              清空对话
            </n-button>
          </n-space>
        </n-space>

        <!-- 消息列表 -->
        <n-scrollbar ref="scrollbarRef" style="flex: 1; margin-bottom: 16px">
          <n-space vertical :size="12">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message-item', msg.role]"
              @contextmenu.prevent="(e) => handleContextMenu(e, msg.id)"
            >
              <n-card
                size="small"
                :bordered="false"
                :content-style="{
                  backgroundColor:
                    msg.role === 'user'
                      ? '#e3f2fd'
                      : msg.role === 'assistant'
                      ? '#f5f5f5'
                      : '#fff3e0',
                  padding: '12px',
                }"
              >
                <n-space vertical :size="4">
                  <n-text strong>
                    {{
                      msg.role === "user"
                        ? "你"
                        : msg.role === "assistant"
                        ? "AI"
                        : "系统"
                    }}
                  </n-text>
                  <MarkdownRenderer
                    v-if="msg.role === 'assistant'"
                    :content="msg.content"
                  />
                  <n-text
                    v-else
                    style="white-space: pre-wrap; word-break: break-word"
                  >
                    {{ msg.content }}
                  </n-text>
                  <n-text depth="3" style="font-size: 12px">
                    {{ formatTime(msg.timestamp) }}
                  </n-text>
                </n-space>
              </n-card>
            </div>
          </n-space>
        </n-scrollbar>

        <!-- 输入区域 -->
        <n-space vertical :size="8">
          <n-input
            v-model:value="userInput"
            type="textarea"
            placeholder="输入你的问题..."
            :autosize="{ minRows: 2, maxRows: 6 }"
            @keydown.ctrl.enter="handleSend"
          />
          <n-space justify="space-between">
            <n-text depth="3" style="font-size: 12px">
              Ctrl + Enter 发送
            </n-text>
            <n-button
              type="primary"
              :loading="isLoading"
              :disabled="!userInput.trim() || !currentModel"
              @click="handleSend"
            >
              发送
            </n-button>
          </n-space>
        </n-space>
      </n-layout-content>
    </n-layout>

    <!-- 添加 URL 模态框 -->
    <n-modal
      v-model:show="showAddUrlModal"
      preset="dialog"
      title="添加网页"
      positive-text="解析"
      negative-text="取消"
      @positive-click="handleAddUrl"
    >
      <n-space vertical :size="12">
        <n-input v-model:value="newUrl" placeholder="输入网页 URL" clearable />
        <n-text depth="3" style="font-size: 12px">
          支持添加多个网页，解析后的内容将作为 AI 对话的上下文
        </n-text>
      </n-space>
    </n-modal>

    <!-- HTML 转 Markdown 模态框 -->
    <n-modal
      v-model:show="showHtmlModal"
      preset="card"
      title="HTML 转 Markdown"
      style="width: 800px"
    >
      <n-space vertical :size="12">
        <n-tabs type="line">
          <n-tab-pane name="html" tab="HTML 输入">
            <n-input
              v-model:value="htmlInput"
              type="textarea"
              placeholder="粘贴 HTML 代码..."
              :autosize="{ minRows: 10, maxRows: 20 }"
            />
          </n-tab-pane>

          <n-tab-pane name="url" tab="URL 输入">
            <n-space vertical :size="8">
              <n-input
                v-model:value="convertUrl"
                placeholder="输入网页 URL"
                clearable
              />
              <n-button
                type="primary"
                :loading="isConverting"
                @click="handleConvertUrl"
              >
                获取并转换
              </n-button>
            </n-space>
          </n-tab-pane>
        </n-tabs>

        <n-divider />

        <n-space vertical :size="8">
          <n-space justify="space-between">
            <n-text strong>Markdown 输出</n-text>
            <n-button
              secondary
              size="small"
              @click="handleCopyMarkdown"
              :disabled="!markdownOutput"
            >
              复制
            </n-button>
          </n-space>
          <n-input
            v-model:value="markdownOutput"
            type="textarea"
            placeholder="转换结果将显示在这里..."
            :autosize="{ minRows: 10, maxRows: 20 }"
            readonly
          />
        </n-space>

        <n-button
          type="primary"
          block
          :loading="isConverting"
          @click="handleConvertHtml"
          :disabled="!htmlInput"
        >
          转换为 Markdown
        </n-button>
      </n-space>
    </n-modal>

    <!-- 右键菜单 -->
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextMenuX"
      :y="contextMenuY"
      :options="contextMenuOptions"
      :show="showContextMenu"
      :on-clickoutside="handleClickOutside"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { AddOutline, CloseOutline, CodeOutline, CopyOutline, TrashOutline } from "@vicons/ionicons5";
import { NIcon, useMessage } from "naive-ui";
import { storeToRefs } from "pinia";
import { computed, h, nextTick, onMounted, ref, watch } from "vue";
import MarkdownRenderer from "../components/MarkdownRenderer.vue";
import { useSettingsStore } from "../stores/settings";
import { useWebChatStore } from "../stores/webChat";

const webChatStore = useWebChatStore();
const settingsStore = useSettingsStore();
const message = useMessage();

const { messages, parsedUrls, currentModel, isLoading } =
  storeToRefs(webChatStore);

const userInput = ref("");
const scrollbarRef = ref();
const showAddUrlModal = ref(false);
const showHtmlModal = ref(false);
const newUrl = ref("");
const htmlInput = ref("");
const convertUrl = ref("");
const markdownOutput = ref("");
const isConverting = ref(false);

// 右键菜单相关
const showContextMenu = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const currentMessageId = ref<string>("");

// 右键菜单选项
const contextMenuOptions = computed(() => [
  {
    label: "复制",
    key: "copy",
    icon: () => h(NIcon, null, { default: () => h(CopyOutline) }),
  },
  {
    label: "删除",
    key: "delete",
    icon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
  },
]);

// 模型选项
const modelOptions = computed(() => {
  return settingsStore.llmConfig.models.map((model) => ({
    label: model,
    value: model,
  }));
});

// 初始化
onMounted(async () => {
  await settingsStore.loadLLMConfig();
  if (modelOptions.value.length > 0) {
    currentModel.value = modelOptions.value[0].value;
  }
});

// 监听消息变化，自动滚动到底部
watch(messages, async () => {
  await nextTick();
  scrollbarRef.value?.scrollTo({
    top: scrollbarRef.value.$el.scrollHeight,
    behavior: "smooth",
  });
});

/**
 * 发送消息
 */
async function handleSend() {
  if (!userInput.value.trim() || !currentModel.value) return;

  const userMessage = userInput.value.trim();
  userInput.value = "";

  webChatStore.addMessage("user", userMessage);
  isLoading.value = true;

  try {
    // 构建完整上下文
    const context = webChatStore.buildContext();
    const chatHistory = webChatStore.getChatHistory();

    // 调用后端 LLM
    const response = await invoke<string>("chat_with_context", {
      model: currentModel.value,
      context,
      messages: chatHistory,
    });

    webChatStore.addMessage("assistant", response);
  } catch (error) {
    message.error(`对话失败: ${error}`);
    webChatStore.addMessage("system", `错误: ${error}`);
  } finally {
    isLoading.value = false;
  }
}

/**
 * 添加 URL
 */
async function handleAddUrl() {
  if (!newUrl.value.trim()) {
    message.warning("请输入 URL");
    return false;
  }

  try {
    await webChatStore.parseUrl(newUrl.value.trim());
    message.success("开始解析网页");
    newUrl.value = "";
    return true;
  } catch (error) {
    message.error(`解析失败: ${error}`);
    return false;
  }
}

/**
 * HTML 转 Markdown
 */
async function handleConvertHtml() {
  if (!htmlInput.value.trim()) {
    message.warning("请输入 HTML");
    return;
  }

  isConverting.value = true;
  try {
    markdownOutput.value = await webChatStore.htmlToMarkdown(htmlInput.value);
    message.success("转换成功");
  } catch (error) {
    message.error(`转换失败: ${error}`);
  } finally {
    isConverting.value = false;
  }
}

/**
 * URL 转 Markdown
 */
async function handleConvertUrl() {
  if (!convertUrl.value.trim()) {
    message.warning("请输入 URL");
    return;
  }

  isConverting.value = true;
  try {
    const parsed = await webChatStore.parseUrl(convertUrl.value.trim());
    if (parsed.status === "success") {
      markdownOutput.value = parsed.markdown;
      message.success("转换成功");
    } else {
      message.error(`转换失败: ${parsed.error}`);
    }
  } catch (error) {
    message.error(`转换失败: ${error}`);
  } finally {
    isConverting.value = false;
  }
}

/**
 * 复制 Markdown
 */
async function handleCopyMarkdown() {
  try {
    await navigator.clipboard.writeText(markdownOutput.value);
    message.success("已复制到剪贴板");
  } catch (error) {
    message.error("复制失败");
  }
}

/**
 * 清空对话
 */
function handleClearChat() {
  webChatStore.clearMessages();
  message.success("已清空对话");
}

/**
 * 清空 URL 列表
 */
function handleClearUrls() {
  webChatStore.clearParsedUrls();
  message.success("已清空列表");
}

/**
 * 删除指定 URL
 */
function removeParsedUrl(id: string) {
  webChatStore.removeParsedUrl(id);
}

/**
 * 获取 URL 标题
 */
function getUrlTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.slice(0, 20) + "...";
  }
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN");
}

/**
 * 处理右键菜单
 */
function handleContextMenu(e: MouseEvent, messageId: string) {
  e.preventDefault();
  showContextMenu.value = false;
  nextTick(() => {
    showContextMenu.value = true;
    contextMenuX.value = e.clientX;
    contextMenuY.value = e.clientY;
    currentMessageId.value = messageId;
  });
}

/**
 * 处理右键菜单选择
 */
async function handleContextMenuSelect(key: string) {
  showContextMenu.value = false;

  if (key === "copy") {
    const success = await webChatStore.copyMessage(currentMessageId.value);
    if (success) {
      message.success("已复制到剪贴板");
    } else {
      message.error("复制失败");
    }
  } else if (key === "delete") {
    webChatStore.deleteMessage(currentMessageId.value);
    message.success("已删除消息");
  }
}

/**
 * 点击外部关闭菜单
 */
function handleClickOutside() {
  showContextMenu.value = false;
}
</script>

<style scoped>
.web-chat-container {
  height: 100vh;
  overflow: hidden;
}

.message-item {
  max-width: 80%;
}

.message-item.user {
  margin-left: auto;
}

.message-item.assistant {
  margin-right: auto;
}

.message-item.system {
  margin: 0 auto;
  max-width: 60%;
}
</style>
