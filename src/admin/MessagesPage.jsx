import { useEffect, useState } from "react";
import { Button, Card, Empty, Form, Image, InputNumber, Modal, Pagination, Select, Space, Spin, Tag } from "antd";
import { ChatCircleDots, ArrowsClockwise, MagnifyingGlass, Clock, WarningCircle } from "@phosphor-icons/react";
import { adminApi } from "./api/client.js";
import "./messages.css";

const TYPES = { text: "文本", image: "图片", video: "视频", private_photo: "私密照片" };
const STATUS = { generating: ["生成中", "yellow"], success: ["成功", "green"], failed: ["失败", "red"] };
const EMPTY = { message_id: "", user_id: "", conversation_id: "", message_type: "", status: "" };
const time = (value) => value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";

function Content({ value }) {
  if (!value) return <span className="message-empty">暂无内容</span>;
  return value.length > 90 ? <details className="message-detail"><summary><span>{value.slice(0, 90)}…</span><span className="message-expand">展开内容</span></summary><div className="message-content">{value}</div></details> : <div className="message-content">{value}</div>;
}

function MessageMedia({ assets = [] }) {
  return <div className="message-media-grid">{assets.map((asset, index) => <MediaItem key={`${asset.url}-${index}`} asset={asset} />)}</div>;
}

function MediaItem({ asset }) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const safeUrl = typeof asset.url === "string" && /^https?:\/\//i.test(asset.url);
  if (!safeUrl || !["image", "video"].includes(asset.type)) return null;
  return <figure className="message-media-item">
    {failed ? <div className="message-media-failed">资源加载失败，地址可能已过期<Button onClick={() => setFailed(false)}>重新加载</Button></div>
      : asset.type === "video" ? <video controls preload="none" playsInline src={asset.url} onError={() => setFailed(true)} />
      : <Button type="text" className="message-image-button" onClick={() => setExpanded(true)} aria-label="放大图片"><img src={asset.url} alt="消息图片" loading="lazy" onError={() => setFailed(true)} /><span>点击放大</span></Button>}
    <figcaption>{asset.type === "video" ? "视频" : "图片"}{asset.asset_id ? ` · 资源 #${asset.asset_id}` : ""}</figcaption>
    {asset.type === "image" && <Modal open={expanded} title="消息图片" footer={null} width="min(920px, calc(100vw - 48px))" onCancel={() => setExpanded(false)} destroyOnHidden>{expanded && <Image preview={false} src={asset.url} alt="消息图片大图" style={{ width: "100%" }} />}</Modal>}
  </figure>;
}

export default function MessagesPage({ adminToken }) {
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    // 切换筛选或离开页面时取消旧请求，避免慢响应覆盖当前列表。
    adminApi.messages.list({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then((data) => { if (active) setResult(data); })
      .catch((e) => { if (active) setError(e.message || "加载消息失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [adminToken, filters, page, pageSize, refresh]);

  const search = () => {
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "")));
    setPage(1);
  };
  return <div className="section-gap messages-page">
    <div className="message-heading"><div className="message-heading-icon"><ChatCircleDots size={26} weight="duotone" /></div><div><h2>消息列表</h2><p>追踪每一次对话，快速定位生成异常</p></div><Button disabled={loading} icon={<ArrowsClockwise size={16} />} onClick={() => setRefresh((v) => v + 1)}>刷新列表</Button></div>
    <Card>
      <div className="message-filter-title"><MagnifyingGlass size={17} /><strong>筛选消息</strong><span>按消息、用户或会话快速查找</span></div>
      <Form className="message-filters" layout="vertical" onFinish={search}>
        {[["message_id", "消息 ID"], ["user_id", "用户 ID"], ["conversation_id", "会话 ID"]].map(([key, label]) => <Form.Item label={label} key={key}><InputNumber min={1} precision={0} value={draft[key] || null} placeholder={label} onChange={(value) => setDraft({ ...draft, [key]: value ?? "" })} /></Form.Item>)}
        <Form.Item label="消息类型"><Select value={draft.message_type || undefined} placeholder="全部类型" allowClear options={Object.entries(TYPES).map(([value, label]) => ({ value, label }))} onChange={(value) => setDraft({ ...draft, message_type: value || "" })} /></Form.Item>
        <Form.Item label="消息状态"><Select value={draft.status || undefined} placeholder="全部状态" allowClear options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} onChange={(value) => setDraft({ ...draft, status: value || "" })} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={() => { setDraft(EMPTY); setFilters({}); setPage(1); }}>重置</Button></Space></Form.Item>
      </Form>
      <div aria-live="polite">
        {loading ? <div className="empty-state"><Spin description="正在加载消息…" /></div> : error ? <div className="empty-state" role="alert">{error}<Button onClick={() => setRefresh((v) => v + 1)}>重试</Button></div> : !result?.items?.length ? <Empty description="没有符合条件的消息" /> : <div className="message-feed">
          {result.items.map((item) => <article className={`message-record ${item.status}`} key={item.id}>
            <header className="message-record-header">
              <span className="message-record-icon"><ChatCircleDots size={19} weight="duotone" /></span>
              <strong>#{item.id}</strong>
              <span className="message-type">{TYPES[item.message_type] || item.message_type}</span>
              <Tag className="message-status" color={{ yellow: "warning", green: "success", red: "error" }[STATUS[item.status]?.[1]] || "default"}>{STATUS[item.status]?.[0] || item.status}</Tag>
              <span className="message-record-date"><Clock size={14} />{time(item.created_at)}</span>
            </header>
            <div className="message-record-body">
              <aside className="message-record-meta"><span>消息归属</span><dl><div><dt>用户</dt><dd>#{item.user_id}</dd></div><div><dt>会话</dt><dd>#{item.conversation_id}</dd></div><div><dt>序号</dt><dd>{item.conversation_seq}</dd></div></dl></aside>
              <div className="message-dialogue">
                <div className="message-dialogue-side"><span className="message-speaker">用户提问 <em>{TYPES[item.message_type] || item.message_type}消息</em></span><div className="message-bubble question"><Content value={item.question} /><MessageMedia assets={item.question_assets} /></div></div>
                <div className="message-dialogue-side"><span className="message-speaker ai">AI 回答 <em>{TYPES[item.message_type] || item.message_type}消息</em></span><div className="message-bubble answer"><Content value={item.answer} /><MessageMedia assets={item.answer_assets} /></div></div>
                {(item.status === "failed" || item.generation_status === "failed") ? <div className="message-error"><div className="message-error-title"><WarningCircle size={17} weight="fill" /><strong>最新生成失败{(item.generation_error_code || item.error_code) ? ` · ${item.generation_error_code || item.error_code}` : ""}</strong></div><Content value={item.generation_error_message || item.error_message || "未记录具体失败原因"} />{item.generation_run_id && <div className="muted">任务 #{item.generation_run_id}</div>}</div> : <div className="message-no-error">失败原因：{item.status === "generating" ? "生成中，尚无失败记录" : "无失败记录"}</div>}
              </div>
            </div>
            <div className="message-tracking"><strong>消息追踪</strong><dl>{[["请求追踪 ID", item.request_id], ["生成 UUID", item.generation_uuid], ["客户端消息 ID", item.client_message_id], ["生成任务 ID", item.generation_run_id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "未关联 / 未记录"}</dd></div>)}</dl></div>
            <footer className="message-record-footer"><span>{item.status === "generating" ? "正在生成回复" : `完成时间：${time(item.completed_at)}`}</span>{item.generation_run_id && <span>生成任务 #{item.generation_run_id}</span>}</footer>
          </article>)}
        </div>}
      </div>
      {!error && Number(result?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
    </Card>
  </div>;
}
