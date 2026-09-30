# Emerald 主题说明

## 来源

| 项目 | 信息 |
| --- | --- |
| 上游 | [Tokinx/komari-theme-emerald](https://github.com/Tokinx/komari-theme-emerald) |
| 版本 | `1.0.16` |
| Revision | `9f9a076df2bc680ddd8c42b6d921a96beec5ea90` |
| 源码 | [src/emerald/upstream](../src/emerald/upstream) |
| 原始文件摘要 | [upstream-manifest.json](../src/emerald/upstream-manifest.json) |
| 许可 | [MIT](../src/emerald/LICENSE) |

## 复用范围

保留上游 Vue 页面、卡片、布局、地球、图表、动画和样式。独立 iframe 隔离样式，数据 transport 接入宿主快照，路由使用 Hash 并与宿主同步，主题与明暗偏好跟随宿主。主题标识为 `emerald`。

国旗和系统图像使用本地资源，来源与许可见[本地图像声明](../public/emerald-assets/NOTICE.md)。其他图标沿用上游 Iconify 加载方式，地图保留上游公共地图资源回退。

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

缺失字段隐藏对应展示，真实零值保留为零，历史缺样保留断点；不模拟未提供的能力。首页流量概览仅展示已用量。流量周期结束时间只读取实际 `period_end`，不自动推算重置日期。费用依赖价格、周期、期限及汇率等实际字段，缺少必要数据时隐藏相关展示。

费用按汇率折算，默认美元，并保留原币种明细；汇率使用每日更新的在线数据。

## 限制

数据能力取决于主控公开接口及权限。图标、地图与汇率仍可能访问外部服务，因此本地图像资源不代表整个主题零外联。

移植阶段曾使用模拟数据验证桌面、390px 手机布局、明暗切换、历史范围及多币种场景；这些记录不构成当前版本或实际主控联调结果。2026-09-29 的检查范围见[历史检查记录](performance-security-review.md)。

## 许可

上游源码保留 Tokinx 及贡献者的版权和 MIT 许可，本地第三方图像保留各自许可。移植不改变[主项目许可](../LICENSE)，本主题为非官方移植，不代表上游作者。
