import { useEffect, useState } from "react";
import { Alert, Button, Card, Descriptions, Empty, Form, Image, InputNumber, Pagination, Select, Space, Spin, Table, Tag, Typography } from "antd";
import { ArrowLeft, ArrowsClockwise, ChatCircleDots, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { adminApi } from "./api/client.js";
import "./messages.css";

const TYPES = { text: "文本", image: "图片", video: "视频", private_photo: "私密照片" };
const STATUS = { generating: ["生成中", "warning"], success: ["成功", "success"], failed: ["失败", "error"] };
const EMPTY_FILTERS = { user_id: "", message_type: "", status: "" };
const time = (value) => value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";
const number = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString("zh-CN") : "—";
const cost = (value, currency = "USD") => Number.isFinite(Number(value)) ? `${currency} ${Number(value).toFixed(6)}` : "—";

function MessageStatus({ value }) {
  const [label, color] = STATUS[value] || [value || "未知", "default"];
  return <Tag color={color}>{label}</Tag>;
}

function CopyValue({ value }) {
  return <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <Typography.Text copyable={value != null && value !== "" ? { text: String(value) } : false}>{value ?? "—"}</Typography.Text>
  </span>;
}

function MessageContent({ value }) {
  if (!value) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文本内容" />;
  return <div className="message-content">{value}</div>;
}

function MessageMedia({ assets = [] }) {
  if (!assets.length) return null;
  return <div className="message-media-grid">{assets.map((asset, index) => <MediaItem key={`${asset.url}-${index}`} asset={asset} />)}</div>;
}

function MediaItem({ asset }) {
  const [failed, setFailed] = useState(false);
  const safeUrl = typeof asset.url === "string" && /^https?:\/\//i.test(asset.url);
  if (!safeUrl || !["image", "video"].includes(asset.type)) return null;
  return <figure className="message-media-item">
    {failed ? <div className="message-media-failed">资源加载失败，地址可能已过期<Button onClick={() => setFailed(false)}>重新加载</Button></div>
      : asset.type === "video" ? <video controls preload="none" playsInline src={asset.url} onError={() => setFailed(true)} />
      : <Image src={asset.url} alt="消息图片" width={240} height={160} loading="lazy" preview={{ mask: "点击放大" }} style={{ display: "block", objectFit: "cover" }} onError={() => setFailed(true)} />}
    <figcaption>{asset.type === "video" ? "视频" : "图片"}{asset.asset_id ? ` · 资源 ID：${asset.asset_id}` : ""}</figcaption>
  </figure>;
}

function JsonContent({ value }) {
  if (!value) return null;
  return <details className="message-json"><summary>查看完整结构化内容</summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}

function TokenSummary({ usage }) {
  const summary = usage?.summary || {};
  const metrics = [
    ["input_tokens", "输入 Token"], ["output_tokens", "输出 Token"],
    ["reasoning_tokens", "推理 Token"], ["total_tokens", "总 Token"], ["requests", "调用次数"],
  ];
  return <div className="message-token-summary">
    {metrics.map(([key, label]) => <div key={key}><span>{label}</span><strong>{number(summary[key])}</strong></div>)}
    <div><span>预估成本</span><strong>{cost(summary.estimated_cost, summary.currency)}</strong></div>
  </div>;
}

function TokenCallsTable({ calls = [] }) {
  const columns = [
    { title: "调用", dataIndex: "attempt_no", width: 70, render: (value) => `#${value || "—"}` },
    { title: "类型", dataIndex: "call_type", width: 100 },
    { title: "Provider / 模型", key: "provider", width: 250, render: (_, row) => <div><b>{row.resolved_model || row.requested_model || "—"}</b><div className="muted small">{row.provider_name || row.provider_instance || "—"}</div></div> },
    { title: "状态", dataIndex: "status", width: 90, render: (value) => <Tag color={value === "succeeded" ? "success" : value === "failed" ? "error" : "warning"}>{value || "—"}</Tag> },
    { title: "输入", dataIndex: "input_tokens", width: 90, align: "right", render: number },
    { title: "输出", dataIndex: "output_tokens", width: 90, align: "right", render: number },
    { title: "推理", dataIndex: "reasoning_tokens", width: 90, align: "right", render: number },
    { title: "总 Token", dataIndex: "total_tokens", width: 110, align: "right", render: number },
    { title: "成本", key: "cost", width: 130, align: "right", render: (_, row) => cost(row.cost_amount, row.cost_currency) },
    { title: "耗时", dataIndex: "duration_ms", width: 100, align: "right", render: (value) => value == null ? "—" : `${number(value)} ms` },
  ];
  return <Table rowKey="id" columns={columns} dataSource={calls} pagination={false} size="middle" scroll={{ x: 1120 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该消息没有 Token 调用记录" /> }} />;
}

function MessageDetailPage({ messageId, adminToken, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setDetail(null);
    adminApi.messages.detail({ message_id: messageId }, { signal: controller.signal })
      .then(setDetail)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message || "加载消息详情失败"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [messageId, adminToken, refresh]);

  if (loading) return <div className="message-page-state"><Spin size="large" /><span>正在加载消息详情…</span></div>;
  if (error) return <div className="section-gap"><Button icon={<ArrowLeft />} onClick={onBack}>返回消息列表</Button><Alert type="error" showIcon message="消息详情加载失败" description={error} action={<Button onClick={() => setRefresh((value) => value + 1)}>重试</Button>} /></div>;
  if (!detail?.message) return <Empty description="消息不存在" />;

  const message = detail.message;
  const generation = detail.generation;
  const gateway = detail.gateway;
  const trackingItems = [
    ["客户端消息 ID", message.client_message_id], ["请求追踪 ID", message.request_id],
    ["生成 UUID", message.generation_uuid], ["生成任务 ID", message.generation_run_id],
  ];

  return <div className="section-gap message-detail-page">
    <div className="message-detail-heading">
      <Button icon={<ArrowLeft />} onClick={onBack}>返回消息列表</Button>
      <div><h2>消息 {message.id}</h2><p>完整业务内容、生成链路与 Token 使用</p></div>
      <Space><Tag color="blue">{TYPES[message.message_type] || message.message_type}</Tag><MessageStatus value={message.status} /></Space>
    </div>

    <Card title="消息概览"><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} items={[
      { key: "message", label: "消息 ID", children: <Typography.Text copyable>{message.id}</Typography.Text> },
      { key: "user", label: "用户 ID", children: <Typography.Text copyable>{message.user_id ?? "—"}</Typography.Text> },
      { key: "character", label: "角色 ID", children: <Typography.Text copyable={Boolean(message.character_id)}>{message.character_id ?? "—"}</Typography.Text> },
      { key: "conversation", label: "会话 ID", children: message.conversation_id ?? "—" },
      { key: "sequence", label: "会话序号", children: message.conversation_seq ?? "—" },
      { key: "senders", label: "发送方", children: `${message.question_sender_type || "—"} → ${message.answer_sender_type || "—"}` },
      { key: "created", label: "创建时间", children: time(message.created_at) },
      { key: "completed", label: "完成时间", children: time(message.completed_at) },
    ]} /></Card>

    <div className="message-content-grid">
      <Card title="用户提问" extra={<Tag>{message.question_sender_type || "user"}</Tag>}><MessageContent value={message.question} /><MessageMedia assets={message.question_assets} /><JsonContent value={message.question_content} /></Card>
      <Card title="AI 回答" extra={<Tag color="success">{message.answer_sender_type || "character"}</Tag>}><MessageContent value={message.answer} /><MessageMedia assets={message.answer_assets} /><JsonContent value={message.answer_content} /></Card>
    </div>

    {(message.error_message || message.generation_error_message) && <Alert type="error" showIcon icon={<WarningCircle />} message={message.generation_error_code || message.error_code || "生成失败"} description={message.generation_error_message || message.error_message} />}

    <Card title="Token 使用" extra={<Tag color="blue">{detail.token_usage?.calls?.length || 0} 次 Provider 调用</Tag>}><TokenSummary usage={detail.token_usage} /><TokenCallsTable calls={detail.token_usage?.calls || []} /></Card>

    <div className="message-metadata-grid">
      <Card title="生成任务"><Descriptions column={1} size="small" items={[
        { key: "status", label: "任务状态", children: generation?.status || "未关联" },
        { key: "character", label: "角色 ID", children: generation?.character_id ?? "—" },
        { key: "profile", label: "模型 Profile", children: `${generation?.requested_profile || "—"} → ${generation?.selected_profile || "—"}` },
        { key: "model", label: "请求模型", children: generation?.requested_model || "—" },
        { key: "provider-job", label: "Provider 任务 ID", children: generation?.provider_job_id || "—" },
        { key: "duration", label: "任务时间", children: `${time(generation?.started_at)} → ${time(generation?.completed_at)}` },
      ]} /></Card>
      <Card title="网关决策"><Descriptions column={1} size="small" items={[
        { key: "status", label: "网关状态", children: gateway?.status || "未关联" },
        { key: "scene", label: "场景", children: gateway?.scene || "—" },
        { key: "profile", label: "路由 Profile", children: `${gateway?.requested_profile || "—"} → ${gateway?.selected_profile || "—"}` },
        { key: "policy", label: "策略决策", children: gateway?.policy_decision || "—" },
        { key: "risk", label: "风险等级", children: gateway?.risk_level || "—" },
        { key: "degradation", label: "降级原因", children: gateway?.degradation_code || "—" },
      ]} /></Card>
    </div>

    <Card title="消息追踪标识"><div className="message-tracking-grid">{trackingItems.map(([label, value]) => <div key={label}><span>{label}</span><Typography.Text copyable={value ? { text: String(value) } : false}>{value || "未关联 / 未记录"}</Typography.Text></div>)}</div></Card>
  </div>;
}

function MessageListPage({ adminToken, onOpen }) {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    adminApi.messages.list({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then(setResult)
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message || "加载消息失败"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [adminToken, filters, page, pageSize, refresh]);

  const columns = [
    { title: "消息 ID", dataIndex: "id", width: 130, render: (value) => value ?? "—" },
    { title: "用户 ID", dataIndex: "user_id", width: 160, render: (value) => <CopyValue value={value} /> },
    { title: "角色 ID", dataIndex: "character_id", width: 160, render: (value) => <CopyValue value={value} /> },
    { title: "消息类型", dataIndex: "message_type", width: 140, render: (value) => <Tag color="blue">{TYPES[value] || value || "—"}</Tag> },
    { title: "消息状态", dataIndex: "status", width: 140, render: (value) => <MessageStatus value={value} /> },
    { title: "发送时间", dataIndex: "created_at", width: 200, render: time },
    { title: "生成时间", dataIndex: "completed_at", width: 200, render: time },
    { title: "操作", key: "action", width: 90, fixed: "right", render: (_, record) => <Button size="small" onClick={(event) => { event.stopPropagation(); onOpen(record.id); }}>详情</Button> },
  ];

  const search = () => { setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ""))); setPage(1); };

  return <div className="section-gap messages-page">
    <div className="message-heading"><div className="message-heading-icon"><ChatCircleDots size={26} weight="duotone" /></div><div><h2>消息列表</h2><p>点击任意消息进入独立详情页，查看完整内容与 Token 使用</p></div><Button disabled={loading} icon={<ArrowsClockwise size={16} />} onClick={() => setRefresh((value) => value + 1)}>刷新列表</Button></div>
    <Card>
      <div className="message-filter-title"><MagnifyingGlass size={17} /><strong>筛选消息</strong><span>按用户、类型或状态查找</span></div>
      <Form className="message-filters" layout="vertical" onFinish={search}>
        <Form.Item label="用户 ID"><InputNumber min={1} precision={0} value={draft.user_id || null} placeholder="用户 ID" onChange={(value) => setDraft({ ...draft, user_id: value ?? "" })} /></Form.Item>
        <Form.Item label="消息类型"><Select value={draft.message_type || undefined} placeholder="全部类型" allowClear options={Object.entries(TYPES).map(([value, label]) => ({ value, label }))} onChange={(value) => setDraft({ ...draft, message_type: value || "" })} /></Form.Item>
        <Form.Item label="消息状态"><Select value={draft.status || undefined} placeholder="全部状态" allowClear options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} onChange={(value) => setDraft({ ...draft, status: value || "" })} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { setDraft(EMPTY_FILTERS); setFilters({}); setPage(1); }}>重置</Button></Space></Form.Item>
      </Form>
      {error && <Alert type="error" showIcon message="消息列表加载失败" description={error} action={<Button onClick={() => setRefresh((value) => value + 1)}>重试</Button>} />}
      <Table className="message-list-table" rowKey="id" columns={columns} dataSource={error ? [] : result?.items || []} loading={{ spinning: loading, tip: "正在加载消息…" }} pagination={false} scroll={{ x: 1250 }} locale={{ emptyText: <Empty description="没有符合条件的消息" /> }} onRow={(record) => ({ tabIndex: 0, role: "link", onClick: () => onOpen(record.id), onKeyDown: (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(record.id); } } })} />
      {!error && Number(result?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
    </Card>
  </div>;
}

export default function MessagesPage({ adminToken, detailId }) {
  const navigate = useNavigate();
  return detailId
    ? <MessageDetailPage messageId={detailId} adminToken={adminToken} onBack={() => navigate("/messages")} />
    : <MessageListPage adminToken={adminToken} onOpen={(messageId) => navigate(`/messages/${messageId}`)} />;
}
