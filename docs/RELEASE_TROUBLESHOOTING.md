# GitHub Actions Release 发布故障排查

## 问题诊断

### 已发现的问题

❌ **版本号不一致** (已修复)
- `package.json`: 0.1.3
- `tauri.conf.json`: 0.1.0
- **影响**: 构建失败，无法发布

✅ **已修复**: `tauri.conf.json` 版本已更新为 0.1.3

## 发布流程检查清单

### 1. 版本号同步
- [ ] `package.json` 中的 `version` 字段
- [ ] `src-tauri/tauri.conf.json` 中的 `version` 字段
- [ ] 两个版本号必须完全相同

**检查命令**:
```bash
# 查看 package.json 版本
node -p "require('./package.json').version"

# 查看 tauri.conf.json 版本
node -p "require('./src-tauri/tauri.conf.json').version"
```

### 2. GitHub Secrets 配置
- [ ] `TAURI_SIGNING_PRIVATE_KEY` - 已配置？
- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - 已配置？（可选）

**检查方法**:
1. 进入仓库 Settings → Secrets and variables → Actions
2. 确认 `TAURI_SIGNING_PRIVATE_KEY` 存在
3. 如果没有，需要生成并添加

**生成密钥**:
```bash
bunx tauri signer generate -w ~/.tauri/myapp.key
```

### 3. 工作流触发条件

#### release.yaml 触发条件
- 当 `package.json` 文件被修改时
- 自动创建 git tag

#### publish.yaml 触发条件
- 推送 tag（格式: `v*`）
- 推送到 `main` 分支
- 手动触发（workflow_dispatch）

### 4. 发布步骤

#### 方式一：自动发布（推荐）
```bash
# 1. 修改 package.json 版本
# 例如: 0.1.3 → 0.1.4

# 2. 同时修改 tauri.conf.json 版本
# 例如: 0.1.3 → 0.1.4

# 3. 提交并推送
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.1.4"
git push origin main

# 4. release.yaml 自动创建 tag
# 5. publish.yaml 自动构建并发布
```

#### 方式二：手动发布
```bash
# 1. 修改版本号（同上）

# 2. 手动创建 tag
git tag v0.1.4
git push origin v0.1.4

# 3. publish.yaml 自动构建并发布
```

## 常见问题

### Q1: 为什么没有创建 Release？
**可能原因**:
1. ❌ 版本号不一致 → 构建失败
2. ❌ 没有配置 `TAURI_SIGNING_PRIVATE_KEY` → 签名失败
3. ❌ 工作流没有被触发 → 检查 git log

**解决方案**:
1. 检查版本号是否一致
2. 检查 GitHub Secrets 是否配置
3. 查看 GitHub Actions 日志

### Q2: 如何查看工作流执行日志？
1. 进入仓库主页
2. 点击 "Actions" 标签
3. 选择对应的工作流
4. 查看执行日志

### Q3: 工作流失败了怎么办？
1. 查看失败的步骤
2. 根据错误信息修复问题
3. 重新推送或手动触发工作流

### Q4: 如何手动触发发布？
1. 进入 GitHub Actions
2. 选择 "publish" workflow
3. 点击 "Run workflow"
4. 选择分支（main）
5. 点击 "Run workflow"

## 快速修复步骤

### 如果版本号不一致

```bash
# 1. 查看当前版本
echo "package.json: $(node -p "require('./package.json').version")"
echo "tauri.conf.json: $(node -p "require('./src-tauri/tauri.conf.json').version")"

# 2. 修改 package.json
# 编辑 package.json，修改 version 字段

# 3. 修改 tauri.conf.json
# 编辑 src-tauri/tauri.conf.json，修改 version 字段

# 4. 提交并推送
git add package.json src-tauri/tauri.conf.json
git commit -m "fix: sync version numbers"
git push origin main
```

### 如果没有配置签名密钥

```bash
# 1. 生成密钥
bunx tauri signer generate -w ~/.tauri/myapp.key

# 2. 查看公钥（已在 tauri.conf.json 中）
# 3. 添加私钥到 GitHub Secrets
#    - 进入 Settings → Secrets and variables → Actions
#    - 新建 Secret: TAURI_SIGNING_PRIVATE_KEY
#    - 粘贴私钥文件内容
```

## 验证发布成功

### 检查清单
- [ ] GitHub Actions 工作流全部通过
- [ ] GitHub Releases 页面有新的 Release
- [ ] Release 中包含各平台的安装包
- [ ] Release 中包含 `.sig` 签名文件
- [ ] Release 中包含 `latest.json` 文件

### 测试更新器
1. 安装旧版本应用
2. 打开应用
3. 应该检测到新版本
4. 点击更新
5. 应该成功下载并安装

## 工作流文件位置

- `.github/workflows/release.yaml` - 自动版本检测和标签创建
- `.github/workflows/publish.yaml` - 构建和发布应用

## 相关文档

- 📖 `.github/workflows/README.md` - 工作流详细说明
- 📖 `UPDATER_SETUP.md` - 更新器设置指南
- 📖 `GITHUB_ACTIONS_FIXED.md` - GitHub Actions 修复说明

## 下一步

1. ✅ 确认版本号已同步（0.1.3）
2. ⏳ 等待 GitHub Actions 执行
3. 📝 修改版本号触发发布流程
4. 🚀 验证 Release 是否成功创建

---

**当前状态**: 版本号已修复，可以开始发布流程
