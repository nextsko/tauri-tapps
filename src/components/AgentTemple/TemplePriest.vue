<template>
  <n-card :bordered="false">
    <template #header>神官（Prompt 生成官）</template>
    <n-form label-placement="left" label-width="90">
      <n-form-item label="目的">
        <n-input v-model:value="priest.purpose" placeholder="这个 Agent 用来做什么" />
      </n-form-item>
      <n-form-item label="角色">
        <n-input v-model:value="priest.role" placeholder="例如 子Agent / 研究员 / 编程助手" />
      </n-form-item>
      <n-form-item label="风格">
        <n-input v-model:value="priest.style" placeholder="例如 结构化、严谨、简洁" />
      </n-form-item>
      <n-form-item label="约束">
        <n-input v-model:value="priest.constraints" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" />
      </n-form-item>
      <n-form-item>
        <n-button type="primary" :loading="isGenerating" @click="generate">生成 system prompt</n-button>
        <n-button style="margin-left: 8px" @click="save">保存</n-button>
      </n-form-item>
      <n-form-item label="system prompt">
        <n-input v-model:value="priest.systemPrompt" type="textarea" :autosize="{ minRows: 6, maxRows: 16 }" />
      </n-form-item>
    </n-form>
  </n-card>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { ref } from "vue";
import { useAgentTempleStore } from "../../stores/agentTemple";

const store = useAgentTempleStore();
const { priest } = storeToRefs(store);

const isGenerating = ref(false);

async function generate() {
  isGenerating.value = true;
  try {
    await store.priestGenerateSystemPrompt();
  } finally {
    isGenerating.value = false;
  }
}

async function save() {
  await store.saveData();
}
</script>
