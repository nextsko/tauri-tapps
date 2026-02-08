export interface RagChunk {
  id: string;
  docId: string;
  title: string;
  tags: string[];
  source?: string;
  content: string;
  embedding: number[];
  createdAt: number;
}

export interface RagIndex {
  version: number;
  chunks: RagChunk[];
  updatedAt: number;
}

export interface RagSearchHit {
  chunk: RagChunk;
  score: number;
}

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export function chunkText(text: string, options: ChunkOptions): string[] {
  const chunkSize = Math.max(200, Math.floor(options.chunkSize));
  const overlap = Math.max(0, Math.floor(options.overlap));

  const cleaned = String(text || "").replace(/\r\n/g, "\n");
  if (!cleaned.trim()) return [];

  const out: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const end = Math.min(cleaned.length, i + chunkSize);
    const slice = cleaned.slice(i, end);
    const normalized = slice.trim();
    if (normalized) out.push(normalized);

    if (end >= cleaned.length) break;

    i = Math.max(0, end - overlap);
  }

  return out;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

export function ensureRagIndex(index?: RagIndex): RagIndex {
  if (index && Array.isArray(index.chunks)) {
    return {
      version: typeof index.version === "number" ? index.version : 1,
      chunks: index.chunks,
      updatedAt: typeof index.updatedAt === "number" ? index.updatedAt : Date.now(),
    };
  }
  return { version: 1, chunks: [], updatedAt: Date.now() };
}

export function searchRagIndex(index: RagIndex, queryEmbedding: number[], topK: number): RagSearchHit[] {
  const hits: RagSearchHit[] = index.chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, Math.max(1, topK)).filter((h) => h.score > 0);
}

export function buildRagContext(hits: RagSearchHit[], maxChars: number): string {
  const parts: string[] = [];
  let budget = Math.max(400, maxChars);

  for (const hit of hits) {
    const header = `### ${hit.chunk.title} (score=${hit.score.toFixed(3)})`;
    const body = hit.chunk.content;
    const piece = `${header}\n${body}`;

    if (piece.length > budget) {
      if (parts.length === 0) {
        parts.push(piece.slice(0, budget));
      }
      break;
    }

    parts.push(piece);
    budget -= piece.length + 2;
    if (budget <= 0) break;
  }

  return parts.join("\n\n");
}
