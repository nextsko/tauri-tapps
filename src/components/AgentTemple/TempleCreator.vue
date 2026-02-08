<template>
  <n-card :bordered="false">
    <template #header>缔造者（组合与封装 Agent）</template>

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
        <n-input v-model:value="creator.systemPrompt" type="textarea" :autosize="{ minRows: 8, maxRows: 18 }" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="create">封装为 Agent</n-button>
        <n-button style="margin-left: 8px" :disabled="!selectedCreatedId" @click="snapshot">版本快照</n-button>
        <n-button style="margin-left: 8px" @click="save">保存</n-button>
      </n-form-item>
    </n-form>

    <n-divider />

    <div class="created">
      <div class="created-title">已缔造</div>
      <n-card v-for="a in createdAgents" :key="a.id" size="small" :bordered="false" class="created-card">
        <div class="created-name">{{ a.name }}</div>
        <div class="created-desc">{{ a.description }}</div>
        <div class="created-actions">
          <n-button size="tiny" @click="loadToEditor(a)">载入编辑</n-button>
          <n-button size="tiny" type="success" @click="exportToHub(a)">导入到 Agent 库</n-button>
        </div>
      </n-card>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useAgentHubStore } from "../../stores/agentHub";
import { useAgentTempleStore } from "../../stores/agentTemple";

const temple = useAgentTempleStore();
const hub = useAgentHubStore();

const { creator, createdAgents } = storeToRefs(temple);

const selectedCreatedId = computed(() => {
  const name = String(creator.value.name || "").trim();
  if (!name) return null;
  const existing = createdAgents.value.find((a: any) => a.name === name);
  return existing ? existing.id : null;
});

async function create() {
  const t = await temple.creatorComposeAgent();
  if (!t) return;
}

function snapshot() {
  if (!selectedCreatedId.value) return;
  temple.snapshotCreatedAgent(selectedCreatedId.value);
}

async function save() {
  await temple.saveData();
}

function loadToEditor(a: any) {
  temple.loadAgentToCreator(a);
}

async function exportToHub(a: any) {
  await hub.importTemplate(a);
}
</script>

<style scoped>
.created-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.created-card {
  margin-bottom: 10px;
}

.created-name {
  font-weight: 600;
}

.created-desc {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  margin-top: 4px;
}

.created-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
