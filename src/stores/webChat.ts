import { defineStore } from "pinia";
import { ref } from "vue";
import { MarkdownConverter, getSystemInfo } from "../utils/markdown";
import { loadJSON, saveJSON } from "../utils/storage";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ParsedUrl {
  id: string;
  url: string;
  markdown: string;
  status: "pending" | "success" | "error";
  error?: string;
}

interface WebChatData {
  messages: Message[];
  parsedUrls: ParsedUrl[];
  currentModel: string;
}

const WEBCHAT_FILE = "webchat-data.json";

export const useWebChatStore = defineStore("webChat", () => {
  const messages = ref<Message[]>([]);
  const parsedUrls = ref<ParsedUrl[]>([]);
  const currentModel = ref<string>("");
  const isLoading = ref(false);
  const converter = new MarkdownConverter();
  const isDataLoaded = ref(false);

  /**
   * 保存数据到文件
   */
  async function saveData() {
    try {
      const data: WebChatData = {
        messages: messages.value,
        parsedUrls: parsedUrls.value,
        currentModel: currentModel.value,
      };
      await saveJSON(WEBCHAT_FILE, data);
    } catch (error) {
      console.error("Failed to save webchat data:", error);
    }
  }

  /**
   * 从文件加载数据
   */
  async function loadData() {
    try {
      const data = (await loadJSON(WEBCHAT_FILE)) as WebChatData;
      messages.value = data.messages || [];
      parsedUrls.value = data.parsedUrls || [];
      currentModel.value = data.currentModel || "";
      isDataLoaded.value = true;
    } catch (error) {
      console.log("No saved webchat data found, starting fresh");
      isDataLoaded.value = true;
    }
  }

  /**
   * 添加消息
   */
  function addMessage(role: Message["role"], content: string): Message {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    };
    messages.value.push(message);
    saveData(); // 自动保存
    return message;
  }

  /**
   * 解析 URL 并转换为 Markdown
   */
  async function parseUrl(url: string): Promise<ParsedUrl> {
    const parsed: ParsedUrl = {
      id: crypto.randomUUID(),
      url,
      markdown: "",
      status: "pending",
    };

    parsedUrls.value.push(parsed);
    await saveData(); // 保存初始状态

    try {
      const markdown = await converter.urlToMarkdown(url);
      parsed.markdown = markdown;
      parsed.status = "success";
    } catch (error) {
      parsed.status = "error";
      parsed.error = error instanceof Error ? error.message : String(error);
    }

    await saveData(); // 保存最终状态
    return parsed;
  }

  /**
   * HTML 转 Markdown
   */
  async function htmlToMarkdown(html: string): Promise<string> {
    return await converter.htmlToMarkdown(html);
  }

  /**
   * 构建完整的上下文（包含系统信息和解析的网页内容）
   */
  function buildContext(): string {
    let context = getSystemInfo() + "\n\n";

    const successUrls = parsedUrls.value.filter((u) => u.status === "success");
    if (successUrls.length > 0) {
      context += "=== 已解析的网页内容 ===\n\n";
      successUrls.forEach((parsed, index) => {
        context += `[网页 ${index + 1}] ${parsed.url}\n\n${
          parsed.markdown
        }\n\n---\n\n`;
      });
    }

    return context;
  }

  /**
   * 获取对话历史（用于多轮对话）
   */
  function getChatHistory(): Array<{ role: string; content: string }> {
    return messages.value.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * 清空对话
   */
  function clearMessages() {
    messages.value = [];
    saveData(); // 自动保存
  }

  /**
   * 删除指定消息
   */
  function deleteMessage(id: string) {
    const index = messages.value.findIndex((msg) => msg.id === id);
    if (index !== -1) {
      messages.value.splice(index, 1);
      saveData(); // 自动保存
    }
  }

  /**
   * 复制消息内容
   */
  async function copyMessage(id: string): Promise<boolean> {
    const message = messages.value.find((msg) => msg.id === id);
    if (message) {
      try {
        await navigator.clipboard.writeText(message.content);
        return true;
      } catch (error) {
        console.error("复制失败:", error);
        return false;
      }
    }
    return false;
  }

  /**
   * 清空已解析的 URL
   */
  function clearParsedUrls() {
    parsedUrls.value = [];
    saveData(); // 自动保存
  }

  /**
   * 删除指定的已解析 URL
   */
  function removeParsedUrl(id: string) {
    const index = parsedUrls.value.findIndex((u) => u.id === id);
    if (index !== -1) {
      parsedUrls.value.splice(index, 1);
      saveData(); // 自动保存
    }
  }

  return {
    messages,
    parsedUrls,
    currentModel,
    isLoading,
    isDataLoaded,
    addMessage,
    parseUrl,
    htmlToMarkdown,
    buildContext,
    getChatHistory,
    clearMessages,
    clearParsedUrls,
    removeParsedUrl,
    deleteMessage,
    copyMessage,
    saveData,
    loadData,
  };
});
