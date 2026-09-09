# 消息列表

POST `/api/admin/messages/list`，需要管理员 Bearer Token。只读接口。

所有参数可选：`message_id`、`user_id`、`conversation_id`、`before_id` 为正整数；`page_size` 默认 30，范围 1–100；`message_type` 为 text/image/video/private_photo；`status` 为 generating/success/failed。空筛选不传。参数错误 HTTP 422，非管理员 HTTP 403。

响应包络 `{c,m,d}`，`d` 包含 `items`、`has_more`、`next_before_id`、`page_size`。按消息 ID 降序；下一页传 `before_id=next_before_id`，不计算总数。

每项字段：`id`、`user_id`、`conversation_id`、`conversation_seq`、`message_type`、`status`、`question`、`answer`、`generation_run_id`、`error_code`、`error_message`、`created_at`、`completed_at`。时间为 ISO 8601 或 null，前端按浏览器时区展示。

失败原因取同会话、输入或输出消息匹配的最新 generation_runs；仅消息与最新任务均失败时使用该任务原因。失败消息没有有效错误记录时返回“未记录具体失败原因”。其他消息的错误字段为 null。

问答摘要和错误原因最多 4000 字符，包含截断提示；常见凭证和 URL 查询参数脱敏。已删除内容仅显示删除提示，旧摘要保留资源数量，媒体通过新增资源字段展示，不加载加密请求快照。

## 部署与验证

先部署 API（新增 Controller、Service 和路由），按现有部署流程更新路由缓存，再发布前端；启用 OPcache 不检查时间戳的环境需重新加载 PHP-FPM。无需 SQL、配置或队列重启。前端构建命令 `npm run build`；后端验证 `php vendor/bin/pest tests/Feature/AdminMessageListTest.php`。

使用管理员进入“消息列表”，筛选失败消息检查错误原因，测试查询、重置、翻页和刷新。生产查询计划及真实账号联调尚未执行。现有会话索引用于任务关联；稀疏的全局状态/类型筛选可能扫描较多消息，需在实际数据量下评估。

## 消息追踪与最新任务异常

新增 `client_message_id`、`request_id`、`generation_uuid`、`generation_status`、`generation_error_code`、`generation_error_message`。追踪字段来自消息和最新生成任务原始标识，没有关联任务时为 null，不以消息数字 ID 代替追踪 ID。

最新任务失败时独立返回 generation_error 字段，即使历史媒体保留使消息 status 仍为 success。原 error_code/error_message 规则保持兼容。后续任务成功或生成中时不返回旧任务失败原因。页面按上下顺序展示问答并标注所属消息类型。

## 图片与视频展示

新增 `question_assets`、`answer_assets`，数组项为 `{url,type,asset_id}`，type 为 image/video。合并内容中的 assets 和 media 参考资源，保留 HTTP(S) 地址及其签名参数；拒绝可执行协议和含用户名密码的 URL。已删除内容返回空数组。

仅在原管理员鉴权接口返回消息已有资源，不查询或替换私密照片原图。页面图片支持放大，视频使用浏览器原生播放器（不自动播放、preload=none），加载失败可重试。过期签名不会自动刷新，浏览器不支持的编码可能无法播放。
