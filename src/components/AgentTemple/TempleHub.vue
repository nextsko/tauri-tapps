<template>
  <n-card :bordered="false">
    <template #header>殿堂枢纽</template>
    <n-space vertical :size="12">
      <n-text depth="3">枢纽负责协调神官/规划官/缔造者的工作流，并将产物沉淀到 Agent 库。</n-text>
      <n-button size="small" @click="load">加载殿堂数据</n-button>
      <n-button size="small" @click="save">保存殿堂数据</n-button>
      <n-divider />
      <TempleLog />
    </n-space>
  </n-card>
</template>

<script setup lang="ts">
import { useAgentTempleStore } from "../../stores/agentTemple";
import TempleLog from "./TempleLog.vue";

const store = useAgentTempleStore();

async function load() {
  await store.loadData();
}

async function save() {
  await store.saveData();
}
</script>
