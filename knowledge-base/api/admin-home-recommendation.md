# 首页推荐管理

以下接口均为 `POST`，位于 `auth:sanctum + active-user + admin` 中间件内，响应使用统一 `{ c, m, d }` 包络。

## 查询推荐配置

`/admin/home-recommendation/config`

请求可传 `pool`、`pool_page`、`pool_page_size` 和布尔值 `include_preview`。返回固定 10 个推荐位、配置版本号、四个池子的数量、当前池分页角色，以及按当前全局配置计算的 `next_round_slots`。`include_preview` 默认为 `true`；四池并行分页等已有独立预览结果的场景可传 `false`，避免重复计算候选。

推荐位 `pool` 支持：`recommended`、`new`、`recent`、`regular`。自动池按角色首次上架时间划分：3 天内为全新池、4-30 天为近期池、超过 30 天为常规池；没有可用发布时间的历史在线角色归入常规池。

`next_round_slots` 按推荐位 1-10 顺序取数，同一角色在同一轮只占一个位置。人工推荐池还会检查角色上架状态、发布版本、推荐开关和生效时间。池成员通过 `is_next_round`、`next_round_positions`、`rule_status` 和 `rule_reason` 明确标记是否命中及原因。

`next_round_scope` 当前固定为 `global_config_preview`。该预览不读取具体用户的已曝光或聊天历史，不能代替 C 端按用户去重后的真实推荐结果。

## 保存推荐位

`/admin/home-recommendation/slots/save`

请求包含当前 `version` 和完整的 10 个 `slots`；每个推荐位提交 `position` 与 `pool`。历史 `remark` 字段继续由服务端兼容，但管理后台不再编辑或提交。服务端使用版本号做并发校验，配置被其他管理员修改时返回冲突错误。

## 修改角色推荐状态

`/admin/home-recommendation/characters/status`

请求字段：`char_id`、`enabled`。只有已有发布版本且状态为 `online` 的角色可以开启推荐。

## 保存推荐池条目

`/admin/home-recommendation/pool/save`

请求字段：`id`、`sort_order`、`enabled`、可空的 `start_at` 和 `end_at`。开始时间不得晚于结束时间。
