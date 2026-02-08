export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface EmbedWithFallbackOptions {
  baseUrls: string[];
  activeBaseUrl: string;
  timeoutMs?: number;
}

export interface EmbedWithFallbackResult {
  embedding: number[];
  usedBaseUrl: string;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function postJsonWithTimeout<T>(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function buildTryOrder(options: EmbedWithFallbackOptions): string[] {
  const active = normalizeBaseUrl(options.activeBaseUrl);
  const list = (options.baseUrls || []).map(normalizeBaseUrl).filter(Boolean);

  const order: string[] = [];
  if (active) order.push(active);
  for (const u of list) {
    if (u && !order.includes(u)) order.push(u);
  }

  return order;
}

export async function embedTextWithFallback(
  req: OllamaEmbeddingRequest,
  options: EmbedWithFallbackOptions
): Promise<EmbedWithFallbackResult> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const tryOrder = buildTryOrder(options);

  if (!tryOrder.length) {
    throw new Error("No Ollama baseUrl configured");
  }

  let lastError: unknown;

  for (const baseUrl of tryOrder) {
    const endpoint = `${baseUrl}/api/embeddings`;
    try {
      const data = await postJsonWithTimeout<OllamaEmbeddingResponse>(endpoint, req, timeoutMs);

      if (!data || !Array.isArray(data.embedding)) {
        throw new Error("Invalid embedding response");
      }

      return { embedding: data.embedding, usedBaseUrl: baseUrl };
    } catch (err) {
      lastError = err;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All embedding endpoints failed. Last error: ${msg}`);
}
