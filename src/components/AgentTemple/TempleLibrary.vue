<template>
  <n-card :bordered="false">
    <template #header>Agent 库（殿堂侧）</template>

    <n-space vertical :size="10">
      <n-text depth="3">这里展示由缔造者沉淀的 Agent，以及已导入枢纽的模板。</n-text>

      <n-space align="center" :size="8">
        <n-input v-model:value="query" clearable placeholder="搜索名称/描述/标签" style="max-width: 260px" />
        <n-select v-model:value="tag" clearable placeholder="标签筛选" style="width: 180px" :options="tagOptions" />
        <n-button size="small" @click="exportTempleAgents">导出 JSON</n-button>
        <n-button size="small" @click="triggerImport">导入 JSON</n-button>
        <input ref="fileInput" type="file" accept="application/json" style="display: none" @change="handleImport" />
      </n-space>

      <n-divider />

      <div class="library-title">殿堂已缔造</div>
      <n-card v-for="a in filteredCreated" :key="a.id" size="small" :bordered="false" class="library-card">
        <div class="library-name">{{ a.name }}</div>
        <div class="library-desc">{{ a.description }}</div>
        <div class="library-meta">
          <n-text depth="3">版本：{{ Array.isArray((a as any).versions) ? (a as any).versions.length : 0 }}</n-text>
        </div>
        <div class="library-tags">
          <n-tag v-for="t in a.tags" :key="t" size="tiny" round :bordered="false" class="task-tag">{{ t }}</n-tag>
        </div>
        <div class="library-actions">
          <n-button size="tiny" @click="loadToCreator(a)">载入编辑</n-button>
          <n-button size="tiny" @click="snapshot(a)">版本快照</n-button>
          <n-button size="tiny" type="success" @click="importToHub(a)">导入枢纽模板</n-button>
          <n-button size="tiny" type="error" @click="remove(a)">删除</n-button>
        </div>
      </n-card>

      <n-divider />

      <div class="library-title">枢纽模板库</div>
      <n-card v-for="a in filteredHubTemplates" :key="a.id" size="small" :bordered="false" class="library-card">
        <div class="library-name">{{ a.name }}</div>
        <div class="library-desc">{{ a.description }}</div>
        <div class="library-tags">
          <n-tag v-for="t in a.tags" :key="t" size="tiny" round :bordered="false" class="task-tag">{{ t }}</n-tag>
        </div>
      </n-card>
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useAgentHubStore } from "../../stores/agentHub";
import { useAgentTempleStore } from "../../stores/agentTemple";

const temple = useAgentTempleStore();
const hub = useAgentHubStore();

const { createdAgents } = storeToRefs(temple);
const { templates } = storeToRefs(hub);

const query = ref("");
const tag = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const hubTemplates = computed(() => templates.value.slice(0, 200));

const tagOptions = computed(() => {
  const set = new Set<string>();
  for (const a of createdAgents.value) for (const t of a.tags || []) set.add(t);
  for (const a of hubTemplates.value) for (const t of a.tags || []) set.add(t);
  return Array.from(set)
    .sort()
    .slice(0, 200)
    .map((x) => ({ label: x, value: x }));
});

function match(a: any) {
  const q = query.value.trim().toLowerCase();
  const tg = tag.value;
  if (tg && !(a?.tags || []).includes(tg)) return false;
  if (!q) return true;
  const hay = `${a?.name || ""}
${a?.description || ""}
${(a?.tags || []).join(" ")}`.toLowerCase();
  return hay.includes(q);
}

const filteredCreated = computed(() => createdAgents.value.filter(match));
const filteredHubTemplates = computed(() => hubTemplates.value.filter(match));

function loadToCreator(a: any) {
  temple.loadAgentToCreator(a);
}

function snapshot(a: any) {
  temple.snapshotCreatedAgent(a.id);
}

async function importToHub(a: any) {
  await hub.importTemplate(a);
}

function remove(a: any) {
  temple.deleteCreatedAgent(a.id);
}

function exportTempleAgents() {
  const text = JSON.stringify(createdAgents.value, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "temple-agents.json";
  a.click();
  URL.revokeObjectURL(url);
}

function triggerImport() {
  fileInput.value?.click();
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    temple.importCreatedAgents(data);
  } finally {
    input.value = "";
  }
}
</script>

<style scoped>
.library-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.library-card {
  margin-bottom: 10px;
}

.library-name {
  font-weight: 600;
}

.library-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
}

.library-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.library-meta {
  margin-top: 6px;
}

.library-actions {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
