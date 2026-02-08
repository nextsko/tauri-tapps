import { ref, watch, type Ref } from "vue";
import { promptLLM } from "../utils/llm";

export interface TaskDescAutofillOptions {
  debounceMs?: number;
}

export function useDebouncedTaskDescAutofill(params: {
  title: Ref<string>;
  description: Ref<string>;
  templateInfo: Ref<{
    name?: string;
    role?: string;
    description?: string;
    systemPrompt?: string;
  } | null>;
  enabled: Ref<boolean>;
  options?: TaskDescAutofillOptions;
}) {
  const isGenerating = ref(false);
  let timer: number | undefined;

  async function generateOnce() {
    const title = params.title.value.trim();
    if (!title) return;

    const tpl = params.templateInfo.value;
    const tplText = tpl
      ? `\n\n选定 Agent 模板：\n- 名称：${tpl.name || ""}\n- 角色：${tpl.role || ""}\n- 风格/说明：${tpl.description || ""}\n- systemPrompt(节选)：${String(tpl.systemPrompt || "").slice(0, 400)}`
      : "";

    const prompt = `你是一个任务分解助手。根据任务标题，为用户生成任务描述（中文），要求清晰、可执行。\n\n请按以下结构输出：\n1) 背景/目标（1-2 句）\n2) 验收标准（3-6 条）\n3) 关键步骤（3-8 条）\n4) 输入/输出（各 1-3 条）\n\n任务标题：${title}${tplText}`;

    isGenerating.value = true;
    try {
      const desc = await promptLLM(prompt);
      params.description.value = String(desc || "");
    } finally {
      isGenerating.value = false;
    }
  }

  function schedule() {
    if (!params.enabled.value) return;
    if (params.description.value.trim()) return;

    if (timer) {
      clearTimeout(timer);
    }

    const wait = params.options?.debounceMs ?? 1200;
    timer = window.setTimeout(() => {
      void generateOnce();
    }, wait);
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  watch(
    () => params.title.value,
    () => {
      cancel();
      schedule();
    }
  );

  watch(
    () => params.enabled.value,
    () => {
      cancel();
      schedule();
    }
  );

  return {
    isGenerating,
    generateOnce,
    cancel,
  };
}
