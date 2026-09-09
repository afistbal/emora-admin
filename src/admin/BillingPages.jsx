import { useEffect, useState } from "react";
import { adminApi } from "./api/client.js";
import "./billing.css";

const PLATFORMS = { 98: "iOS · Apple", 99: "Android · Google", 1: "PayPal" };
const ORDER_STATUS = { 0: "未确认", 1: "已支付", 2: "已退款" };
const SUB_STATUS = { 1: "待处理", 2: "有效", 3: "已过期", 4: "已取消续订", 5: "已退款 / 撤销", 6: "验证失败" };
const PERIOD = { 1: "周", 2: "月", 3: "年" };
const show = (v) => v === null || v === undefined || v === "" ? "—" : String(v);
function State({ value, subscription }) {
  const color = subscription ? ({ 2: "green", 1: "yellow", 5: "red", 6: "red" }[value] || "gray") : ({ 0: "yellow", 1: "green", 2: "red" }[value] || "gray");
  return <span className={`badge ${color}`}>{(subscription ? SUB_STATUS : ORDER_STATUS)[value] || `未知 (${value})`}</span>;
}

export default function BillingPage({ subscription = false, adminToken }) {
  const initial = subscription ? { platform: "99" } : {};
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [cursors, setCursors] = useState([null]);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursor = cursors.at(-1);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true); setError(""); setData(null);
    const method = subscription ? adminApi.billing.subscriptions : adminApi.billing.orders;
    method({ ...filters, page_size: 10, ...(cursor ? { before_id: cursor } : {}) }, { signal: controller.signal })
      .then((result) => { if (active) setData(result); })
      .catch((e) => { if (active) setError(e.message || "加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [subscription, adminToken, filters, cursor, version]);
  const field = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const input = (key, label, type = "text") => <label>{label}<input className="input" type={type} min={type === "number" ? 1 : undefined} maxLength={type === "text" ? 255 : undefined} value={draft[key] || ""} onChange={(e) => field(key, e.target.value)} /></label>;
  const select = (key, label, options, all = true) => <label>{label}<select className="select" value={draft[key] ?? ""} onChange={(e) => field(key, e.target.value)}>{all && <option value="">全部</option>}{Object.entries(options).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></label>;
  return <div className="section-gap billing-page">
    <header className="billing-heading"><div><h2>{subscription ? "订阅统计" : "订单列表"}</h2><p>{subscription ? "按平台查看订阅状态与有效期" : "查看商品订单、支付平台与处理状态"}</p></div><button className="btn" disabled={loading} onClick={() => setVersion((v) => v + 1)}>刷新</button></header>
    {subscription && <div className="billing-platforms">{[99, 98].map((platform) => <button className={`btn ${Number(filters.platform) === platform ? "primary" : ""}`} key={platform} onClick={() => { setDraft((v) => ({ ...v, platform: String(platform) })); setFilters((v) => ({ ...v, platform: String(platform) })); setCursors([null]); }}>{PLATFORMS[platform]}</button>)}</div>}
    <section className="card"><form className="billing-filters" onSubmit={(e) => { e.preventDefault(); setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== ""))); setCursors([null]); }}>
      {input("user_id", "用户 ID", "number")}
      {!subscription && select("platform", "支付平台", PLATFORMS)}
      {subscription ? input("store_product_id", "商店商品 ID") : input("sn", "本地订单号（精确）")}
      {!subscription && select("type", "商品类型", { 1: "一次性商品", 2: "订阅" })}
      {select("status", "状态", subscription ? SUB_STATUS : ORDER_STATUS)}
      {subscription && select("auto_renewing", "自动续订", { 1: "开启", 0: "关闭" })}
      {input("date_from", "记录创建日期 · 起", "date")}{input("date_to", "记录创建日期 · 止", "date")}
      <button className="btn primary" type="submit">查询</button><button className="btn" type="button" onClick={() => { setDraft(initial); setFilters(initial); setCursors([null]); }}>重置</button>
    </form></section>
    <section className="card"><div aria-live="polite">{loading ? <div className="empty-state">正在加载…</div> : error ? <div className="empty-state" role="alert">{error}<button className="btn" onClick={() => setVersion((v) => v + 1)}>重试</button></div> : !data?.items?.length ? <div className="empty-state">没有符合条件的记录</div> : <div className="table-wrap"><table className="table billing-table"><thead>{subscription ? <tr><th>订阅 / 用户</th><th>商品 / 平台</th><th>状态</th><th>周期 / 续订</th><th>时间</th><th>金额</th><th>交易追踪</th></tr> : <tr><th>订单 / 用户</th><th>商品</th><th>平台 / 类型</th><th>状态</th><th>金额 / 退款</th><th>平台订单号</th><th>时间</th></tr>}</thead><tbody>{data.items.map((item) => subscription ? <tr key={item.id}>
      <td><strong>#{item.id}</strong><div>用户 #{item.user_id}</div></td><td><strong>{show(item.product_name)}</strong><div>{item.store_product_id}</div><small>{PLATFORMS[item.platform]}</small><div>{show(item.base_plan_id)}</div></td>
      <td><State value={item.status} subscription /><div className="billing-muted">{show(item.subscription_state)}</div></td><td>{PERIOD[item.subscription_type] || "未配置"}<div>自动续订：{Number(item.auto_renewing) === 1 ? "开启" : "关闭"}</div></td>
      <td><div>开始：{show(item.start_time)}</div><div>到期：{show(item.expiry_time)}</div>{item.next_billing_at && <div>下次扣款：{item.next_billing_at}</div>}<small>更新：{show(item.updated_at)}</small></td><td>{show(item.amount)}<div>{item.currency || "币种未记录"}</div></td>
      <td><div>订单：{show(item.pay_no)}</div><div>交易：{show(item.transaction_id || item.google_order_id)}</div>{item.original_transaction_id && <div>原始交易：{item.original_transaction_id}</div>}{item.environment && <small>{item.environment}</small>}</td>
    </tr> : <tr key={item.id}><td><strong>#{item.id}</strong><div>{item.sn}</div><small>用户 #{item.user_id}</small></td><td><strong>{item.product_name || "商品未关联"}</strong><div>#{item.product_id}</div><small>{show(item.store_product_id)}</small></td><td>{PLATFORMS[item.platform] || `平台 ${item.platform}`}<div className="billing-type">{{ 1: "一次性商品", 2: "订阅" }[item.product_type] || "类型未知"}</div></td><td><State value={item.status} /></td><td><strong>{show(item.amount)}</strong><div>退款：{show(item.refund_amount)}</div></td><td>{show(item.platform_sn)}</td><td><div>创建：{show(item.created_at)}</div><div>更新：{show(item.updated_at)}</div></td></tr>)}</tbody></table></div>}</div>
      <footer className="billing-pagination"><span>第 {cursors.length} 页 · 本页 {data?.items?.length || 0} 条</span><button className="btn" disabled={loading || cursors.length === 1} onClick={() => setCursors((v) => v.slice(0, -1))}>上一页</button><button className="btn" disabled={loading || !data?.has_more} onClick={() => setCursors((v) => [...v, data.next_before_id])}>下一页</button></footer>
      {!subscription && <p className="billing-note">金额为订单保存金额（未汇总）；订单表未记录币种。未确认订单的“平台订单号”可能仍为本地占位号。</p>}
    </section>
  </div>;
}
