# LuminaPlus 移植记录

上游：[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)，版本 `a52305e1c26c68bd741a079c4ff50f7b3a5a016e`。源码复制到 `src/lumina/upstream`，静态资源保存在 `public/lumina-assets`。原始文件摘要见 `src/lumina/upstream-manifest.json`，MIT 许可见 `src/lumina/LICENSE`。

保留上游首页、卡片/列表、实例详情、资产和流量页面的组件及样式。移植仅增加数据桥接、独立 iframe 入口、Hash 路由、主题切换与明暗偏好、资源路径和纯黑深色画布适配。上游开发模拟数据、后台恢复入口和 Service Worker 启动不参与运行。

主题标识为 `lumina`，显示名称为 LuminaPlus，主题菜单排列在 Emerald 后面。首页和详情路由与宿主同步，定时数据更新不会重置当前路由；资产和流量页面路由保留在主题内。

数据由宿主公开探针载荷提供，等待首次载荷后挂载页面。适配器将主控节点、历史指标、网络探测和流量映射为上游结构，缺失能力不生成模拟历史或在线状态。Komari 管理写入接口不可用，登录入口遵循主控公开开关。主题源码保留上游辅助组件，未启用功能不代表主控已支持相应能力。

历史负载与 Ping 使用主项目 `/api/series`，周期为 1 小时、6 小时、24 小时、3 天、7 天，并按主控保留时间限制。计费流量采用主控校正用量，开机累计流量单独显示；流量重置日期仅使用实际 `period_end`。今日流量需要主控提供 `daily_traffic`，没有速率采样时不推算峰值。IPv4/IPv6、显卡、虚拟化、Swap 等未提供字段保持未知。

费用、周期、期限或汇率缺失时，相关价值与汇总显示 `—`。真实零值保留为零，历史缺样保留断点。浏览器已验证 390px 手机布局、明暗切换、首页与详情返回、6 小时负载与三线路 Ping、资产和流量页面；当前预览只用本地模拟数据，尚未联调实际主控。

主控开启三网延迟时，三网 Ping 按 `tri_isp.targets[].key` 匹配节点 `ping`，复用原主题三线路延迟/丢包组件，缺失目标保留槽位；关闭时只显示主控下发的第一条 Ping。卡片底部的回程线路标签单独读取 `return_routes`，展示电信、联通、移动的 `route_type`；缺失结果显示“未知”，不以延迟推断线路类型。
