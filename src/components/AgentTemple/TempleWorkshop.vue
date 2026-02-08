<template>
  <n-card :bordered="false">
    <template #header>任务工坊</template>

    <n-form label-placement="left" label-width="90">
      <n-form-item label="输入">
        <n-input v-model:value="workInput" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" placeholder="输入目标/需求/上下文/URL（可直接粘贴）" />
      </n-form-item>

      <n-form-item v-if="detectedUrl" label="识别为 URL">
        <n-space vertical :size="6" style="width: 100%">
          <n-text depth="3">{{ detectedUrl }}</n-text>
          <n-space align="center" :size="8">
            <n-button size="small" :loading="isResolvingContext" @click="resolveContext(true)">抓取并入库</n-button>
            <n-text depth="3" v-if="resolvedSourceTitle">{{ resolvedSourceTitle }}</n-text>
          </n-space>
          <n-text depth="3" v-if="resolvedSourceSummary">{{ resolvedSourceSummary }}</n-text>
        </n-space>
      </n-form-item>

      <n-form-item label="任务模板">
        <n-select v-model:value="taskTemplateId" clearable filterable placeholder="可选：生成任务时绑定 Agent 模板" :options="templateOptions" />
      </n-form-item>

      <n-form-item label="任务前缀">
        <n-input v-model:value="taskPrefix" placeholder="例如 [工坊]" />
      </n-form-item>

      <n-form-item label="立即开始">
        <n-switch v-model:value="startNow" size="small" />
      </n-form-item>

      <n-form-item>
        <n-space :size="8">
          <n-button type="primary" :loading="isGeneratingPrompt" :disabled="!workInput.trim()" @click="generatePrompt">生成 Prompt</n-button>
          <n-button type="info" :loading="isGeneratingAtoms" :disabled="!workInput.trim()" @click="generateAtoms">拆解 Atoms</n-button>
          <n-button type="success" :disabled="!planner.atoms.length" @click="buildTaskDrafts">生成任务草稿</n-button>
        </n-space>
      </n-form-item>
    </n-form>

    <n-divider />

    <n-space vertical :size="12">
      <n-card size="small" :bordered="false" class="result-card">
        <template #header>Prompt（神官）</template>
        <n-input v-model:value="priest.systemPrompt" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" placeholder="生成后的 system prompt 会显示在这里" />
        <n-space align="center" :size="8" style="margin-top: 8px">
          <n-button size="small" :disabled="!priest.systemPrompt.trim()" @click="applyPromptToCreator">应用到缔造者</n-button>
          <n-button size="small" :disabled="!priest.systemPrompt.trim()" @click="saveTemple">保存</n-button>
        </n-space>
      </n-card>

      <n-card size="small" :bordered="false" class="result-card">
        <template #header>Atoms（规划官）</template>
        <n-space vertical :size="6">
          <n-text depth="3" v-if="!planner.atoms.length">暂无 atoms，点击“拆解 Atoms”生成。</n-text>
          <n-tag v-for="(a, idx) in planner.atoms" :key="idx" size="small" round :bordered="false" class="atom-tag">{{ a }}</n-tag>
        </n-space>
        <n-space align="center" :size="8" style="margin-top: 8px">
          <n-button size="small" :disabled="!planner.atoms.length" @click="saveTemple">保存</n-button>
        </n-space>
      </n-card>

      <n-card size="small" :bordered="false" class="result-card" v-if="taskDrafts.length">
        <template #header>任务草稿（确认后写入看板）</template>
        <n-space vertical :size="8">
          <div v-for="d in taskDrafts" :key="d.id" class="draft-row">
            <n-checkbox v-model:checked="d.selected" />
            <n-input v-model:value="d.title" size="small" placeholder="任务标题" style="flex: 1" />
          </div>
          <n-space align="center" :size="8">
            <n-button size="small" @click="selectAllDrafts(true)">全选</n-button>
            <n-button size="small" @click="selectAllDrafts(false)">全不选</n-button>
            <n-button size="small" @click="clearDrafts">清空</n-button>
            <n-button type="success" size="small" :disabled="selectedDraftCount === 0" :loading="isCreatingTasks" @click="confirmCreateTasks">
              确认创建 {{ selectedDraftCount }} 个任务
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card size="small" :bordered="false" class="result-card">
        <template #header>封装 Agent（缔造者）</template>
        <n-form label-placement="left" label-width="90">
          <n-form-item label="名称">
            <n-input v-model:value="creator.name" placeholder="例如 文档总结 Agent" />
          </n-form-item>
          <n-form-item label="简介">
            <n-input v-model:value="creator.description" placeholder="一句话描述" />
          </n-form-item>
          <n-form-item label="角色">
            <n-input v-model:value="creator.role" placeholder="例如 子Agent" />
          </n-form-item>
          <n-form-item label="标签">
            <n-dynamic-tags v-model:value="creator.tags" />
          </n-form-item>
          <n-form-item label="system prompt">
            <n-input v-model:value="creator.systemPrompt" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" placeholder="可以从上方 Prompt 一键应用" />
          </n-form-item>
          <n-form-item>
            <n-space :size="8">
              <n-button size="small" type="primary" :disabled="!creator.name.trim()" @click="composeAgent">封装为 Agent</n-button>
              <n-button size="small" :disabled="!creator.name.trim()" @click="saveTemple">保存</n-button>
            </n-space>
          </n-form-item>
        </n-form>
      </n-card>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref, watch } from "vue";
import { useAgentHubStore } from "../../stores/agentHub";
import { useAgentTempleStore } from "../../stores/agentTemple";

const hub = useAgentHubStore();
const temple = useAgentTempleStore();

const { templates, tasks, autoDispatch, knowledgeBase } = storeToRefs(hub);
const { priest, planner, creator } = storeToRefs(temple);

const workInput = ref("");
const taskPrefix = ref("[工坊]");
const taskTemplateId = ref<string | null>(null);
const startNow = ref(true);

const isGeneratingPrompt = ref(false);
const isGeneratingAtoms = ref(false);
const isResolvingContext = ref(false);
const isCreatingTasks = ref(false);

type TaskDraft = {
  id: string;
  selected: boolean;
  title: string;
  description: string;
};

const taskDrafts = ref<TaskDraft[]>([]);

const resolvedKnowledgeId = ref<string | null>(null);
const resolvedSourceUrl = ref<string | null>(null);
const resolvedSourceTitle = ref<string>("");
const resolvedSourceSummary = ref<string>("");
const resolvedContextText = ref<string>("");

const templateOptions = computed(() =>
  templates.value.map((t) => ({
    label: t.name,
    value: t.id,
  }))
);

const selectedDraftCount = computed(() => taskDrafts.value.filter((d) => d.selected).length);

const detectedUrl = computed(() => {
  const raw = String(workInput.value || "").trim();
  if (!raw) return null;
  if (raw.includes("\n") || raw.includes(" ")) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
});

watch(
  () => workInput.value,
  () => {
    const url = detectedUrl.value;
    if (!url) {
      resolvedKnowledgeId.value = null;
      resolvedSourceUrl.value = null;
      resolvedSourceTitle.value = "";
      resolvedSourceSummary.value = "";
      resolvedContextText.value = "";
    }
  }
);

async function saveTemple() {
  await temple.saveData();
}

function buildContextFromKnowledge(url: string, item: any) {
  const title = String(item?.title || "").trim();
  const summary = String(item?.summary || "").trim();
  const content = String(item?.content || "").trim();
  const excerpt = content.length > 2500 ? content.slice(0, 2500) + "..." : content;
  resolvedSourceTitle.value = title;
  resolvedSourceSummary.value = summary;
  resolvedContextText.value = `来源URL：${url}\n标题：${title || "(无)"}\n摘要：${summary || "(无)"}\n内容节选：\n${excerpt || "(无)"}`;
}

async function resolveContext(force: boolean) {
  const url = detectedUrl.value;
  if (!url) {
    resolvedContextText.value = workInput.value;
    return;
  }

  if (!force && resolvedSourceUrl.value === url && resolvedContextText.value) return;

  isResolvingContext.value = true;
  try {
    resolvedSourceUrl.value = url;

    const existing = knowledgeBase.value.find((k: any) => k?.sourceUrl === url);
    if (existing && !force) {
      resolvedKnowledgeId.value = existing.id;
      buildContextFromKnowledge(url, existing);
      return;
    }

    const id = await hub.ingestUrl(url, ["workshop"]);
    resolvedKnowledgeId.value = id;
    const item = knowledgeBase.value.find((k: any) => k.id === id);
    buildContextFromKnowledge(url, item);
  } finally {
    isResolvingContext.value = false;
  }
}

async function generatePrompt() {
  isGeneratingPrompt.value = true;
  try {
    await resolveContext(false);
    priest.value.purpose = resolvedContextText.value || workInput.value;
    await temple.priestGenerateSystemPrompt();
  } finally {
    isGeneratingPrompt.value = false;
  }
}

async function generateAtoms() {
  isGeneratingAtoms.value = true;
  try {
    await resolveContext(false);
    planner.value.goal = resolvedContextText.value || workInput.value;
    await temple.plannerGenerateAtoms();
  } finally {
    isGeneratingAtoms.value = false;
  }
}

function applyPromptToCreator() {
  creator.value.systemPrompt = priest.value.systemPrompt;
  if (priest.value.role) creator.value.role = priest.value.role;
  void temple.saveData();
}

function buildTaskDrafts() {
  const prefix = taskPrefix.value.trim();
  const atoms = Array.isArray(planner.value.atoms) ? planner.value.atoms.map((x) => String(x || "").trim()).filter((x) => x) : [];
  if (!atoms.length) return;
  taskDrafts.value = atoms.map((atom) => ({
    id: crypto.randomUUID(),
    selected: true,
    title: prefix ? `${prefix} ${atom}` : atom,
    description: "",
  }));
}

function selectAllDrafts(v: boolean) {
  taskDrafts.value = taskDrafts.value.map((d) => ({ ...d, selected: v }));
}

function clearDrafts() {
  taskDrafts.value = [];
}

async function confirmCreateTasks() {
  const tpl = taskTemplateId.value || undefined;
  const selected = taskDrafts.value.filter((d) => d.selected && d.title.trim());
  if (!selected.length) return;

  isCreatingTasks.value = true;
  try {
    for (const d of selected) {
      await hub.createTask({
        title: d.title.trim(),
        description: d.description,
        knowledgeIds: resolvedKnowledgeId.value ? [resolvedKnowledgeId.value] : [],
        templateId: tpl,
      });

      if (startNow.value && !autoDispatch.value) {
        const created = tasks.value[0];
        if (created) {
          await hub.dispatchTask(created.id);
        }
      }
    }
    taskDrafts.value = [];
  } finally {
    isCreatingTasks.value = false;
  }
}

async function composeAgent() {
  await temple.creatorComposeAgent();
}
</script>

<style scoped>
.result-card {
  background: rgba(0, 0, 0, 0.02);
}

.atom-tag {
  margin-right: 6px;
  margin-bottom: 6px;
}

.draft-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
