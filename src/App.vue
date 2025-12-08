<template>
  <n-message-provider>
    <div class="app-container">
      <n-layout has-sider>
        <!-- 侧边栏 -->
        <n-layout-sider
          collapse-mode="width"
          :collapsed-width="64"
          :width="200"
          :native-scrollbar="false"
          show-trigger="bar"
        >
          <n-menu
            :value="activeMenu"
            :options="menuOptions"
            @update:value="handleMenuChange"
          />
        </n-layout-sider>

        <!-- 主内容区 -->
        <n-layout>
          <component :is="currentComponent" />
        </n-layout>
      </n-layout>
    </div>
  </n-message-provider>
</template>

<script lang="ts" setup>
import { Robot } from "@vicons/fa";
import { Book } from "@vicons/ionicons5";
import { NIcon } from "naive-ui";
import { computed, ref } from "vue";
import LLMDemo from "./LLMDemo.vue";
import Prompt from "./Prompt.vue";

const activeMenu = ref("prompt");

const menuOptions = [
  {
    label: "提示词管理",
    key: "prompt",
    icon: () => {
      return h(NIcon, null, {
        default: () => h(Book),
      });
    },
  },
  {
    label: "LLM 演示",
    key: "llm",
    icon: () => {
      return h(NIcon, null, {
        default: () => h(Robot),
      });
    },
  },
];

const currentComponent = computed(() => {
  return activeMenu.value === "prompt" ? Prompt : LLMDemo;
});

const handleMenuChange = (key: string) => {
  activeMenu.value = key;
};

import { h } from "vue";
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
}

:deep(.n-layout) {
  height: 100%;
}

:deep(.n-layout-sider) {
  background-color: #f5f5f5;
}
</style>
