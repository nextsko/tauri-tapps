# GitHub Actions Workflows

## 工作流说明

### 1. release.yaml - 自动版本检测和标签创建
**触发条件**: 当 `package.json` 中的版本号变化时

**功能**:
- 检测 `package.json` 版本是否变化
- 检查对应的 git tag 是否已存在
- 如果 tag 不存在，自动创建并推送 tag

**使用方法**:
1. 修改 `package.json` 中的 `version` 字段（例如从 `0.1.2` 改为 `0.1.3`）
2. 提交并推送到 `main` 分支
3. 工作流会自动创建 `v0.1.3` 标签
4. 标签创建后会触发 `publish.yaml` 工作流

### 2. publish.yaml - 构建和发布应用
**触发条件**: 
- 推送 tag（格式: `v*`，例如 `v0.1.3`）
- 推送到 `main` 分支
- 手动触发（workflow_dispatch）

**功能**:
- 在 Windows、macOS、Linux 上构建应用
- 为 macOS 构建 ARM64 版本
- 生成签名的更新包（需要配置密钥）
- 创建 GitHub Release 并上传安装包
- 上传构建产物（artifacts）

**平台支持**:
- **Windows**: `.msi` 和 `.exe` 安装包
- **macOS**: `.dmg` 和 `.app` (ARM64)
- **Linux**: `.deb`、`.rpm`、`.AppImage`

## 配置要求

### GitHub Secrets
需要在仓库设置中添加以下 Secrets：

1. **TAURI_SIGNING_PRIVATE_KEY** (必需)
   - 用于签名更新包的私钥
   - 生成方法: `bunx tauri signer generate -w ~/.tauri/myapp.key`
   - 将生成的私钥文件内容复制到此 Secret

2. **TAURI_SIGNING_PRIVATE_KEY_PASSWORD** (可选)
   - 如果私钥有密码保护，在此设置密码
   - 如果没有密码，可以留空或不设置

### 添加 Secrets 步骤
1. 进入仓库 Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加上述 Secrets

## 发布流程

### 方式一：自动发布（推荐）
1. 修改 `package.json` 中的版本号
2. 提交并推送到 `main` 分支
3. `release.yaml` 自动创建 tag
4. `publish.yaml` 自动构建并发布

### 方式二：手动发布
1. 手动创建并推送 tag:
   ```bash
   git tag v0.1.3
   git push origin v0.1.3
   ```
2. `publish.yaml` 自动构建并发布

### 方式三：手动触发
1. 进入 GitHub Actions 页面
2. 选择 "publish" workflow
3. 点击 "Run workflow"

## 注意事项

1. **版本号格式**: 必须使用 `v` 前缀，例如 `v0.1.3`
2. **首次发布**: 需要先配置 `TAURI_SIGNING_PRIVATE_KEY`
3. **macOS 构建**: 只构建 ARM64 版本（Apple Silicon）
4. **缓存优化**: 使用了 Rust、Cargo 和 Bun 缓存加速构建
5. **Draft Release**: 如需审核后再发布，将 `releaseDraft` 改为 `true`

## 故障排查

### 构建失败
- 检查 `package.json` 和 `src-tauri/tauri.conf.json` 版本是否一致
- 检查是否配置了 `TAURI_SIGNING_PRIVATE_KEY`
- 查看 Actions 日志获取详细错误信息

### 更新器不工作
- 确保 `tauri.conf.json` 中配置了正确的公钥
- 确保 `endpoints` 指向正确的 `latest.json` URL
- 检查 Release 中是否包含 `.sig` 签名文件

## 工作流文件

- ✅ `release.yaml` - 自动版本检测和标签创建
- ✅ `publish.yaml` - 构建和发布应用
- ❌ `release.yml` - 已删除（功能重复）
