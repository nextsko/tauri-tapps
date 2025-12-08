# 网页智能对话功能

## 功能概述

这是一个集成了网页内容解析和 AI 对话的功能模块，支持：

1. **网页转 Markdown**
   - 自动获取 HTTP 网页内容
   - 使用 Rust 后端绕过 CORS 限制
   - 支持多个链接同时解析

2. **智能上下文管理**
   - 自动注入系统环境信息（时间、操作系统、浏览器）
   - 按字符长度分批次处理长文本
   - 将解析的网页内容作为 AI 对话的上下文

3. **多轮对话支持**
   - 完整的对话历史记录
   - 支持连续多轮对话
   - 上下文自动传递

4. **模型切换**
   - 支持在对话过程中随时切换模型
   - 从设置中读取可用模型列表

5. **快捷工具**
   - 模态框一键 HTML 转 Markdown
   - 支持直接输入 HTML 代码
   - 支持输入 URL 自动获取并转换

6. **Markdown 渲染** ✨ 新增
   - AI 回复自动渲染为 Markdown 格式
   - 支持代码高亮显示
   - 支持表格、列表、引用等格式

7. **消息管理** ✨ 新增
   - 右键菜单快速操作
   - 复制消息内容
   - 删除指定消息

## 技术栈

### 前端
- **Vue 3** + **TypeScript**
- **Naive UI** - UI 组件库
- **Pinia** - 状态管理
- **Tauri API** - 调用后端命令
- **Marked** - Markdown 解析和渲染
- **Highlight.js** - 代码语法高亮

### 后端 (Rust)
- **Tauri** - 桌面应用框架
- **Rig** - LLM 客户端库
- **Tokio** - 异步运行时
- **Reqwest** - HTTP 客户端（绕过 CORS 限制）
- **Scraper** - HTML 解析
- **html2md** - HTML 转 Markdown

## 使用方法

### 1. 添加网页

点击侧边栏的"添加网页"按钮，输入 URL，系统会自动：
- 获取网页内容
- 转换为 Markdown 格式
- 显示在已解析列表中

### 2. 开始对话

1. 选择要使用的 AI 模型
2. 在输入框中输入问题
3. 系统会自动将已解析的网页内容作为上下文
4. AI 会基于网页内容回答问题

### 3. HTML 转 Markdown

点击顶部的"HTML转Markdown"按钮，可以：
- 直接粘贴 HTML 代码进行转换
- 输入 URL 自动获取并转换
- 一键复制转换结果

## 文件结构

```
src/
├── stores/
│   └── webChat.ts          # 网页对话状态管理
├── utils/
│   └── markdown.ts         # Markdown 转换工具
├── views/
│   └── WebChatView.vue     # 主界面组件
└── router/
    └── index.ts            # 路由配置

src-tauri/src/
├── llm.rs                  # LLM 多轮对话实现
└── lib.rs                  # Tauri 命令注册
```

## API 说明

### 前端 Store (webChat.ts)

- `addMessage(role, content)` - 添加消息
- `parseUrl(url)` - 解析 URL 为 Markdown
- `htmlToMarkdown(html)` - HTML 转 Markdown
- `buildContext()` - 构建完整上下文
- `getChatHistory()` - 获取对话历史
- `clearMessages()` - 清空对话
- `clearParsedUrls()` - 清空已解析 URL
- `removeParsedUrl(id)` - 删除指定 URL
- `deleteMessage(id)` - 删除指定消息 ✨
- `copyMessage(id)` - 复制消息内容 ✨

### Rust 后端命令

- `chat_with_context(model, context, messages)` - 带上下文的多轮对话
- `fetch_url_to_markdown(url)` - 获取 URL 并转换为 Markdown
- `convert_html_to_markdown(html)` - HTML 字符串转 Markdown

## 配置要求

1. 在"设置"页面配置 LLM：
   - Base URL
   - API Key
   - 可用模型列表

2. 确保网络连接正常（用于获取网页内容）

## 注意事项

1. **网页抓取在 Rust 后端完成**，绕过了浏览器的 CORS 限制
2. 支持设置自定义 User-Agent，避免被反爬虫机制拦截
3. 对话历史会保存在内存中，刷新页面会清空
4. 建议先解析网页，再开始对话，以获得更好的效果
5. 网页抓取超时时间为 30 秒

## 技术优势

### 为什么使用 Rust 后端处理网页抓取？

1. **绕过 CORS 限制**：浏览器的同源策略会阻止跨域请求，而 Rust 后端不受此限制
2. **自定义 User-Agent**：浏览器禁止 JavaScript 设置 User-Agent 头，Rust 可以自由设置
3. **更好的性能**：Rust 的异步 HTTP 客户端性能优异
4. **统一错误处理**：在后端统一处理网络错误和解析错误
5. **安全性**：API 密钥等敏感信息不会暴露在前端代码中
