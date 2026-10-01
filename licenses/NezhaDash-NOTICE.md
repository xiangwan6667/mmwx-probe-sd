# Nezha 主题说明

## 来源

| 项目 | 信息 |
| --- | --- |
| 当前上游 | [BITJEBE/nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE) |
| 版本 | `1.1.7` |
| Revision | `88a9a07d5f60441b01440062474d0cc5339bc08a` |
| 上游来源链 | BITJEBE README 声明基于 [Akizon77/nezha-dash-v1](https://github.com/Akizon77/nezha-dash-v1) 二次开发 |
| 源码 | [src/nezhadash/upstream](../src/nezhadash/upstream) |
| 原始文件摘要 | [NezhaDash-upstream-files.json](NezhaDash-upstream-files.json) |
| 许可 | [Apache-2.0](NezhaDash-Apache-2.0.txt) |

本项目最初以 [hamster1963/nezha-dash-v2](https://github.com/hamster1963/nezha-dash-v2) `2.4.3`（`cd070d57dac800fb7a6a6e119a7db35066587149`）建立独立数据与宿主适配，现以 BITJEBE 整套主题源码为主要来源。保留上游源码中的原作者及贡献者版权信息，历史适配来源的权利不因切换主题来源而改变。

## 复用范围

完整迁入 BITJEBE 的页面、组件、Hooks、翻译、样式与资源，包括首页、卡片/列表、实例详情、流量、资产和服务监控组件。资产统计面板及入口按用户要求不展示，原版源码仍保留。主题标识为 `nezha`，资源保存在 [public/nezhadash](../public/nezhadash)。

2026 年 9 月由 xiangwan6667 作以下宿主适配：

- 源码与入口：独立同源 iframe 隔离样式，通过校验消息桥共享宿主快照，接入宿主主题菜单和系统明暗偏好。
- 数据：将妙妙屋公开节点、配置、历史指标、流量及费用映射为主题结构，保留实际零值与缺样语义；服务监控按实际数据展示。
- 路由：Hash 路由与宿主首页及节点详情同步，直接访问子页面返回宿主；节点移除时显示不存在页面。
- 资源与设置：适配本地资源路径、Worker 背景设置、Cloudflare 访客信息及宿主登录开关。

具体复制文件及原始摘要以来源清单为准；本说明按模块记录适配，不将未核对文件宣称为完全未修改。

## 接口与数据

宿主使用 `/api/probe` 和 `/api/stream` 获取公开探针数据，主题共享宿主快照。历史资源使用 `/api/series?server=数组索引&range=...&metric=system`，Ping 使用 `/api/series?server=数组索引&range=...&all=1`；保留节点数组索引、字节单位、缺失延迟桶和丢包样本，时间戳转换为毫秒。

计费用量采用主控调整后的 `traffic_used`，配额与剩余使用相同口径；周期上下行 `traffic_used_up/down` 与网卡开机累计 `boot_traffic_*` / `cumulative_*` 分开展示，不相加替代计费用量。汇总包含离线节点用量，实时网速只汇总在线节点。流量周期仅读取实际 `period_end`，过期周期不自动顺延。

套餐标签使用主控公开配额与 `return_routes`。访客胶囊保留上游外观和定时隐藏，数据只来自 `/api/visitor` 的 Cloudflare 请求信息，国旗和字体使用本地资源，不调用外部 IP 查询或国旗服务。

## 展示规则

缺失字段隐藏对应展示，真实零值保留为零，历史缺样保留断点。首页网络概览保留上游上下行流量与实时速率的排版、颜色和图标，流量绑定主控周期上下行（包含离线节点），速率仅汇总在线节点。不生成主控未提供的进程数量、资源历史或 IP 类型标记。卡片、紧凑列表与详情使用相同数据语义。

## 限制

主控数据能力与付费权限决定可用内容，续费进度属于估算。服务监控仅展示主控实际提供的记录，不承诺上游所述的完整 30 天监控。保留上游资产等辅助组件源码不代表运行页面提供对应功能，主题不是独立采集端。

## 许可

BITJEBE 上游仓库使用 Apache-2.0 许可，复用代码保留其许可证及原有版权来源链。MMWX 派生代码继续遵循[主项目许可](../LICENSE)，本声明不将宿主应用重新授权为 Apache-2.0。本主题为非官方移植，不代表 BITJEBE、NezhaDash 或其他上游作者。
