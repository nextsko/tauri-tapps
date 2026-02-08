import { invoke } from "@tauri-apps/api/core";

export async function fetchUrlToMarkdown(url: string): Promise<string> {
  return invoke("fetch_url_to_markdown", { url });
}
