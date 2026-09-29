# SD Probe

**面向个人自托管场景的非官方独立探针前端。** 本项目基于 [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe) 二次开发，由 [xiangwan6667](https://github.com/xiangwan6667) 维护，代码仓库为 [`mmwx-probe-sd`](https://github.com/xiangwan6667/mmwx-probe-sd)。

本项目不是妙妙屋 X 官方发布，也不代表原作者。它依赖已部署的妙妙屋 X 主控提供数据，负责展示服务器状态、代理指定接口，以及提供访客可自由选择的页面主题；不包含服务器采集 Agent，也不替代主控。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiangwan6667/mmwx-probe-sd)

> **推荐先 [Fork 本仓库](https://github.com/xiangwan6667/mmwx-probe-sd/fork)，再将自己的 Fork 连接到 Cloudflare Workers Builds。** 后续同步更新到 Fork 的 `main` 分支，Cloudflare 即可自动构建和部署。仅 Fork 不会自动创建 Worker。

## 项目性质与原版关系

- **定位**：原版独立探针的非官方二次开发版本，主要调整前端体验与部署维护方式。
- **来源**：基于原版提交 [`7d8d8ef`](https://github.com/mmwx-group/mmwx-probe/commit/7d8d8ef)，保留原有提交历史、版权与许可证。
- **维护**：本仓库独立迭代，原作者更新由维护者评估后引入，不承诺与官方同步发布。
- **使用范围**：适合个人、学习及其他符合许可证的非商业用途。源码公开可查，但不属于 OSI 批准的开源许可项目。
- **问题反馈**：本版新增功能或部署问题请提交到 [本仓库 Issues](https://github.com/xiangwan6667/mmwx-probe-sd/issues)。反馈时不要附上探针密钥或其他凭据。

## 本版改动

| 改动 | 行为 |
| --- | --- |
| 自由选择主题 | Pixel、Flat、Anime、Premium，可恢复「跟随主控」 |
| 明暗模式 | 浅色、深色、跟随系统；系统切换时页面实时响应 |
| 本地偏好 | 保存到当前浏览器，刷新和主控实时更新不会重置手动选择 |
| Premium 布局 | 切换时同步进入或退出 Premium 面板，不需要刷新页面 |
| 部署与更新 | 使用本仓库部署入口，Fork 工作流从本仓库同步更新 |

点击页面右上角的调色盘按钮，打开「外观设置」。主题风格和明暗模式独立选择，例如 **Premium + 跟随系统**。选择「跟随主控」只恢复默认主题风格；明暗设置仍由你选择。偏好不会改变主控配置或影响其他访客。

原版已有的节点卡片/列表、CPU/内存/磁盘、流量与实时网速、延迟/丢包趋势、Premium 面板、转发信息和 Passkey 登录等能力继续保留；实际可用数据取决于主控版本、配置和授权。主题选择不改变主控授权、认证或数据访问规则。

## 工作方式

```text
访客浏览器 → Cloudflare Worker → 妙妙屋 X 主控
              ├─ React 静态页面
              ├─ 固定只读 API 代理
              └─ WebSocket 实时数据代理
```

探针密钥保存在 Worker Secret，浏览器通过 Worker 读取探针数据。WebSocket 断开或无数据时，前端保留 HTTP 轮询作为兜底。

| 探针路径 | 主控路径 | 用途 |
| --- | --- | --- |
| `/api/probe` | `/api/public/probe-servers` | 服务器状态 |
| `/api/series` | `/api/public/probe-series` | 延迟、丢包及系统指标历史 |
| `/api/stream` | `/api/public/probe-ws` | 实时数据 |
| `/api/forward` | `/api/public/probe-forward` | 转发链数据 |

Passkey 登录另外使用两条固定 POST 路径 `/api/login/passkey/begin` 和 `/api/login/passkey/finish`；登录代理不附带只读探针密钥。有效登录成功后可以跳转主控。项目不提供任意 URL 代理。

## 部署前准备

1. 已部署支持独立探针访问密钥的妙妙屋 X 主控，并准备一个 Cloudflare 可访问的主控 HTTPS 地址。
2. 在主控 **系统设置 → 探针** 中启用探针、选择要展示的服务器与指标，并生成「独立探针访问密钥」。
3. 准备 GitHub 和 Cloudflare 账号。网页部署不要求本地安装 Node.js。

## 推荐部署：Fork + Cloudflare 自动构建

### 1. Fork 仓库

打开 [xiangwan6667/mmwx-probe-sd](https://github.com/xiangwan6667/mmwx-probe-sd)，点击 **Fork**，复制到自己的账号，默认保留仓库名 `mmwx-probe-sd` 和 `main` 分支。

### 2. 连接 Cloudflare

进入 Cloudflare Dashboard → **Workers & Pages → Create application → Import a repository**，连接 GitHub 并授权访问你自己的 `你的用户名/mmwx-probe-sd`。

| 设置 | 填写内容 |
| --- | --- |
| Worker 名称 | `mmwx-probe-sd`，与 `wrangler.jsonc` 保持一致 |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | 留空，使用仓库根目录 |

若自定义 Worker 名称，请同步修改 `wrangler.jsonc` 的 `name`。在 Worker **Settings → Builds** 中确认连接的是自己的 Fork，并启用生产分支的自动构建。也可使用上方部署按钮快速开始，最终应确认绑定的是自己可维护的 GitHub 仓库。

### 3. 配置运行时变量

部署后进入 Worker **Settings → Variables and Secrets**：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `MMWX_ORIGIN` | Text | 主控 HTTPS 源站，如 `https://panel.example.com`，不要附加路径 |
| `PROBE_TOKEN` | Secret | 主控生成的独立探针访问密钥 |

这里配置的是 **Worker 运行时变量**，不是构建环境的 Build Variables。保存后重新部署，使变量生效。不要把实际密钥写入仓库。

### 4. 验证并绑定域名

打开 Worker 地址，检查节点列表、历史趋势和实时更新。需要自定义域名时，在 **Settings → Domains & Routes** 添加域名。

确认独立探针工作正常后，可在主控开启「仅允许独立探针访问」。如果使用 Passkey，按主控要求添加探针来源地址。

## 更新：同步 Fork 后自动部署

```text
本仓库发布更新 → 你的 Fork 同步到 main → Cloudflare 自动构建 → 部署新版本
```

**本仓库有更新不会直接修改你的 Fork。** 需要完成下面的同步设置，或手动同步。

### 自动同步

1. 打开 Fork 的 **Actions** 页面，启用工作流；公共 Fork 的定时工作流默认可能被禁用。
2. 在 **Settings → Actions → General → Workflow permissions** 中选择 **Read and write permissions**。
3. 内置 **Sync upstream** 每天北京时间 **11:23** 检查 `xiangwan6667/mmwx-probe-sd` 的 `main` 分支，无冲突时合并并推送。
4. 推送后由已连接的 Cloudflare Workers Builds 触发构建。GitHub Actions 查看同步结果，Cloudflare **Builds / Deployments** 查看部署结果。

该工作流只在下游仓库运行。本仓库自身不会定时合并原作者版本，避免未经验证的上游改动影响二次开发功能。

### 立即更新与异常处理

- 手动触发：**Actions → Sync upstream → Run workflow**，在 `main` 分支运行。
- GitHub 网页同步：**Sync fork → Update branch**。
- 同步冲突或分支保护阻止推送：工作流会停止，不会强制覆盖本地改动；解决冲突或调整权限后重新运行。
- 自动同步长时间未运行：检查 Actions 是否被 GitHub 因仓库不活跃而停用，并重新启用。
- 已同步但 Cloudflare 未部署：确认 **Settings → Builds** 的仓库、生产分支和自动构建开关，再查看构建日志。

## 本地开发与命令行部署

需要 Node.js 22+、npm 10+。先克隆你自己的 Fork：

```bash
git clone https://github.com/你的用户名/mmwx-probe-sd.git
cd mmwx-probe-sd
npm ci
```

将 `.dev.vars.example` 复制为 `.dev.vars`，填写：

```dotenv
MMWX_ORIGIN=https://panel.example.com
PROBE_TOKEN=主控生成的独立探针访问密钥
```

分别在两个终端运行：

```bash
# 终端 1：本地 Worker
npx wrangler dev

# 终端 2：前端
npm run dev
```

访问 `http://localhost:5173`，Vite 会将 `/api/*` 转发到本地 Worker 的 `8787` 端口。

| 命令 | 用途 |
| --- | --- |
| `npm test` | 回归测试 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 构建生产静态资源 |
| `npm run preview` | 预览静态构建，API 仍需可用 Worker |
| `npm run deploy` | 构建并部署到 Cloudflare |

使用命令行部署时先执行 `npx wrangler login`，再在 Cloudflare 配置运行时变量；可用 `npx wrangler secret put PROBE_TOKEN` 写入密钥，最后执行 `npm run deploy`。

密钥轮换时先在主控生成新密钥，再更新 Worker Secret 并重新部署；主控仅保留哈希，无法找回旧密钥。切换期间可能短暂无法获取数据。

## 常见问题

| 现象 | 检查方向 |
| --- | --- |
| `503 Probe access secret is not configured` | Worker 未配置 `PROBE_TOKEN` |
| 接口 `404` | 密钥不一致、主控探针未启用或接口版本不兼容 |
| `MMWX_ORIGIN must use HTTPS` | 使用主控 HTTPS 源站；本地仅允许 localhost / 127.0.0.1 使用 HTTP |
| 没有服务器 | 在主控探针设置中选择要展示的服务器 |
| 无实时更新 | 检查 Worker 和主控反向代理的 WebSocket 支持；HTTP 轮询作为兜底 |
| 选择主题后其他人没变化 | 主题偏好仅影响当前浏览器，这是预期行为 |
| 跟随系统与主控不一致 | 两项设置独立：系统决定明暗，主控决定默认主题风格 |
| Passkey 来源不被承认 | 按主控要求配置 `MMWX_WEBAUTHN_RELATED_ORIGINS` 并重启主控 |

## 版权与许可证

原项目版权归原作者所有：**Copyright (c) 2026 Jim Lee**。感谢 [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe) 提供项目基础。

本修改版继续遵循仓库中的 [Miaomiaowu X Source Available License v1.0（MSAL-1.0）](LICENSE)，并保留原始版权和许可文件。该许可证是 **Source Available** 许可证，不是 MIT / Apache，也不是 OSI 批准的开源许可证。

按许可证要求，非商业使用、学习、审计、修改和 Fork 可以进行；发布修改版或通过网络提供修改版服务时，需要公开相应完整源码、保留版权并说明修改。商业使用需事先获得原版权方书面授权，不得移除或绕过授权机制。具体权利与限制以 [LICENSE](LICENSE) 原文为准。

**SD Probe 是非官方修改版，与原作者及官方项目不存在官方背书关系。**
