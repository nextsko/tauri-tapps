<template>
  <n-message-provider>
    <n-config-provider>
      <div class="app-container">
        <n-layout has-sider>
          <!-- 侧边栏 -->
          <n-layout-sider
            collapse-mode="width"
            :collapsed-width="64"
            :width="200"
            :native-scrollbar="false"
            show-trigger="bar"
            style="user-select: none"
          >
            <n-menu
              :value="activeMenu"
              :options="menuOptions"
              @update:value="handleMenuChange"
            />
          </n-layout-sider>

          <!-- 主内容区 -->
          <n-layout>
            <router-view />
          </n-layout>
        </n-layout>
      </div>
    </n-config-provider>
  </n-message-provider>
</template>

<script lang="ts" setup>
import {
  BookOutlined,
  RobotOutlined,
  SettingOutlined,
  TranslationOutlined,
  GlobalOutlined,
} from "@vicons/antd";
import { Emoji16Regular } from "@vicons/fluent";
import { NIcon } from "naive-ui";
import { h, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "./stores/settings";

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();

// 应用启动时加载配置
onMounted(async () => {
  try {
    await settingsStore.loadLLMConfig();
    console.log("LLM config loaded successfully");
  } catch (error) {
    console.error("Failed to load LLM config on app start:", error);
  }
});

const activeMenu = ref("prompt");

const menuOptions = [
  {
    label: "提示词管理",
    key: "prompt",
    icon: () => h(NIcon, null, { default: () => h(BookOutlined) }),
  },
  {
    label: "快捷翻译",
    key: "translate",
    icon: () => h(NIcon, null, { default: () => h(TranslationOutlined) }),
  },
  {
    label: "LLM 演示",
    key: "llm-demo",
    icon: () => h(NIcon, null, { default: () => h(RobotOutlined) }),
  },
  {
    label: "Emoji 演示",
    key: "emoji",
    icon: () => h(NIcon, null, { default: () => h(Emoji16Regular) }),
  },
  {
    label: "网页智能对话",
    key: "web-chat",
    icon: () => h(NIcon, null, { default: () => h(GlobalOutlined) }),
  },
  {
    label: "设置",
    key: "settings",
    icon: () => h(NIcon, null, { default: () => h(SettingOutlined) }),
  },
];

const handleMenuChange = (key: string) => {
  activeMenu.value = key;
  router.push(`/${key}`);
};

// 监听路由变化更新菜单
watch(
  () => route.path,
  (newPath) => {
    const key = newPath.slice(1) || "prompt";
    activeMenu.value = key;
  },
  { immediate: true }
);
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
