<template>
  <div class="emoji-tool">
    <div class="header">
      <div class="title">符号表情小工具</div>
      <div class="subtitle">点击复制你喜欢的符号表情吧！</div>
    </div>
    <div class="emoji-grid">
      <div
        v-for="(emoji, index) in filteredEmojis"
        :key="index"
        class="emoji-item"
        @click="copyToClipboard(emoji.value)"
      >
        <span class="emoji-text">{{ emoji.value }}</span>
      </div>
    </div>
    <div class="footer">
      <n-input
        v-model:value="searchTerm"
        placeholder="搜索表情..."
        clearable
        size="large"
      />
    </div>
    <n-popover
      trigger="manual"
      :show="showCopiedPopover"
      placement="top"
      style="
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      "
    >
      <template #trigger>
        <div
          style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
          "
        ></div>
      </template>
      <span>复制成功！</span>
    </n-popover>
  </div>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";
import { computed, ref } from "vue";

const message = useMessage();

const emojis = ref([
  { value: "😊", tags: ["笑", "开心", "微笑"] },
  { value: "😂", tags: ["笑哭", "大笑", "欢乐"] },
  { value: "😍", tags: ["爱心眼", "喜欢", "爱"] },
  { value: "😭", tags: ["哭", "悲伤", "难过"] },
  { value: "🤔", tags: ["思考", "疑问", "思考者"] },
  { value: "👍", tags: ["赞", "好", "棒"] },
  { value: "👎", tags: ["差", "不好", "反对"] },
  { value: "🙏", tags: ["祈祷", "拜托", "感谢"] },
  { value: "🙌", tags: ["庆祝", "欢呼", "举手"] },
  { value: "✨", tags: ["闪亮", "星星", "魔法"] },
  { value: "💖", tags: ["粉色", "爱心", "喜欢"] },
  { value: "🎉", tags: ["派对", "庆祝", "礼花"] },
  { value: "🔥", tags: ["火", "热门", "酷"] },
  { value: "💯", tags: ["满分", "一百", "完美"] },
  { value: "🚀", tags: ["火箭", "快速", "起飞"] },
  { value: "🤯", tags: ["震惊", "脑洞", "难以置信"] },
  { value: "🤩", tags: ["兴奋", "惊艳", "闪亮"] },
  { value: "🌈", tags: ["彩虹", "美丽", "希望"] },
  { value: "🥰", tags: ["喜欢", "爱慕", "温柔"] },
  { value: "🥳", tags: ["派对", "庆祝", "快乐"] },
]);

const searchTerm = ref("");
const showCopiedPopover = ref(false);

const filteredEmojis = computed(() => {
  if (!searchTerm.value) {
    return emojis.value;
  }
  const lowerCaseSearch = searchTerm.value.toLowerCase();
  return emojis.value.filter((emoji) =>
    emoji.tags.some((tag) => tag.toLowerCase().includes(lowerCaseSearch))
  );
});

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success("复制成功！");
  } catch (err) {
    message.error("复制失败，请手动复制。");
    console.error("Failed to copy: ", err);
  }
};
</script>

<style scoped>
.emoji-tool {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
  box-sizing: border-box;
  user-select: none;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-top: 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
  width: 100%;
  max-width: 900px;
  margin-bottom: 30px;
}

.emoji-item {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  background-color: #ffffff;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.emoji-item:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.emoji-text {
  font-size: 2.5rem;
  line-height: 1;
}

.footer {
  width: 100%;
  max-width: 400px;
}

:deep(.n-input) {
  --n-border-radius: 25px !important;
  --n-height: 50px !important;
  --n-font-size: 16px !important;
}

:deep(.n-input .n-input__input-el) {
  padding-left: 20px !important;
}
</style>
