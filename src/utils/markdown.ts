import { invoke } from '@tauri-apps/api/core';

/**
 * HTML 转 Markdown 服务
 */
export class MarkdownConverter {
  /**
   * 将 HTML 字符串转换为 Markdown
   */
  async htmlToMarkdown(html: string): Promise<string> {
    try {
      return await invoke<string>('convert_html_to_markdown', { html });
    } catch (error) {
      throw new Error(`转换失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从 URL 获取网页并转换为 Markdown
   */
  async urlToMarkdown(url: string): Promise<string> {
    try {
      return await invoke<string>('fetch_url_to_markdown', { url });
    } catch (error) {
      throw new Error(`获取网页失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * 将长文本按字符数分块
 */
export function splitTextIntoChunks(text: string, chunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // 如果单行超过 chunkSize，强制分割
      if (line.length > chunkSize) {
        for (let i = 0; i < line.length; i += chunkSize) {
          chunks.push(line.slice(i, i + chunkSize));
        }
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * 获取系统信息
 */
export function getSystemInfo(): string {
  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  return `当前系统时间: ${dateStr}`;
}
