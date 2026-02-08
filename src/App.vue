<template>
  <n-message-provider>
    <n-config-provider>
      <div class="app-container">
        <n-layout has-sider>
          <!-- 侧边栏 -->
          <n-layout-sider
            v-model:collapsed="uiStore.sidebarCollapsed"
            collapse-mode="width"
            :collapsed-width="64"
            :width="200"
            :native-scrollbar="false"
            :show-trigger="false"
            style="user-select: none"
          >
            <div class="sider-body">
              <n-menu
                class="sider-menu"
                :value="uiStore.activeMenu"
                :options="menuOptions"
                @update:value="handleMenuChange"
              />

              <div class="sider-footer">
                <n-button quaternary size="small" @click="uiStore.sidebarCollapsed = !uiStore.sidebarCollapsed">
                  <template #icon>
                    <n-icon>
                      <component :is="uiStore.sidebarCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined" />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </div>
          </n-layout-sider>

          <!-- 主内容区 -->
          <n-layout>
            <router-view />
          </n-layout>
        </n-layout>
      </div>

      <!-- 更新检查器 -->
      <UpdateChecker ref="updateCheckerRef" />
    </n-config-provider>
  </n-message-provider>
</template>

<script lang="ts" setup>
import {
  BookOutlined,
  AppstoreOutlined,
  RobotOutlined,
  SettingOutlined,
  TranslationOutlined,
  GlobalOutlined,
  SmileOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@vicons/antd";
import { NIcon } from "naive-ui";
import { h, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "./stores/settings";
import { useUIStore } from "./stores/ui";
import UpdateChecker from "./components/UpdateChecker.vue";

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

// 应用启动时加载配置
onMounted(async () => {
  try {
    await settingsStore.loadLLMConfig();
    console.log("LLM config loaded successfully");
  } catch (error) {
    console.error("Failed to load LLM config on app start:", error);
  }
});

const menuOptions = [
  {
    label: "提示词管理",
    key: "prompt",
    icon: () => h(NIcon, null, { default: () => h(BookOutlined) }),
  },
  {
    label: "Agent 协作中心",
    key: "agent-hub",
    icon: () => h(NIcon, null, { default: () => h(AppstoreOutlined) }),
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
    icon: () => h(NIcon, null, { default: () => h(SmileOutlined) }),
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
  uiStore.setActiveMenu(key);
  router.push(`/${key}`);
};

// 监听路由变化更新菜单
watch(
  () => route.path,
  (newPath) => {
    const key = newPath.slice(1) || "prompt";
    uiStore.setActiveMenu(key);
  },
  { immediate: true }
);
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
}

 .sider-body {
  height: 100%;
  display: flex;
  flex-direction: column;
 }

 .sider-menu {
  flex: 1;
  min-height: 0;
 }

 .sider-footer {
  padding: 8px 8px 12px;
  display: flex;
  justify-content: center;
 }

:deep(.n-layout) {
  height: 100%;
}

:deep(.n-layout-sider) {
  background-color: #f5f5f5;
}
</style>
