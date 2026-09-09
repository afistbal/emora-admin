# 消息列表与详情

消息管理分为列表和独立详情页。两个接口均为只读 POST 接口，需要管理员 Bearer Token，响应使用统一包络 `{c,m,d}`。

## 消息列表

POST `/api/admin/messages/list`

所有参数可选：`message_id`、`user_id`、`conversation_id`、`before_id`、`page` 为正整数；`page_size` 默认 10，范围 1–100；`message_type` 为 `text`、`image`、`video`、`private_photo`；`status` 为 `generating`、`success`、`failed`。空筛选不传。参数错误 HTTP 422，非管理员 HTTP 403。

`d` 包含 `items`、`has_more`、`next_before_id`、`page_size`，按消息 ID 降序。传 `page` 时使用页码分页并增加 `page`、`total`；不传 `page` 时保留原游标方式，下一页传 `before_id=next_before_id` 且不计算总数。

每项字段：`id`、`user_id`、`character_id`、`conversation_id`、`conversation_seq`、`message_type`、`status`、`question`、`answer`、`question_assets`、`answer_assets`、`generation_run_id`、`client_message_id`、`request_id`、`generation_uuid`、`generation_status`、`generation_error_code`、`generation_error_message`、`error_code`、`error_message`、`created_at`、`completed_at`。`character_id` 来自该消息关联的最新生成任务，没有关联任务时为 null；时间为 ISO 8601 或 null。

列表页展示消息 ID、用户 ID、角色 ID、消息类型、消息状态、发送时间、生成时间和操作。发送时间使用 `created_at`，生成时间使用 `completed_at`，生成尚未完成时显示空值。消息 ID 为普通文本；用户 ID 和角色 ID 可复制，复制时不会触发跳转。整行、键盘或“详情”按钮均可进入 `/messages/{id}`。

## 消息详情

POST `/api/admin/messages/detail`

请求：

```json
{
  "message_id": 625
}
```

`message_id` 必填且必须为正整数。参数错误 HTTP 422，消息不存在 HTTP 404，非管理员 HTTP 403。

响应 `d`：

- `message`：列表字段，以及发送方、删除时间、更新时间、递归脱敏后的 `question_content` 和 `answer_content`。
- `generation`：最新关联生成任务的状态、角色、模型 Profile、模型、Provider 任务 ID、错误和各阶段时间；未关联时为 null。
- `gateway`：安全的网关路由与策略决策字段；未关联时为 null。
- `token_usage.summary`：`requests`、`input_tokens`、`output_tokens`、`reasoning_tokens`、`total_tokens`、`estimated_cost`、`currency`。
- `token_usage.calls`：每次 Provider 调用的模型、状态、HTTP 状态、Token、成本、耗时、错误和时间字段。

详情页完整展示业务消息正文、结构化内容、图片或视频、失败原因、生成任务、网关决策、追踪标识和 Token 调用明细。出于安全边界，接口不返回 `request_raw`、`response_raw`、`provider_metadata`、加密快照或任何 API 密钥。

## 内容、异常与媒体规则

问答摘要和错误原因最多 4000 字符，包含截断提示；详情结构化内容中的字符串最多 50000 字符。常见凭证和 URL 查询参数会脱敏。已删除内容仅显示删除提示且完整结构返回 null，不加载加密请求快照。

`question_assets`、`answer_assets` 数组项为 `{url,type,asset_id}`，`type` 为 image/video。仅返回消息已有的 HTTP(S) 资源地址，不查询或替换私密照片原图。图片支持预览放大；视频不自动播放并使用 `preload=none`。过期签名不会自动刷新，浏览器不支持的编码可能无法播放。

失败原因取同会话、输入或输出消息匹配的最新 `generation_runs`。仅消息与最新任务均失败时使用该任务原因；媒体重试失败仍可能保留成功消息，因此另行返回 `generation_error_*`，不改变原消息状态。

## 部署与验证

必须先部署 API，再发布前端；否则列表仍可兼容旧接口，但角色 ID 为空且详情接口会真实返回 404。API 更新后按现有流程刷新路由缓存；启用 OPcache 且不检查时间戳的环境还需重新加载 PHP-FPM。无需 SQL、配置或队列重启。

前端验证：`npm run validate`。后端验证：`php artisan test tests/Feature/AdminMessageListTest.php`。使用管理员账号检查列表查询、重置、分页、复制、整行跳转，以及详情页的正常、空 Token、失败消息和媒体加载失败状态。

详情固定执行消息、最新任务、网关记录和 Token 调用四类查询，不在列表中逐条加载详情。当前会话索引用于任务关联；全局状态或类型筛选在大数据量下可能扫描较多消息，仍需结合生产执行计划评估。
