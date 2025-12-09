<template>
  <n-modal
    v-model:show="showUpdateModal"
    preset="dialog"
    title="发现新版本"
    positive-text="立即更新"
    negative-text="稍后提醒"
    @positive-click="handleUpdate"
    @negative-click="handleLater"
  >
    <n-space vertical :size="12">
      <n-text>
        发现新版本 <n-text strong>{{ updateInfo?.version }}</n-text>
      </n-text>
      <n-text v-if="updateInfo?.body" depth="3">
        {{ updateInfo.body }}
      </n-text>
      <n-progress
        v-if="isUpdating"
        type="line"
        :percentage="downloadProgress"
        :status="downloadProgress === 100 ? 'success' : 'default'"
      />
      <n-text v-if="isUpdating" depth="3" style="font-size: 12px">
        {{ downloadProgress === 100 ? '下载完成，准备安装...' : `下载中... ${downloadProgress}%` }}
      </n-text>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useMessage } from 'naive-ui';
import { onMounted, ref } from 'vue';

const message = useMessage();
const showUpdateModal = ref(false);
const isUpdating = ref(false);
const downloadProgress = ref(0);
const updateInfo = ref<any>(null);

let updateInstance: any = null;

/**
 * 检查更新
 */
async function checkForUpdates(silent = false) {
  try {
    const update = await check();

    if (update) {
      updateInstance = update;
      updateInfo.value = {
        version: update.version,
        body: update.body,
        date: update.date,
      };
      showUpdateModal.value = true;
    } else if (!silent) {
      message.success('当前已是最新版本');
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (!silent) {
      message.error(`检查更新失败: ${error}`);
    }
  }
}

/**
 * 执行更新
 */
async function handleUpdate() {
  if (!updateInstance) return;

  isUpdating.value = true;
  downloadProgress.value = 0;

  try {
    // 下载并安装更新
    await updateInstance.downloadAndInstall((event: any) => {
      switch (event.event) {
        case 'Started':
          downloadProgress.value = 0;
          break;
        case 'Progress':
          downloadProgress.value = Math.round(
            (event.data.downloaded / event.data.contentLength) * 100
          );
          break;
        case 'Finished':
          downloadProgress.value = 100;
          break;
      }
    });

    message.success('更新完成，即将重启应用');

    // 等待一秒后重启
    setTimeout(async () => {
      await relaunch();
    }, 1000);
  } catch (error) {
    console.error('更新失败:', error);
    message.error(`更新失败: ${error}`);
    isUpdating.value = false;
  }
}

/**
 * 稍后提醒
 */
function handleLater() {
  showUpdateModal.value = false;
}

// 组件挂载时检查更新（静默模式）
onMounted(() => {
  checkForUpdates(true);
});

// 暴露方法供外部调用
defineExpose({
  checkForUpdates,
});
</script>
