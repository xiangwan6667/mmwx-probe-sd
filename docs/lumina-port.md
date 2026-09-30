# LuminaPlus 主题说明

## 来源

| 项目 | 信息 |
| --- | --- |
| 上游 | [shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus) |
| Revision | `a52305e1c26c68bd741a079c4ff50f7b3a5a016e` |
| 源码 | [src/lumina/upstream](../src/lumina/upstream) |
| 静态资源 | [public/lumina-assets](../public/lumina-assets) |
| 原始文件摘要 | [upstream-manifest.json](../src/lumina/upstream-manifest.json) |
| 许可 | [MIT](../src/lumina/LICENSE) |

## 复用范围

保留上游 React 首页、卡片/列表、实例详情、资产和流量页面的组件及样式。独立 iframe 隔离样式，增加宿主数据桥接、Hash 路由、主题与明暗偏好同步和资源路径适配，深色画布使用上游纯黑预设。主题标识为 `lumina`，显示名称为 LuminaPlus。

首页与详情路由同步宿主，定时数据更新不重置当前路由；资产和流量页面路由保留在主题内。站点标题来自主控 `sitename`，主题与卡片尺寸按钮常驻显示，首页移除箭头装饰。

## 接口与数据

主题通过同源 iframe 与宿主共享公开探针快照；宿主使用 `/api/probe` 和 `/api/stream` 获取数据。历史资源使用 `/api/series?server=数组索引&range=...&metric=system`，Ping 历史使用 `/api/series?server=数组索引&range=...&all=1`。节点标识保留主控数组索引，历史范围受主控保留时间限制。

| 数据 | 展示口径 |
| --- | --- |
| 计费用量、配额与剩余 | 使用主控调整后的 `traffic_used` 及同口径配额，不以周期上下行之和替代已用量 |
| 周期上传与下载 | `traffic_used_up` / `traffic_used_down`，保留原始方向统计 |
| 网卡开机累计 | `boot_traffic_*` / `cumulative_*`，与计费周期用量分开 |
| 汇总 | 用量包含离线节点；实时网速只汇总在线节点 |
| 三网延迟 | 按 `tri_isp.targets[].key` 匹配节点 `ping`，不以延迟推断回程线路 |
| 回程线路 | 单独读取 `return_routes` 中电信、联通、移动结果 |

## 展示规则

缺失字段隐藏对应展示，真实零值保留为零，历史缺样保留断点；不模拟未提供的能力。首页流量概览仅展示已用量，节点卡片和列表不展示剩余流量。流量周期结束时间只读取实际 `period_end`，不自动推算重置日期。费用依赖价格、周期、期限及汇率等实际字段，缺少必要数据时隐藏相关展示。

今日流量需要主控提供 `daily_traffic`，没有速率采样时不推算峰值。三网延迟关闭时使用主控下发的第一条 Ping。

## 限制

等待首次宿主载荷后挂载页面。上游开发模拟数据、后台恢复入口和 Service Worker 启动不参与运行，Komari 管理写入接口不可用，登录入口遵循主控公开开关。源码保留的辅助组件不代表主控已支持对应能力；IPv4/IPv6、显卡、虚拟化、Swap 等字段以实际载荷为准。

移植阶段曾使用本地模拟数据验证 390px 手机布局、明暗切换、首页与详情返回、6 小时负载、三线路 Ping、资产和流量页面；这些记录不构成当前版本或实际主控联调结果。2026-09-29 的检查范围见[历史检查记录](performance-security-review.md)。

## 许可

上游源码保留 shanyang242 及贡献者的版权和 MIT 许可。移植不改变[主项目许可](../LICENSE)，本主题为非官方移植，不代表上游作者。
