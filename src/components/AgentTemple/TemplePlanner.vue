<template>
  <n-card :bordered="false">
    <template #header>任务规划官（原子化拆解）</template>
    <n-form label-placement="left" label-width="90">
      <n-form-item label="目标">
        <n-input v-model:value="planner.goal" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="要拆解的目标" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" @click="generate">生成原子任务</n-button>
        <n-button style="margin-left: 8px" @click="save">保存</n-button>
      </n-form-item>
    </n-form>

    <n-divider />

    <n-form label-placement="left" label-width="90">
      <n-form-item label="导出前缀">
        <n-input v-model:value="exportPrefix" placeholder="例如 [拆解]" />
      </n-form-item>
      <n-form-item label="模板">
        <n-select v-model:value="exportTemplateId" clearable filterable placeholder="可选：给导出的任务指定 Agent 模板" :options="templateOptions" />
      </n-form-item>
      <n-form-item label="立即开始">
        <n-switch v-model:value="exportStartNow" size="small" />
      </n-form-item>
      <n-form-item>
        <n-button type="success" :disabled="!planner.atoms.length" @click="exportAtomsToTasks">一键转为任务</n-button>
      </n-form-item>
    </n-form>

    <div class="atoms">
      <div class="atoms-title">原子任务</div>
      <n-card v-for="(a, idx) in planner.atoms" :key="idx" size="small" :bordered="false" class="atom-card">
        {{ a }}
      </n-card>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";
import { useAgentHubStore } from "../../stores/agentHub";
import { useAgentTempleStore } from "../../stores/agentTemple";

const store = useAgentTempleStore();
const hub = useAgentHubStore();
const { planner } = storeToRefs(store);
const { templates, tasks, autoDispatch } = storeToRefs(hub);

const exportPrefix = ref("[拆解]");
const exportTemplateId = ref<string | null>(null);
const exportStartNow = ref(true);

const templateOptions = computed(() =>
  templates.value.map((t) => ({
    label: t.name,
    value: t.id,
  }))
);

async function generate() {
  await store.plannerGenerateAtoms();
}

async function save() {
  await store.saveData();
}

async function exportAtomsToTasks() {
  const atoms = Array.isArray(planner.value.atoms) ? planner.value.atoms.map((x) => String(x || "").trim()).filter((x) => x) : [];
  if (!atoms.length) return;

  const prefix = exportPrefix.value.trim();
  const tpl = exportTemplateId.value || undefined;

  for (const atom of atoms) {
    const title = prefix ? `${prefix} ${atom}` : atom;
    await hub.createTask({
      title,
      description: "",
      knowledgeIds: [],
      templateId: tpl,
    });

    if (exportStartNow.value && !autoDispatch.value) {
      const created = tasks.value[0];
      if (created) {
        await hub.dispatchTask(created.id);
      }
    }
  }
}
</script>

<style scoped>
.atoms-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.atom-card {
  margin-bottom: 8px;
}
</style>
