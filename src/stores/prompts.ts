import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { loadJSON, saveJSON } from "../utils/storage";

export interface PromptLegacy {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  createdAt: number;
  content: string;
  note?: string;
}

export interface PromptEntity {
  id: string;
  title: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  currentVersionId: string;
  versionIds: string[];
}

interface PromptsDataV2 {
  prompts: PromptEntity[];
  versions: PromptVersion[];
  selectedPromptId?: string;
}

const PROMPTS_V2_FILE = "prompts-v2.json";
const PROMPTS_LEGACY_FILE = "prompts.json";

function nowTs() {
  return Date.now();
}

function newId() {
  return crypto.randomUUID();
}

export const usePromptsStore = defineStore("prompts", () => {
  const prompts = ref<PromptEntity[]>([]);
  const versions = ref<PromptVersion[]>([]);
  const selectedPromptId = ref<string | null>(null);
  const isLoaded = ref(false);

  const selectedPrompt = computed(() => {
    if (!selectedPromptId.value) return null;
    return prompts.value.find((p) => p.id === selectedPromptId.value) || null;
  });

  const selectedVersion = computed(() => {
    const p = selectedPrompt.value;
    if (!p) return null;
    return versions.value.find((v) => v.id === p.currentVersionId) || null;
  });

  async function saveData() {
    const data: PromptsDataV2 = {
      prompts: prompts.value,
      versions: versions.value,
      selectedPromptId: selectedPromptId.value || undefined,
    };
    await saveJSON(PROMPTS_V2_FILE, data);
  }

  function normalizeLegacy(list: unknown): PromptLegacy[] {
    if (!Array.isArray(list)) return [];
    const now = nowTs();
    return list
      .map((x: any) => {
        const title = String(x?.title || "").trim();
        const content = String(x?.content || "");
        if (!title || !content) return null;
        return {
          id: typeof x?.id === "string" ? x.id : newId(),
          title,
          content,
          tags: Array.isArray(x?.tags) ? x.tags.map((t: any) => String(t || "").trim()).filter((t: string) => t) : [],
          createdAt: typeof x?.createdAt === "number" ? x.createdAt : now,
          updatedAt: typeof x?.updatedAt === "number" ? x.updatedAt : (typeof x?.createdAt === "number" ? x.createdAt : now),
        } as PromptLegacy;
      })
      .filter(Boolean) as PromptLegacy[];
  }

  function importLegacyAsV2(legacy: PromptLegacy[]) {
    const v2Prompts: PromptEntity[] = [];
    const v2Versions: PromptVersion[] = [];

    for (const p of legacy) {
      const pid = p.id || newId();
      const vid = newId();
      v2Versions.push({
        id: vid,
        promptId: pid,
        createdAt: p.updatedAt || p.createdAt || nowTs(),
        content: p.content,
        note: "legacy-import",
      });
      v2Prompts.push({
        id: pid,
        title: p.title,
        tags: Array.isArray(p.tags) ? [...p.tags] : [],
        createdAt: p.createdAt || nowTs(),
        updatedAt: p.updatedAt || p.createdAt || nowTs(),
        currentVersionId: vid,
        versionIds: [vid],
      });
    }

    prompts.value = v2Prompts;
    versions.value = v2Versions;
    selectedPromptId.value = v2Prompts.length ? v2Prompts[0].id : null;
  }

  async function loadData() {
    if (isLoaded.value) return;
    try {
      const data = (await loadJSON(PROMPTS_V2_FILE)) as PromptsDataV2;
      prompts.value = Array.isArray(data?.prompts) ? data.prompts : [];
      versions.value = Array.isArray(data?.versions) ? data.versions : [];
      selectedPromptId.value = typeof data?.selectedPromptId === "string" ? data.selectedPromptId : (prompts.value[0]?.id || null);
      isLoaded.value = true;
      return;
    } catch {
      // ignore
    }

    try {
      const legacyRaw = await loadJSON(PROMPTS_LEGACY_FILE);
      const legacy = normalizeLegacy(legacyRaw);
      importLegacyAsV2(legacy);
      await saveData();
    } catch {
      prompts.value = [];
      versions.value = [];
      selectedPromptId.value = null;
    }

    isLoaded.value = true;
  }

  function selectPrompt(id: string) {
    selectedPromptId.value = id;
    void saveData();
  }

  async function createPrompt(payload: { title: string; tags?: string[]; content: string; note?: string }) {
    const now = nowTs();
    const pid = newId();
    const vid = newId();
    const p: PromptEntity = {
      id: pid,
      title: payload.title.trim(),
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      createdAt: now,
      updatedAt: now,
      currentVersionId: vid,
      versionIds: [vid],
    };
    const v: PromptVersion = {
      id: vid,
      promptId: pid,
      createdAt: now,
      content: payload.content,
      note: payload.note,
    };

    prompts.value.unshift(p);
    versions.value.unshift(v);
    selectedPromptId.value = pid;
    await saveData();
  }

  async function updatePromptMeta(promptId: string, patch: { title?: string; tags?: string[] }) {
    const p = prompts.value.find((x) => x.id === promptId);
    if (!p) return;
    if (typeof patch.title === "string") p.title = patch.title;
    if (Array.isArray(patch.tags)) p.tags = [...patch.tags];
    p.updatedAt = nowTs();
    await saveData();
  }

  async function saveNewVersion(promptId: string, content: string, note?: string) {
    const p = prompts.value.find((x) => x.id === promptId);
    if (!p) return;
    const now = nowTs();
    const vid = newId();
    const v: PromptVersion = {
      id: vid,
      promptId: p.id,
      createdAt: now,
      content,
      note,
    };
    versions.value.unshift(v);
    p.versionIds = [vid, ...(Array.isArray(p.versionIds) ? p.versionIds : [])];
    p.currentVersionId = vid;
    p.updatedAt = now;
    await saveData();
  }

  async function setCurrentVersion(promptId: string, versionId: string) {
    const p = prompts.value.find((x) => x.id === promptId);
    if (!p) return;
    const v = versions.value.find((x) => x.id === versionId && x.promptId === promptId);
    if (!v) return;
    p.currentVersionId = versionId;
    p.updatedAt = nowTs();
    await saveData();
  }

  async function deletePrompt(promptId: string) {
    prompts.value = prompts.value.filter((p) => p.id !== promptId);
    versions.value = versions.value.filter((v) => v.promptId !== promptId);
    if (selectedPromptId.value === promptId) {
      selectedPromptId.value = prompts.value[0]?.id || null;
    }
    await saveData();
  }

  const allTags = computed(() => {
    const set = new Set<string>();
    for (const p of prompts.value) for (const t of p.tags || []) if (t) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  const selectedPromptVersions = computed(() => {
    const p = selectedPrompt.value;
    if (!p) return [];
    const ids = new Set(Array.isArray(p.versionIds) ? p.versionIds : []);
    return versions.value.filter((v) => ids.has(v.id)).sort((a, b) => b.createdAt - a.createdAt);
  });

  return {
    prompts,
    versions,
    selectedPromptId,
    selectedPrompt,
    selectedVersion,
    selectedPromptVersions,
    allTags,
    isLoaded,
    loadData,
    saveData,
    selectPrompt,
    createPrompt,
    updatePromptMeta,
    saveNewVersion,
    setCurrentVersion,
    deletePrompt,
  };
});
