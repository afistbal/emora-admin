import { useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker, Empty, Form, Input, InputNumber, Pagination, Select, Space, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { adminApi } from "./api/client.js";
import "./billing.css";

const PLATFORMS = { 98: "iOS · Apple", 99: "Android · Google", 1: "PayPal" };
const ORDER_STATUS = { 0: "未确认", 1: "已支付", 2: "已退款" };
const SUB_STATUS = { 1: "待处理", 2: "有效", 3: "已过期", 4: "已取消续订", 5: "已退款 / 撤销", 6: "验证失败" };
const PERIOD = { 1: "周", 2: "月", 3: "年" };
const show = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const formatDateTime = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : show(value);
};

function State({ value, subscription }) {
  const status = subscription ? SUB_STATUS : ORDER_STATUS;
  const color = subscription ? ({ 2: "success", 1: "warning", 5: "error", 6: "error" }[value] || "default") : ({ 0: "warning", 1: "success", 2: "error" }[value] || "default");
  return <Tag color={color}>{status[value] || `未知 (${value})`}</Tag>;
}

function DetailLines({ children }) {
  return <div className="billing-detail-lines">{children}</div>;
}

function OrderNumber({ label, value }) {
  const text = show(value);
  return <div className="billing-order-number">
    <small>{label}</small>
    <div className="billing-order-number-row">
      <Typography.Text
        className="billing-copyable-value"
        ellipsis={{ tooltip: text }}
        copyable={text !== "—" ? { text, tooltips: [`复制${label}`, "已复制"] } : false}
      >{text}</Typography.Text>
    </div>
  </div>;
}

export default function BillingPage({ subscription = false, adminToken }) {
  const initial = {};
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setData(null);
    const method = subscription ? adminApi.billing.subscriptions : adminApi.billing.orders;
    method({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message || "加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [subscription, adminToken, filters, page, pageSize, version]);

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value ?? "" }));
  const applyFilters = () => {
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "")));
    setPage(1);
  };
  const resetFilters = () => {
    setDraft(initial);
    setFilters(initial);
    setPage(1);
  };

  const orderColumns = [
    { title: "订单 / 用户", key: "identity", width: 150, render: (_, item) => <DetailLines><span>订单 ID：<strong>{show(item.id)}</strong></span><span>用户 ID：<strong>{show(item.user_id)}</strong></span></DetailLines> },
    { title: "订单号", key: "order_numbers", width: 280, render: (_, item) => <DetailLines><OrderNumber label="系统订单号" value={item.sn} /><OrderNumber label="三方订单号" value={item.platform_sn} /></DetailLines> },
    { title: "金额", key: "amount", render: (_, item) => <strong>{show(item.amount)}</strong> },
    { title: "商品", key: "product", render: (_, item) => <DetailLines><strong>{item.product_name || "商品未关联"}</strong><small>{show(item.store_product_id)}</small></DetailLines> },
    { title: "平台 / 类型", key: "platform", render: (_, item) => <DetailLines><span>{PLATFORMS[item.platform] || `平台 ${item.platform}`}</span><Tag color="blue">{{ 1: "一次性商品", 2: "订阅" }[item.product_type] || "类型未知"}</Tag></DetailLines> },
    { title: "状态", dataIndex: "status", key: "status", render: (value) => <State value={value} /> },
    { title: "时间", key: "time", render: (_, item) => <DetailLines><span>创建：{formatDateTime(item.created_at)}</span><span>更新：{formatDateTime(item.updated_at)}</span></DetailLines> },
  ];
  const subscriptionColumns = [
    { title: "订阅 / 用户", key: "identity", width: 130, render: (_, item) => <DetailLines><span>订阅 ID：<strong>{show(item.id)}</strong></span><span>用户 ID：<strong>{show(item.user_id)}</strong></span></DetailLines> },
    { title: "订单号", key: "order_numbers", width: 300, render: (_, item) => {
      const isGoogle = Number(item.platform) === 99;
      // 兼容后端修复部署前的 UNION 字段错位：旧响应把 Google 订单号放在 original_transaction_id。
      const platformOrderId = isGoogle ? (item.google_order_id || item.original_transaction_id) : item.transaction_id;
      return <DetailLines><OrderNumber label="系统订单号" value={item.pay_no} /><OrderNumber label={isGoogle ? "Google 订单号" : "Apple 交易号"} value={platformOrderId} />{!isGoogle && item.original_transaction_id && <OrderNumber label="Apple 原始交易号" value={item.original_transaction_id} />}</DetailLines>;
    } },
    { title: "金额", key: "amount", width: 110, render: (_, item) => <DetailLines><strong>{show(item.amount)}</strong><small>{item.currency || "币种未记录"}</small></DetailLines> },
    { title: "状态", key: "status", width: 210, render: (_, item) => <DetailLines><State value={item.status} subscription /><small>{show(item.subscription_state)}</small></DetailLines> },
    { title: "周期 / 续订", key: "period", width: 145, render: (_, item) => <DetailLines><span>{PERIOD[item.subscription_type] || "未配置"}</span><span>自动续订：{Number(item.auto_renewing) === 1 ? "开启" : "关闭"}</span></DetailLines> },
    { title: "时间", key: "time", width: 275, render: (_, item) => <DetailLines><span>开始：{formatDateTime(item.start_time)}</span><span>到期：{formatDateTime(item.expiry_time)}</span>{item.next_billing_at && <span>下次扣款：{formatDateTime(item.next_billing_at)}</span>}<span>更新：{formatDateTime(item.updated_at)}</span></DetailLines> },
    { title: "商品 / 平台", key: "product", width: 280, render: (_, item) => {
      const isGoogle = Number(item.platform) === 99;
      // 旧响应把 base_plan_id 错放在 transaction_id；后端发布后自动优先使用正确字段。
      const basePlanId = item.base_plan_id || (isGoogle ? item.transaction_id : null);
      return <DetailLines><strong>{show(item.product_name)}</strong><span>商店商品 ID：{show(item.store_product_id)}</span><small>{PLATFORMS[item.platform] || `平台 ${item.platform}`}</small>{isGoogle && <span>Google 基础计划 ID：{show(basePlanId)}</span>}</DetailLines>;
    } },
  ];

  const options = (values) => Object.entries(values).map(([value, label]) => ({ value, label }));
  const platformOptions = subscription ? { 99: PLATFORMS[99], 98: PLATFORMS[98] } : PLATFORMS;
  return <div className="section-gap billing-page">
    <header className="billing-heading"><div><h2>{subscription ? "订阅列表" : "订单列表"}</h2><p>{subscription ? "按平台查看订阅状态与有效期" : "查看商品订单、支付平台与处理状态"}</p></div><Button loading={loading} onClick={() => setVersion((current) => current + 1)}>刷新</Button></header>
    <Card><Form className="billing-filters" layout="vertical" onFinish={applyFilters}>
      <Form.Item label="用户 ID"><InputNumber min={1} precision={0} value={draft.user_id || null} onChange={(value) => updateDraft("user_id", value)} /></Form.Item>
      <Form.Item label="支付平台"><Select allowClear placeholder="全部平台" value={draft.platform || undefined} options={options(platformOptions)} onChange={(value) => updateDraft("platform", value)} /></Form.Item>
      <Form.Item label={subscription ? "商店商品 ID" : "本地订单号（精确）"}><Input maxLength={255} value={(subscription ? draft.store_product_id : draft.sn) || ""} onChange={(event) => updateDraft(subscription ? "store_product_id" : "sn", event.target.value)} /></Form.Item>
      {!subscription && <Form.Item label="商品类型"><Select allowClear placeholder="全部" value={draft.type || undefined} options={options({ 1: "一次性商品", 2: "订阅" })} onChange={(value) => updateDraft("type", value)} /></Form.Item>}
      <Form.Item label="状态"><Select allowClear placeholder="全部" value={draft.status || undefined} options={options(subscription ? SUB_STATUS : ORDER_STATUS)} onChange={(value) => updateDraft("status", value)} /></Form.Item>
      {subscription && <Form.Item label="自动续订"><Select allowClear placeholder="全部" value={draft.auto_renewing ?? undefined} options={options({ 1: "开启", 0: "关闭" })} onChange={(value) => updateDraft("auto_renewing", value)} /></Form.Item>}
      <Form.Item label="记录创建日期 · 起"><DatePicker value={draft.date_from ? dayjs(draft.date_from) : null} onChange={(_, value) => updateDraft("date_from", value)} /></Form.Item>
      <Form.Item label="记录创建日期 · 止"><DatePicker value={draft.date_to ? dayjs(draft.date_to) : null} onChange={(_, value) => updateDraft("date_to", value)} /></Form.Item>
      <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={resetFilters}>重置</Button></Space></Form.Item>
    </Form></Card>
    <Card>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setVersion((current) => current + 1)}>重试</Button>} />}
      {!error && loading && <div className="empty-state"><Spin description="正在加载…" /></div>}
      {!error && !loading && !data?.items?.length && <Empty description="没有符合条件的记录" />}
      {!error && !loading && Boolean(data?.items?.length) && <Table rowKey={subscription ? (item) => `${item.platform}-${item.id}` : "id"} columns={subscription ? subscriptionColumns : orderColumns} dataSource={data.items} pagination={false} scroll={{ x: 1100 }} size="middle" />}
      {!error && Number(subscription ? data?.summary?.total : data?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(subscription ? data.summary.total : data.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
      {!subscription && <p className="billing-note">金额为订单保存金额（未汇总）；订单表未记录币种。未确认订单的“平台订单号”可能仍为本地占位号。</p>}
    </Card>
  </div>;
}
