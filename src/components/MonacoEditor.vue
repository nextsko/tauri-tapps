<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import loader from "@monaco-editor/loader";
import { onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
  modelValue: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const editorContainer = ref<HTMLElement>();
let editor: any = null;

onMounted(async () => {
  const monaco = await loader.init();

  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language || "markdown",
      theme: props.theme || "vs",
      readOnly: props.readOnly || false,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: "on",
      wordWrap: "on",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
    });

    editor.onDidChangeModelContent(() => {
      emit("update:modelValue", editor.getValue());
    });
  }
});

watch(() => props.modelValue, (newValue) => {
  if (editor && editor.getValue() !== newValue) {
    editor.setValue(newValue);
  }
});

watch(() => props.theme, (newTheme) => {
  if (editor) {
    loader.init().then((monaco) => {
      monaco.editor.setTheme(newTheme || "vs");
    });
  }
});

onUnmounted(() => {
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
</style>
