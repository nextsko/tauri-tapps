# GitHub Actions 修复说明

## 问题
`.github/workflows` 目录中有三个工作流文件，功能重复：
- `publish.yaml` - 完整的构建和发布流程
- `release.yaml` - 自动版本检测和标签创建
- `release.yml` - 简单的发布流程（与 publish.yaml 重复）

## 修复内容

### 1. 删除重复文件
❌ 删除了 `release.yml`（功能与 publish.yaml 重复）

### 2. 保留的工作流

#### ✅ release.yaml - 自动版本管理
**作用**: 监听 `package.json` 版本变化，自动创建 git tag

**工作流程**:
```
修改 package.json 版本 → 推送到 main → 自动创建 tag → 触发 publish.yaml
```

#### ✅ publish.yaml - 构建和发布
**作用**: 在 tag 推送时自动构建并发布应用

**改进**:
- ✅ 添加了签名密钥环境变量支持
- ✅ 优化了 Release 描述信息
- ✅ 支持 Windows、macOS、Linux 多平台构建
- ✅ 包含缓存优化，加速构建

### 3. 新增文档
- ✅ `.github/workflows/README.md` - 详细的工作流使用说明
- ✅ 更新了 `UPDATER_SETUP.md` - 添加 GitHub Actions 快速设置指南

## 使用方法

### 发布新版本（推荐方式）

1. **修改版本号**
   ```bash
   # 编辑 package.json，将 version 从 0.1.2 改为 0.1.3
   ```

2. **提交并推送**
   ```bash
   git add package.json
   git commit -m "chore: bump version to 0.1.3"
   git push origin main
   ```

3. **自动发布**
   - `release.yaml` 检测到版本变化
   - 自动创建 tag `v0.1.3`
   - `publish.yaml` 自动构建并发布

### 首次使用前的配置

1. **生成签名密钥**
   ```bash
   bunx tauri signer generate -w ~/.tauri/myapp.key
   ```

2. **添加到 GitHub Secrets**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加 `TAURI_SIGNING_PRIVATE_KEY`（私钥文件内容）
   - 添加 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`（如果设置了密码）

3. **更新 tauri.conf.json**
   - 将生成的公钥添加到 `plugins.updater.pubkey` 字段

## 优势

✅ **自动化**: 只需修改版本号，其余全自动
✅ **多平台**: 同时构建 Windows、macOS、Linux
✅ **签名**: 自动生成签名的更新包
✅ **缓存**: 优化构建速度
✅ **清晰**: 工作流职责明确，不重复

## 文件结构

```
.github/workflows/
├── README.md          # 工作流使用文档
├── release.yaml       # 自动版本检测和标签创建
└── publish.yaml       # 构建和发布应用
```

## 下一步

1. 按照上述步骤配置 GitHub Secrets
2. 修改 `package.json` 版本号测试自动发布
3. 查看 `.github/workflows/README.md` 了解更多细节
