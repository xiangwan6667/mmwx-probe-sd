# mmwx-probe-sd

基于 [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe) 的**非官方独立探针前端**，由 [xiangwan6667](https://github.com/xiangwan6667) 维护。依赖妙妙屋 X 主控提供数据，不包含采集 Agent，也不替代主控。

支持服务器状态、实时网速与历史曲线；提供扁平、像素、二次元、高级黑金和 **Nezha** 主题，明暗可跟随系统。主题选择只影响当前浏览器。Nezha 复用 NezhaDash 页面源码，融合 BITJEBE 卡片样式；数据能力与付费权限取决于主控。

## 部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiangwan6667/mmwx-probe-sd)

1. 在主控 **系统设置 → 探针** 中启用探针、选择服务器，生成独立探针访问密钥。
2. **推荐先 [Fork 本仓库](https://github.com/xiangwan6667/mmwx-probe-sd/fork)**，再在 Cloudflare Workers 导入自己的 Fork。
3. 生产分支填 `main`，构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`。Worker 名称与 `wrangler.jsonc` 中的 `name` 保持一致。
4. 在 Worker **Settings → Variables and Secrets** 配置以下运行时变量，保存并重新部署：

| 变量 | 类型 | 说明 |
| --- | --- | --- |
| `MMWX_ORIGIN` | Text | 主控 HTTPS 地址，如 `https://panel.example.com`，不带路径 |
| `PROBE_TOKEN` | Secret | 主控生成的独立探针访问密钥 |
| `ENABLE_MASTER_LOGIN` | Text，可选 | 默认关闭；设为 `true` 开启主控登录入口与跳转 |

这些是 Worker **运行时变量**，不是构建变量。密钥不要提交到仓库。启用 Passkey 登录还需在主控注册 Passkey，并按主控要求配置探针的 related origins。

## 更新

Fork 连接 Cloudflare Workers Builds 后，`main` 分支收到更新即可自动构建部署。

- 手动同步：在 Fork 页面点击 **Sync fork → Update branch**。
- 定时同步：启用 Fork 的 **Actions**，将 **Workflow permissions** 设为 **Read and write**。内置 **Sync upstream** 每天北京时间 11:23 从本仓库同步，也可手动运行。
- 有冲突会停止，不会强制覆盖修改。长期不活跃时，需检查 GitHub 是否暂停了定时任务。

## 本地开发

需要 Node.js 22+。复制 `.dev.vars.example` 为 `.dev.vars` 并填写变量，然后执行：

```bash
npm ci
npm run build
# 终端 1：本地 Worker（8787）
npx wrangler dev
# 终端 2：前端（5173）
npm run dev
```

访问 `http://localhost:5173`。检查使用 `npm test`、`npm run typecheck`；正式构建使用 `npm run build`。

## 来源与许可

- 主项目：[mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe)，Copyright © 2026 Jim Lee，遵循 [MSAL-1.0](LICENSE)。仅允许许可证规定的非商业使用，商业使用需取得原版权方授权；这是源码可用项目，不是 OSI 开源许可。
- Nezha 主题：[nezha-dash-v2](https://github.com/hamster1963/nezha-dash-v2) 页面 + [nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE) 卡片，来源与修改记录见 [主题声明](licenses/NezhaDash-NOTICE.md)。第三方部分保留 Apache-2.0 许可。

本版独立维护，不代表原作者或官方项目。问题请提交至 [Issues](https://github.com/xiangwan6667/mmwx-probe-sd/issues)。
