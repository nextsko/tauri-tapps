import { invoke } from "@tauri-apps/api/core";

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  rootDir: string;
}

export async function testWebDav(config: WebDavConfig): Promise<string> {
  return invoke("test_webdav", { config });
}

export async function backupToWebDav(config: WebDavConfig): Promise<string> {
  return invoke("backup_to_webdav", { config });
}

export async function restoreFromWebDav(config: WebDavConfig): Promise<string> {
  return invoke("restore_from_webdav", { config });
}
