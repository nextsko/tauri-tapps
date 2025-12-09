# 测试 Pinia 状态持久化

## 快速测试步骤

### 测试 1: 侧边栏折叠状态
1. ✅ 启动应用
2. ✅ 点击侧边栏的折叠按钮（或拖动）
3. ✅ 关闭应用
4. ✅ 重新打开应用
5. ✅ **预期结果**: 侧边栏保持折叠状态

### 测试 2: 当前 Tab 记忆
1. ✅ 启动应用
2. ✅ 点击切换到"网页智能对话"
3. ✅ 关闭应用
4. ✅ 重新打开应用
5. ✅ **预期结果**: 自动打开"网页智能对话"页面

### 测试 3: 组合测试
1. ✅ 启动应用
2. ✅ 折叠侧边栏
3. ✅ 切换到"设置"页面
4. ✅ 关闭应用
5. ✅ 重新打开应用
6. ✅ **预期结果**: 
   - 侧边栏保持折叠
   - 自动打开"设置"页面

### 测试 4: 模型选择记忆（WebChat）
1. ✅ 打开"网页智能对话"
2. ✅ 选择一个模型（如果有模型选择器）
3. ✅ 关闭应用
4. ✅ 重新打开应用
5. ✅ 打开"网页智能对话"
6. ✅ **预期结果**: 之前选择的模型仍然被选中

## 查看持久化数据

### 方法 1: 浏览器开发者工具
1. 打开应用
2. 按 F12 打开开发者工具
3. 进入 Console 标签
4. 输入以下命令查看数据:

```javascript
// 查看 UI 状态
console.log(JSON.parse(localStorage.getItem('ui')));

// 查看 Settings 状态
console.log(JSON.parse(localStorage.getItem('settings')));

// 查看 WebChat 状态
console.log(JSON.parse(localStorage.getItem('webChat')));
```

### 方法 2: Application 面板
1. 打开开发者工具
2. 进入 Application 标签
3. 左侧选择 Storage → Local Storage
4. 查看存储的键值对

## 清除测试数据

### 清除所有持久化数据
```javascript
// 在开发者工具 Console 中执行
localStorage.clear();
location.reload();
```

### 清除特定 Store
```javascript
// 只清除 UI 状态
localStorage.removeItem('ui');
location.reload();
```

## 预期的 localStorage 数据结构

### ui store
```json
{
  "sidebarCollapsed": false,
  "activeMenu": "prompt"
}
```

### settings store
```json
{
  "storageDir": "C:\\Users\\YourName\\AppData\\Roaming\\com.fromsko.chat-app"
}
```

### webChat store
```json
{
  "currentModel": "LongCat-Flash-Chat"
}
```

## 故障排查

### 问题: 状态没有保存
**检查**:
1. 确认 `pinia-plugin-persistedstate` 已安装
2. 确认 `main.ts` 中已注册插件
3. 检查浏览器控制台是否有错误
4. 确认 localStorage 未被禁用

### 问题: 状态保存了但没有恢复
**检查**:
1. 查看 localStorage 中是否有数据
2. 检查 store 的 `persist` 配置是否正确
3. 确认组件中正确使用了 store

### 问题: 部分状态没有持久化
**检查**:
1. 确认使用了 `pick` 选项指定了要持久化的字段
2. 字段名是否正确

## 开发建议

### 添加新的持久化状态
1. 在对应的 store 中添加状态
2. 如果需要持久化，确保在 `persist.pick` 中包含该字段
3. 测试保存和恢复功能

### 示例: 添加主题设置
```typescript
// src/stores/ui.ts
export const useUIStore = defineStore('ui', () => {
  const theme = ref<'light' | 'dark'>('light');
  
  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme;
  };

  return {
    theme,
    setTheme,
    // ... 其他状态
  };
}, {
  persist: true, // 会自动持久化 theme
});
```

## 性能考虑

- ✅ localStorage 读写很快，不会影响性能
- ✅ 只在状态变化时写入，不会频繁操作
- ✅ 使用 `pick` 选项可以减少存储数据量
- ⚠️ 避免持久化大量数据（如聊天记录），应使用文件系统

## 总结

✅ **UI 状态**: 完全持久化（侧边栏、当前页面）
✅ **Settings**: 部分持久化（存储目录）
✅ **WebChat**: 部分持久化（当前模型）
✅ **业务数据**: 使用文件系统（LLM 配置、聊天记录）

这样的设计既保证了用户体验，又避免了 localStorage 容量限制问题。
