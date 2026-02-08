<template>
  <div class="agent-hub-view">
    <n-layout has-sider class="hub-layout">
      <n-layout-content content-style="padding: 0 16px 24px; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
        <n-tabs v-model:value="activeTab" type="segment" animated class="hub-tabs">
          <n-tab-pane name="board" tab="任务看板">
            <div class="task-panel">
              <n-card class="task-create-card" :bordered="false">
                <template #header>创建任务</template>
                <n-form label-placement="left" label-width="70">
                  <n-form-item label="标题">
                    <n-input v-model:value="taskForm.title" placeholder="输入任务名称" />
                  </n-form-item>
                  <n-form-item label="描述">
                    <n-input
                      v-model:value="taskForm.description"
                      type="textarea"
                      placeholder="任务背景与目标"
                      :autosize="{ minRows: 3, maxRows: 8 }"
                    />
                    <n-button
                      size="small"
                      style="margin-left: 8px"
                      :loading="isFillingDesc"
                      :disabled="!taskForm.title.trim()"
                      @click="fillTaskDescription"
                    >
                      AI 生成
                    </n-button>
                  </n-form-item>
                  <n-form-item label="自动生成">
                    <n-switch v-model:value="autoSuggestDesc" size="small" />
                    <n-text depth="3" style="margin-left: 8px">停止输入 1.2s 自动生成描述</n-text>
                  </n-form-item>
                  <n-form-item label="Agent">
                    <n-select
                      v-model:value="taskForm.templateId"
                      filterable
                      clearable
                      placeholder="选择预设 Agent（可选）"
                      :options="templateOptions"
                    />
                  </n-form-item>
                  <n-form-item label="知识">
                    <n-select
                      v-model:value="taskForm.knowledgeIds"
                      multiple
                      filterable
                      placeholder="选择知识库资料"
                      :options="knowledgeOptions"
                    />
                  </n-form-item>
                  <n-form-item>
                    <n-button type="primary" @click="handleCreateTask">创建任务</n-button>
                  </n-form-item>
                </n-form>
              </n-card>

              <div class="board-columns">
                <div class="board-column">
                  <div class="board-title">任务列表</div>
                  <div class="board-list">
                    <n-card
                      v-for="task in todoTasks"
                      :key="task.id"
                      class="task-card"
                      :bordered="false"
                    >
                      <div class="task-header">
                        <div class="task-title">{{ task.title }}</div>
                        <div class="task-time">{{ formatTime(task.updatedAt) }}</div>
                      </div>
                      <div class="task-desc">{{ task.description || '暂无描述' }}</div>
                      <div class="task-tags">
                        <n-tag
                          v-for="tag in taskKnowledgeTags(task)"
                          :key="tag"
                          size="tiny"
                          round
                          :bordered="false"
                          class="task-tag"
                        >
                          {{ tag }}
                        </n-tag>
                      </div>
                      <div class="task-actions">
                        <n-button size="tiny" type="primary" @click="dispatchTask(task.id)">派发</n-button>
                      </div>
                    </n-card>
                  </div>
                </div>

                <div class="board-column">
                  <div class="board-title">任务进行中</div>
                  <div class="board-list">
                    <n-card
                      v-for="task in inProgressTasks"
                      :key="task.id"
                      class="task-card"
                      :bordered="false"
                    >
                      <div class="task-header">
                        <div class="task-title">{{ task.title }}</div>
                        <div class="task-time">{{ formatTime(task.updatedAt) }}</div>
                      </div>
                      <div class="task-desc">{{ task.description || '暂无描述' }}</div>
                      <div class="task-meta">负责 Agent：{{ getAgentName(task.agentId) }}</div>
                      <div class="task-tags">
                        <n-tag
                          v-for="tag in taskKnowledgeTags(task)"
                          :key="tag"
                          size="tiny"
                          round
                          :bordered="false"
                          class="task-tag"
                        >
                          {{ tag }}
                        </n-tag>
                      </div>
                      <n-input
                        v-model:value="taskOutputDrafts[task.id]"
                        type="textarea"
                        placeholder="记录产出..."
                        :autosize="{ minRows: 2, maxRows: 4 }"
                      />
                      <div class="task-actions">
                        <n-button size="tiny" @click="saveTaskOutput(task)">保存产出</n-button>
                        <n-button size="tiny" type="success" @click="completeTask(task.id)">完成</n-button>
                        <n-button size="tiny" type="warning" @click="stopAgent(task.agentId)">停止</n-button>
                      </div>
                    </n-card>
                  </div>
                </div>

                <div class="board-column">
                  <div class="board-title">已完成</div>
                  <div class="board-list">
                    <n-card
                      v-for="task in doneTasks"
                      :key="task.id"
                      class="task-card"
                      :bordered="false"
                      hoverable
                      @click="openDonePreview(task)"
                    >
                      <div class="task-header">
                        <div class="task-title">{{ task.title }}</div>
                        <div class="task-time">{{ formatTime(task.updatedAt) }}</div>
                      </div>
                      <div class="task-desc">
                        <div v-if="task.output" class="done-snippet">{{ previewDoneSnippet(task.output) }}</div>
                        <div v-else class="done-snippet">暂无产出</div>
                      </div>
                      <div class="task-actions">
                        <n-button size="tiny" @click.stop="restartTask(task.id)">重新派发</n-button>
                      </div>
                    </n-card>
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="knowledge" tab="知识库">
            <div class="knowledge-panel">
              <div class="knowledge-toolbar">
                <n-input v-model:value="knowledgeQuery" placeholder="搜索标题/摘要/内容" clearable />
                <n-select v-model:value="knowledgeSource" :options="knowledgeSourceOptions" style="min-width: 140px" />
                <n-button size="small" type="primary" @click="showKnowledgeEditor = true">新增文档</n-button>
              </div>
              <div class="knowledge-list-main">
                <n-card
                  v-for="item in filteredKnowledge"
                  :key="item.id"
                  size="small"
                  class="knowledge-item"
                  :bordered="false"
                  @click="openKnowledge(item)"
                >
                  <div class="knowledge-title">{{ item.title }}</div>
                  <div class="knowledge-meta">
                    <span v-if="item.sourceUrl">{{ item.sourceUrl }}</span>
                    <span v-else>{{ item.source || 'manual' }}</span>
                    <span> · {{ formatTime(item.createdAt) }}</span>
                  </div>
                  <div v-if="item.summary" class="knowledge-content">{{ item.summary }}</div>
                  <div class="knowledge-tags">
                    <n-tag
                      v-for="tag in item.tags"
                      :key="tag"
                      size="tiny"
                      round
                      :bordered="false"
                      class="task-tag"
                    >
                      {{ tag }}
                    </n-tag>
                  </div>
                  <div class="knowledge-actions">
                    <n-button size="tiny" @click.stop="openKnowledge(item)">查看</n-button>
                    <n-button size="tiny" type="error" @click.stop="removeKnowledge(item.id)">删除</n-button>
                  </div>
                </n-card>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane name="training" tab="训练基地">
            <AgentTemplePanel />
          </n-tab-pane>
        </n-tabs>
      </n-layout-content>

      <n-layout-sider width="360" content-style="padding: 0 16px 24px; height: 100%; box-sizing: border-box; overflow: auto;">
        <n-space vertical :size="16">
          <n-card class="hub-card" :bordered="false">
            <template #header>枢纽控制</template>
            <n-space align="center" :size="8" style="margin-bottom: 12px">
              <n-switch v-model:value="autoDispatch" size="small" />
              <n-text depth="3">自动派发新任务</n-text>
            </n-space>
            <n-button size="small" @click="dispatchAll">派发全部待处理</n-button>
            <div class="hub-log">
              <div class="hub-log-title">事件日志</div>
              <n-scrollbar style="max-height: 160px">
                <div class="hub-log-item" v-for="(log, idx) in hubLogs" :key="idx">
                  {{ log }}
                </div>
              </n-scrollbar>
            </div>
          </n-card>

          <n-card class="knowledge-card" :bordered="false">
            <template #header>知识库</template>
            <n-form label-placement="left" label-width="60">
              <n-form-item label="标题">
                <n-input v-model:value="knowledgeForm.title" placeholder="知识标题" />
              </n-form-item>
              <n-form-item label="标签">
                <n-space align="center" :size="8" style="flex-wrap: wrap">
                  <n-tag
                    v-for="tag in knowledgeForm.tags"
                    :key="tag"
                    size="tiny"
                    round
                    closable
                    :bordered="false"
                    class="tag-chip"
                    @close="removeKnowledgeTag(tag)"
                  >
                    {{ tag }}
                  </n-tag>
                </n-space>
                <n-space align="center" :size="6" style="margin-top: 6px">
                  <n-input
                    v-model:value="newKnowledgeTag"
                    size="small"
                    placeholder="添加标签"
                    @keyup.enter="addKnowledgeTag"
                  />
                  <n-button size="small" @click="addKnowledgeTag" :disabled="!newKnowledgeTag.trim()">添加</n-button>
                </n-space>
              </n-form-item>
              <n-form-item label="内容">
                <n-input
                  v-model:value="knowledgeForm.content"
                  type="textarea"
                  placeholder="知识摘要或参考链接"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                />
              </n-form-item>
              <n-form-item>
                <n-button size="small" type="primary" @click="createKnowledge">添加知识</n-button>
              </n-form-item>
            </n-form>
            <div class="knowledge-list">
              <n-card
                v-for="item in knowledgeBase"
                :key="item.id"
                size="small"
                class="knowledge-item"
                :bordered="false"
              >
                <div class="knowledge-title">{{ item.title }}</div>
                <div class="knowledge-content">{{ item.content }}</div>
                <div class="knowledge-tags">
                  <n-tag
                    v-for="tag in item.tags"
                    :key="tag"
                    size="tiny"
                    round
                    :bordered="false"
                    class="task-tag"
                  >
                    {{ tag }}
                  </n-tag>
                </div>
                <n-button size="tiny" type="error" quaternary @click="removeKnowledge(item.id)">
                  删除
                </n-button>
              </n-card>
            </div>
          </n-card>

          <n-card class="agent-card" :bordered="false">
            <template #header>子 Agent 状态</template>
            <div class="agent-list">
              <n-collapse accordion>
                <n-collapse-item v-for="agent in agents" :key="agent.id" :title="agent.name">
                  <div class="agent-meta">任务：{{ getTaskTitle(agent.taskId) }}</div>
                  <div class="agent-meta">状态：{{ agent.status }}</div>
                  <div class="agent-meta">角色：{{ agent.role }}</div>
                  <div v-if="agent.templateId" class="agent-meta">模板：{{ getTemplateName(agent.templateId) }}</div>
                  <div class="agent-meta">更新时间：{{ formatTime(agent.updatedAt) }}</div>
                  <div class="agent-meta agent-prompt">提示词：{{ previewPrompt(agent.systemPrompt) }}</div>
                  <div class="agent-plan">
                    <div class="agent-plan-title">执行大纲</div>
                    <ul>
                      <li v-for="(step, idx) in agent.plan" :key="idx">{{ step }}</li>
                    </ul>
                  </div>
                  <div class="agent-log">
                    <div class="agent-plan-title">进度汇报</div>
                    <div class="agent-log-item" v-for="log in agent.logs" :key="log.id">
                      {{ formatTime(log.timestamp) }} · {{ log.message }}
                    </div>
                  </div>
                  <div class="agent-actions">
                    <n-button size="tiny" @click="appendLog(agent.id)">记录进度</n-button>
                    <n-button size="tiny" type="warning" @click="stopAgent(agent.id)">停止</n-button>
                  </div>
                </n-collapse-item>
              </n-collapse>
            </div>
          </n-card>
        </n-space>
      </n-layout-sider>
    </n-layout>
  </div>

  <n-modal v-model:show="showKnowledgeModal" preset="card" style="width: min(980px, 92vw)" :bordered="false">
    <template #header>{{ viewingKnowledge?.title || "知识详情" }}</template>
    <n-space vertical :size="10">
      <div class="knowledge-meta">
        <span v-if="viewingKnowledge?.sourceUrl">{{ viewingKnowledge?.sourceUrl }}</span>
        <span v-else>{{ viewingKnowledge?.source || 'manual' }}</span>
        <span v-if="viewingKnowledge?.createdAt"> · {{ formatTime(viewingKnowledge?.createdAt) }}</span>
      </div>
      <div v-if="viewingKnowledge?.summary" class="knowledge-content">{{ viewingKnowledge?.summary }}</div>
      <n-scrollbar style="max-height: 65vh">
        <MarkdownRenderer :content="viewingKnowledge?.content || ''" />
      </n-scrollbar>
    </n-space>
    <template #footer>
      <n-space justify="end" :size="8">
        <n-button size="small" type="error" :disabled="!viewingKnowledge" @click="removeKnowledge(viewingKnowledge?.id || '')">删除</n-button>
      </n-space>
    </template>
  </n-modal>
  <n-modal v-model:show="showKnowledgeEditor" preset="card" title="新增文档" style="width: min(720px, 92vw)" :bordered="false">
    <template #header-extra>
      <n-button size="small" type="primary" @click="createKnowledge">保存</n-button>
    </template>
    <n-form label-placement="left" label-width="60">
      <n-form-item label="标题">
        <n-input v-model:value="knowledgeForm.title" placeholder="知识标题" />
      </n-form-item>
      <n-form-item label="标签">
        <n-space align="center" :size="8" style="flex-wrap: wrap">
          <n-tag
            v-for="tag in knowledgeForm.tags"
            :key="tag"
            size="tiny"
            round
            closable
            :bordered="false"
            class="tag-chip"
            @close="removeKnowledgeTag(tag)"
          >
            {{ tag }}
          </n-tag>
        </n-space>
        <n-space align="center" :size="6" style="margin-top: 6px">
          <n-input
            v-model:value="newKnowledgeTag"
            size="small"
            placeholder="添加标签"
            @keyup.enter="addKnowledgeTag"
          />
          <n-button size="small" @click="addKnowledgeTag" :disabled="!newKnowledgeTag.trim()">添加</n-button>
        </n-space>
      </n-form-item>
      <n-form-item label="内容">
        <n-input
          v-model:value="knowledgeForm.content"
          type="textarea"
          placeholder="知识内容或参考链接"
          :autosize="{ minRows: 4, maxRows: 12 }"
        />
      </n-form-item>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAgentHubStore, type Task, type KnowledgeItem } from "../stores/agentHub";
import MarkdownRenderer from "../components/MarkdownRenderer.vue";
import AgentTemplePanel from "../components/AgentTemple/AgentTemplePanel.vue";
import { useDebouncedTaskDescAutofill } from "../composables/useDebouncedTaskDesc";
import { computed, onMounted, reactive, ref, toRef, watch } from "vue";

const activeTab = ref("board");
const agentHubStore = useAgentHubStore();
const { tasks, agents, knowledgeBase, templates, autoDispatch, hubLogs } = storeToRefs(agentHubStore);

const taskForm = reactive({
  title: "",
  description: "",
  templateId: undefined as string | undefined,
  knowledgeIds: [] as string[],
});

const knowledgeForm = reactive({
  title: "",
  content: "",
  tags: [] as string[],
});

const newKnowledgeTag = ref("");
const taskOutputDrafts = reactive<Record<string, string>>({});

const knowledgeQuery = ref("");
const knowledgeSource = ref<"all" | "manual" | "training" | "memory">("all");

const autoSuggestDesc = ref(true);

const showDoneModal = ref(false);
const doneModalTitle = ref("");
const doneModalContent = ref("");
const showKnowledgeModal = ref(false);
const showKnowledgeEditor = ref(false);
const viewingKnowledge = ref<KnowledgeItem | null>(null);

const knowledgeSourceOptions = [
  { label: "全部", value: "all" },
  { label: "训练", value: "training" },
  { label: "经验", value: "memory" },
  { label: "手动", value: "manual" },
];

const knowledgeOptions = computed(() =>
  knowledgeBase.value.map((k) => ({
    label: k.title,
    value: k.id,
  }))
);

const templateOptions = computed(() =>
  templates.value.map((t) => ({
    label: t.name,
    value: t.id,
  }))
);

const selectedTemplateInfo = computed(() => {
  const id = taskForm.templateId;
  if (!id) return null;
  const t = templates.value.find((x) => x.id === id);
  if (!t) return null;
  return {
    name: t.name,
    role: t.role,
    description: t.description,
    systemPrompt: t.systemPrompt,
  };
});

const todoTasks = computed(() => tasks.value.filter((t) => t.status === "todo"));
const inProgressTasks = computed(() => tasks.value.filter((t) => t.status === "in_progress"));
const doneTasks = computed(() => tasks.value.filter((t) => t.status === "done"));

const filteredKnowledge = computed(() => {
  const q = knowledgeQuery.value.trim().toLowerCase();
  return knowledgeBase.value
    .filter((k: any) => {
      if (knowledgeSource.value !== "all" && k?.source !== knowledgeSource.value) return false;
      if (!q) return true;
      const hay = `${k.title || ""}\n${k.summary || ""}\n${k.content || ""}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 200);
});

onMounted(async () => agentHubStore.loadData());

watch(autoDispatch, (value) => {
  agentHubStore.logHub(value ? "自动派发已开启" : "自动派发已关闭");
  agentHubStore.saveData();
});


async function handleCreateTask() {
  if (!taskForm.title.trim()) return;
  await agentHubStore.createTask({
    title: taskForm.title,
    description: taskForm.description,
    templateId: taskForm.templateId,
    knowledgeIds: taskForm.knowledgeIds,
  });
  taskForm.title = "";
  taskForm.description = "";
  taskForm.templateId = undefined;
  taskForm.knowledgeIds = [];
}

const titleRef = toRef(taskForm, "title");
const descRef = toRef(taskForm, "description");

const { isGenerating: isFillingDesc, generateOnce: fillTaskDescription } = useDebouncedTaskDescAutofill({
  title: titleRef,
  description: descRef,
  templateInfo: selectedTemplateInfo as any,
  enabled: autoSuggestDesc,
  options: { debounceMs: 1200 },
});

async function dispatchTask(taskId: string) {
  await agentHubStore.dispatchTask(taskId);
}

async function dispatchAll() {
  const pending = tasks.value.filter((t) => t.status === "todo");
  for (const t of pending) {
    await agentHubStore.dispatchTask(t.id);
  }
}

function getTemplateName(templateId?: string) {
  if (!templateId) return "";
  const t = templates.value.find((x) => x.id === templateId);
  return t ? t.name : templateId;
}

function previewPrompt(prompt: string) {
  const text = String(prompt || "").replace(/\s+/g, " ").trim();
  if (text.length <= 120) return text;
  return text.slice(0, 120) + "...";
}

function previewDoneSnippet(text: string) {
  const raw = String(text || "");
  const oneLine = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (oneLine.length <= 160) return oneLine;
  return oneLine.slice(0, 160) + "...";
}

function openDonePreview(task: Task) {
  doneModalTitle.value = task.title;
  doneModalContent.value = task.output || "";
  showDoneModal.value = true;
}

async function stopAgent(agentId?: string) {
  if (!agentId) return;
  await agentHubStore.stopAgent(agentId);
}

async function completeTask(taskId: string) {
  await agentHubStore.completeTask(taskId);
}

async function restartTask(taskId: string) {
  await agentHubStore.restartTask(taskId);
}

async function saveTaskOutput(task: Task) {
  const value = taskOutputDrafts[task.id] ?? task.output;
  await agentHubStore.updateTaskOutput(task.id, value);
}

async function createKnowledge() {
  if (!knowledgeForm.title.trim()) return;
  await agentHubStore.createKnowledge({
    title: knowledgeForm.title,
    content: knowledgeForm.content,
    tags: knowledgeForm.tags,
  });
  knowledgeForm.title = "";
  knowledgeForm.content = "";
  knowledgeForm.tags = [];
  newKnowledgeTag.value = "";
  showKnowledgeEditor.value = false;
}

async function removeKnowledge(id: string) {
  await agentHubStore.removeKnowledge(id);
  if (viewingKnowledge.value?.id === id) {
    showKnowledgeModal.value = false;
    viewingKnowledge.value = null;
  }
}

function openKnowledge(item: KnowledgeItem) {
  viewingKnowledge.value = item;
  showKnowledgeModal.value = true;
}

function addKnowledgeTag() {
  const t = newKnowledgeTag.value.trim();
  if (!t) return;
  if (!knowledgeForm.tags.includes(t)) {
    knowledgeForm.tags.push(t);
  }
  newKnowledgeTag.value = "";
}

function removeKnowledgeTag(tag: string) {
  knowledgeForm.tags = knowledgeForm.tags.filter((t) => t !== tag);
}

function taskKnowledgeTags(task: Task) {
  return knowledgeBase.value
    .filter((k) => task.knowledgeIds.includes(k.id))
    .flatMap((k) => k.tags)
    .slice(0, 4);
}

function getAgentName(agentId?: string) {
  if (!agentId) return "未派发";
  return agents.value.find((a) => a.id === agentId)?.name || "未派发";
}

function getTaskTitle(taskId: string) {
  return tasks.value.find((t) => t.id === taskId)?.title || "未知任务";
}

async function appendLog(agentId: string) {
  await agentHubStore.appendAgentLog(agentId, "进度已更新，等待下一步。");
}

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}
</script>

<style scoped>
.agent-hub-view {
  height: 100%;
  min-height: 0;
  padding: 12px;
  box-sizing: border-box;
  background: transparent;
  color: #1f2d3d;
  font-family: "Avenir Next", "PingFang SC", "Helvetica Neue", sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.hub-layout {
  background: transparent;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

 :deep(.hub-tabs) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
 }

 :deep(.hub-tabs .n-tabs-nav) {
  flex: 0 0 auto;
 }

 :deep(.hub-tabs .n-tabs-pane-wrapper),
 :deep(.hub-tabs .n-tabs-content) {
  flex: 1;
  min-height: 0;
 }

 :deep(.hub-tabs .n-tabs-content) {
  overflow: hidden;
 }

.workflow-panel,
.task-panel {
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 12px 30px rgba(15, 30, 55, 0.08);
}

.workflow-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.workflow-canvas {
  height: 520px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(15, 30, 55, 0.08);
  background: #fff;
}

.vue-flow-canvas {
  width: 100%;
  height: 100%;
}

.block-node {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  min-width: 140px;
  border: 1px solid rgba(15, 30, 55, 0.12);
  box-shadow: 0 8px 18px rgba(15, 30, 55, 0.12);
  text-align: left;
  position: relative;
}

.block-node[data-kind="hub"] {
  border-color: rgba(32, 109, 255, 0.35);
  background: linear-gradient(135deg, rgba(32, 109, 255, 0.08), rgba(255, 255, 255, 0.95));
}

.block-node[data-kind="agent"] {
  border-color: rgba(24, 160, 88, 0.35);
}

.block-node-title {
  font-weight: 600;
  color: #2c3e50;
}

.block-node-meta {
  font-size: 11px;
  color: #7687a5;
  margin-top: 4px;
}

.task-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.task-create-card {
  border-radius: 14px;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.board-column {
  background: #f9fafb;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.board-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.board-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.task-card {
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(15, 30, 55, 0.08);
}

.task-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.task-title {
  font-weight: 600;
  color: #2b3a4a;
}

.task-time {
  font-size: 11px;
  color: #8a97ab;
}

.task-desc {
  font-size: 12px;
  color: #4b5b6a;
  margin-bottom: 6px;
}

.task-meta {
  font-size: 12px;
  color: #2f3d4d;
  margin-bottom: 6px;
}

.task-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.task-tag {
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
}

.task-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.hub-card,
.knowledge-card,
.agent-card {
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(12, 26, 60, 0.08);
}

.hub-log {
  margin-top: 12px;
}

.hub-log-title {
  font-size: 12px;
  color: #8391a5;
  margin-bottom: 6px;
}

.hub-log-item {
  font-size: 12px;
  color: #3b4a5a;
  padding: 4px 0;
}

.knowledge-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.knowledge-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.knowledge-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.knowledge-list-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.knowledge-item {
  border-radius: 12px;
}

.knowledge-title {
  font-weight: 600;
}

.knowledge-content {
  font-size: 12px;
  color: #5a697a;
  margin: 4px 0 6px;
}

.knowledge-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.tag-chip {
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
}

.agent-list {
  max-height: 320px;
  overflow-y: auto;
}

.agent-meta {
  font-size: 12px;
  color: #4b5b6a;
  margin-bottom: 4px;
}

.agent-plan-title {
  font-size: 12px;
  color: #718096;
  margin-bottom: 4px;
}

.agent-plan ul {
  padding-left: 18px;
  margin: 0 0 8px;
  font-size: 12px;
  color: #3b4a5a;
}

.agent-log-item {
  font-size: 12px;
  color: #3b4a5a;
  padding: 4px 0;
}

.agent-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 1200px) {
  .board-columns {
    grid-template-columns: 1fr;
  }

  .hub-layout :deep(.n-layout-sider) {
    display: none;
  }
}
</style>
