import { invoke } from "@tauri-apps/api/core";

/**
 * 获取应用配置目录路径
 */
export async function getConfigDir(): Promise<string> {
  return invoke("get_config_dir");
}

/**
 * 保存数据到文件
 * @param filename 文件名 (例如: 'config.json', 'data.txt')
 * @param data 要保存的数据
 * @returns 保存的文件完整路径
 */
export async function saveData(
  filename: string,
  data: string
): Promise<string> {
  return invoke("save_data", { filename, data });
}

/**
 * 从文件读取数据
 * @param filename 文件名
 * @returns 文件内容
 */
export async function loadData(filename: string): Promise<string> {
  return invoke("load_data", { filename });
}

/**
 * 保存 JSON 数据
 */
export async function saveJSON(filename: string, data: any): Promise<string> {
  return saveData(filename, JSON.stringify(data, null, 2));
}

/**
 * 读取 JSON 数据
 */
export async function loadJSON(filename: string): Promise<any> {
  const content = await loadData(filename);
  return JSON.parse(content);
}

/**
 * 设置自定义存储目录
 * @param dirPath 绝对路径 (例如: 'D:\\MyData' 或 '/home/user/mydata')
 * @returns 设置后的目录路径
 */
export async function setStorageDir(dirPath: string): Promise<string> {
  return invoke("set_storage_dir", { dirPath });
}

/**
 * 获取当前存储目录
 */
export async function getStorageDir(): Promise<string> {
  return invoke("get_storage_dir");
}

/**
 * 重置为默认存储目录
 */
export async function resetStorageDir(): Promise<string> {
  return invoke("reset_storage_dir");
}
