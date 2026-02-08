<template>
  <div class="prompt-studio">
    <div class="studio-left">
      <n-card :bordered="false" class="pane">
        <template #header>
          <n-space justify="space-between" align="center">
            <n-text strong>Prompt 库</n-text>
            <n-button size="small" type="primary" @click="createEmpty">新建</n-button>
          </n-space>
        </template>

        <div class="left-body">
          <n-input v-model:value="searchQuery" clearable placeholder="搜索标题..." />

          <div class="prompt-list">
            <n-empty v-if="filteredPrompts.length === 0" description="暂无 Prompt" />
            <div
              v-else
              v-for="p in filteredPrompts"
              :key="p.id"
              class="prompt-item"
              :class="{ active: p.id === selectedPromptId }"
              @click="selectPrompt(p.id)"
            >
              <div class="prompt-item-top">
                <div class="prompt-title">{{ p.title }}</div>
                <n-tag size="tiny" round :bordered="false" type="success">v{{ getVersionCount(p.id) }}</n-tag>
              </div>
              <div class="prompt-meta">{{ formatTime(p.updatedAt || p.createdAt) }}</div>
              <div class="prompt-tags" v-if="p.tags && p.tags.length">
                <n-tag v-for="t in p.tags.slice(0, 3)" :key="t" size="tiny" round :bordered="false" class="prompt-tag">{{ t }}</n-tag>
                <n-text depth="3" v-if="p.tags.length > 3">+{{ p.tags.length - 3 }}</n-text>
              </div>
            </div>
          </div>
        </div>
      </n-card>
    </div>

    <div class="studio-center">
      <n-card :bordered="false" class="pane" v-if="selectedPrompt && selectedVersion">
        <template #header>
          <n-space justify="space-between" align="center" class="center-toolbar">
            <n-space align="center" :size="10">
              <n-input v-model:value="editTitle" placeholder="Prompt 标题" style="width: 360px" />
              <n-button size="small" @click="saveMeta">保存信息</n-button>
            </n-space>
            <n-space align="center" :size="8">
              <n-button size="small" :disabled="!editContent.trim()" @click="copyContent">复制</n-button>
              <n-button size="small" :disabled="!editContent.trim()" @click="copyAsSystem">复制为 system</n-button>
              <n-button size="small" @click="showGenModal = true">自动生成</n-button>
              <n-button size="small" @click="snapshot">保存新版本</n-button>
              <n-button size="small" type="error" @click="removePrompt">删除</n-button>
            </n-space>
          </n-space>
        </template>

        <div class="center-body">
          <div class="version-bar">
            <n-text depth="3">版本：</n-text>
            <div class="version-tags">
              <n-tag
                v-for="(v, idx) in orderedVersions"
                :key="v.id"
                size="small"
                round
                :bordered="false"
                :type="v.id === selectedPrompt?.currentVersionId ? 'success' : 'default'"
                class="version-tag"
                :title="versionHint(v, idx)"
                @click="selectVersion(v.id)"
              >
                v{{ idx + 1 }}
              </n-tag>
            </div>
          </div>

          <div class="editor-wrap">
            <MonacoEditor v-model="editContent" language="markdown" theme="vs" />
          </div>
        </div>
      </n-card>

      <n-card v-else :bordered="false" class="pane">
        <n-empty description="请选择或新建一个 Prompt" />
      </n-card>
    </div>

    <div class="studio-right">
      <n-card :bordered="false" class="pane">
        <template #header>
          <n-text strong>测试台（V1）</n-text>
        </template>
        <div class="testbench">
          <n-text depth="3">使用当前 Prompt（当前版本）作为 system，上下文将按多轮对话拼接调用。</n-text>

          <div class="test-messages">
            <n-empty v-if="testMessages.length === 0" description="暂无对话，输入一句话开始测试" />
            <div v-else class="test-message" v-for="m in testMessages" :key="m.id">
              <div class="test-message-meta">
                <n-tag size="tiny" round :bordered="false" :type="m.role === 'user' ? 'info' : 'success'">{{ m.role }}</n-tag>
                <span class="test-message-time">{{ formatTime(m.timestamp) }}</span>
                <n-button size="tiny" quaternary @click="copyText(m.content)">复制</n-button>
              </div>
              <div class="test-message-content">
                <MarkdownRenderer :content="m.content" />
              </div>
            </div>
          </div>

          <n-input
            v-model:value="testInput"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="输入用户消息（Enter 发送，Shift+Enter 换行）"
            @keydown.enter.exact.prevent="sendTest"
          />

          <n-space justify="space-between" align="center" :size="8">
            <n-button size="small" :disabled="testMessages.length === 0" @click="clearTest">清空</n-button>
            <n-button type="primary" size="small" :loading="isTestLoading" :disabled="!canSendTest" @click="sendTest">发送</n-button>
          </n-space>
        </div>
      </n-card>
    </div>
  </div>

  <n-modal v-model:show="showGenModal" preset="card" title="Prompt 自动生成" style="width: min(1200px, 94vw)" :bordered="false">
    <template #header-extra>
      <n-space align="center" :size="8">
        <n-button size="small" @click="resetGen">重置</n-button>
        <n-button type="primary" size="small" :loading="isGenerating" :disabled="!genForm.purpose.trim()" @click="generatePromptContent">
          生成
        </n-button>
      </n-space>
    </template>

    <div class="gen-modal">
      <n-text depth="3">填写信息后生成 Prompt。可选 URL/外部资料会被作为上下文参与生成。</n-text>
      <div class="gen-grid">
        <div class="gen-panel">
          <div class="gen-panel-title">核心信息</div>
          <div class="gen-panel-body">
            <n-form label-placement="top">
              <n-form-item label="目的">
                <n-input v-model:value="genForm.purpose" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" placeholder="这个 Prompt 要解决什么问题？" />
              </n-form-item>
              <n-form-item label="角色">
                <n-input v-model:value="genForm.role" placeholder="例如：专业助理/代码审查官/文档生成器" />
              </n-form-item>
              <n-form-item label="风格">
                <n-input v-model:value="genForm.style" placeholder="例如：结构化、简洁、可执行" />
              </n-form-item>
              <n-form-item label="约束">
                <n-input v-model:value="genForm.constraints" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" placeholder="例如：不要编造/输出 JSON/必须给出步骤" />
              </n-form-item>
            </n-form>
          </div>
        </div>

        <div class="gen-panel">
          <div class="gen-panel-title">上下文资料</div>
          <div class="gen-panel-body">
            <n-form label-placement="top">
              <n-form-item label="URL">
                <n-input v-model:value="genForm.sourceUrl" placeholder="https://...（可选）" />
              </n-form-item>
              <n-form-item label="外部资料">
                <n-input v-model:value="genForm.sourceText" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" placeholder="可选：粘贴资料/规范/需求作为上下文" />
              </n-form-item>
              <n-form-item label="写入后">
                <n-space align="center" :size="10">
                  <n-switch v-model:value="genForm.saveAsNewVersion" size="small" />
                  <n-text depth="3">自动保存为新版本</n-text>
                </n-space>
              </n-form-item>
            </n-form>
          </div>
        </div>

        <div class="gen-panel gen-preview-panel">
          <div class="gen-panel-title">生成预览</div>
          <div class="gen-panel-body gen-preview-body">
            <div class="gen-preview">
              <MonacoEditor v-model="genPreview" language="markdown" theme="vs" />
            </div>
            <n-space justify="end" :size="8">
              <n-button size="small" :disabled="!genPreview.trim()" @click="applyGenerated">应用到编辑器</n-button>
            </n-space>
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";
import { storeToRefs } from "pinia";
import { computed, onMounted, reactive, ref, watch } from "vue";
import MarkdownRenderer from "../components/MarkdownRenderer.vue";
import MonacoEditor from "../components/MonacoEditor.vue";
import { useAgentHubStore } from "../stores/agentHub";
import { usePromptsStore, type PromptVersion } from "../stores/prompts";
import { promptLLM } from "../utils/llm";

const message = useMessage();
const hubStore = useAgentHubStore();
const promptsStore = usePromptsStore();
const { prompts, selectedPromptId, selectedPrompt, selectedVersion, selectedPromptVersions } = storeToRefs(promptsStore);

const searchQuery = ref("");

const editTitle = ref("");
const editContent = ref("");

const showGenModal = ref(false);
const isGenerating = ref(false);
const genPreview = ref("");
const genForm = reactive({
  purpose: "",
  role: "",
  style: "结构清晰、可执行、简洁",
  constraints: "",
  sourceUrl: "",
  sourceText: "",
  saveAsNewVersion: true,
});

type TestMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const testMessages = ref<TestMessage[]>([]);
const testInput = ref("");
const isTestLoading = ref(false);

const canSendTest = computed(() => {
  if (!selectedPrompt.value || !selectedVersion.value) return false;
  return !!testInput.value.trim();
});

const filteredPrompts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return prompts.value;
  return prompts.value.filter((p) => p.title.toLowerCase().includes(q));
});

const orderedVersions = computed(() =>
  [...selectedPromptVersions.value].sort((a, b) => a.createdAt - b.createdAt)
);

function getVersionCount(promptId: string) {
  const p = prompts.value.find((x) => x.id === promptId);
  return p ? (Array.isArray(p.versionIds) ? p.versionIds.length : 0) : 0;
}

function selectPrompt(id: string) {
  promptsStore.selectPrompt(id);
}

async function createEmpty() {
  await promptsStore.createPrompt({
    title: "新 Prompt",
    tags: [],
    content: "",
    note: "init",
  });
}

async function saveMeta() {
  if (!selectedPrompt.value) return;
  await promptsStore.updatePromptMeta(selectedPrompt.value.id, {
    title: editTitle.value,
  });
  message.success("已保存");
}

async function snapshot() {
  if (!selectedPrompt.value) return;
  await promptsStore.saveNewVersion(selectedPrompt.value.id, editContent.value, "manual");
  message.success("已保存新版本");
}

async function selectVersion(versionId: string) {
  if (!selectedPrompt.value) return;
  await promptsStore.setCurrentVersion(selectedPrompt.value.id, versionId);
}

function versionHint(version: PromptVersion, index: number) {
  const note = version.note ? ` · ${version.note}` : "";
  return `v${index + 1} · ${formatTime(version.createdAt)}${note}`;
}

async function removePrompt() {
  if (!selectedPrompt.value) return;
  await promptsStore.deletePrompt(selectedPrompt.value.id);
  message.success("已删除");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success("已复制");
  } catch {
    message.error("复制失败");
  }
}

function buildTestPrompt(nextUserMessage: string) {
  const system = String(editContent.value || "").trim();
  const lines: string[] = [];
  if (system) {
    lines.push("=== SYSTEM PROMPT ===");
    lines.push(system);
    lines.push("");
  }

  lines.push("=== CHAT ===");
  for (const m of testMessages.value) {
    const role = m.role === "user" ? "USER" : "ASSISTANT";
    lines.push(`${role}: ${m.content}`);
  }
  lines.push(`USER: ${nextUserMessage}`);
  lines.push("ASSISTANT:");
  return lines.join("\n");
}

function clearTest() {
  testMessages.value = [];
  testInput.value = "";
}

async function sendTest() {
  if (!canSendTest.value) return;
  const userMsg = testInput.value.trim();
  testInput.value = "";

  testMessages.value.push({
    id: crypto.randomUUID(),
    role: "user",
    content: userMsg,
    timestamp: Date.now(),
  });

  isTestLoading.value = true;
  try {
    const prompt = buildTestPrompt(userMsg);
    const res = await promptLLM(prompt);
    const text = String(res || "").trim();
    testMessages.value.push({
      id: crypto.randomUUID(),
      role: "assistant",
      content: text,
      timestamp: Date.now(),
    });
  } finally {
    isTestLoading.value = false;
  }
}

async function copyContent() {
  await copyText(editContent.value);
}

async function copyAsSystem() {
  const text = `SYSTEM PROMPT\n\n${editContent.value}`;
  await copyText(text);
}

function resetGen() {
  genForm.purpose = "";
  genForm.role = "";
  genForm.style = "结构清晰、可执行、简洁";
  genForm.constraints = "";
  genForm.sourceUrl = "";
  genForm.sourceText = "";
  genForm.saveAsNewVersion = true;
  genPreview.value = "";
}

function normalizeUrl(input: string) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function buildExternalContext(): Promise<string> {
  const parts: string[] = [];
  const url = normalizeUrl(genForm.sourceUrl);
  if (url) {
    const { knowledgeBase } = storeToRefs(hubStore);
    const existing = knowledgeBase.value.find((k: any) => k?.sourceUrl === url);
    let item: any = existing;
    if (!item) {
      const id = await hubStore.ingestUrl(url, ["prompt-gen"]);
      item = knowledgeBase.value.find((k: any) => k.id === id);
    }
    if (item) {
      const title = String(item?.title || "").trim();
      const summary = String(item?.summary || "").trim();
      const content = String(item?.content || "").trim();
      const excerpt = content.length > 2500 ? content.slice(0, 2500) + "..." : content;
      parts.push(`来源URL：${url}\n标题：${title || "(无)"}\n摘要：${summary || "(无)"}\n内容节选：\n${excerpt || "(无)"}`);
    }
  }

  const extra = String(genForm.sourceText || "").trim();
  if (extra) {
    parts.push(extra);
  }
  return parts.join("\n\n---\n\n").trim();
}

async function generatePromptContent() {
  if (!genForm.purpose.trim()) return;
  isGenerating.value = true;
  try {
    const ctx = await buildExternalContext();
    const prompt = `你是一个专业的 Prompt 生成助手。请根据输入信息生成高质量 system prompt（中文）。\n\n要求：\n- 输出必须只包含 system prompt 本体，不要输出其它文字\n- 必须包含：角色定义、工作目标、工作流程、输出格式要求、边界与禁止事项\n- 如果给了外部资料，必须将其作为上下文约束的一部分（不要原样复述大段资料）\n\n信息：\n目的：${genForm.purpose}\n角色：${genForm.role}\n风格：${genForm.style}\n约束：${genForm.constraints || "无"}\n\n外部资料：\n${ctx || "无"}`;
    const res = await promptLLM(prompt);
    genPreview.value = String(res || "").trim();
    applyGenerated();

    if (genForm.saveAsNewVersion && selectedPrompt.value) {
      await promptsStore.saveNewVersion(selectedPrompt.value.id, editContent.value, "auto-gen");
    }
  } finally {
    isGenerating.value = false;
  }
}

function applyGenerated() {
  if (!genPreview.value.trim()) return;
  editContent.value = genPreview.value;
}

watch(
  () => [selectedPrompt.value?.id, selectedPrompt.value?.currentVersionId],
  () => {
    if (!selectedPrompt.value || !selectedVersion.value) {
      editTitle.value = "";
      editContent.value = "";
      return;
    }
    editTitle.value = selectedPrompt.value.title;
    editContent.value = selectedVersion.value.content;
  },
  { immediate: true }
);

function formatTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

onMounted(async () => {
  await promptsStore.loadData();
});
</script>

<style scoped>
.prompt-studio {
  height: 100vh;
  min-height: 0;
  max-height: 100vh;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  grid-template-rows: 1fr;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.pane .n-card__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.studio-left,
.studio-center,
.studio-right {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.prompt-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.left-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.prompt-item {
  cursor: pointer;
  margin-bottom: 8px;
  padding: 10px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
}

.prompt-item.active {
  outline: 2px solid rgba(24, 160, 88, 0.35);
  background: rgba(24, 160, 88, 0.08);
}

.prompt-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.prompt-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.prompt-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.prompt-tag {
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
}

.center-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.version-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.version-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.version-tag {
  cursor: pointer;
}

.editor-wrap {
  flex: 1;
  min-height: 0;
}

.editor-wrap :deep(.monaco-editor-container) {
  min-height: 0 !important;
  height: 100%;
}

.testbench {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.test-messages {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.02);
}

.test-message {
  margin-bottom: 10px;
}

.test-message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.test-message-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.test-message-content {
  font-size: 13px;
}

.gen-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gen-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(240px, 1fr) minmax(280px, 1.2fr);
  gap: 12px;
  min-height: 0;
}

.gen-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.gen-panel-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.75);
}

.gen-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gen-preview-panel {
  min-width: 280px;
}

.gen-preview-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gen-preview {
  flex: 1;
  min-height: 240px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
