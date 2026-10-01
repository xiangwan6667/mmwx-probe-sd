# mmwx-probe-sd

基于 [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe) 的**非官方独立探针前端**，由 [xiangwan6667](https://github.com/xiangwan6667) 维护。依赖妙妙屋 X 主控提供数据，不包含采集 Agent，也不替代主控。

支持服务器状态、实时网速与历史曲线；提供扁平、像素、二次元、高级黑金、**Nezha**、**Emerald** 和 **LuminaPlus** 主题，明暗默认跟随系统，也会记住当前浏览器手动选择的浅色或深色。访客切换主题只影响当前浏览器，也可跟随主控指定的主题。Nezha 完整复用 BITJEBE 主题的页面、组件与样式；数据能力与付费权限取决于主控。

## 部署

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiangwan6667/mmwx-probe-sd)

1. 在主控 **系统设置 → 探针** 中启用探针、选择服务器，生成独立探针访问密钥。
2. **推荐先 [Fork 本仓库](https://github.com/xiangwan6667/mmwx-probe-sd/fork)**，再在 Cloudflare Workers 导入自己的 Fork。
3. 生产分支填 `main`，构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`。Worker 名称与 `wrangler.jsonc` 中的 `name` 保持一致。
4. 在 Worker **Settings → Variables and Secrets** 配置下面的运行时变量，保存并重新部署。

## 配置

### Worker 运行时变量

| 变量 | 必填 | 类型 | 默认值 | 用途与填写示例 |
| --- | --- | --- | --- | --- |
| `MMWX_ORIGIN` | 是 | Text | 无 | 妙妙屋 X 主控的 HTTPS 地址，如 `https://panel.example.com`，不带路径 |
| `PROBE_TOKEN` | 是 | Secret | 无 | 主控 **系统设置 → 探针** 生成的独立探针访问密钥，不是账号密码或登录 Token |
| `ENABLE_MASTER_LOGIN` | 否 | Text | 关闭 | 仅填写小写 `true` 时开启主控快捷登录、跳转和 Passkey 登录接口；不填或填 `false` 均关闭 |
| `NEZHA_BACKGROUND_URL` | 否 | Text | 无背景图 | Nezha 背景图片地址，如 `https://images.example.com/background.webp`；也支持本站 `/background.webp` 路径 |
| `NEZHA_MOBILE_BACKGROUND_URL` | 否 | Text | 沿用通用背景 | Nezha 手机专用背景图片，格式同上；屏幕宽度小于 640px 时使用 |

这些变量在 Worker 运行时读取，不能只填到构建环境中。`PROBE_TOKEN` 使用 **Secret** 保存，不要提交到仓库。启用 Passkey 登录还需在主控注册 Passkey，并按主控要求配置探针的 related origins。

主控可开启 **保护探针数据接口**：本项目由 Worker 向主控添加专用密钥，浏览器不接触密钥。Worker 的数据接口另外拒绝跨站和无来源请求（404），不透传主控的跨域放行头。同源检查用于阻止浏览器跨站读取和普通扫描，来源请求头可被脚本伪造，公开页面展示的数据仍可被采集。

背景仅影响 Nezha 主题，图片居中铺满，深色模式自动压暗；配置背景后会自动启用半透明玻璃卡片和背景模糊，不填背景变量则保持默认纯色卡片。图片地址会公开给浏览器，请使用可直接访问的图片链接。使用本站路径时，将图片放入 `public/` 后重新构建部署。修改变量后重新部署并刷新页面生效。

### 其他配置的来源

| 配置 | 设置位置 / 数据来源 |
| --- | --- |
| 站点名称、图标、展示服务器、历史范围 | 妙妙屋 X 主控的探针设置 |
| 默认主题 | 主控自定义主题名称，见下表 |
| 浅色 / 深色 / 跟随系统 | 页面右上角主题菜单；默认跟随系统，手动选择保存在当前浏览器 |
| 续费价格、到期时间、流量额度 | 主控下发的服务器信息 |
| 三网回程标签 | 主控公开探针接口的 `return_routes`，按电信、联通、移动展示探测结果 |
| 访客 IP、地区、网络组织 | Cloudflare 请求信息自动提供，无需配置查询密钥；本地开发可能不可用 |

`ASSETS` 是 `wrangler.jsonc` 自动创建的静态资源绑定，无需手动添加。正常部署不需要设置 `VITE_*` 构建变量；上游保留的 `VITE_GIT_HASH` 仅用于 Nezha 页脚版本链接，不控制探针功能。上游源码中的 `window.Custom*`、`window.Hide*` 等不是 Cloudflare 环境变量；背景请使用上表中的变量。

## 主题

在主控 **系统设置 → 探针 → 探针主题** 选择 **自定义主题名称**，填写下表中的英文值（小写，不加 `theme-` 前缀）：

| 界面名称 | 主控填写值 |
| --- | --- |
| 扁平 | `flat` |
| 像素 | `pixel` |
| 二次元 | `anime` |
| 高级黑金（付费许可证） | `premium` |
| Nezha | `nezha` |
| Emerald | `emerald` |
| LuminaPlus | `lumina` |

外置探针选择 **跟随主控** 后生效；若浏览器已手动选过主题，需先切回“跟随主控”。`server` 是浏览器的“跟随主控”选项，不是主控主题名称。旧值 `nezhadash` 兼容映射到 `nezha`，新配置统一用 `nezha`。这些名称对应本项目的外置探针，主控内置探针对未知主题仍使用默认样式。

三套移植主题均使用主控公开探针数据，缺失字段隐藏对应展示，真实零值保留为零，历史缺样保留断点。Emerald 与 LuminaPlus 首页流量概览以已用量为主数字，LuminaPlus 同时展示周期上下行明细；Nezha 首页网络概览保留上游上下行流量与实时速率的展示样式。节点卡片不展示剩余流量；已用量使用主控调整后的 `traffic_used`。周期上下行与网卡开机累计独立映射，不相加替代计费用量。流量汇总包含离线节点用量，实时网速只汇总在线节点。

Nezha 续费进度按到期日和续费周期估算，访客胶囊约 12 秒后隐藏，访客信息来自 Cloudflare 请求信息。Emerald 与 LuminaPlus 在同源 iframe 中复用上游页面与样式，并共享宿主数据快照。各主题的来源、数据映射和限制见下方主题说明。

## 更新

Fork 连接 Cloudflare Workers Builds 后，`main` 分支收到更新即可自动构建部署。

- 手动同步：在 Fork 页面点击 **Sync fork → Update branch**。
- 定时同步：启用 Fork 的 **Actions**，将 **Workflow permissions** 设为 **Read and write**。内置 **Sync upstream** 每天北京时间 11:23 从本仓库同步，也可手动运行。
- 有冲突会停止，不会强制覆盖修改。长期不活跃时，需检查 GitHub 是否暂停了定时任务。

## 开发

需要 Node.js 22+。复制 [`.dev.vars.example`](.dev.vars.example) 为 `.dev.vars`，按变量表填写，然后执行：

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

本项目基于 [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe)，由 [xiangwan6667](https://github.com/xiangwan6667) 独立维护，不代表原作者或官方项目。问题请提交至 [Issues](https://github.com/xiangwan6667/mmwx-probe-sd/issues)。

| 部分 | 上游来源 | 许可 | 说明与记录 |
| --- | --- | --- | --- |
| 主项目 | [mmwx-group/mmwx-probe](https://github.com/mmwx-group/mmwx-probe)，Copyright © 2026 Jim Lee | [MSAL-1.0](LICENSE) | 非商业使用须遵守许可证；商业使用需取得原版权方授权。该许可不是 OSI 开源许可 |
| Nezha | [BITJEBE/nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE)，基于 [Akizon77/nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1) | [Apache-2.0](licenses/NezhaDash-Apache-2.0.txt) | [主题说明](licenses/NezhaDash-NOTICE.md) |
| Emerald | [Tokinx/komari-theme-emerald](https://github.com/Tokinx/komari-theme-emerald) | [MIT](src/emerald/LICENSE) | [主题说明](docs/emerald-port.md) · [本地图像声明](public/emerald-assets/NOTICE.md) |
| LuminaPlus | [shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus) | [MIT](src/lumina/LICENSE) | [主题说明](docs/lumina-port.md) |

第三方源码与资源保留各自的版权和许可证；主题移植不改变主项目或第三方部分的许可。以上是来源索引，使用条件以各许可证原文为准。
