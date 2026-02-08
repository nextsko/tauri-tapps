import { defineStore } from "pinia";
import { ref } from "vue";
import { loadJSON, saveJSON } from "../utils/storage";
import { embedTextWithFallback } from "../utils/embedding";
import { promptLLM } from "../utils/llm";
import { buildRagContext, chunkText, ensureRagIndex, searchRagIndex, type RagIndex } from "../utils/rag";
import { fetchUrlToMarkdown } from "../utils/webScraper";
import { useSettingsStore } from "./settings";

export type TaskStatus = "todo" | "in_progress" | "done";
export type AgentStatus = "idle" | "working" | "stopped" | "completed";

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  systemPrompt: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AgentLog {
  id: string;
  message: string;
  timestamp: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  taskId: string;
  templateId?: string;
  systemPrompt: string;
  plan: string[];
  logs: AgentLog[];
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  agentId?: string;
  templateId?: string;
  knowledgeIds: string[];
  output: string;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  tags: string[];
  summary?: string;
  source?: "manual" | "training" | "memory";
  sourceUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowNode {
  id: string;
  position: { x: number; y: number };
  data: { label: string; kind?: string };
  type?: string;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: any;
}

interface AgentHubData {
  tasks: Task[];
  agents: Agent[];
  knowledgeBase: KnowledgeItem[];
  templates?: AgentTemplate[];
  workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  hub: {
    autoDispatch: boolean;
    logs: string[];
  };
}

const HUB_FILE = "agent-hub.json";
const RAG_INDEX_FILE = "rag-index.json";

export const useAgentHubStore = defineStore("agentHub", () => {
  const settingsStore = useSettingsStore();
  const tasks = ref<Task[]>([]);
  const agents = ref<Agent[]>([]);
  const knowledgeBase = ref<KnowledgeItem[]>([]);
  const templates = ref<AgentTemplate[]>(defaultTemplates());
  const ragIndex = ref<RagIndex>(ensureRagIndex());
  const workflowNodes = ref<WorkflowNode[]>([]);
  const workflowEdges = ref<WorkflowEdge[]>([]);
  const autoDispatch = ref(true);
  const hubLogs = ref<string[]>([]);

  const runningAgents = new Set<string>();

  async function saveData() {
    const data: AgentHubData = {
      tasks: tasks.value,
      agents: agents.value,
      knowledgeBase: knowledgeBase.value,
      templates: templates.value,
      workflow: {
        nodes: workflowNodes.value,
        edges: workflowEdges.value,
      },
      hub: {
        autoDispatch: autoDispatch.value,
        logs: hubLogs.value,
      },
    };
    try {
      await saveJSON(HUB_FILE, data);
    } catch (error) {
      console.error("Failed to save agent hub data:", error);
    }
  }

  async function saveRagIndex() {
    try {
      ragIndex.value.updatedAt = Date.now();
      await saveJSON(RAG_INDEX_FILE, ragIndex.value);
    } catch (error) {
      console.error("Failed to save rag index:", error);
    }
  }

  async function loadRagIndex() {
    try {
      const data = (await loadJSON(RAG_INDEX_FILE)) as RagIndex;
      ragIndex.value = ensureRagIndex(data);
    } catch {
      ragIndex.value = ensureRagIndex();
    }
  }

  async function loadData() {
    try {
      const data = (await loadJSON(HUB_FILE)) as AgentHubData;
      tasks.value = Array.isArray(data.tasks) ? data.tasks : [];
      agents.value = Array.isArray(data.agents) ? data.agents : [];
      knowledgeBase.value = Array.isArray(data.knowledgeBase)
        ? data.knowledgeBase.map((k) => ({
            ...k,
            createdAt: typeof (k as any).createdAt === "number" ? (k as any).createdAt : (k as any).updatedAt || Date.now(),
            updatedAt: typeof (k as any).updatedAt === "number" ? (k as any).updatedAt : Date.now(),
            tags: Array.isArray((k as any).tags) ? (k as any).tags : [],
            summary: typeof (k as any).summary === "string" ? (k as any).summary : undefined,
            source: (k as any).source === "training" || (k as any).source === "memory" ? (k as any).source : "manual",
            sourceUrl: typeof (k as any).sourceUrl === "string" ? (k as any).sourceUrl : undefined,
          }))
        : [];

      templates.value = Array.isArray(data.templates) && data.templates.length
        ? data.templates.map((t) => ({
            ...t,
            createdAt: typeof (t as any).createdAt === "number" ? (t as any).createdAt : Date.now(),
            updatedAt: typeof (t as any).updatedAt === "number" ? (t as any).updatedAt : Date.now(),
          }))
        : defaultTemplates();

      const fallback = defaultWorkflow();
      workflowNodes.value = (data.workflow?.nodes || fallback.nodes).map((node) => ({
        ...node,
        type: node.type || "block",
        data: {
          label: node.data?.label || "节点",
          kind: node.data?.kind || "generic",
        },
      }));
      workflowEdges.value = data.workflow?.edges || fallback.edges;
      autoDispatch.value = data.hub?.autoDispatch ?? true;
      hubLogs.value = data.hub?.logs || [];
    } catch {
      workflowNodes.value = defaultWorkflow().nodes;
      workflowEdges.value = defaultWorkflow().edges;
    }

    await settingsStore.loadEmbeddingConfig();
    await loadRagIndex();
  }

  function logHub(message: string) {
    hubLogs.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
    hubLogs.value = hubLogs.value.slice(0, 50);
  }

  async function ensureEmbedded(text: string) {
    const cfg = settingsStore.embeddingConfig;
    const result = await embedTextWithFallback(
      { model: cfg.model, prompt: text },
      { baseUrls: cfg.baseUrls, activeBaseUrl: cfg.activeBaseUrl }
    );

    if (result.usedBaseUrl !== cfg.activeBaseUrl) {
      await settingsStore.setEmbedding({ ...cfg, activeBaseUrl: result.usedBaseUrl });
    }

    return result.embedding;
  }

  async function indexKnowledgeItem(item: KnowledgeItem) {
    const parts = chunkText(item.content, { chunkSize: 900, overlap: 150 });
    const now = Date.now();
    for (const content of parts) {
      const embedding = await ensureEmbedded(content);
      ragIndex.value.chunks.unshift({
        id: crypto.randomUUID(),
        docId: item.id,
        title: item.title,
        tags: item.tags,
        source: "knowledge",
        content,
        embedding,
        createdAt: now,
      });
    }
    await saveRagIndex();
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

  async function generateKnowledgeMetadata(markdown: string) {
    const prompt = `你是一个知识库标注助手。请根据给定 Markdown 内容生成结构化元数据，只输出严格 JSON，不要输出任何额外文字。\n\nJSON schema:\n{\n  "title": string,\n  "summary": string,\n  "tags": string[]\n}\n\nMarkdown 内容如下（可能很长）：\n\n${markdown.slice(0, 12000)}`;

    const res = await promptLLM(prompt);
    const data = safeJsonFromText(res);
    const title = typeof data?.title === "string" ? data.title.trim() : "";
    const summary = typeof data?.summary === "string" ? data.summary.trim() : "";
    const tags = Array.isArray(data?.tags)
      ? data.tags.map((t: any) => String(t || "").trim()).filter((t: string) => t)
      : [];

    return {
      title: title || "未命名资料",
      summary: summary || "",
      tags,
    };
  }

  async function ragSearch(query: string, topK = 6) {
    const embedding = await ensureEmbedded(query);
    const hits = searchRagIndex(ragIndex.value, embedding, topK);
    const context = buildRagContext(hits, 4000);
    return { hits, context };
  }

  function generatePlan(task: Task): string[] {
    const base = [
      `理解任务目标：${task.title}`,
      "拆分子步骤并确认交付物",
      "执行任务并记录阶段结果",
      "汇报进度并同步产出",
    ];
    if (task.description) {
      base.splice(1, 0, `任务背景：${task.description.slice(0, 80)}...`);
    }
    return base;
  }

  function generatePrompt(task: Task, knowledge: KnowledgeItem[]): string {
    const knowledgeSummary = knowledge.map((k) => `- ${k.title}`).join("\n");
    return `你是子Agent，专注完成任务：${task.title}。\n\n任务描述：${task.description || "无"}\n\n参考知识库：\n${knowledgeSummary || "无"}\n\n请给出清晰的步骤、产出和进度汇报。`;
  }

  async function createTask(payload: { title: string; description: string; knowledgeIds: string[]; templateId?: string }) {
    const now = Date.now();
    const task: Task = {
      id: crypto.randomUUID(),
      title: payload.title,
      description: payload.description,
      status: "todo",
      templateId: payload.templateId,
      knowledgeIds: payload.knowledgeIds,
      output: "",
      createdAt: now,
      updatedAt: now,
    };
    tasks.value.unshift(task);
    logHub(`新任务创建：${task.title}`);
    await saveData();

    if (autoDispatch.value) {
      await dispatchTask(task.id);
    }
  }

  async function dispatchTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;

    const knowledge = knowledgeBase.value.filter((k) => task.knowledgeIds.includes(k.id));
    const template = task.templateId ? templates.value.find((t) => t.id === task.templateId) : undefined;
    const now = Date.now();
    const agent: Agent = {
      id: crypto.randomUUID(),
      name: template ? template.name : `Agent-${task.title.slice(0, 6)}`,
      role: template ? template.role : "子Agent",
      status: "working",
      taskId: task.id,
      templateId: template?.id,
      systemPrompt: template ? template.systemPrompt : generatePrompt(task, knowledge),
      plan: generatePlan(task),
      logs: [
        {
          id: crypto.randomUUID(),
          message: "已接收任务，开始分析与拆解。",
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    agents.value.unshift(agent);
    task.status = "in_progress";
    task.agentId = agent.id;
    task.updatedAt = now;
    logHub(`任务派发：${task.title} → ${agent.name}`);
    await saveData();

    void runAgent(agent.id);
  }

  async function runAgent(agentId: string) {
    const agent = agents.value.find((a) => a.id === agentId);
    if (!agent) return;
    if (runningAgents.has(agentId)) return;
    runningAgents.add(agentId);

    try {
      const task = tasks.value.find((t) => t.id === agent.taskId);
      if (!task) return;
      if (agent.status !== "working") return;

      await appendAgentLog(agentId, "开始检索知识库（RAG）。");
      const query = `${task.title}\n${task.description || ""}`.trim();
      const rag = await ragSearch(query, 8);
      const selectedKnowledge = knowledgeBase.value
        .filter((k) => task.knowledgeIds.includes(k.id))
        .map((k) => `- ${k.title}`)
        .join("\n");

      const prompt = `${agent.systemPrompt}\n\n已选择知识：\n${selectedKnowledge || "无"}\n\nRAG 检索结果：\n${rag.context || "无"}\n\n请给出最终可交付的产出（必要时包含步骤、结论、代码/命令等）。`;

      await appendAgentLog(agentId, "开始执行任务并生成产出。");
      const output = await promptLLM(prompt);
      if (agent.status !== "working") return;

      await updateTaskOutput(task.id, output);
      await appendAgentLog(agentId, "产出已写入任务，准备完成。");
      await completeTask(task.id);

      const memory: KnowledgeItem = {
        id: crypto.randomUUID(),
        title: `经验：${task.title}`,
        content: output,
        tags: ["memory", agent.name],
        source: "memory",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      knowledgeBase.value.unshift(memory);
      await indexKnowledgeItem(memory);
      await saveData();
      logHub(`经验已沉淀：${memory.title}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await appendAgentLog(agentId, `执行失败：${msg}`);
      logHub(`执行失败：${msg}`);
      const agent = agents.value.find((a) => a.id === agentId);
      if (agent && agent.status === "working") {
        agent.status = "idle";
        agent.updatedAt = Date.now();
        await saveData();
      }
    } finally {
      runningAgents.delete(agentId);
    }
  }

  async function stopAgent(agentId: string) {
    const agent = agents.value.find((a) => a.id === agentId);
    if (!agent) return;
    agent.status = "stopped";
    agent.updatedAt = Date.now();
    const task = tasks.value.find((t) => t.id === agent.taskId);
    if (task) {
      task.status = "todo";
      task.agentId = undefined;
      task.updatedAt = Date.now();
    }
    logHub(`已停止子Agent：${agent.name}`);
    await saveData();
  }

  async function completeTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.status = "done";
    task.updatedAt = Date.now();
    const agent = agents.value.find((a) => a.id === task.agentId);
    if (agent) {
      agent.status = "completed";
      agent.updatedAt = Date.now();
      agent.logs.unshift({
        id: crypto.randomUUID(),
        message: "任务已完成，等待验收。",
        timestamp: Date.now(),
      });
    }
    logHub(`任务完成：${task.title}`);
    await saveData();
  }

  async function restartTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.status = "todo";
    task.agentId = undefined;
    task.updatedAt = Date.now();
    await saveData();
    await dispatchTask(taskId);
  }

  async function updateTaskOutput(taskId: string, output: string) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.output = output;
    task.updatedAt = Date.now();
    await saveData();
  }

  async function appendAgentLog(agentId: string, message: string) {
    const agent = agents.value.find((a) => a.id === agentId);
    if (!agent) return;
    agent.logs.unshift({
      id: crypto.randomUUID(),
      message,
      timestamp: Date.now(),
    });
    agent.updatedAt = Date.now();
    await saveData();
  }

  async function createKnowledge(payload: { title: string; content: string; tags: string[] }) {
    const now = Date.now();
    const item: KnowledgeItem = {
      id: crypto.randomUUID(),
      title: payload.title,
      content: payload.content,
      tags: payload.tags,
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };
    knowledgeBase.value.unshift(item);
    await indexKnowledgeItem(item);
    await saveData();
  }

  async function ingestUrl(url: string, tags: string[]) {
    const markdown = await fetchUrlToMarkdown(url);
    const meta = await generateKnowledgeMetadata(markdown);
    const now = Date.now();
    const mergedTags = Array.from(
      new Set(
        ["training", ...tags, ...meta.tags]
          .map((t) => String(t || "").trim())
          .filter((t) => t)
      )
    );

    const item: KnowledgeItem = {
      id: crypto.randomUUID(),
      title: meta.title,
      content: markdown,
      tags: mergedTags,
      summary: meta.summary,
      source: "training",
      sourceUrl: url,
      createdAt: now,
      updatedAt: now,
    };
    knowledgeBase.value.unshift(item);
    await indexKnowledgeItem(item);
    await saveData();
    logHub(`训练入库：${url}`);
    return item.id;
  }

  async function removeKnowledge(id: string) {
    knowledgeBase.value = knowledgeBase.value.filter((k) => k.id !== id);
    tasks.value.forEach((t) => {
      t.knowledgeIds = t.knowledgeIds.filter((kid) => kid !== id);
    });
    await saveData();
  }

  async function updateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    workflowNodes.value = nodes;
    workflowEdges.value = edges;
    await saveData();
  }

  async function importTemplate(template: AgentTemplate) {
    const now = Date.now();
    const clean: AgentTemplate = {
      id: template.id,
      name: template.name,
      description: template.description,
      role: template.role,
      systemPrompt: template.systemPrompt,
      tags: Array.isArray(template.tags) ? [...template.tags] : [],
      createdAt: typeof template.createdAt === "number" ? template.createdAt : now,
      updatedAt: now,
    };

    const exists = templates.value.find((t) => t.id === clean.id) || templates.value.find((t) => t.name === clean.name);
    if (exists) {
      exists.name = clean.name;
      exists.description = clean.description;
      exists.role = clean.role;
      exists.systemPrompt = clean.systemPrompt;
      exists.tags = clean.tags;
      exists.updatedAt = now;
    } else {
      templates.value.unshift(clean);
    }
    await saveData();
  }

  return {
    tasks,
    agents,
    knowledgeBase,
    templates,
    ragIndex,
    workflowNodes,
    workflowEdges,
    autoDispatch,
    hubLogs,
    loadData,
    saveData,
    createTask,
    dispatchTask,
    runAgent,
    stopAgent,
    completeTask,
    restartTask,
    updateTaskOutput,
    appendAgentLog,
    createKnowledge,
    removeKnowledge,
    ingestUrl,
    updateWorkflow,
    importTemplate,
    logHub,
  };
});

function defaultTemplates(): AgentTemplate[] {
  const now = Date.now();
  return [
    {
      id: "template-general",
      name: "通用执行 Agent",
      description: "适用于多数任务的高质量执行与汇报",
      role: "子Agent",
      systemPrompt: "你是一个高效的子Agent。你需要基于任务描述、已选择知识、RAG 检索结果，给出可交付产出。输出需要结构清晰、可直接执行。",
      tags: ["general"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "template-research",
      name: "研究整理 Agent",
      description: "擅长总结资料与给出行动建议",
      role: "子Agent",
      systemPrompt: "你是一个研究整理子Agent。请先提炼关键信息，再给出结论与下一步行动建议。若存在不确定性，请明确假设。",
      tags: ["research"],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function defaultWorkflow() {
  return {
    nodes: [
      {
        id: "hub",
        position: { x: 200, y: 80 },
        data: { label: "枢纽 Agent", kind: "hub" },
        type: "block",
      },
      {
        id: "task",
        position: { x: 40, y: 220 },
        data: { label: "任务节点", kind: "task" },
        type: "block",
      },
      {
        id: "agent",
        position: { x: 360, y: 220 },
        data: { label: "子Agent", kind: "agent" },
        type: "block",
      },
    ],
    edges: [
      { id: "e1", source: "hub", target: "task" },
      { id: "e2", source: "hub", target: "agent" },
    ],
  };
}
