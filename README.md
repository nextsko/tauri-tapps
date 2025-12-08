# Tauri + Vue + TypeScript

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## start

```shell
bun run tauri dev
```

## Dir override

```shell
/// 获取应用配置目录
/// 如果设置了自定义目录，使用自定义目录
/// 否则使用默认的应用配置目录
/// Windows: C:\Users\[username]\AppData\Roaming\chat-app
/// macOS: /Users/[username]/Library/Application Support/chat-app
/// Linux: /home/[username]/.config/chat-app
```

```ts
// set_storage_dir(dirPath) - 设置自定义存储目录（必须是绝对路径）
// get_storage_dir() - 获取当前存储目录
// reset_storage_dir() - 重置为默认目录
import { setStorageDir, getStorageDir, resetStorageDir } from '@/utils/storage';

// 设置自定义目录
await setStorageDir('D:\\MyData');

// 获取当前目录
const dir = await getStorageDir();

// 重置为默认
await resetStorageDir();
```