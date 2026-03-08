# GitHub Actions Workflows

## 当前策略

仓库只保留一个发布工作流：`publish.yaml`。

它只做一件事：当推送 `v*` 标签时，在 Windows、macOS、Linux 三个平台构建 Tauri 安装包，并自动发布到 GitHub Release。

## 触发方式

```bash
git tag v0.1.3
git push origin v0.1.3
```

## 平台产物

- Windows: `.msi` 和 `.exe`
- macOS: `.dmg`（ARM64）
- Linux: `.AppImage` 和 `.deb`

## 配置要求

- 不再需要 `TAURI_SIGNING_PRIVATE_KEY`
- 不再需要 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- 不再生成 Tauri updater 的签名产物和 `latest.json`

## 发布前检查

1. 保持 `package.json` 和 `src-tauri/tauri.conf.json` 的 `version` 一致。
2. 推送的标签与版本号保持一致，例如版本是 `0.1.3` 时使用 `v0.1.3`。

## 故障排查

### 版本不一致

如果 Release 构建失败，先确认：

```bash
node -p "require('./package.json').version"
node -p "require('./src-tauri/tauri.conf.json').version"
```

### Linux 构建失败

工作流已经自动安装 Tauri 所需的 WebKit 依赖；如果仍然失败，优先查看 Actions 日志里的系统包或 Rust 编译报错。
