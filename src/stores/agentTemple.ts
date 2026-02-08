import { defineStore } from "pinia";
import { ref } from "vue";
import { loadJSON, saveJSON } from "../utils/storage";
import { promptLLM } from "../utils/llm";
import type { AgentTemplate } from "./agentHub";

export type TempleRole = "hub" | "priest" | "planner" | "creator";

export interface TempleLog {
  id: string;
  role: TempleRole;
  message: string;
  timestamp: number;
}

export interface PriestDraft {
  purpose: string;
  role: string;
  style: string;
  constraints: string;
  systemPrompt: string;
}

export interface PlannerDraft {
  goal: string;
  atoms: string[];
}

export interface CreatorDraft {
  name: string;
  description: string;
  role: string;
  tags: string[];
  systemPrompt: string;
}

export interface TempleAgentVersion {
  id: string;
  timestamp: number;
  name: string;
  description: string;
  role: string;
  tags: string[];
  systemPrompt: string;
}

export interface TempleAgent extends AgentTemplate {
  versions?: TempleAgentVersion[];
}

interface TempleData {
  priest: PriestDraft;
  planner: PlannerDraft;
  creator: CreatorDraft;
  createdAgents: TempleAgent[];
  logs: TempleLog[];
}

const TEMPLE_FILE = "agent-temple.json";

function defaultPriest(): PriestDraft {
  return {
    purpose: "",
    role: "子Agent",
    style: "结构清晰、可执行、简洁",
    constraints: "",
    systemPrompt: "",
  };
}

function defaultPlanner(): PlannerDraft {
  return {
    goal: "",
    atoms: [],
  };
}

function defaultCreator(): CreatorDraft {
  return {
    name: "",
    description: "",
    role: "子Agent",
    tags: ["custom"],
    systemPrompt: "",
  };
}

export const useAgentTempleStore = defineStore("agentTemple", () => {
  const priest = ref<PriestDraft>(defaultPriest());
  const planner = ref<PlannerDraft>(defaultPlanner());
  const creator = ref<CreatorDraft>(defaultCreator());
  const createdAgents = ref<TempleAgent[]>([]);
  const logs = ref<TempleLog[]>([]);

  function log(role: TempleRole, message: string) {
    logs.value.unshift({
      id: crypto.randomUUID(),
      role,
      message,
      timestamp: Date.now(),
    });
    logs.value = logs.value.slice(0, 80);
  }

  async function saveData() {
    const data: TempleData = {
      priest: priest.value,
      planner: planner.value,
      creator: creator.value,
      createdAgents: createdAgents.value,
      logs: logs.value,
    };
    await saveJSON(TEMPLE_FILE, data);
  }

  async function loadData() {
    try {
      const data = (await loadJSON(TEMPLE_FILE)) as TempleData;
      priest.value = data?.priest ? { ...defaultPriest(), ...data.priest } : defaultPriest();
      planner.value = data?.planner ? { ...defaultPlanner(), ...data.planner } : defaultPlanner();
      creator.value = data?.creator ? { ...defaultCreator(), ...data.creator } : defaultCreator();
      createdAgents.value = Array.isArray(data?.createdAgents) ? (data.createdAgents as TempleAgent[]) : [];
      logs.value = Array.isArray(data?.logs) ? data.logs : [];
    } catch {
      priest.value = defaultPriest();
      planner.value = defaultPlanner();
      creator.value = defaultCreator();
      createdAgents.value = [];
      logs.value = [];
    }
  }

  async function priestGenerateSystemPrompt() {
    const input = priest.value;
    const prompt = `你是神官（Prompt 生成官）。请根据以下信息生成一个高质量 system prompt（中文），用于一个子 Agent。输出必须只包含 system prompt 本体，不要输出其它文字。\n\n目的：${input.purpose}\n角色：${input.role}\n风格：${input.style}\n约束：${input.constraints}`;
    log("priest", "开始生成 system prompt");
    const sys = await promptLLM(prompt);
    priest.value.systemPrompt = String(sys || "").trim();
    creator.value.role = input.role || creator.value.role;
    creator.value.systemPrompt = priest.value.systemPrompt;
    log("priest", "system prompt 已生成");
    await saveData();
  }

  function safeJsonFromText(text: string): any {
    const raw = String(text || "").trim();
    try {
      return JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const sliced = raw.slice(start, end + 1);
        return JSON.parse(sliced);
      }
      return null;
    }
  }

  async function plannerGenerateAtoms() {
    const goal = planner.value.goal.trim();
    if (!goal) return;
    const prompt = `你是任务规划官。请将目标拆解为可执行的原子任务列表，只输出严格 JSON，不要输出任何额外文字。\n\nJSON schema:\n{\n  "atoms": string[]\n}\n\n目标：${goal}`;
    log("planner", "开始生成原子任务");
    const res = await promptLLM(prompt);
    const data = safeJsonFromText(res);
    const atoms = Array.isArray(data?.atoms) ? data.atoms.map((x: any) => String(x || "").trim()).filter((x: string) => x) : [];
    planner.value.atoms = atoms;
    log("planner", `已生成原子任务：${atoms.length} 条`);
    await saveData();
  }

  async function creatorComposeAgent() {
    const c = creator.value;
    const name = c.name.trim();
    if (!name) return;

    const now = Date.now();
    const template: TempleAgent = {
      id: crypto.randomUUID(),
      name,
      description: c.description,
      role: c.role || "子Agent",
      systemPrompt: c.systemPrompt,
      tags: Array.from(new Set((c.tags || []).map((t) => String(t || "").trim()).filter((t) => t))),
      createdAt: now,
      updatedAt: now,
      versions: [
        {
          id: crypto.randomUUID(),
          timestamp: now,
          name,
          description: c.description,
          role: c.role || "子Agent",
          tags: Array.from(new Set((c.tags || []).map((t) => String(t || "").trim()).filter((t) => t))),
          systemPrompt: c.systemPrompt,
        },
      ],
    };

    createdAgents.value.unshift(template);
    log("creator", `已缔造 Agent：${template.name}`);
    await saveData();
    return template;
  }

  function loadAgentToCreator(template: AgentTemplate) {
    creator.value = {
      name: template.name,
      description: template.description,
      role: template.role,
      tags: [...template.tags],
      systemPrompt: template.systemPrompt,
    };
  }

  function snapshotCreatedAgent(agentId: string) {
    const a = createdAgents.value.find((x) => x.id === agentId);
    if (!a) return;
    const now = Date.now();
    const ver: TempleAgentVersion = {
      id: crypto.randomUUID(),
      timestamp: now,
      name: a.name,
      description: a.description,
      role: a.role,
      tags: Array.isArray(a.tags) ? [...a.tags] : [],
      systemPrompt: a.systemPrompt,
    };
    const versions = Array.isArray(a.versions) ? a.versions : [];
    a.versions = [ver, ...versions].slice(0, 20);
    a.updatedAt = now;
    log("creator", `已生成版本快照：${a.name}`);
    void saveData();
  }

  function updateCreatedAgent(agentId: string, patch: Partial<AgentTemplate>) {
    const a = createdAgents.value.find((x) => x.id === agentId);
    if (!a) return;
    if (typeof patch.name === "string") a.name = patch.name;
    if (typeof patch.description === "string") a.description = patch.description;
    if (typeof patch.role === "string") a.role = patch.role;
    if (typeof patch.systemPrompt === "string") a.systemPrompt = patch.systemPrompt;
    if (Array.isArray(patch.tags)) a.tags = [...patch.tags];
    a.updatedAt = Date.now();
    void saveData();
  }

  function deleteCreatedAgent(agentId: string) {
    createdAgents.value = createdAgents.value.filter((x) => x.id !== agentId);
    void saveData();
  }

  function importCreatedAgents(list: unknown) {
    if (!Array.isArray(list)) return;
    const now = Date.now();
    const normalized: TempleAgent[] = list
      .map((x: any) => {
        const id = typeof x?.id === "string" ? x.id : crypto.randomUUID();
        const name = String(x?.name || "").trim();
        if (!name) return null;
        const tags = Array.isArray(x?.tags) ? x.tags.map((t: any) => String(t || "").trim()).filter((t: string) => t) : [];
        const createdAt = typeof x?.createdAt === "number" ? x.createdAt : now;
        const updatedAt = typeof x?.updatedAt === "number" ? x.updatedAt : now;
        const base: TempleAgent = {
          id,
          name,
          description: String(x?.description || ""),
          role: String(x?.role || "子Agent"),
          systemPrompt: String(x?.systemPrompt || ""),
          tags,
          createdAt,
          updatedAt,
          versions: Array.isArray(x?.versions) ? x.versions : undefined,
        };
        return base;
      })
      .filter(Boolean) as TempleAgent[];

    const byId = new Map(createdAgents.value.map((a) => [a.id, a] as const));
    for (const a of normalized) {
      const existing = byId.get(a.id) || createdAgents.value.find((x) => x.name === a.name);
      if (existing) {
        existing.name = a.name;
        existing.description = a.description;
        existing.role = a.role;
        existing.systemPrompt = a.systemPrompt;
        existing.tags = a.tags;
        existing.updatedAt = Date.now();
        existing.versions = Array.isArray(a.versions) ? a.versions : existing.versions;
      } else {
        createdAgents.value.unshift(a);
      }
    }
    log("creator", `已导入殿堂 Agent：${normalized.length} 个`);
    void saveData();
  }

  return {
    priest,
    planner,
    creator,
    createdAgents,
    logs,
    loadData,
    saveData,
    log,
    priestGenerateSystemPrompt,
    plannerGenerateAtoms,
    creatorComposeAgent,
    loadAgentToCreator,
    snapshotCreatedAgent,
    updateCreatedAgent,
    deleteCreatedAgent,
    importCreatedAgents,
  };
});
