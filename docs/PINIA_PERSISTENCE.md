# Pinia 状态持久化说明

## 已实现的持久化功能

### 1. UI 状态持久化 (`src/stores/ui.ts`)

**持久化内容**:
- ✅ 侧边栏折叠状态 (`sidebarCollapsed`)
- ✅ 当前激活的菜单/Tab (`activeMenu`)

**效果**:
- 关闭应用后重新打开，侧边栏保持之前的折叠/展开状态
- 自动恢复到上次访问的页面

### 2. Settings Store 部分持久化

**持久化内容**:
- ✅ 存储目录路径 (`storageDir`)

**说明**:
- LLM 配置通过文件系统管理（`llm-config.json`），不使用 localStorage
- 避免数据重复存储

### 3. WebChat Store 部分持久化

**持久化内容**:
- ✅ 当前选择的模型 (`currentModel`)

**说明**:
- 消息和解析的 URL 通过文件系统管理（`webchat-data.json`）
- 只持久化 UI 选择状态

## 技术实现

### 使用的插件
- `pinia-plugin-persistedstate` - 自动将 Pinia store 状态保存到 localStorage

### 配置方式

```typescript
// main.ts
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
```

### Store 配置示例

```typescript
// 完全持久化
export const useUIStore = defineStore('ui', () => {
  // ... state and actions
}, {
  persist: true, // 持久化所有状态
});

// 部分持久化
export const useSettingsStore = defineStore('settings', () => {
  // ... state and actions
}, {
  persist: {
    pick: ['storageDir'], // 只持久化指定字段
  },
});
```

## 存储位置

### localStorage (通过 pinia-plugin-persistedstate)
- `ui` store → `localStorage.getItem('ui')`
- `settings` store → `localStorage.getItem('settings')`
- `webChat` store → `localStorage.getItem('webChat')`

### 文件系统 (通过 Tauri API)
- LLM 配置 → `{appDataDir}/llm-config.json`
- WebChat 数据 → `{appDataDir}/webchat-data.json`

## 数据持久化策略

### UI 状态 → localStorage
- 轻量级
- 快速读写
- 适合 UI 偏好设置

### 业务数据 → 文件系统
- 更安全
- 支持大数据
- 可备份和迁移
- 跨平台兼容

## 清除持久化数据

### 清除 localStorage
```javascript
// 浏览器控制台
localStorage.clear();
// 或清除特定 store
localStorage.removeItem('ui');
```

### 清除文件数据
通过应用的设置页面或直接删除配置文件

## 优势

✅ **用户体验好**: 应用状态在重启后保持
✅ **自动化**: 无需手动保存/加载
✅ **灵活**: 可选择持久化全部或部分状态
✅ **类型安全**: 完全支持 TypeScript
✅ **性能好**: localStorage 读写速度快

## 注意事项

1. **不要持久化敏感信息**: localStorage 是明文存储
2. **控制数据大小**: localStorage 有容量限制（通常 5-10MB）
3. **大数据用文件**: 聊天记录等大数据应使用文件系统
4. **版本兼容**: 更新 store 结构时注意向后兼容

## 测试方法

1. 打开应用，折叠侧边栏
2. 切换到某个 Tab（如"网页智能对话"）
3. 关闭应用
4. 重新打开应用
5. ✅ 侧边栏应该保持折叠状态
6. ✅ 应该自动打开"网页智能对话"页面
