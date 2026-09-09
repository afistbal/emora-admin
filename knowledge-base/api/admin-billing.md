# 后台订单列表与订阅统计

新增只读 POST `/api/admin/orders/list` 和 `/api/admin/subscriptions/list`，沿用 Sanctum + admin 鉴权和 `{c,m,d}` 响应。原支付接口、状态值及数据库结构不变。

## 公共筛选与分页

`user_id` 正整数；`page_size` 默认30、1–100；`before_id` 正整数用于下一页。`date_from`、`date_to` 为 YYYY-MM-DD，按记录 created_at 筛选，结束日期包含整天，按应用数据库时间约定，不做浏览器时区转换。分页按 ID 降序，响应含 items、has_more、next_before_id、page_size。校验失败 HTTP 422，非管理员 HTTP 403。

## 订单

平台 platform：1 PayPal、98 Apple、99 Google；status：0 未确认、1 已支付、2 已退款。type：1 一次性、2 订阅；sn 为精确订单号。Apple/Google 使用订单创建时保存的商品类型，其他历史平台依据关联商品类型，缺失显示未知。

items 字段：id、sn、user_id、platform、status、amount、refund_amount、product_id、platform_sn、created_at、updated_at、product_name、store_product_id、product_type。没有币种字段，不汇总为收入。未确认的平台交易号可能是本地占位号。

## 订阅统计

platform 仅支持98/99，默认99；status：1 待处理、2 有效、3 已过期、4 取消续订、5 退款撤销、6 验证失败。支持 store_product_id 精确筛选、auto_renewing 0/1。排除 del_flag != 1。

summary 包含 total（记录数）、users（去重用户数）、statuses（状态码到数量的映射）。统计当前筛选全集，不受 before_id 影响；不是续费次数、转化率或实时 VIP 权益判断。并发支付回调可能使汇总与明细在瞬间出现差异。

明细包含 id、user_id、pay_no、pkg_name、status、subscription_state、auto_renewing、expiry_time、amount、created_at、updated_at、product_name、store_product_id、start_time、subscription_type、platform。Apple 另含 transaction_id、original_transaction_id、environment、currency；Google 另含 base_plan_id、google_order_id、next_billing_at。周/月/年从关联订单对应的当前商品配置读取，无法关联时为 null；Apple start_time 为购买时间，不伪称初次订阅时间。Google 金额币种缺失时显示未记录。

不返回 purchase_token、app_account_token、verify_data、latest_payload。无 H5 专用订阅表，不编造 H5 或续费次数统计。

## 查询与部署

订单列表1次查询，订阅列表4次查询（状态分组、去重用户、分页明细、批量关联订单商品），无循环查询、不加锁、不写事务、不调用第三方或缓存。订阅表 `pay_no` 与订单表 `sn` 的历史排序规则不同，因此不直接 JOIN，而是分页后通过 `orders.sn` 唯一索引批量查询；商品关联使用 products.id 主键。现有订阅 user/status 索引可用于筛选。全局统计需要扫描匹配的订阅记录，日期筛选缺少专用索引时可能扫描更多。尚未在生产执行 EXPLAIN，不预先新增重复索引。

无数据库结构变更、无新配置。先发布后端并按项目流程刷新路由缓存，再发布前端；若 OPcache 不检查文件更新，重新加载 PHP-FPM。无需队列重启。回滚本次代码及前端包即可。

验证：php vendor/bin/pest tests/Feature/AdminBillingTest.php；npm run validate。真实数据库统计和浏览器账号联调需在部署后核对。
