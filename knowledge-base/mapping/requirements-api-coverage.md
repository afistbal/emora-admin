# 需求与接口覆盖矩阵

本表只表达“已确认能否支持”，不把产品页面和接口强制做一一对应。

## 已有明确接口支持

| 产品域 | 已确认接口 | 结论 |
|---|---|---|
| 角色管理 | `/admin/characters/list`、`detail`、`versions`、`create`、`draft/save`、`publish`、`rollback`、`assets/status`、`assets/remove` | 覆盖角色列表、详情、版本、草稿、发布、回滚和资产状态 |
| 媒体资产 | `/admin/media/list`、`upload`、`upload-policy` | 支持素材查询与上传流程；它是角色编辑等页面的基础能力，不必单独做菜单 |
| 生成预设 | `/admin/ai/presets/list`、`create`、`update`、`status`、`delete` | 覆盖预设管理；虽然包含 `ai`，但路径属于 `/admin/`，必须保留 |
| 用户管理 | `/admin/users/list`、`detail`、`admin/status`、`wallet/history`、`coins/grant` | 覆盖用户查询、详情、管理员状态、金币流水和人工赠币 |
| 商品管理 | `/admin/products/list`、`create`、`update`、`status`、`delete` | 提供通用商品管理能力，可支持已定义的商业化页面，但具体商品类型仍以接口枚举为准 |
| 数据统计 | `/admin/analytics/query` | 有统一查询入口，但维度与产品稿并不完全一致，见下方差异 |
| 系统设置 | `/admin/settings/list`、`/admin/settings/update` | 动态管理 settings 现有记录；配置键只读，JSON 值和启停状态支持版本并发校验 |

## 产品有要求、接口尚未明确

| 产品要求 | 当前结论 | 开发处理 |
|---|---|---|
| 生成价格、免费次数、失败兜底文案配置 | 当前已登记的 30 个后台接口中没有专用配置接口 | 页面标记待接，不编造接口或数据 |
| 会员开关、会员到期调整 | 用户接口未提供对应操作 | 只展示接口已返回的数据，不实现伪保存 |
| 封禁/解封用户 | 未找到后台操作接口 | 保留待确认入口或禁用态 |
| 重置免费次数 | 未找到后台操作接口 | 标记待后端补充 |
| 会员权益编辑 | `/admin/settings/commerce/benefits`、`/admin/settings/commerce/benefits/save` | 支持按语言查询、编辑标题与描述、启停并覆盖保存 |
| 权限矩阵、角色权限、审计日志 | 通用 settings 接口不等同于权限或审计模型 | 系统设置页只管理配置记录，不伪造权限矩阵和审计日志 |
| Dashboard 专用汇总 | 没有独立汇总接口 | 仅在 `/admin/analytics/query` 明确支持的范围内组合展示 |

## 接口存在、产品页面未明确

| 接口能力 | 当前处理 |
|---|---|
| `/admin/feedback/list` | 登记为后台能力；需求没有明确反馈管理页面，暂不新增一级菜单 |
| `/admin/media/*` | 作为上传/素材选择基础设施使用，暂不强行新增媒体中心 |
| 通用商品创建、删除、上下架 | 只在商业化需求需要时使用，不因接口完整就扩展额外页面 |

## 已知口径差异

`/admin/analytics/query` 当前文档支持：

- `tab`：`all`、`user`、`chat`、`media`
- `user_type`：`all`、`guest`、`registered`
- 查询时间范围：最长 31 天

产品/原型提出的统计页还包含金币、会员等口径，以及游客、非会员、会员等用户分层。两者并不等价。开发时只发送 OpenAPI 允许的枚举；缺失指标不伪造数据，并在页面注明待接口支持。
