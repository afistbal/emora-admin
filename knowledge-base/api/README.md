# Admin API 知识库

- **运行基址**：`https://testapi.weshow.cc/api`
- **来源文件**：`C:\Users\Administrator\Downloads\testwww.yogoshort.com\testwww.yogoshort.com\test-api-docs\openapi.yaml`
- **OpenAPI**：3.0.3
- **文档版本**：0.2.0
- **源文件 SHA-256**：`16a86fce8814a88ca49d47a86b9656d19434cac122e561a301d1079b1742e256`
- **筛选规则**：仅保留路径以 `/admin/` 开头的接口；忽略路径以 `/ai/` 开头的 C 端聊天接口。
- **接口数量**：42

## 通用约定

- 当前后台接口全部为 POST。
- 业务参数使用 JSON request body；媒体上传策略接口返回表单直传参数。
- 统一响应包络为 `{ c, m, d }`。
- 后台接口声明 `bearerAuth`，请求头使用 `Authorization: Bearer <admin-token>`。
- 已实测运行基址可达：未带 Token 请求返回 HTTP 401 和 `Unauthenticated.`。

## 分组

| 分组 | 数量 | 文档 |
|---|---:|---|
| 角色与版本 | 11 | [admin-character.md](./admin-character.md) |
| 媒体资产 | 3 | [admin-media.md](./admin-media.md) |
| 生成预设 | 5 | [admin-presets.md](./admin-presets.md) |
| 用户与金币 | 8 | [admin-user.md](./admin-user.md) |
| 用户反馈 | 1 | [admin-feedback.md](./admin-feedback.md) |
| 商品与商业化 | 5 | [admin-product.md](./admin-product.md) |
| 后台设置 | 4 | [admin-settings.md](./admin-settings.md) |
| 后台统计 | 1 | [admin-analytics.md](./admin-analytics.md) |
| 消息管理 | 2 | [admin-messages.md](./admin-messages.md) |
| 订单与订阅 | 2 | [admin-billing.md](./admin-billing.md) |

## 完整接口索引

| # | 方法 | 路径 | 摘要 | 文档 |
|---:|---|---|---|---|
| 1 | POST | `/admin/characters/list` | 角色列表 | [查看](./admin-character.md#admincharacterlist) |
| 2 | POST | `/admin/characters/detail` | 角色详情和版本快照 | [查看](./admin-character.md#admincharacterdetail) |
| 3 | POST | `/admin/characters/versions` | 角色版本历史 | [查看](./admin-character.md#admincharacterversions) |
| 4 | POST | `/admin/characters/create` | 创建角色草稿 | [查看](./admin-character.md#admincharactercreate) |
| 5 | POST | `/admin/characters/draft/save` | 保存角色草稿 | [查看](./admin-character.md#admincharacterdraftsave) |
| 6 | POST | `/admin/characters/publish` | 发布角色草稿 | [查看](./admin-character.md#admincharacterpublish) |
| 7 | POST | `/admin/characters/rollback` | 回滚角色版本 | [查看](./admin-character.md#admincharacterrollback) |
| 8 | POST | `/admin/characters/assets/status` | 修改角色资产绑定状态 | [查看](./admin-character.md#admincharacterassetstatus) |
| 9 | POST | `/admin/characters/assets/remove` | 移除角色资产绑定 | [查看](./admin-character.md#admincharacterassetremove) |
| 10 | POST | `/admin/characters/delete` | 软删除角色 | [查看](./admin-character.md#admincharacterdelete) |
| 11 | POST | `/admin/characters/json/update` | 使用 JSON 更新角色草稿 | [查看](./admin-character.md#admincharacterjsonupdate) |
| 12 | POST | `/admin/media/list` | 查询媒体资产 | [查看](./admin-media.md#adminmedialist) |
| 13 | POST | `/admin/media/upload` | 登记 COS/OSS 上传结果 | [查看](./admin-media.md#adminmediaregister) |
| 14 | POST | `/admin/media/upload-policy` | 获取 COS/OSS 表单直传凭证 | [查看](./admin-media.md#adminmediauploadpolicy) |
| 15 | POST | `/admin/ai/presets/list` | 查询 AI 提示语预设 | [查看](./admin-presets.md#adminaipromptpresetlist) |
| 16 | POST | `/admin/ai/presets/create` | 新增 AI 提示语预设 | [查看](./admin-presets.md#adminaipromptpresetcreate) |
| 17 | POST | `/admin/ai/presets/update` | 编辑 AI 提示语预设 | [查看](./admin-presets.md#adminaipromptpresetupdate) |
| 18 | POST | `/admin/ai/presets/status` | 上下架 AI 提示语预设 | [查看](./admin-presets.md#adminaipromptpresetstatus) |
| 19 | POST | `/admin/ai/presets/delete` | 删除 AI 提示语预设 | [查看](./admin-presets.md#adminaipromptpresetdelete) |
| 20 | POST | `/admin/users/list` | 查询后台用户列表 | [查看](./admin-user.md#adminuserlist) |
| 21 | POST | `/admin/users/detail` | 查询后台用户详情 | [查看](./admin-user.md#adminuserdetail) |
| 22 | POST | `/admin/users/admin/status` | 设置或取消管理员 | [查看](./admin-user.md#adminuseradminstatus) |
| 23 | POST | `/admin/users/wallet/history` | 查询用户金币流水 | [查看](./admin-user.md#adminuserwallethistory) |
| 24 | POST | `/admin/users/wallet/flows` | 查询全局用户流水 | [查看](./admin-user.md#adminuserwalletflows) |
| 25 | POST | `/admin/users/coins/grant` | 后台补发金币 | [查看](./admin-user.md#adminusergrantcoins) |
| 26 | POST | `/admin/users/free-quota/reset` | 重置用户今日免费额度 | [查看](./admin-user.md#adminuserresetfreequota) |
| 27 | POST | `/admin/users/status` | 封禁或解除封禁用户 | [查看](./admin-user.md#adminuseraccountstatus) |
| 28 | POST | `/admin/feedback/list` | 查询用户反馈列表 | [查看](./admin-feedback.md#adminfeedbacklist) |
| 29 | POST | `/admin/products/list` | 查询后台商品列表 | [查看](./admin-product.md#adminproductlist) |
| 30 | POST | `/admin/products/create` | 创建后台商品 | [查看](./admin-product.md#adminproductcreate) |
| 31 | POST | `/admin/products/update` | 编辑后台商品 | [查看](./admin-product.md#adminproductupdate) |
| 32 | POST | `/admin/products/status` | 上下架商品 | [查看](./admin-product.md#adminproductstatus) |
| 33 | POST | `/admin/products/delete` | 下架后台商品 | [查看](./admin-product.md#adminproductdelete) |
| 34 | POST | `/admin/analytics/query` | 查询后台统计 | [查看](./admin-analytics.md#adminanalyticsquery) |
| 35 | POST | `/admin/settings/commerce/benefits` | 查询后台会员权益配置 | [查看](./admin-settings.md) |
| 36 | POST | `/admin/settings/commerce/benefits/save` | 保存后台会员权益配置 | [查看](./admin-settings.md) |

| 37 | POST | `/admin/messages/list` | 查询消息及失败原因 | [查看](./admin-messages.md) |
| 38 | POST | `/admin/messages/detail` | 查询消息内容、生成链路和 Token 明细 | [查看](./admin-messages.md#消息详情) |
| 39 | POST | `/admin/orders/list` | 订单列表 | [查看](./admin-billing.md) |
| 40 | POST | `/admin/subscriptions/list` | 订阅统计与明细 | [查看](./admin-billing.md) |
| 41 | POST | `/admin/settings/list` | 查询系统配置列表 | [查看](./admin-settings.md#查询系统配置列表) |
| 42 | POST | `/admin/settings/update` | 更新系统配置 | [查看](./admin-settings.md#更新系统配置) |
