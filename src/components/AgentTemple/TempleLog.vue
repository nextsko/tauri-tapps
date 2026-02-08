<template>
  <div class="temple-log">
    <div class="temple-log-title">殿堂日志</div>
    <n-scrollbar style="max-height: 280px">
      <div v-for="item in logs" :key="item.id" class="temple-log-item">
        {{ formatTime(item.timestamp) }} · {{ roleLabel(item.role) }} · {{ item.message }}
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAgentTempleStore } from "../../stores/agentTemple";

const store = useAgentTempleStore();
const { logs } = storeToRefs(store);

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    hub: "枢纽",
    priest: "神官",
    planner: "规划官",
    creator: "缔造者",
  };
  return map[role] || role;
}
</script>

<style scoped>
.temple-log {
  border-radius: 8px;
}

.temple-log-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.temple-log-item {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.75);
  padding: 4px 0;
}
</style>
