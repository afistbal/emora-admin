import { useEffect, useRef, useState } from "react";
import { ChatCircleDots, ArrowsClockwise, MagnifyingGlass, CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
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
  const dialog = useRef(null);
  const safeUrl = typeof asset.url === "string" && /^https?:\/\//i.test(asset.url);
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
    else dialog.current?.close();
  }, [expanded]);
  if (!safeUrl || !["image", "video"].includes(asset.type)) return null;
  return <figure className="message-media-item">
    {failed ? <div className="message-media-failed">资源加载失败，地址可能已过期<button className="btn" onClick={() => setFailed(false)}>重新加载</button></div>
      : asset.type === "video" ? <video controls preload="none" playsInline src={asset.url} onError={() => setFailed(true)} />
      : <button className="message-image-button" onClick={() => setExpanded(true)} aria-label="放大图片"><img src={asset.url} alt="消息图片" loading="lazy" onError={() => setFailed(true)} /><span>点击放大</span></button>}
    <figcaption>{asset.type === "video" ? "视频" : "图片"}{asset.asset_id ? ` · 资源 #${asset.asset_id}` : ""}</figcaption>
    {asset.type === "image" && <dialog className="message-image-dialog" ref={dialog} onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)} onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}><button className="btn" autoFocus onClick={() => setExpanded(false)}>关闭</button>{expanded && <img src={asset.url} alt="消息图片大图" />}</dialog>}
  </figure>;
}

export default function MessagesPage({ adminToken }) {
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState({});
  const [cursors, setCursors] = useState([null]);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursor = cursors[cursors.length - 1];

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    // 切换筛选或离开页面时取消旧请求，避免慢响应覆盖当前列表。
    adminApi.messages.list({ ...filters, page_size: 30, ...(cursor ? { before_id: cursor } : {}) }, { signal: controller.signal })
      .then((data) => { if (active) setResult(data); })
      .catch((e) => { if (active) setError(e.message || "加载消息失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [adminToken, filters, cursor, refresh]);

  const search = (event) => {
    event.preventDefault();
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "")));
    setCursors([null]);
  };
  const items = result?.items || [];
  const metrics = [
    ["本页消息", items.length, ChatCircleDots, "all"],
    ["本页成功", items.filter((item) => item.status === "success").length, CheckCircle, "success"],
    ["本页生成中", items.filter((item) => item.status === "generating").length, Clock, "generating"],
    ["本页失败", items.filter((item) => item.status === "failed").length, WarningCircle, "failed"],
  ];
  return <div className="section-gap messages-page">
    <div className="message-heading"><div className="message-heading-icon"><ChatCircleDots size={26} weight="duotone" /></div><div><h2>消息列表</h2><p>追踪每一次对话，快速定位生成异常</p></div><button className="btn" disabled={loading} onClick={() => setRefresh((v) => v + 1)}><ArrowsClockwise size={16} />刷新列表</button></div>
    <div className="message-metrics">{metrics.map(([label, count, Icon, tone]) => <div className={`message-metric ${tone}`} key={tone}><div><span>{label}</span><strong>{loading || error ? "—" : count}</strong></div><Icon size={25} weight="duotone" /></div>)}</div>
    <section className="card">
      <div className="message-filter-title"><MagnifyingGlass size={17} /><strong>筛选消息</strong><span>按消息、用户或会话快速查找</span></div>
      <form className="message-filters" onSubmit={search}>
        {[['message_id', '消息 ID'], ['user_id', '用户 ID'], ['conversation_id', '会话 ID']].map(([key, label]) => <label key={key}>{label}<input className="input" type="number" min="1" step="1" value={draft[key]} placeholder={label} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
        <label>消息类型<select className="select" value={draft.message_type} onChange={(e) => setDraft({ ...draft, message_type: e.target.value })}><option value="">全部类型</option>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>消息状态<select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">全部状态</option>{Object.entries(STATUS).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="btn primary" type="submit">查询</button><button className="btn" type="button" onClick={() => { setDraft(EMPTY); setFilters({}); setCursors([null]); }}>重置</button>
      </form>
      <div aria-live="polite">
        {loading ? <div className="empty-state">正在加载消息…</div> : error ? <div className="empty-state" role="alert">{error}<button className="btn" onClick={() => setRefresh((v) => v + 1)}>重试</button></div> : !result?.items?.length ? <div className="empty-state">没有符合条件的消息</div> : <div className="message-feed">
          {result.items.map((item) => <article className={`message-record ${item.status}`} key={item.id}>
            <header className="message-record-header">
              <span className="message-record-icon"><ChatCircleDots size={19} weight="duotone" /></span>
              <strong>#{item.id}</strong>
              <span className="message-type">{TYPES[item.message_type] || item.message_type}</span>
              <span className={`message-status badge ${STATUS[item.status]?.[1] || "gray"}`}>{STATUS[item.status]?.[0] || item.status}</span>
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
      <div className="message-pagination"><span>第 {cursors.length} 页 · 本页 {result?.items?.length || 0} 条</span><button className="btn" disabled={loading || cursors.length === 1} onClick={() => setCursors((v) => v.slice(0, -1))}>上一页</button><button className="btn" disabled={loading || !result?.has_more} onClick={() => setCursors((v) => [...v, result.next_before_id])}>下一页</button></div>
    </section>
  </div>;
}
