<template>
  <div
    class="web-chat-container"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
    :class="{ 'drag-over': isDragOver }"
  >
    <n-layout has-sider>
      <!-- 侧边栏：已解析的网页列表 -->
      <n-layout-sider
        v-model:collapsed="docSidebarCollapsed"
        bordered
        collapse-mode="width"
        :collapsed-width="0"
        :width="260"
        :show-trigger="false"
        content-style="padding: 12px; background: #fff;"
      >
        <div class="sidebar-content">
          <div class="sidebar-header">
            <span class="sidebar-title">📄 已解析 ({{ parsedUrls.length }})</span>
          </div>

          <div class="sidebar-actions">
            <n-button type="primary" size="small" @click="showAddUrlModal = true">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加
            </n-button>
            <n-button
              size="small"
              quaternary
              @click="handleClearUrls"
              :disabled="parsedUrls.length === 0"
            >
              清空
            </n-button>
          </div>

          <n-scrollbar class="sidebar-list">
            <div class="url-list">
              <div
                v-for="parsed in parsedUrls"
                :key="parsed.id"
                class="url-item"
                @click="openMarkdownEditor(parsed)"
              >
                <div class="url-item-header">
                  <span class="url-item-title">{{ getUrlTitle(parsed.url) }}</span>
                  <n-button
                    text
                    size="tiny"
                    @click.stop="removeParsedUrl(parsed.id)"
                    class="url-item-close"
                  >
                    <n-icon><CloseOutline /></n-icon>
                  </n-button>
                </div>
                <div class="url-item-info">
                  <n-tag
                    :type="parsed.status === 'success' ? 'success' : parsed.status === 'error' ? 'error' : 'info'"
                    size="tiny"
                    :bordered="false"
                  >
                    {{ parsed.status === "success" ? "成功" : parsed.status === "error" ? "失败" : "解析中" }}
                  </n-tag>
                  <span class="url-item-time">{{ formatParsedTime(parsed.updatedAt) }}</span>
                  <span class="url-item-size" v-if="parsed.markdown">
                    {{ (parsed.markdown.length / 1000).toFixed(1) }}k 字符
                  </span>
                </div>
                <div class="url-item-tags" v-if="parsed.tags && parsed.tags.length">
                  <n-tag
                    v-for="tag in parsed.tags.slice(0, 3)"
                    :key="tag"
                    size="tiny"
                    round
                    :bordered="false"
                    class="url-item-tag"
                  >
                    {{ tag }}
                  </n-tag>
                  <span v-if="parsed.tags.length > 3" class="url-item-tag-more">
                    +{{ parsed.tags.length - 3 }}
                  </span>
                </div>
                <div class="url-item-preview" v-if="parsed.markdown">
                  {{ getPreviewText(parsed.markdown) }}
                </div>
                <div class="url-item-url">{{ parsed.url }}</div>
              </div>
            </div>
          </n-scrollbar>
        </div>
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
            <n-button
              text
              @click="docSidebarCollapsed = !docSidebarCollapsed"
              :title="docSidebarCollapsed ? '展开文档列表' : '收起文档列表'"
            >
              <template #icon>
                <n-icon size="18">
                  <MenuOutline />
                </n-icon>
              </template>
            </n-button>
            <n-text strong>网页智能对话</n-text>
            <n-button text type="info" @click="showHtmlModal = true">
              <template #icon>
                <n-icon><CodeOutline /></n-icon>
              </template>
              HTML转Markdown
            </n-button>
            <n-button text type="primary" @click="showSystemPromptModal = true">
              <template #icon>
                <n-icon><SettingsOutline /></n-icon>
              </template>
              提示词
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
              <div :class="['message-bubble', msg.role]">
                <div class="message-header">
                  <span class="message-role">
                    {{ msg.role === "user" ? "你" : msg.role === "assistant" ? "AI" : "系统" }}
                  </span>
                  <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                </div>
                <div class="message-content">
                  <MarkdownRenderer
                    v-if="msg.role === 'assistant'"
                    :content="msg.content"
                  />
                  <span v-else>{{ msg.content }}</span>
                </div>
              </div>
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

    <!-- Markdown 编辑器模态框 -->
    <n-modal
      v-model:show="showMarkdownEditor"
      preset="card"
      :title="editingParsedUrl ? getUrlTitle(editingParsedUrl.url) : 'Markdown 编辑器'"
      style="width: 90vw; max-width: 1200px;"
      :bordered="false"
      size="huge"
    >
      <template #header-extra>
        <n-space>
          <n-button type="primary" size="small" @click="saveMarkdownEdit">
            保存
          </n-button>
        </n-space>
      </template>
      <n-space vertical :size="12" style="margin-bottom: 12px">
        <n-space align="center" :size="8">
          <n-text depth="3">标签</n-text>
          <n-tag
            v-for="tag in editingTags"
            :key="tag"
            size="small"
            closable
            round
            :bordered="false"
            @close="removeEditingTag(tag)"
          >
            {{ tag }}
          </n-tag>
        </n-space>
        <n-space align="center" :size="8">
          <n-input
            v-model:value="newTag"
            size="small"
            placeholder="添加标签（回车确认）"
            style="width: 240px"
            @keyup.enter="addEditingTag"
          />
          <n-button size="small" @click="addEditingTag" :disabled="!newTag.trim()">
            添加
          </n-button>
        </n-space>
      </n-space>
      <div class="markdown-editor-wrapper">
        <MonacoEditor
          v-model="editingMarkdown"
          language="markdown"
          theme="vs"
        />
      </div>
    </n-modal>

    <!-- 系统提示词设置模态框 -->
    <n-modal
      v-model:show="showSystemPromptModal"
      preset="card"
      title="系统提示词设置"
      style="width: 700px;"
      :bordered="false"
    >
      <template #header-extra>
        <n-button type="primary" size="small" @click="handleSaveSystemPrompt">
          保存
        </n-button>
      </template>
      <n-space vertical :size="12">
        <n-text depth="3">
          系统提示词会在每次对话时作为上下文发送给 AI，用于设定 AI 的行为和角色。
        </n-text>
        <n-input
          v-model:value="systemPrompt"
          type="textarea"
          placeholder="输入系统提示词..."
          :autosize="{ minRows: 8, maxRows: 16 }"
        />
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { invoke } from "@tauri-apps/api/core";
import { AddOutline, CloseOutline, CodeOutline, CopyOutline, MenuOutline, SettingsOutline, TrashOutline } from "@vicons/ionicons5";
import { NIcon, useMessage } from "naive-ui";
import { storeToRefs } from "pinia";
import { computed, h, nextTick, onMounted, ref, watch } from "vue";
import MarkdownRenderer from "../components/MarkdownRenderer.vue";
import MonacoEditor from "../components/MonacoEditor.vue";
import { useSettingsStore } from "../stores/settings";
import { useWebChatStore } from "../stores/webChat";
import type { ParsedUrl } from "../stores/webChat";

const webChatStore = useWebChatStore();
const settingsStore = useSettingsStore();
const message = useMessage();

const { messages, parsedUrls, currentModel, systemPrompt, isLoading } =
  storeToRefs(webChatStore);

const userInput = ref("");
const scrollbarRef = ref();
const showAddUrlModal = ref(false);
const isDragOver = ref(false);
const docSidebarCollapsed = ref(false);
const showHtmlModal = ref(false);
const newUrl = ref("");
const htmlInput = ref("");
const convertUrl = ref("");
const markdownOutput = ref("");
const isConverting = ref(false);

// Markdown 编辑器模态框
const showMarkdownEditor = ref(false);
const showSystemPromptModal = ref(false);
const editingParsedUrl = ref<ParsedUrl | null>(null);
const editingMarkdown = ref("");
const editingTags = ref<string[]>([]);
const newTag = ref("");

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
  // 加载 LLM 配置
  await settingsStore.loadLLMConfig();

  // 加载聊天数据
  if (!webChatStore.isDataLoaded) {
    await webChatStore.loadData();
  }

  // 如果没有选择模型，使用第一个
  if (!currentModel.value && modelOptions.value.length > 0) {
    currentModel.value = modelOptions.value[0].value;
  }
});

/**
 * 处理拖拽文件（DOM 原生 API - 支持文件和 URL）
 */
async function handleDroppedFile(file: File) {
  const fileName = file.name.toLowerCase();

  // 支持 HTML 文件
  if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
    message.info(`正在解析 HTML 文件: ${file.name}`);
    try {
      const htmlContent = await file.text();
      const markdown = await webChatStore.htmlToMarkdown(htmlContent);

      const id = Date.now().toString();
      webChatStore.parsedUrls.push({
        id,
        url: `file://${file.name}`,
        markdown,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "success",
      });

      message.success(`HTML 文件解析成功`);
    } catch (error) {
      message.error(`HTML 解析失败: ${error}`);
    }
    return;
  }

  // 支持 Markdown 文件
  if (fileName.endsWith(".md") || fileName.endsWith(".markdown")) {
    message.info(`正在读取 Markdown 文件: ${file.name}`);
    try {
      const markdown = await file.text();

      const id = Date.now().toString();
      webChatStore.parsedUrls.push({
        id,
        url: `file://${file.name}`,
        markdown,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "success",
      });

      message.success(`Markdown 文件读取成功`);
    } catch (error) {
      message.error(`文件读取失败: ${error}`);
    }
    return;
  }

  // 支持纯文本文件
  if (fileName.endsWith(".txt")) {
    message.info(`正在读取文本文件: ${file.name}`);
    try {
      const text = await file.text();

      const id = Date.now().toString();
      webChatStore.parsedUrls.push({
        id,
        url: `file://${file.name}`,
        markdown: text,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "success",
      });

      message.success(`文本文件读取成功`);
    } catch (error) {
      message.error(`文件读取失败: ${error}`);
    }
    return;
  }

  // 支持 Windows .url 快捷方式文件
  if (fileName.endsWith(".url")) {
    message.info(`正在解析 URL 快捷方式...`);
    try {
      const content = await file.text();
      // 解析 .url 文件格式：[InternetShortcut]\nURL=https://...
      const urlMatch = content.match(/URL=(.+)/i);
      if (urlMatch && urlMatch[1]) {
        const targetUrl = urlMatch[1].trim();
        await webChatStore.parseUrl(targetUrl);
        message.success(`URL 快捷方式解析成功`);
      } else {
        message.error(`无法从 .url 文件中提取链接`);
      }
    } catch (error) {
      message.error(`URL 快捷方式解析失败: ${error}`);
    }
    return;
  }

  message.warning(`不支持的文件格式: ${file.name}（支持 .html, .md, .txt, .url）`);
}

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
 * 保存系统提示词
 */
function handleSaveSystemPrompt() {
  webChatStore.saveData();
  showSystemPromptModal.value = false;
  message.success("系统提示词已保存");
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
 * 打开 Markdown 编辑器
 */
function openMarkdownEditor(parsed: ParsedUrl) {
  editingParsedUrl.value = parsed;
  editingMarkdown.value = parsed.markdown || "";
  editingTags.value = Array.isArray(parsed.tags) ? [...parsed.tags] : [];
  newTag.value = "";
  showMarkdownEditor.value = true;
}

/**
 * 保存 Markdown 编辑
 */
function saveMarkdownEdit() {
  if (editingParsedUrl.value) {
    const index = webChatStore.parsedUrls.findIndex(p => p.id === editingParsedUrl.value!.id);
    if (index !== -1) {
      webChatStore.parsedUrls[index].markdown = editingMarkdown.value;
      webChatStore.parsedUrls[index].tags = [...editingTags.value];
      webChatStore.parsedUrls[index].updatedAt = Date.now();
      webChatStore.saveData();
      message.success("保存成功");
    }
  }
  showMarkdownEditor.value = false;
}

function addEditingTag() {
  const t = newTag.value.trim();
  if (!t) return;
  if (!editingTags.value.includes(t)) {
    editingTags.value.push(t);
  }
  newTag.value = "";
}

function removeEditingTag(tag: string) {
  editingTags.value = editingTags.value.filter((t) => t !== tag);
}

function formatParsedTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function getPreviewText(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 80);
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

/**
 * 拖拽进入
 */
function handleDragOver(e: DragEvent) {
  isDragOver.value = true;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
}

/**
 * 拖拽离开
 */
function handleDragLeave() {
  isDragOver.value = false;
}

/**
 * 拖拽放下 - 解析 URL 或文件
 */
async function handleDrop(e: DragEvent) {
  isDragOver.value = false;

  if (!e.dataTransfer) return;

  // 1. 优先处理文件拖拽（HTML、Markdown 文件）
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    for (const file of Array.from(files)) {
      await handleDroppedFile(file);
    }
    return;
  }

  // 2. 处理 URL 拖拽（从浏览器拖拽链接）
  const url = e.dataTransfer.getData("text/uri-list")
    || e.dataTransfer.getData("text/plain")
    || e.dataTransfer.getData("URL");

  if (url && isValidUrl(url)) {
    message.info(`正在解析: ${url}`);
    try {
      await webChatStore.parseUrl(url.trim());
      message.success("网页解析成功");
    } catch (error) {
      message.error(`解析失败: ${error}`);
    }
  } else if (url) {
    // 可能是纯文本，尝试作为内容添加
    message.warning("无法识别的内容格式");
  }
}

/**
 * 验证 URL 格式
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
</script>

<style scoped>
.web-chat-container {
  height: 100vh;
  overflow: hidden;
  transition: all 0.2s ease;
  background: #fafafa;
}

.web-chat-container.drag-over {
  background: rgba(24, 160, 88, 0.08);
  border: 2px dashed #18a058;
}

/* 消息项容器 */
.message-item {
  max-width: 85%;
  padding: 0 8px;
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

/* 消息气泡 */
.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.message-bubble:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.message-bubble.user {
  background: #18a058;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-bubble.assistant {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-bottom-left-radius: 4px;
}

.message-bubble.system {
  background: #fff8e6;
  border: 1px solid #ffe58f;
}

/* 消息头部 */
.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.message-role {
  font-weight: 600;
}

.message-bubble.user .message-role {
  color: rgba(255, 255, 255, 0.9);
}

.message-bubble.assistant .message-role {
  color: #18a058;
}

.message-time {
  opacity: 0.6;
  font-size: 11px;
}

/* 消息内容 */
.message-content {
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.message-bubble.user .message-content {
  color: #fff;
}

.message-bubble.assistant .message-content {
  color: #333;
}

/* 侧边栏样式 */
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.sidebar-header {
  margin-bottom: 12px;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.sidebar-list {
  flex: 1;
  max-height: calc(100vh - 160px);
}

.url-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.url-item {
  padding: 12px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}

.url-item:hover {
  border-color: rgba(24, 160, 88, 0.25);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
  transform: translateY(-1px);
}

.url-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.url-item:hover .url-item-close {
  opacity: 1;
}

.url-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.url-item-time {
  font-size: 11px;
  color: #8c8c8c;
}

.url-item-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.url-item-tag {
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
}

.url-item-tag-more {
  font-size: 11px;
  color: #8c8c8c;
}

.url-item-preview {
  font-size: 12px;
  color: #555;
  line-height: 1.45;
  margin-bottom: 6px;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.url-item-size {
  font-size: 11px;
  color: #999;
}

.url-item-url {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Markdown 编辑器 */
.markdown-editor-wrapper {
  height: 70vh;
  min-height: 500px;
}
</style>
