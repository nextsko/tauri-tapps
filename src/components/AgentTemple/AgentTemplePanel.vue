<template>
  <div class="temple-panel">
    <TempleWorkshop />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import TempleWorkshop from "./TempleWorkshop.vue";
import { useAgentTempleStore } from "../../stores/agentTemple";

const store = useAgentTempleStore();

onMounted(() => {
  void store.loadData();
});
</script>

<style scoped>
.temple-panel {
  min-height: 540px;
}
</style>
