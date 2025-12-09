# 自动更新功能

本应用集成了 Tauri 的自动更新功能，可以自动检测并安装新版本。

## 功能特性

- ✅ 应用启动时自动检查更新（静默模式）
- ✅ 设置页面手动检查更新
- ✅ 下载进度显示
- ✅ 一键更新并重启

## 使用方法

### 自动检查

应用启动时会自动在后台检查更新，如果发现新版本会弹出提示框。

### 手动检查

1. 打开应用
2. 进入"设置"页面
3. 在"应用更新"部分点击"检查更新"按钮
4. 如果有新版本，会提示是否立即更新

## 发布新版本

### 1. 更新版本号

编辑 `src-tauri/tauri.conf.json`：

```json
{
  "version": "0.2.0"
}
```

编辑 `src-tauri/Cargo.toml`：

```toml
[package]
version = "0.2.0"
```

### 2. 提交并打标签

```bash
git add .
git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

### 3. GitHub Actions 自动构建

推送标签后，GitHub Actions 会自动：
1. 构建 Windows、macOS、Linux 版本
2. 创建 GitHub Release
3. 上传安装包
4. 生成 `latest.json` 更新清单

### 4. 发布 Release

1. 进入 GitHub Releases 页面
2. 找到自动创建的 Draft Release
3. 编辑 Release 说明
4. 点击"Publish release"

## 更新清单格式

`latest.json` 示例：

```json
{
  "version": "0.2.0",
  "notes": "新功能和改进",
  "pub_date": "2024-12-09T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_x64_en-US.msi.zip"
    },
    "linux-x86_64": {
      "signature": "",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_amd64.AppImage.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "",
      "url": "https://github.com/nextsko/tauri-tapps/releases/download/v0.2.0/chat-app_0.2.0_aarch64.dmg"
    }
  }
}
```

## 配置说明

### tauri.conf.json

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/nextsko/tauri-tapps/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": ""
    }
  }
}
```

- `active`: 启用更新功能
- `endpoints`: 更新清单 URL
- `dialog`: 显示更新对话框
- `pubkey`: 签名公钥（可选，用于验证更新包）

## 注意事项

1. **首次发布**: 第一个版本不会触发自动更新，需要用户手动下载安装
2. **版本号格式**: 必须遵循语义化版本 (Semantic Versioning)，如 `0.1.0`、`1.0.0`
3. **GitHub Token**: GitHub Actions 需要 `GITHUB_TOKEN` 权限来创建 Release
4. **平台支持**: 自动更新支持 Windows、macOS、Linux

## 故障排除

### 检查更新失败

1. 检查网络连接
2. 确认 GitHub Release 已发布
3. 查看浏览器控制台错误信息

### 下载失败

1. 检查 GitHub Release 中的文件是否完整
2. 确认文件 URL 正确
3. 检查防火墙设置

### 安装失败

1. 确认有足够的磁盘空间
2. 检查应用权限
3. 尝试手动下载安装

## 相关链接

- [Tauri 更新插件文档](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
