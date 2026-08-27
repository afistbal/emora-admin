import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChartLineUp,
  ChatCircleDots,
  Check,
  Coins,
  CrownSimple,
  Gauge,
  GearSix,
  ImageSquare,
  Info,
  LockKey,
  MaskHappy,
  Prohibit,
  Sparkle,
  UserCircle,
  Users,
  VideoCamera,
  Warning,
  X,
} from "@phosphor-icons/react";
import { adminApi, getAdminToken, setAdminToken } from "./api/client.js";
import { useLocation, useNavigate } from "react-router-dom";

/* ================= 共享小组件 ================= */

function Card({ title, sub, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {sub && <span className="sub">{sub}</span>}
          {actions && <div className="spacer" />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

function Badge({ tone = "gray", children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function statusTone(status) {
  if (["上架中", "全量", "已上架", "正常", "启用", "有效会员", "已放行", "已回复", "开"].includes(status)) return "green";
  if (["草稿", "审核中", "待处理", "处理中", "待审"].includes(status)) return "yellow";
  if (["已下架", "已封禁", "拦截", "已拦截", "高"].includes(status)) return "red";
  return "gray";
}

function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <label className="switch" aria-label={label} style={disabled ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <i />
    </label>
  );
}

function ToggleRow({ label, desc, checked, onChange, disabled = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #181818" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {desc && <div className="muted small" style={{ marginTop: 3 }}>{desc}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

function KpiRow({ items }) {
  return (
    <div className="kpi-grid">
      {items.map(([label, value, sub]) => (
        <div className="kpi-card" key={label}>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>
          {sub && <div className="kpi-delta">{sub}</div>}
        </div>
      ))}
    </div>
  );
}

const ANALYTICS_KPI_META = {
  dau: "日活用户（DAU）",
  app_opens: "App 启动次数",
  character_exposure_pv: "角色曝光 PV",
  character_exposure_uv: "角色曝光 UV",
  chat_view_users: "聊天用户数",
  private_unlock_clicks: "私密照片解锁点击",
  private_unlock_successes: "私密照片解锁成功",
  private_unlock_rate: "私密照片解锁率",
  generation_submits: "生成提交数",
  generation_successes: "生成成功数",
  generation_failures: "生成失败数",
  generation_success_rate: "生成成功率",
  coin_store_views: "金币商城浏览次数",
  coin_store_view_users: "金币商城访问用户数",
  coin_pack_purchases: "金币包购买数",
  coin_transactions: "金币流水笔数",
  coin_purchase_results: "金币购买结果数",
  membership_views: "会员页浏览次数",
  membership_view_users: "会员页访问用户数",
  membership_plan_selections: "会员套餐选择数",
  membership_purchase_results: "会员购买结果数",
  membership_expires: "会员到期数",
};

function formatAnalyticsKpi(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = Number(value);
  if (key.endsWith("_rate") && Number.isFinite(numericValue)) {
    return `${(numericValue * 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}%`;
  }
  return Number.isFinite(numericValue) ? numericValue.toLocaleString("zh-CN") : String(value);
}

function LiveAnalyticsKpis({ kpis }) {
  return <KpiRow items={Object.entries(kpis).map(([key, value]) => [ANALYTICS_KPI_META[key] || key, formatAnalyticsKpi(key, value), ""])} />;
}

function formatUnixDate(timestamp, includeTime = false) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(Number(timestamp) * 1000));
}

function ConfirmDialog({ title, desc, confirmText = "确认", onConfirm, onClose }) {
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="medal"><Warning weight="fill" /></div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="dialog-actions">
          <button className="btn danger" onClick={onConfirm}>{confirmText}</button>
          <button className="btn ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

function ApiAccessGate() {
  return (
    <div className="api-access-gate">
      <div className="api-access-icon"><LockKey weight="fill" /></div>
      <h2>加载中…</h2>
    </div>
  );
}

function AdminLogin({ state, onSubmit }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const stateError = state === "forbidden"
    ? "邮箱登录成功，但该账号没有后台管理权限。"
    : state === "unauthorized"
      ? "登录状态无效或已过期，请重新获取验证码。"
      : state === "error"
        ? "服务暂不可用，请稍后重试。"
        : "";

  const sendCode = async () => {
    setBusy(true);
    setFormError("");
    try {
      const data = await adminApi.auth.sendEmailCode({ email: email.trim() });
      setChallengeId(data.challenge_id);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setBusy(true);
    setFormError("");
    try {
      const data = await adminApi.auth.emailLogin({ email: email.trim(), challenge_id: challengeId, code: code.trim() });
      onSubmit(data.access_token);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-brand"><span><Sparkle weight="fill" /></span><div><b>Emora 运营后台</b><small>ADMIN CONSOLE</small></div></div>
        <div className="login-copy">
          <Badge tone="yellow">内部系统</Badge>
          <h1>登录后台</h1>
        </div>
        <form className="login-form" onSubmit={(event) => { event.preventDefault(); challengeId ? login() : sendCode(); }}>
          <Field label="管理员邮箱">
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={Boolean(challengeId)} autoFocus autoComplete="email" />
          </Field>
          {challengeId && <Field label="6 位邮箱验证码">
            <input className="input code-input" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus autoComplete="one-time-code" />
          </Field>}
          {(formError || stateError) && <div className="login-error"><Warning weight="fill" />{formError || stateError}</div>}
          <button className="btn primary login-submit" disabled={busy || !email.trim() || (challengeId && code.length !== 6)}>{busy ? "请稍候…" : challengeId ? "登录后台" : "发送验证码"}</button>
          {challengeId && <button type="button" className="btn ghost" disabled={busy} onClick={() => { setChallengeId(""); setCode(""); setFormError(""); }}>更换邮箱</button>}
        </form>
      </div>
    </div>
  );
}

/* ================= 仪表盘 ================= */

function DashboardPage({ toast }) {
  const [range, setRange] = useState("今日");
  const [liveSummary, setLiveSummary] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (range === "30 日" ? 29 : range === "7 日" ? 6 : 0));
    const format = (date) => date.toISOString().slice(0, 10);
    adminApi.analytics.query({
      tab: "all",
      start_date: format(start),
      end_date: format(end),
      user_type: "all",
      timezone: "Asia/Shanghai",
    }, { signal: controller.signal })
      .then(setLiveSummary)
      .catch((error) => {
        if (error.name !== "AbortError") toast(`仪表盘统计请求失败：${error.message}`);
      });
    return () => controller.abort();
  }, [range]);

  return (
    <div className="section-gap">
      <div className="filter-bar">
        {["今日", "7 日", "30 日"].map((r) => (
          <button key={r} className={`btn sm ${range === r ? "primary" : ""}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      {liveSummary?.kpis ? <LiveAnalyticsKpis kpis={liveSummary.kpis} /> : <div className="panel-loading">加载中…</div>}
    </div>
  );
}

/* ================= 角色管理 ================= */

function NewCharacterDialog({ onClose, onCreate }) {
  const [charCode, setCharCode] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [greeting, setGreeting] = useState("");
  const [cover, setCover] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const valid = charCode.trim() && name.trim() && greeting.trim() && cover;
  const confirm = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await onCreate({
      id: `char_${Date.now()}`,
      charCode: charCode.trim(),
      name: name.trim(), nameEn: name.trim(), subtitle: subtitle.trim(),
      status: "草稿", version: "v0.1.0-draft", publishedAt: "—",
      tags: tags.split(/[，,\s]+/).filter(Boolean).slice(0, 4),
      image: cover, cardImage: cover,
      greeting: greeting.trim(), lockedImage: cover, gallery: [cover], video: null,
      sessions7d: 0, validDialogs7d: 0, todaySessions: 0, assetScore: 1,
      chats: 0, msgCount: 0, msgPer: 0, expPv: 0, expUv: 0, genSubmit: 0, genRate: "—",
      coverFile,
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 520, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>新增角色</h3>
        <Field label="角色编码 char_code *"><input className="input" maxLength={64} value={charCode} onChange={(e) => setCharCode(e.target.value)} placeholder="如：char_night_walker" autoFocus /></Field>
        <div style={{ marginTop: 12 }}>
        <Field label="名称 *"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：星野" /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="标签（逗号分隔，≤4 个）"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="如：元气， 校园， 歌手" /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="简介"><textarea className="textarea" style={{ minHeight: 56 }} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="问候语 first_mes *"><textarea className="textarea" style={{ minHeight: 56 }} value={greeting} onChange={(e) => setGreeting(e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="封面（本地上传）*">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {cover
                ? <img src={cover} alt="封面预览" style={{ width: 56, height: 72, objectFit: "cover", borderRadius: 10 }} />
                : <div style={{ width: 56, height: 72, borderRadius: 10, background: "var(--surface-2)", border: "1px dashed var(--surface-3)" }} />}
              <label className="btn sm">
                选择图片
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCover(URL.createObjectURL(f)); } }} />
              </label>
            </div>
          </Field>
        </div>
        <div className="dialog-actions" style={{ marginTop: 18, gridTemplateColumns: "1fr 1fr", display: "grid", gap: 10 }}>
          <button className="btn primary" disabled={!valid || submitting} onClick={confirm}>{submitting ? "创建中…" : "创建并进入编辑器"}</button>
          <button className="btn" onClick={onClose}>取消</button>
        </div>
        {submitError && <div className="login-error" style={{ marginTop: 12 }}><Warning weight="fill" />{submitError}</div>}
        <p className="muted small" style={{ margin: "10px 0 0", textAlign: "center" }}>新角色以「草稿」状态创建</p>
      </div>
    </div>
  );
}

function CharacterListPage({ list, onEdit, onCreate }) {
  const [showNew, setShowNew] = useState(false);
  return (
    <Card
      title="官方角色"
      sub={`共 ${list.length} 个角色 · 未发布草稿的改动不影响 C 端`}
      actions={<button className="btn primary" onClick={() => setShowNew(true)}>+ 新增角色</button>}
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>角色</th><th>状态</th><th>ID</th><th>标签</th><th>今日聊天用户数</th><th>消息次数</th><th>卡曝光 pv/uv</th><th>生成提交 → 成功率</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => onEdit(c)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={c.image} alt={c.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                    <div><b>{c.name}</b>{c.subtitle && <div className="muted" style={{ fontSize: 11 }}>{c.subtitle}</div>}</div>
                  </div>
                </td>
                <td>
                  <Badge tone={c.status === "草稿" ? "yellow" : "green"}>{c.status}</Badge>
                  <div className="character-status-note">{c.status === "草稿" ? "未影响线上版本" : "C 端可见"}</div>
                </td>
                <td className="muted">{c.id}</td>
                <td><div className="pill-row">{c.tags.map((t) => <span className="tag-pill" key={t}>{t}</span>)}</div></td>
                <td className="num">{c.chats.toLocaleString()}</td>
                <td className="num">{c.msgCount.toLocaleString()}<div className="muted" style={{ fontSize: 11 }}>人均 {c.msgPer} 轮</div></td>
                <td className="num">{c.expPv.toLocaleString()} / {c.expUv.toLocaleString()}</td>
                <td className="num">{c.genSubmit.toLocaleString()} → {c.genRate}</td>
                <td>
                  <button className="btn sm" onClick={(e) => { e.stopPropagation(); onEdit(c); }}>编辑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showNew && <NewCharacterDialog onClose={() => setShowNew(false)} onCreate={onCreate} />}
    </Card>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

async function createBlurredPreviewFile(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("无法生成模糊预览图");
  }
  const blurRadius = 18;
  context.filter = `blur(${blurRadius}px)`;
  context.drawImage(bitmap, -blurRadius, -blurRadius, width + blurRadius * 2, height + blurRadius * 2);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("无法生成模糊预览图")), "image/jpeg", 0.82);
  });
  const baseName = file.name.replace(/\.[^.]+$/, "") || "private-image";
  return new File([blob], `${baseName}-blurred.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function loadMediaRefsByIds(ids, signal) {
  const pending = new Set(ids.filter(Boolean).map(Number));
  const refs = new Map();
  let page = 1;
  while (pending.size) {
    const data = await adminApi.media.list({ type: "image", page, page_size: 100 }, { signal });
    const items = data?.items || [];
    for (const item of items) {
      if (pending.has(Number(item.id))) {
        refs.set(Number(item.id), item.ref);
        pending.delete(Number(item.id));
      }
    }
    if (!items.length || page * 100 >= Number(data?.total || 0)) break;
    page += 1;
  }
  return refs;
}

function CharacterEditorPage({ character, onBack, toast, onStatusChange }) {
  const [tab, setTab] = useState("basic");
  const [stage, setStage] = useState(character.status === "草稿" ? "草稿" : "已上架");
  const [locale, setLocale] = useState("zh");
  const [prompt, setPrompt] = useState({ zh: "", en: "" });
  const [greetings, setGreetings] = useState([]);
  const [mesExamples, setMesExamples] = useState([]);
  const [cover, setCover] = useState(character.cardImage || character.image || "");
  const [assetTab, setAssetTab] = useState("public");
  const [assetItems, setAssetItems] = useState({ public: [], private: [] });
  const [confirmDelAsset, setConfirmDelAsset] = useState(null); // { mode, id, label }
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [profile, setProfile] = useState({
    name: character.name,
    nameEn: character.nameEn || character.name,
    version: "",
    creator: "",
    creatorNotes: "",
    tagline: character.subtitle || "",
    description: character.subtitle || "",
    personality: "",
    scenario: "",
    avatarNotes: "",
    tags: character.tags || [],
  });
  useEffect(() => {
    if (!Number.isInteger(Number(character.id))) return undefined;
    const controller = new AbortController();
    adminApi.characters.detail({ char_id: Number(character.id) }, { signal: controller.signal })
      .then(async (data) => {
        const version = data?.draft || data?.published;
        if (!version) return;
        const rawData = version.data || {};
        const zh = rawData["zh-Hant"] || rawData;
        const en = rawData.en || rawData;
        setProfile({
          name: zh.name || character.name,
          nameEn: en.name || character.nameEn || character.name,
          version: zh.character_version || en.character_version || "",
          creator: zh.creator || en.creator || "",
          creatorNotes: zh.creator_notes || en.creator_notes || "",
          tagline: zh.tagline || "",
          description: zh.description || "",
          personality: zh.personality || "",
          scenario: zh.scenario || "",
          avatarNotes: zh.avatar_notes || "",
          tags: zh.tags || [],
        });
        setPrompt({ zh: zh.prompt || "", en: en.prompt || "" });
        const zhExamples = Array.isArray(zh.mes_example) ? zh.mes_example : Array.isArray(rawData.mes_example) ? rawData.mes_example : [];
        const enExamples = Array.isArray(en.mes_example) ? en.mes_example : Array.isArray(rawData.mes_example) ? rawData.mes_example : [];
        const exampleCount = Math.max(zhExamples.length, enExamples.length);
        setMesExamples(Array.from({ length: exampleCount }, (_, index) => ({
          id: index + 1,
          zhUser: zhExamples[index]?.user || "",
          zhCharacter: zhExamples[index]?.character || "",
          enUser: enExamples[index]?.user || "",
          enCharacter: enExamples[index]?.character || "",
        })));
        const zhGreetings = zh.greetings || [];
        const enGreetings = en.greetings || [];
        const greetingCount = Math.max(zhGreetings.length, enGreetings.length);
        if (greetingCount) {
          setGreetings(Array.from({ length: greetingCount }, (_, index) => ({
            id: index + 1,
            primary: (zhGreetings[index]?.kind || enGreetings[index]?.kind) === "primary",
            enabled: zhGreetings[index]?.enabled ?? enGreetings[index]?.enabled ?? true,
            zh: zhGreetings[index]?.body || "",
            en: enGreetings[index]?.body || "",
          })));
        }
        const bindings = version.assets || [];
        const previewRefs = await loadMediaRefsByIds(bindings.map((binding) => binding.preview_id), controller.signal);
        if (bindings.length) {
          const mapped = { public: [], private: [] };
          for (const binding of bindings) {
            const mode = binding.access === "private" || binding.role === "private" ? "private" : "public";
            mapped[mode].push({
              id: binding.id,
              assetId: binding.asset_id,
              src: binding.asset?.ref || binding.asset?.preview_ref || "",
              label: binding.role === "cover" ? "封面" : binding.role === "private" ? "私密照片" : binding.role === "poster" ? "视频封面" : "Gallery",
              kind: binding.role,
              role: binding.role,
              active: binding.state === "online",
              blurred: mode === "private",
              previewId: binding.preview_id,
              previewSrc: previewRefs.get(Number(binding.preview_id)) || null,
              price: binding.price,
            });
          }
          setAssetItems(mapped);
          const coverBinding = bindings.find((binding) => binding.role === "cover");
          if (coverBinding?.asset?.ref) setCover(coverBinding.asset.ref);
        }
        setStage(data.character?.state === "online" ? "已上架" : "草稿");
      })
      .catch((error) => {
        if (error.name !== "AbortError") toast(`角色详情请求失败：${error.message}`);
      });
    return () => controller.abort();
  }, [character.id]);

  const uploadAssets = async (files) => {
    const selectedFiles = [...files];
    if (!selectedFiles.length) return;
    try {
      const adds = await Promise.all(selectedFiles.map(async (file) => {
            const previewFile = assetTab === "private" ? await createBlurredPreviewFile(file) : null;
            const [asset, previewAsset] = await Promise.all([
              adminApi.media.uploadFile(file, character.charCode),
              previewFile ? adminApi.media.uploadFile(previewFile, character.charCode) : Promise.resolve(null),
            ]);
            return {
              id: `new_${asset.id}`,
              assetId: asset.id,
              src: asset.ref,
              previewId: previewAsset?.id,
              previewSrc: previewAsset?.ref,
              label: file.name,
              kind: assetTab === "private" ? "私密照片" : "Gallery",
              role: assetTab === "private" ? "private" : "gallery",
              active: true,
              blurred: assetTab === "private",
              price: null,
            };
          }));
      setAssetItems((items) => ({ ...items, [assetTab]: [...items[assetTab], ...adds] }));
      toast(assetTab === "private"
        ? `已上传 ${adds.length} 张私密图片及对应模糊预览，保存草稿后绑定`
        : `已上传 ${adds.length} 张图片，保存草稿后绑定`);
    } catch (error) {
      toast(`上传资产失败：${error.message}`);
    }
  };
  const toggleAsset = async (mode, id, active) => {
    try {
      if (Number.isInteger(Number(id))) {
        await adminApi.characters.setAssetStatus({ char_id: Number(character.id), binding_id: Number(id), state: active ? "online" : "offline" });
      }
      setAssetItems((items) => ({ ...items, [mode]: items[mode].map((asset) => (asset.id === id ? { ...asset, active } : asset)) }));
      toast(`资产已${active ? "上架" : "下架"}`);
    } catch (error) {
      toast(`修改资产状态失败：${error.message}`);
    }
  };
  const deleteAsset = async () => {
    const { mode, id } = confirmDelAsset;
    try {
      if (Number.isInteger(Number(id))) {
        await adminApi.characters.removeAsset({ char_id: Number(character.id), binding_id: Number(id) });
      }
      setAssetItems((items) => ({ ...items, [mode]: items[mode].filter((asset) => asset.id !== id) }));
      setConfirmDelAsset(null);
      toast("资产已删除");
    } catch (error) {
      toast(`删除资产失败：${error.message}`);
    }
  };

  const changeCover = async (file) => {
    try {
      const asset = await adminApi.media.uploadFile(file, character.charCode);
      setCover(asset.ref);
      setAssetItems((items) => ({
        ...items,
        public: [
          { id: `new_${asset.id}`, assetId: asset.id, src: asset.ref, label: "封面", kind: "封面", role: "cover", active: true },
          ...items.public.filter((item) => item.role !== "cover" && item.kind !== "封面"),
        ],
      }));
      toast("封面已上传，保存草稿后绑定");
    } catch (error) {
      toast(`上传封面失败：${error.message}`);
    }
  };

  const openVersions = async () => {
    try {
      const data = await adminApi.characters.versions({ char_id: Number(character.id) });
      setVersions(data?.items || []);
      setShowVersions(true);
    } catch (error) {
      toast(`版本历史请求失败：${error.message}`);
    }
  };

  const rollbackVersion = async (version) => {
    try {
      await adminApi.characters.rollback({ char_id: Number(character.id), ver_id: Number(version.id) });
      setShowVersions(false);
      setStage("已上架");
      onStatusChange(character.id, "已上架");
      toast(`已回滚并发布版本 v${version.ver}`);
    } catch (error) {
      toast(`版本回滚失败：${error.message}`);
    }
  };

  const tabs = [
    ["basic", "基础信息"], ["persona", "人设设定"], ["examples", "示例对话"], ["rules", "对话规则"], ["assets", "视觉资产"],
  ];

  const isReadOnly = false;
  const buildCharacterData = () => {
    const zhContent = {
      name: profile.name,
      character_version: profile.version,
      creator: profile.creator,
      creator_notes: profile.creatorNotes,
      tagline: profile.tagline,
      description: profile.description,
      personality: profile.personality,
      scenario: profile.scenario,
      prompt: prompt.zh,
      mes_example: mesExamples.map((example) => ({ user: example.zhUser, character: example.zhCharacter })),
      avatar_notes: profile.avatarNotes,
      greetings: greetings.map((greeting, index) => ({ kind: greeting.primary ? "primary" : "alternate", body: greeting.zh, enabled: greeting.enabled, sort: index })),
      tags: profile.tags,
    };
    const enContent = {
      name: profile.nameEn,
      character_version: profile.version,
      creator: profile.creator,
      creator_notes: profile.creatorNotes,
      tagline: profile.tagline,
      description: profile.description,
      personality: profile.personality,
      scenario: profile.scenario,
      prompt: prompt.en,
      mes_example: mesExamples.map((example) => ({ user: example.enUser, character: example.enCharacter })),
      avatar_notes: profile.avatarNotes,
      greetings: greetings.map((greeting, index) => ({ kind: greeting.primary ? "primary" : "alternate", body: greeting.en, enabled: greeting.enabled, sort: index })),
      tags: profile.tags,
    };
    // 后端角色卡同时存在两种数据形态：旧接口使用 zh-Hant/en 包裹，
    // chara_card_v2 使用平铺字段。平铺层放完整字段，避免人格字段只显示在前端却没有被保存。
    const flatContent = {
      name: profile.name,
      character_version: profile.version,
      creator: profile.creator,
      creator_notes: profile.creatorNotes,
      tagline: profile.tagline,
      description: profile.description,
      personality: profile.personality,
      scenario: profile.scenario,
      prompt: prompt.zh,
      mes_example: zhContent.mes_example,
      avatar_notes: profile.avatarNotes,
      greetings: zhContent.greetings,
      tags: profile.tags,
    };
    return {
      ...flatContent,
      "zh-Hant": zhContent,
      en: enContent,
    };
  };
  const buildAssetBindings = () => Object.entries(assetItems).flatMap(([mode, items]) => items
    .filter((asset) => asset.assetId)
    .map((asset, index) => ({
      asset_id: Number(asset.assetId),
      role: asset.role || (mode === "private" ? "private" : "gallery"),
      access: mode === "private" ? "private" : "public",
      preview_id: asset.previewId ? Number(asset.previewId) : undefined,
      price: asset.price ? Number(asset.price) : undefined,
      state: asset.active ? "online" : "offline",
      sort: index,
    })));
  const save = async (silent = false) => {
    try {
      await adminApi.characters.saveDraft({ char_id: Number(character.id), data: buildCharacterData(), assets: buildAssetBindings() });
      setStage("草稿");
      onStatusChange(character.id, "草稿");
      if (!silent) toast("草稿已保存，当前线上版本继续生效");
      return true;
    } catch (error) {
      toast(`保存角色草稿失败：${error.message}`);
      return false;
    }
  };
  const publish = async () => {
    if (!definitionReady) {
      setTab("rules");
      toast("发布前请先完善中英文提示词与主开场");
      return;
    }
    if (!(await save(true))) return;
    try {
      await adminApi.characters.publish({ char_id: Number(character.id) });
      setStage("已上架");
      onStatusChange(character.id, "已上架");
      toast("上架成功，新版本已对 C 端生效");
    } catch (error) {
      toast(`发布角色失败：${error.message}`);
    }
  };

  const updateGreeting = (id, value) =>
    setGreetings((list) => list.map((g) => (g.id === id ? { ...g, [locale]: value } : g)));
  const addGreeting = () => {
    const nextId = Math.max(...greetings.map((g) => g.id), 0) + 1;
    setGreetings((list) => [...list, { id: nextId, primary: false, enabled: true, zh: "", en: "" }]);
  };
  const deleteGreeting = (id) => setGreetings((list) => list.filter((g) => !g.primary && g.id !== id));
  const toggleGreeting = (id, enabled) => setGreetings((list) => list.map((g) => g.id === id ? { ...g, enabled } : g));
  const updateMesExample = (id, field, value) =>
    setMesExamples((list) => list.map((example) => (example.id === id ? { ...example, [field]: value } : example)));
  const addMesExample = () => {
    const nextId = Math.max(...mesExamples.map((example) => example.id), 0) + 1;
    setMesExamples((list) => [...list, { id: nextId, zhUser: "", zhCharacter: "", enUser: "", enCharacter: "" }]);
  };
  const deleteMesExample = (id) => setMesExamples((list) => list.filter((example) => example.id !== id));

  const primaryGreeting = greetings.find((g) => g.primary);
  const definitionChecks = [
    { label: "中英文提示词均已填写", pass: String(prompt.zh || "").trim().length > 0 && String(prompt.en || "").trim().length > 0 },
    { label: "主开场中英文已完成，且未超过 4,096 字符", pass: Boolean(primaryGreeting && String(primaryGreeting.zh || "").trim() && String(primaryGreeting.en || "").trim() && String(primaryGreeting.zh || "").length <= 4096 && String(primaryGreeting.en || "").length <= 4096) },
    { label: "提示词双语均未超过 32,000 字符", pass: String(prompt.zh || "").length <= 32000 && String(prompt.en || "").length <= 32000 },
  ];
  const definitionReady = definitionChecks.every((item) => item.pass);

  return (
    <div>
      <div className="editor-toolbar">
        <button className="btn" onClick={onBack}><ArrowLeft />返回列表</button>
        <Badge tone={stage === "草稿" ? "yellow" : "green"}>{stage}</Badge>
        <span className="editor-stage-note">
          {stage === "草稿" ? "修改仅保存在草稿，上架前不会影响 C 端" : "当前为线上版本，可直接编辑；保存草稿不会影响 C 端"}
        </span>
        <div className="spacer" style={{ marginLeft: "auto" }} />
        <span className={`definition-health ${definitionReady ? "is-ready" : ""}`}>
          {definitionReady ? <Check /> : <Warning />}{definitionReady ? "发布检查通过" : "发布检查未完成"}
        </span>
        <button className="btn" onClick={openVersions}>版本记录</button>
        <button className="btn" onClick={() => save()}>保存草稿</button>
        <button className="btn primary" onClick={publish}>上架</button>
      </div>

      <div className="editor-layout">
        <aside className="editor-summary">
          <img className="cover" src={cover} alt={character.name} />
          <div className="body">
            <h3>{character.name}</h3>
            <div className="en">{character.subtitle}</div>
            <div className="summary-kv">
              <div><span>今日聊天用户数</span><b className="num">{character.chats.toLocaleString()}</b></div>
              <div><span>消息次数</span><b className="num">{character.msgCount.toLocaleString()}（人均 {character.msgPer} 轮）</b></div>
              <div><span>卡曝光 pv/uv</span><b className="num">{character.expPv.toLocaleString()} / {character.expUv.toLocaleString()}</b></div>
              <div><span>生成提交 → 成功率</span><b className="num">{character.genSubmit.toLocaleString()} → {character.genRate}</b></div>
            </div>
          </div>
        </aside>

        <div className="section-gap">
          <div className="tabs">
            {tabs.map(([key, label]) => (
              <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          {tab === "basic" && (
            <Card title="基础信息" sub="角色数据对应 chara_card_v2 规范（spec: chara_card_v2 / spec_version 2.0）">
              <div style={{ marginBottom: 14 }}>
                <Field label="Avatar / 封面（本地上传）"><div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={cover} alt="封面预览" style={{ width: 56, height: 72, objectFit: "cover", borderRadius: 10 }} />
                  <label className="btn sm" style={isReadOnly ? { opacity: .4, pointerEvents: "none" } : undefined}>
                    更换图片<input type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) changeCover(file); }} />
                  </label>
                </div></Field>
              </div>
              <div className="grid-2">
                <Field label="Name / 名称 *"><input className="input" value={profile.name} onChange={(event) => setProfile((value) => ({ ...value, name: event.target.value }))} readOnly={isReadOnly} /></Field>
                <Field label="Tagline / 一句话定位（≤50 字符）"><input className="input" value={profile.tagline} onChange={(event) => setProfile((value) => ({ ...value, tagline: event.target.value }))} maxLength={50} readOnly={isReadOnly} /></Field>
              </div>
              <div className="grid-2" style={{ marginTop: 14 }}>
                <Field label="标签（双语，≤4 个）"><input className="input" value={profile.tags.join(" / ")} onChange={(event) => setProfile((value) => ({ ...value, tags: event.target.value.split(/[，,\/\s]+/).filter(Boolean).slice(0, 4) }))} readOnly={isReadOnly} /></Field>
                <Field label="AI 标识"><input className="input" value="AI（常量展示，不伪装真人）" readOnly /></Field>
              </div>
              <div className="grid-2" style={{ marginTop: 14 }}>
                <Field label="版本号 character_version"><input className="input" value={profile.version} onChange={(event) => setProfile((value) => ({ ...value, version: event.target.value }))} readOnly={isReadOnly} placeholder="如：v2.3.1" /></Field>
                <Field label="创建者 creator"><input className="input" value={profile.creator} onChange={(event) => setProfile((value) => ({ ...value, creator: event.target.value }))} readOnly={isReadOnly} placeholder="如：Luma 内容组" /></Field>
              </div>
              <div style={{ marginTop: 14 }}>
                <Field label="角色备注 creator_notes">
                  <textarea className="textarea" value={profile.creatorNotes} onChange={(event) => setProfile((value) => ({ ...value, creatorNotes: event.target.value }))} readOnly={isReadOnly} placeholder="补充角色的运营备注…" />
                </Field>
              </div>
            </Card>
          )}

          {tab === "basic" && (
            <Card title="开场白 / Greetings" sub="主开场 + 最多 5 条备选开场；每条都应提供一个不同的对话起点">
              <div className="tabs locale-tabs basic-locale-tabs" aria-label="开场白语言">
                <button className={locale === "zh" ? "is-active" : ""} onClick={() => setLocale("zh")}>中文</button>
                <button className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")}>English</button>
              </div>
              <div className="hint-bar greeting-hint"><Info />开场白需要直接进入场景，用角色自己的声音给用户一个可回应的动作、问题或选择。</div>
              {greetings.map((g, index) => (
                <div className="greeting-card" key={g.id}>
                  <header>
                    <b>{g.primary ? "Primary Greeting / 主开场" : `Alternate Greeting ${index} / 备选开场`}</b>
                    <span className="order">GREETING {String(index + 1).padStart(2, "0")}</span>
                    {g.primary
                      ? <Badge tone="yellow">主开场</Badge>
                      : isReadOnly
                        ? <Badge tone={g.enabled ? "green" : "gray"}>{g.enabled ? "启用" : "停用"}</Badge>
                        : <><Switch checked={g.enabled} onChange={(enabled) => toggleGreeting(g.id, enabled)} label={`启用备选开场 ${index}`} /><button className="icon-text-btn danger-text" onClick={() => deleteGreeting(g.id)}>删除</button></>}
                  </header>
                  <textarea className="textarea" value={g[locale]} maxLength={4096} readOnly={isReadOnly} onChange={(e) => updateGreeting(g.id, e.target.value)} />
                  <div className="greeting-foot"><span>{g[locale].length} / 4096</span>{g.primary && <span>重置对话时恢复此条</span>}</div>
                </div>
              ))}
              {!isReadOnly && <button className="btn" style={{ marginTop: 12 }} disabled={greetings.length >= 6} onClick={addGreeting}>+ 新增备选开场 {greetings.length >= 6 ? "（已达上限）" : `${greetings.length - 1} / 5`}</button>}
            </Card>
          )}

          {tab === "persona" && (
            <Card title="人设设定" sub="chara_card_v2 规范字段 · 组装顺序从上到下">
              <div className="persona-block">
                <header><b>Description / 角色简介</b><span className="muted small">介绍角色身份、背景和整体定位</span><span className="order">PROMPT SEGMENT 1</span></header>
                <textarea className="textarea" maxLength={500} value={profile.description} onChange={(event) => setProfile((value) => ({ ...value, description: event.target.value }))} readOnly={isReadOnly} />
              </div>
              <div className="persona-block">
                <header><b>Personality / 人格设定</b><span className="muted small">定义性格、情绪表达、行为倾向和语气</span><span className="order">PROMPT SEGMENT 2</span></header>
                <textarea className="textarea" value={profile.personality} onChange={(event) => setProfile((value) => ({ ...value, personality: event.target.value }))} readOnly={isReadOnly} placeholder="描述角色的性格、情绪表达、行为倾向和语气…" />
              </div>
              <div className="persona-block">
                <header><b>Scenario / 场景设定</b><span className="muted small">定义用户与 AI 的关系、身份和聊天背景</span><span className="order">PROMPT SEGMENT 3</span></header>
                <textarea className="textarea" value={profile.scenario} onChange={(event) => setProfile((value) => ({ ...value, scenario: event.target.value }))} readOnly={isReadOnly} placeholder="描述用户与 AI 的关系、身份和聊天背景…" />
              </div>
              <div className="persona-block">
                <header><b>Avatar notes / 视觉备注</b><span className="muted small">内部可见，不进入模型</span></header>
                <textarea className="textarea" value={profile.avatarNotes} onChange={(event) => setProfile((value) => ({ ...value, avatarNotes: event.target.value }))} readOnly={isReadOnly} />
              </div>
            </Card>
          )}

          {tab === "rules" && (
            <Card
              title="提示词 / Prompt"
              sub="运营直接维护最终交给模型的角色提示词，不再拆分重复的结构化字段"
              actions={
                <div className="tabs locale-tabs" aria-label="角色定义语言">
                  <button className={locale === "zh" ? "is-active" : ""} onClick={() => setLocale("zh")}>中文</button>
                  <button className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")}>English</button>
                </div>
              }
            >
              <div className="prompt-guide">
                <div><Info /><span>可直接使用</span><code>{"{{char}}"}</code><span>和</span><code>{"{{user}}"}</code><span>；保存内容将作为该语言的完整角色提示词。</span></div>
                <Badge tone={prompt[locale].length > 32000 ? "red" : "yellow"}>{prompt[locale].length.toLocaleString()} / 32,000</Badge>
              </div>
              <textarea
                className="textarea prompt-textarea"
                value={prompt[locale]}
                maxLength={32000}
                readOnly={isReadOnly}
                placeholder={locale === "zh" ? "输入角色中文提示词…" : "Enter the Character prompt in English…"}
                onChange={(e) => setPrompt((all) => ({ ...all, [locale]: e.target.value }))}
              />
              <div className="prompt-checks">
                {definitionChecks.map((item) => <span key={item.label} className={item.pass ? "is-pass" : ""}>{item.pass ? <Check /> : <Warning />}{item.label}</span>)}
              </div>

            </Card>
          )}

          {tab === "examples" && (
            <Card title="示例对话 / mes_example" sub="通过具体问答示范角色的回复方式；每组包含一条用户消息和一条角色回复">
              <div className="hint-bar greeting-hint"><Info />示例对话会作为角色定义的一部分提交给后端，建议使用真实、具体的对话场景。</div>
              {mesExamples.map((example, index) => {
                const userField = locale === "zh" ? "zhUser" : "enUser";
                const characterField = locale === "zh" ? "zhCharacter" : "enCharacter";
                return (
                  <div className="persona-block" key={example.id}>
                    <header>
                      <b>示例对话 {index + 1}</b>
                      <button className="icon-text-btn danger-text" onClick={() => deleteMesExample(example.id)}>删除</button>
                    </header>
                    <Field label="User / 用户">
                      <textarea className="textarea" value={example[userField]} onChange={(event) => updateMesExample(example.id, userField, event.target.value)} placeholder="例如：今天加班到现在，脑子还是懵的。" />
                    </Field>
                    <div style={{ marginTop: 10 }}>
                      <Field label="Character / 角色">
                        <textarea className="textarea" value={example[characterField]} onChange={(event) => updateMesExample(example.id, characterField, event.target.value)} placeholder="输入角色在这个场景下的回复…" />
                      </Field>
                    </div>
                  </div>
                );
              })}
              <button className="btn" style={{ marginTop: 12 }} onClick={addMesExample}>+ 新增示例对话</button>
            </Card>
          )}

          {tab === "assets" && (
            <Card
              title="视觉资产"
              sub="上传即时预览 · 删除需确认 · 上下架即时生效"
              actions={
                <div className="tabs">
                  <button className={assetTab === "public" ? "is-active" : ""} onClick={() => setAssetTab("public")}>公开资产（{assetItems.public.length}）</button>
                  <button className={assetTab === "private" ? "is-active" : ""} onClick={() => setAssetTab("private")}>私密资产（{assetItems.private.length}）</button>
                </div>
              }
            >
              <div className="asset-grid">
                {assetItems[assetTab].map((a) => (
                  <div className="asset-card" key={a.id}>
                    <div className="thumb">
                      <img src={a.previewSrc || a.src} alt={a.label} style={a.blurred && !a.previewSrc ? { filter: "blur(14px)" } : undefined} />
                      <span className="corner"><Badge tone={a.active ? "green" : "gray"}>{a.active ? "已上架" : "已下架"}</Badge></span>
                      <button className="asset-del" aria-label={`删除 ${a.label}`} onClick={() => setConfirmDelAsset({ mode: assetTab, id: a.id, label: a.label })}><X /></button>
                    </div>
                    <div className="meta">
                      <b>{a.label}</b>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                        <span>{a.kind}{a.price ? ` · ${a.price} 金币` : ""}</span>
                        <Switch checked={a.active} onChange={(v) => toggleAsset(assetTab, a.id, v)} label={a.label} />
                      </div>
                    </div>
                  </div>
                ))}
                <label className="asset-card asset-upload">
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { uploadAssets(e.target.files || []); e.target.value = ""; }} />
                  <span>+ 上传图片</span>
                </label>
              </div>
              <p className="muted small" style={{ margin: "12px 0 0" }}>
                {assetTab === "public" ? "公开资产：封面与 Gallery 图片，C 端首页与角色资料页可见。" : "私密资产：私密照片（40 金币逐张解锁，独立模糊预览）与视频封面；私密素材不得被生成器或其他未解锁页面引用。"}
              </p>
            </Card>
          )}

        </div>
      </div>
      {confirmDelAsset && (
        <ConfirmDialog
          title="删除该资产"
          desc={`将移除「${confirmDelAsset.label}」，C 端对应展示同步消失。操作不可恢复。`}
          confirmText="确认删除"
          onClose={() => setConfirmDelAsset(null)}
          onConfirm={deleteAsset}
        />
      )}
      {showVersions && (
        <div className="dialog-mask" onClick={() => setShowVersions(false)}>
          <div className="dialog version-dialog" onClick={(event) => event.stopPropagation()}>
            <h3>版本记录 · {profile.name}</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>版本</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
                <tbody>{versions.map((version) => (
                  <tr key={version.id}>
                    <td>v{version.ver}</td>
                    <td><Badge tone={version.state === "published" ? "green" : "gray"}>{version.state}</Badge></td>
                    <td className="muted">{version.created_at || "—"}</td>
                    <td><button className="btn sm" disabled={version.state !== "published"} onClick={() => rollbackVersion(version)}>回滚到此版本</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!versions.length && <p className="muted small">暂无版本记录</p>}
            <div className="dialog-actions"><button className="btn" onClick={() => setShowVersions(false)}>关闭</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= 生成预设（预设管理 / 生成价格 / 免费额度） ================= */

function AddPresetDialog({ mode, onClose, onAdd }) {
  const [tag, setTag] = useState("");
  const [tagEn, setTagEn] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptEn, setPromptEn] = useState("");
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 440, textAlign: "left" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>新增{mode === "photo" ? "照片" : "视频"}预设</h3>
        <Field label="标签名 *"><input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="如：胶片感" /></Field>
        <div style={{ marginTop: 12 }}><Field label="English label *"><input className="input" value={tagEn} onChange={(e) => setTagEn(e.target.value)} placeholder="e.g. Film look" /></Field></div>
        <div style={{ marginTop: 12 }}>
          <Field label="繁中提示语 *"><textarea className="textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}><Field label="English prompt *"><textarea className="textarea" value={promptEn} onChange={(e) => setPromptEn(e.target.value)} /></Field></div>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn primary" disabled={!tag.trim() || !tagEn.trim() || !prompt.trim() || !promptEn.trim()} onClick={() => onAdd(tag.trim(), tagEn.trim(), prompt.trim(), promptEn.trim())}>确认新增</button>
          <button className="btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

function PresetsPage({ toast, adminToken }) {
  const [tab, setTab] = useState("manage");
  const [presets, setPresets] = useState({ photo: [], video: [] });
  const [showAdd, setShowAdd] = useState(null); // "photo" | "video"
  const [confirmDel, setConfirmDel] = useState(null); // { mode, id, tag }

  const mapApiPreset = (preset) => ({
    id: preset.id,
    tag: preset.label_i18n?.["zh-Hant"] || preset.label_i18n?.en || preset.preset_code,
    tagEn: preset.label_i18n?.en || preset.label_i18n?.["zh-Hant"] || preset.preset_code,
    prompt: preset.prompt_i18n?.["zh-Hant"] || preset.prompt_i18n?.en || "",
    promptEn: preset.prompt_i18n?.en || preset.prompt_i18n?.["zh-Hant"] || "",
    active: preset.state === "online",
    sort: preset.sort || 0,
    raw: preset,
  });

  useEffect(() => {
    const controller = new AbortController();
    adminApi.presets.list({ state: "all", page: 1, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        const next = { photo: [], video: [] };
        for (const item of data?.items || []) {
          next[item.response_type === "video" ? "video" : "photo"].push(mapApiPreset(item));
        }
        setPresets(next);
      })
      .catch((error) => {
        if (error.name !== "AbortError") toast(`预设列表请求失败：${error.message}`);
      });
    return () => controller.abort();
  }, [adminToken]);

  const updatePreset = (mode, id, key, value) =>
    setPresets((p) => ({ ...p, [mode]: p[mode].map((x) => (x.id === id ? { ...x, [key]: value } : x)) }));
  const addPreset = async (tag, tagEn, prompt, promptEn) => {
    try {
      const data = await adminApi.presets.create({
        response_type: showAdd === "video" ? "video" : "image",
        label_i18n: { en: tagEn, "zh-Hant": tag },
        prompt_i18n: { en: promptEn, "zh-Hant": prompt },
        sort: presets[showAdd].length,
      });
      setPresets((current) => ({ ...current, [showAdd]: [...current[showAdd], mapApiPreset(data.preset)] }));
      setShowAdd(null);
      toast(`预设「${tag}」已新增，当前为下架状态`);
    } catch (error) {
      toast(`新增预设失败：${error.message}`);
    }
  };
  const deletePreset = async () => {
    try {
      await adminApi.presets.remove({ id: Number(confirmDel.id) });
      setPresets((current) => ({ ...current, [confirmDel.mode]: current[confirmDel.mode].filter((item) => item.id !== confirmDel.id) }));
      toast(`预设「${confirmDel.tag}」已删除`);
      setConfirmDel(null);
    } catch (error) {
      toast(`删除预设失败：${error.message}`);
    }
  };

  const setPresetStatus = async (mode, preset, active) => {
    try {
      await adminApi.presets.status({ id: Number(preset.id), state: active ? "online" : "offline" });
      updatePreset(mode, preset.id, "active", active);
      toast(`「${preset.tag}」已${active ? "上架" : "下架"}`);
    } catch (error) {
      toast(`修改预设状态失败：${error.message}`);
    }
  };

  const savePreset = async (mode, preset, index) => {
    try {
      await adminApi.presets.update({
        id: Number(preset.id),
        label_i18n: { en: preset.tagEn, "zh-Hant": preset.tag },
        prompt_i18n: { en: preset.promptEn, "zh-Hant": preset.prompt },
        sort: index,
      });
      toast(`「${preset.tag}」已保存`);
    } catch (error) {
      toast(`保存预设失败：${error.message}`);
    }
  };

  const presetBlock = (mode, title) => (
    <Card title={title} sub={`共 ${presets[mode].length} 个标签 · 改动 C 端实时生效`}
      actions={<button className="btn sm primary" onClick={() => setShowAdd(mode)}>+ 新增预设</button>}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th style={{ width: 46 }}>排序</th><th style={{ width: 170 }}>标签（繁中 / EN）</th><th>提示语（繁中 / EN）</th><th style={{ width: 76 }}>状态</th><th style={{ width: 132 }}>操作</th></tr></thead>
          <tbody>
            {presets[mode].map((p, i) => (
              <tr key={p.id}>
                <td className="muted num">{i + 1}</td>
                <td><div className="stacked-inputs"><input className="input" value={p.tag} aria-label="繁中标签" onChange={(e) => updatePreset(mode, p.id, "tag", e.target.value)} /><input className="input" value={p.tagEn} aria-label="English label" onChange={(e) => updatePreset(mode, p.id, "tagEn", e.target.value)} /></div></td>
                <td><div className="stacked-inputs"><input className="input" value={p.prompt} aria-label="繁中提示语" onChange={(e) => updatePreset(mode, p.id, "prompt", e.target.value)} /><input className="input" value={p.promptEn} aria-label="English prompt" onChange={(e) => updatePreset(mode, p.id, "promptEn", e.target.value)} /></div></td>
                <td><Switch checked={p.active} onChange={(value) => setPresetStatus(mode, p, value)} label={p.tag} /></td>
                <td><div style={{ display: "flex", gap: 6 }}><button className="btn sm" onClick={() => savePreset(mode, p, i)}>保存</button><button className="btn sm danger-ghost" onClick={() => setConfirmDel({ mode, id: p.id, tag: p.tag })}>删除</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="section-gap">
      <div className="hint-bar"><Info />视觉资产（封面 / Gallery / 私密照片）已在「角色管理 → 角色编辑器 → 视觉资产」Tab 中管理。</div>
      <div className="tabs">
        {[["manage", "预设管理"], ["price", "生成价格"], ["quota", "免费额度"], ["fallback", "兜底话术"]].map(([key, label]) => (
          <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "manage" && (
        <>
          {presetBlock("photo", "照片预设")}
          {presetBlock("video", "视频预设")}
        </>
      )}

      {tab === "price" && (
        <Card title="生成价格"><div className="empty-state">暂无对应后台接口，未展示任何本地数据。</div></Card>
      )}

      {tab === "quota" && (
        <Card title="免费消息额度"><div className="empty-state">暂无对应后台接口，未展示任何本地数据。</div></Card>
      )}

      {tab === "fallback" && (
        <Card title="兜底话术"><div className="empty-state">暂无对应后台接口，未展示任何本地数据。</div></Card>
      )}

      {showAdd && <AddPresetDialog mode={showAdd} onClose={() => setShowAdd(null)} onAdd={addPreset} />}
      {confirmDel && (
        <ConfirmDialog
          title="删除该预设"
          desc={`将删除「${confirmDel.tag}」标签，C 端生成卡片标签行同步移除。操作不可恢复。`}
          confirmText="确认删除"
          onClose={() => setConfirmDel(null)}
          onConfirm={deletePreset}
        />
      )}
    </div>
  );
}

/* ================= 用户管理 ================= */

const txTone = { 购买: "green", 解锁: "yellow", 生成: "gray", 退款: "yellow", 后台补币: "yellow" };

function TxTable({ rows }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>时间</th><th>类型</th><th>变动</th><th>变动后余额</th><th>备注</th></tr></thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.time + i}>
              <td className="muted">{t.time}</td>
              <td><Badge tone={txTone[t.type] || "gray"}>{t.type}</Badge></td>
              <td className="num" style={{ color: t.delta > 0 ? "#4ade80" : "#f04a44", fontWeight: 700 }}>{t.delta > 0 ? `+${t.delta.toLocaleString()}` : t.delta.toLocaleString()}</td>
              <td className="num">{t.balance.toLocaleString()}</td>
              <td>{t.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersPage({ toast, adminToken }) {
  const [view, setView] = useState("list"); // list | records
  const [selected, setSelected] = useState(null);
  const [recordsUser, setRecordsUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [addAmount, setAddAmount] = useState(100);
  const [addNote, setAddNote] = useState("后台补币");
  const [txFilter, setTxFilter] = useState("全部");

  useEffect(() => {
    const controller = new AbortController();
    adminApi.users.list({ page: 1, page_size: 100 }, { signal: controller.signal })
      .then((data) => {
        setUsers((data?.items || []).map((user) => ({
          id: user.user_id,
          internalId: user.internal_id,
          nick: user.nickname || "未设置昵称",
          registered: formatUnixDate(user.registered_at),
          member: user.is_vip ? "有效会员" : "非会员",
          memberUntil: user.is_vip ? formatUnixDate(user.vip_expires_at) : "—",
          coins: user.coin_balance || 0,
          sessions: user.session_count ?? "—",
          status: user.status === "normal" ? "正常" : user.status,
          gender: "—",
          lang: "—",
          channel: "—",
        })));
      })
      .catch((error) => {
        if (error.name !== "AbortError") toast(`用户列表请求失败：${error.message}`);
      });
    return () => controller.abort();
  }, [adminToken]);

  const filtered = users.filter((u) => !keyword || u.id.includes(keyword) || u.nick.includes(keyword));

  const patchUser = (id, patch) => {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const addCoins = async () => {
    const amount = Number(addAmount);
    if (!amount || amount <= 0) return;
    try {
      const result = await adminApi.users.grantCoins({
        user_id: selected.id,
        amount,
        note: addNote.trim() || "后台补币",
        idempotency_key: `emora-admin-${selected.id}-${Date.now()}`,
      });
      const newBalance = result.balance_after;
      setRecords((r) => [{ time: "刚刚", type: "后台补币", delta: amount, balance: newBalance, note: addNote.trim() || "后台补币" }, ...r]);
      patchUser(selected.id, { coins: newBalance });
      toast(`已增加 ${amount.toLocaleString()} 金币`);
    } catch (error) {
      toast(`补发金币失败：${error.message}`);
    }
  };

  const openWalletRecords = async (user) => {
    setRecordsUser(user);
    setSelected(null);
    setView("records");
    try {
      const data = await adminApi.users.walletHistory({ user_id: user.id, page_size: 50 });
      setRecords((data?.items || []).map((item) => ({
        time: formatUnixDate(item.occurred_at, true),
        type: item.source_type === "admin_adjustment" ? "后台补币" : item.type === 1 ? "购买" : "生成",
        delta: item.change || 0,
        balance: item.balance_after || 0,
        note: item.note || item.title_key || item.source_type || "—",
      })));
    } catch (error) {
      toast(`金币流水请求失败：${error.message}`);
    }
  };

  const openUser = async (user) => {
    try {
      const data = await adminApi.users.detail({ user_id: user.id });
      setSelected({
        ...user,
        nick: data.profile?.nickname || user.nick,
        email: data.profile?.email || "—",
        gender: data.profile?.gender || "—",
        ageRange: data.profile?.age_range || "—",
        bio: data.profile?.bio || "—",
        channel: data.profile?.registration_channel || "—",
        registered: formatUnixDate(data.profile?.registered_at),
        member: data.membership?.is_vip ? "有效会员" : "非会员",
        memberUntil: data.membership?.is_vip ? formatUnixDate(data.membership?.vip_expires_at) : "—",
        coins: data.wallet?.balance || 0,
        sessions: data.session_count ?? "—",
        status: data.status === "normal" ? "正常" : data.status,
      });
    } catch (error) {
      toast(`用户详情请求失败：${error.message}`);
    }
  };

  /* 金币流水独立页 */
  if (view === "records" && recordsUser) {
    const txTypes = ["全部", "购买", "解锁", "生成", "退款", "后台补币"];
    const txRows = records.filter((t) => txFilter === "全部" || t.type === txFilter);
    return (
      <div className="section-gap">
        <div className="filter-bar">
          <button className="btn" onClick={() => setView("list")}><ArrowLeft />返回</button>
          <span className="muted small">用户管理 / {recordsUser.nick} / 金币流水</span>
          <div style={{ marginLeft: "auto" }}>
            <select className="select" value={txFilter} onChange={(e) => setTxFilter(e.target.value)}>
              {txTypes.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <Card title={`金币流水 · ${recordsUser.nick}`} sub={`当前余额 ${recordsUser.coins.toLocaleString()} · 共 ${txRows.length} 条`}>
          <TxTable rows={txRows} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Card title="用户列表" sub={`共 ${filtered.length} 位用户`}>
        <div className="filter-bar" style={{ marginBottom: 14 }}>
          <input className="input" style={{ width: 280 }} placeholder="按用户 ID / 昵称搜索" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>用户 ID</th><th>昵称</th><th>注册时间</th><th>会员状态</th><th>金币余额</th><th>会话数</th><th>状态</th></tr></thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="clickable" onClick={() => openUser(u)}>
                  <td className="muted">{u.id}</td>
                  <td><b>{u.nick}</b></td>
                  <td className="muted">{u.registered}</td>
                  <td><Badge tone={u.member === "有效会员" ? "green" : "gray"}>{u.member}{u.member === "有效会员" ? ` · ${u.memberUntil}` : ""}</Badge></td>
                  <td className="num">{u.coins.toLocaleString()}</td>
                  <td className="num">{u.sessions}</td>
                  <td><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <>
          <div className="drawer-mask" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <header>
              <h2>用户详情 · {selected.nick}</h2>
              <button className="btn ghost" onClick={() => setSelected(null)}><X /></button>
            </header>
            <div className="drawer-body section-gap">
              <div className="card">
                <div className="summary-kv">
                  <div><span>用户 ID</span><b>{selected.id}</b></div>
                  <div><span>性别 / 语言</span><b>{selected.gender} · {selected.lang}</b></div>
                  <div><span>注册渠道</span><b>{selected.channel}</b></div>
                  <div><span>注册时间</span><b>{selected.registered}</b></div>
                  <div><span>邮箱</span><b>{selected.email || "—"}</b></div>
                  <div><span>年龄范围</span><b>{selected.ageRange || "—"}</b></div>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h2>会员</h2><span className="sub">高危操作 · 需超管或运营</span></div>
                <ToggleRow
                  label="会员状态"
                  desc={selected.member === "有效会员" ? `有效期至 ${selected.memberUntil}` : "当前为非会员 · 暂无会员状态修改接口"}
                  checked={selected.member === "有效会员"}
                  onChange={() => {}}
                  disabled
                />
              </div>
              <div className="card">
                <div className="card-head"><h2>金币</h2><span className="sub">余额 {selected.coins.toLocaleString()} · 高危操作</span></div>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <Field label="增加数量">
                    <input className="input" style={{ width: 120 }} type="number" min={1} value={addAmount} onChange={(e) => setAddAmount(e.target.value)} />
                  </Field>
                  <Field label="备注">
                    <input className="input" value={addNote} onChange={(e) => setAddNote(e.target.value)} />
                  </Field>
                  <button className="btn primary" onClick={addCoins}>确认增加</button>
                </div>
              </div>
              <div className="card">
                <div className="card-head">
                  <h2>金币流水</h2><span className="sub">最近 3 条</span>
                  <div className="spacer" />
                  <button className="btn sm" onClick={() => openWalletRecords(selected)}>查看全部流水</button>
                </div>
                <TxTable rows={records.slice(0, 3)} />
              </div>
              <div className="card">
                <div className="card-head"><h2>处置操作</h2><span className="sub">全部留痕 · 即时生效于 C 端</span></div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn" disabled title="暂无对应后台接口">重置免费额度</button>
                  <button className={`btn ${selected.status === "正常" ? "danger-ghost" : ""}`} disabled title="暂无对应后台接口">
                    {selected.status === "正常" ? "封禁用户" : "解除封禁"}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/* ================= 商业化配置（金币包 / 订阅套餐 / 权益清单） ================= */

function AddProductDialog({ kind, onClose, onCreate }) {
  const isCoin = kind === "pack";
  const [platform, setPlatform] = useState(1);
  const [pkgName, setPkgName] = useState("");
  const [productId, setProductId] = useState("");
  const [basePlanId, setBasePlanId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [firstPrice, setFirstPrice] = useState("");
  const [coin, setCoin] = useState("");
  const [bonus, setBonus] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const valid = pkgName.trim() && productId.trim() && name.trim() && price !== ""
    && Number(price) >= 0 && (!isCoin || (coin !== "" && Number(coin) > 0));

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onCreate({
        plate_form: platform,
        pkg_name: pkgName.trim(),
        product_id: productId.trim(),
        ...(basePlanId.trim() ? { base_plan_id: basePlanId.trim() } : {}),
        name: name.trim(),
        price: String(price),
        first_price: isCoin ? "0" : String(firstPrice || 0),
        coin: isCoin ? Number(coin) : 0,
        bonus: isCoin ? String(bonus || 0) : "0",
        type: isCoin ? 1 : 2,
        status: 0,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 560, textAlign: "left" }} onClick={(event) => event.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>新增{isCoin ? "金币包" : "订阅套餐"}</h3>
        <div className="grid-2" style={{ gap: 12 }}>
          <Field label="平台 *">
            <select className="select" value={platform} onChange={(event) => setPlatform(Number(event.target.value))}>
              <option value={1}>Android</option><option value={2}>iOS</option>
            </select>
          </Field>
          <Field label="包名 *"><input className="input" value={pkgName} onChange={(event) => setPkgName(event.target.value)} placeholder="com.example.app" /></Field>
          <Field label="商品 ID *"><input className="input" value={productId} onChange={(event) => setProductId(event.target.value)} /></Field>
          <Field label="商品名称 *"><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="价格 *"><input className="input" type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
          {isCoin ? (
            <>
              <Field label="基础金币 *"><input className="input" type="number" min={1} value={coin} onChange={(event) => setCoin(event.target.value)} /></Field>
              <Field label="赠送金币"><input className="input" type="number" min={0} value={bonus} onChange={(event) => setBonus(event.target.value)} /></Field>
            </>
          ) : (
            <>
              <Field label="Base Plan ID"><input className="input" value={basePlanId} onChange={(event) => setBasePlanId(event.target.value)} /></Field>
              <Field label="首次优惠价"><input className="input" type="number" min={0} step="0.01" value={firstPrice} onChange={(event) => setFirstPrice(event.target.value)} /></Field>
            </>
          )}
        </div>
        {error && <div className="login-error" style={{ marginTop: 12 }}><Warning weight="fill" />{error}</div>}
        <p className="muted small" style={{ margin: "12px 0 0" }}>新建商品默认为下架状态，确认配置后再手动上架。</p>
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn primary" disabled={!valid || submitting} onClick={submit}>{submitting ? "创建中…" : "确认新增"}</button>
          <button className="btn" disabled={submitting} onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

function CommercePage({ toast, adminToken }) {
  const [tab, setTab] = useState("packs");
  const [packs, setPacks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [benefitLocale, setBenefitLocale] = useState("zh-Hant");
  const [benefitItems, setBenefitItems] = useState([]);
  const [benefitVersion, setBenefitVersion] = useState(null);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsSaving, setBenefitsSaving] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(null);

  const applyProductList = (data) => {
    const items = Array.isArray(data) ? data : data?.items || data?.list || [];
    const coinItems = items.filter((item) => Number(item.type) === 1);
    const memberItems = items.filter((item) => Number(item.type) === 2);
    setPacks(coinItems.map((item) => ({
      id: item.id,
      productId: item.product_id,
      name: item.name,
      base: Number(item.coin || 0),
      bonus: Number(item.bonus || 0),
      price: Number(item.price || 0),
      active: Number(item.status) === 1,
    })));
    setPlans(memberItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price || 0),
      renewPrice: Number(item.first_price || 0),
      struck: item.first_price && Number(item.first_price) > 0 ? `¥${item.first_price}` : "—",
      active: Number(item.status) === 1,
    })));
  };

  const refreshProducts = async (options) => {
    const data = await adminApi.products.list({ page: 1, page_size: 100 }, options);
    applyProductList(data);
  };

  useEffect(() => {
    const controller = new AbortController();
    refreshProducts({ signal: controller.signal })
      .catch((error) => {
        if (error.name !== "AbortError") toast(`商品列表请求失败：${error.message}`);
      });
    return () => controller.abort();
  }, [adminToken]);

  useEffect(() => {
    if (tab !== "benefits") return undefined;
    const controller = new AbortController();
    setBenefitsLoading(true);
    setBenefitItems([]);
    setBenefitVersion(null);
    adminApi.settings.commerceBenefits({ locale: benefitLocale }, { signal: controller.signal })
      .then((data) => {
        setBenefitItems((data?.items || []).map((item) => ({
          key: String(item.key || ""),
          title: String(item.title || ""),
          description: String(item.description || ""),
          icon_key: String(item.icon_key || ""),
          sort: Number(item.sort || 0),
          enabled: item.enabled !== false,
        })));
        setBenefitVersion(data?.version ?? null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") toast(`会员权益请求失败：${error.message}`);
      })
      .finally(() => setBenefitsLoading(false));
    return () => controller.abort();
  }, [tab, benefitLocale, adminToken]);

  const updatePack = (id, key, value) =>
    setPacks((list) => list.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  const updatePlan = (i, key, value) =>
    setPlans((list) => list.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  const updateBenefit = (key, field, value) =>
    setBenefitItems((items) => items.map((item) => (item.key === key ? { ...item, [field]: value } : item)));
  const savePacks = async () => {
    try {
      await Promise.all(packs.map((pack) => adminApi.products.update({
        id: Number(pack.id),
        name: pack.name || `${pack.base} Coins`,
        price: String(pack.price),
        coin: Number(pack.base),
        bonus: String(pack.bonus),
      })));
      toast("金币包配置已保存");
    } catch (error) {
      toast(`保存金币包失败：${error.message}`);
    }
  };

  const setProductStatus = async (kind, id, active) => {
    try {
      await adminApi.products.status({ id: Number(id), status: active ? 1 : 0 });
      if (kind === "pack") updatePack(id, "active", active);
      else setPlans((items) => items.map((item) => (item.id === id ? { ...item, active } : item)));
      toast(`商品已${active ? "上架" : "下架"}`);
    } catch (error) {
      toast(`修改商品状态失败：${error.message}`);
    }
  };

  const savePlan = async (plan) => {
    try {
      await adminApi.products.update({
        id: Number(plan.id),
        name: plan.name,
        price: String(plan.price),
        first_price: String(plan.renewPrice || 0),
      });
      toast(`${plan.name} 已保存`);
    } catch (error) {
      toast(`保存订阅商品失败：${error.message}`);
    }
  };

  const createProduct = async (params) => {
    await adminApi.products.create(params);
    await refreshProducts();
    setShowAddProduct(null);
    toast(`${params.type === 1 ? "金币包" : "订阅套餐"}已创建，当前为下架状态`);
  };

  const saveBenefits = async () => {
    setBenefitsSaving(true);
    try {
      const data = await adminApi.settings.saveCommerceBenefits({
        locale: benefitLocale,
        items: [...benefitItems]
          .sort((a, b) => a.sort - b.sort)
          .map(({ key, title, description, icon_key, sort, enabled }) => ({ key, title, description, icon_key, sort, enabled })),
      });
      setBenefitVersion(data?.version ?? benefitVersion);
      toast(`会员权益（${benefitLocale}）已保存`);
    } catch (error) {
      toast(`保存会员权益失败：${error.message}`);
    } finally {
      setBenefitsSaving(false);
    }
  };

  return (
    <div className="section-gap">
      <div className="tabs">
        {[["packs", "金币包"], ["plans", "订阅套餐"], ["benefits", "权益清单"]].map(([key, label]) => (
          <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === "packs" && (
        <Card
          title="金币包配置"
          sub={`共 ${packs.length} 档 · 数据来自商品接口`}
          actions={<div style={{ display: "flex", gap: 8 }}><button className="btn" onClick={() => setShowAddProduct("pack")}>+ 新增金币包</button><button className="btn primary" disabled={packs.length === 0} onClick={savePacks}>保存</button></div>}
        >
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>档位</th><th>基础金币</th><th>赠送金币</th><th>价格（CNY）</th><th>C 端展示</th><th>上架</th></tr></thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{p.productId || p.name || `#${p.id}`}</td>
                    <td><input className="input" style={{ width: 100, height: 32 }} type="number" value={p.base} onChange={(e) => updatePack(p.id, "base", Number(e.target.value))} /></td>
                    <td><input className="input" style={{ width: 100, height: 32 }} type="number" value={p.bonus} onChange={(e) => updatePack(p.id, "bonus", Number(e.target.value))} /></td>
                    <td><input className="input" style={{ width: 90, height: 32 }} type="number" value={p.price} onChange={(e) => updatePack(p.id, "price", Number(e.target.value))} /></td>
                    <td className="muted small">额外赠送 +{p.bonus} · ¥{p.price}</td>
                    <td><Switch checked={p.active} onChange={(value) => setProductStatus("pack", p.id, value)} label={`pack_${p.id}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "plans" && (
        <>
          <div className="filter-bar" style={{ justifyContent: "flex-end" }}>
            <button className="btn primary" onClick={() => setShowAddProduct("plan")}>+ 新增订阅套餐</button>
          </div>
          {plans.length === 0 ? <div className="empty-state">商品接口暂未返回订阅套餐。</div> : (
            <div className="grid-3">
              {plans.map((p, i) => (
                <Card key={p.id || p.name} title={p.name} actions={<button className="btn sm primary" onClick={() => savePlan(p)}>保存</button>}>
                  <div className="grid-2" style={{ gap: 10 }}>
                    <Field label="价格（CNY）">
                      <input className="input" type="number" value={p.price} onChange={(e) => updatePlan(i, "price", Number(e.target.value))} />
                    </Field>
                    <Field label="首次优惠价（CNY）">
                      <input className="input" type="number" value={p.renewPrice} onChange={(e) => updatePlan(i, "renewPrice", Number(e.target.value))} />
                    </Field>
                  </div>
                  {p.id && <ToggleRow label="商品状态" checked={p.active !== false} onChange={(value) => setProductStatus("plan", p.id, value)} />}
                  <p className="muted small" style={{ margin: "10px 0 0" }}>划线价 {p.struck} · 续费自「当前时间与当前到期日较晚者」起顺延</p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "benefits" && (
        <Card
          title="权益清单"
          sub={`${benefitLocale}${benefitVersion == null ? "" : ` · 版本 ${benefitVersion}`} · 数据来自后台配置接口`}
          actions={<button className="btn primary" disabled={benefitsLoading || benefitsSaving || benefitItems.length === 0} onClick={saveBenefits}>{benefitsSaving ? "保存中…" : "保存"}</button>}
        >
          <div className="tabs" style={{ marginBottom: 14 }}>
            {[["zh-Hant", "繁體中文"], ["en", "English"]].map(([locale, label]) => (
              <button key={locale} className={benefitLocale === locale ? "is-active" : ""} onClick={() => setBenefitLocale(locale)}>{label}</button>
            ))}
          </div>
          {benefitsLoading ? <div className="panel-loading">加载中…</div> : benefitItems.length === 0 ? (
            <div className="empty-state">该语言尚未保存会员权益配置。</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th style={{ width: 260 }}>权益标题</th><th>描述</th><th style={{ width: 90 }}>状态</th></tr></thead>
                <tbody>
                  {[...benefitItems].sort((a, b) => a.sort - b.sort).map((item) => (
                    <tr key={item.key}>
                      <td>
                        <input className="input" style={{ height: 32 }} value={item.title} onChange={(event) => updateBenefit(item.key, "title", event.target.value)} />
                        <div className="muted small" style={{ marginTop: 5 }}>{item.key}{item.icon_key ? ` · ${item.icon_key}` : ""}</div>
                      </td>
                      <td><input className="input" style={{ height: 32 }} value={item.description} onChange={(event) => updateBenefit(item.key, "description", event.target.value)} /></td>
                      <td><Switch checked={item.enabled} onChange={(value) => updateBenefit(item.key, "enabled", value)} label={item.title || item.key} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {showAddProduct && <AddProductDialog kind={showAddProduct} onClose={() => setShowAddProduct(null)} onCreate={createProduct} />}
    </div>
  );
}

/* ================= 数据看板 ================= */

/* ================= 数据看板（按四组 Tab 组织） ================= */

const analyticsTabs = [
  ["user", "用户"], ["chat", "聊天页"],
];

function AnalyticsPage({ toast, adminToken }) {
  const [tab, setTab] = useState("user");
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [userType, setUserType] = useState("all");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setAnalytics(null);
    adminApi.analytics.query({
      tab,
      start_date: startDate,
      end_date: endDate,
      user_type: userType,
      timezone: "Asia/Shanghai",
    }, { signal: controller.signal })
      .then(setAnalytics)
      .catch((error) => {
        if (error.name !== "AbortError") toast(`统计接口请求失败：${error.message}`);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [tab, startDate, endDate, userType, adminToken]);

  const days = Math.max(1, Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1);
  return (
    <div className="section-gap">
      <div className="filter-bar">
        <input className="input" style={{ width: 152 }} type="date" max={todayStr} value={startDate} aria-label="开始日期"
          onChange={(e) => { const value = e.target.value; if (!value) return; setStartDate(value); if (value > endDate) setEndDate(value); }} />
        <span className="muted">~</span>
        <input className="input" style={{ width: 152 }} type="date" max={todayStr} value={endDate} aria-label="结束日期"
          onChange={(e) => { const value = e.target.value; if (!value) return; setEndDate(value); if (value < startDate) setStartDate(value); }} />
        <select className="select" style={{ width: "auto", minWidth: 120 }} value={userType} aria-label="用户类型" onChange={(e) => setUserType(e.target.value)}>
          <option value="all">全部</option>
          <option value="guest">游客</option>
          <option value="registered">已注册</option>
        </select>
        <span className="muted small">{startDate} ~ {endDate} · 共 {days} 天</span>
      </div>
      <div className="tabs">
        {analyticsTabs.map(([key, label]) => (
          <button key={key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {loading ? <div className="panel-loading">加载中…</div> : analytics?.kpis ? <LiveAnalyticsKpis kpis={analytics.kpis} /> : <div className="empty-state">接口未返回统计数据。</div>}
    </div>
  );
}

/* ================= 模型配置 ================= */

const MODEL_PROFILES = [
  { key: "chat.default", label: "文本", shortKey: "text" },
  { key: "media.image", label: "图片", shortKey: "image" },
  { key: "media.video", label: "视频", shortKey: "video" },
];

function getProviderRoute(provider, profileKey) {
  return (provider.routes || []).find((route) => route.profile_key === profileKey) || null;
}

function maskApiKey(value) {
  if (!value) return "—";
  if (value.includes("****")) return value;
  return value.length > 10 ? `${value.slice(0, 5)}****${value.slice(-4)}` : "••••••••";
}

function ProviderDialog({ provider, onClose, onSave }) {
  const editing = Boolean(provider);
  const [form, setForm] = useState(() => ({
    name: provider?.name || "",
    driver: provider?.driver || "openrouter",
    baseUrl: provider?.base_url || "",
    apiKey: "",
    status: provider?.status || "enabled",
    connectTimeout: provider?.connect_timeout ?? 5,
    requestTimeout: provider?.request_timeout ?? 90,
    mediaTimeout: provider?.media_timeout ?? 300,
    httpReferer: provider?.http_referer || "",
    xTitle: provider?.x_title || "",
    remark: provider?.remark || "",
    models: Object.fromEntries(MODEL_PROFILES.map(({ key }) => [key, getProviderRoute(provider || {}, key)?.model || ""])),
  }));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateModel = (key, value) => setForm((current) => ({ ...current, models: { ...current.models, [key]: value } }));
  const ready = form.name.trim() && form.baseUrl.trim() && (editing || form.apiKey.trim()) && MODEL_PROFILES.every(({ key }) => form.models[key].trim());
  const submit = () => {
    if (!ready) return;
    const payload = {
      ...(editing ? { id: Number(provider.id) } : {}),
      name: form.name.trim(),
      driver: form.driver,
      base_url: form.baseUrl.trim(),
      status: form.status,
      connect_timeout: Number(form.connectTimeout),
      request_timeout: Number(form.requestTimeout),
      media_timeout: Number(form.mediaTimeout),
      http_referer: form.httpReferer.trim(),
      x_title: form.xTitle.trim(),
      remark: form.remark.trim(),
      ...(form.apiKey.trim() ? { api_key: form.apiKey.trim() } : {}),
    };
    onSave(payload, form.models);
  };
  return (
    <div className="dialog-mask" onClick={onClose}>
      <div className="dialog" style={{ width: 560, maxHeight: "90vh", overflowY: "auto", textAlign: "left" }} onClick={(event) => event.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>{editing ? "编辑中转站" : "新建中转站"}</h3>
        <Field label="名称 *"><input className="input" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="如：主用中转站" /></Field>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Field label="Provider 类型 *"><select className="select" value={form.driver} onChange={(event) => update("driver", event.target.value)}><option value="openrouter">openrouter</option><option value="deepseek">deepseek</option></select></Field>
          <Field label="状态"><select className="select" value={form.status} onChange={(event) => update("status", event.target.value)}><option value="enabled">启用</option><option value="disabled">停用</option></select></Field>
        </div>
        <div style={{ marginTop: 12 }}><Field label="API 地址 / 中转域名 *"><input className="input" value={form.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} placeholder="https://api.example.com/v1" /></Field></div>
        <div style={{ marginTop: 12 }}><Field label={`API Key ${editing ? "（留空则保留原 Key）" : "*"}`}><input className="input" type="password" value={form.apiKey} onChange={(event) => update("apiKey", event.target.value)} placeholder={editing ? `当前：${maskApiKey(provider.api_key)}` : "sk-..."} autoComplete="new-password" /></Field></div>
        <div style={{ marginTop: 12 }}>
          <Field label="模型（文本、图片、视频各 1 个）">
            <div style={{ display: "grid", gap: 10 }}>
              {MODEL_PROFILES.map(({ key, label }) => <div key={key} style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 8 }}><span className="muted small">{label}</span><input className="input" value={form.models[key]} onChange={(event) => updateModel(key, event.target.value)} placeholder={`输入${label}模型名`} /></div>)}
            </div>
          </Field>
        </div>
        <div className="grid-3" style={{ marginTop: 12 }}>
          <Field label="连接超时（秒）"><input className="input" type="number" min="1" value={form.connectTimeout} onChange={(event) => update("connectTimeout", event.target.value)} /></Field>
          <Field label="请求超时（秒）"><input className="input" type="number" min="1" value={form.requestTimeout} onChange={(event) => update("requestTimeout", event.target.value)} /></Field>
          <Field label="媒体超时（秒）"><input className="input" type="number" min="1" value={form.mediaTimeout} onChange={(event) => update("mediaTimeout", event.target.value)} /></Field>
        </div>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Field label="HTTP Referer"><input className="input" value={form.httpReferer} onChange={(event) => update("httpReferer", event.target.value)} /></Field>
          <Field label="X-Title"><input className="input" value={form.xTitle} onChange={(event) => update("xTitle", event.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}><Field label="备注"><textarea className="textarea" value={form.remark} onChange={(event) => update("remark", event.target.value)} /></Field></div>
        <div className="dialog-actions" style={{ marginTop: 18, gridTemplateColumns: "1fr 1fr" }}><button className="btn primary" disabled={!ready} onClick={submit}>保存</button><button className="btn" onClick={onClose}>取消</button></div>
        {!ready && <p className="muted small" style={{ margin: "10px 0 0", textAlign: "center" }}>名称、API 地址、API Key（新建时）以及三类模型均为必填</p>}
      </div>
    </div>
  );
}

function ModelConfigPage({ toast, adminToken }) {
  const [providers, setProviders] = useState([]);
  const [profileKeys, setProfileKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = (signal) => adminApi.modelConfig.list({}, { signal }).then((data) => {
    setProviders(data?.providers || []);
    setProfileKeys(data?.profile_keys || []);
  });
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal).catch((error) => { if (error.name !== "AbortError") toast(`模型配置加载失败：${error.message}`); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [adminToken]);

  const saveProvider = async (payload, models) => {
    try {
      const data = await adminApi.modelConfig.saveProvider(payload);
      const saved = data?.provider || { ...payload, id: payload.id };
      const providerId = Number(saved.id || payload.id);
      for (const { key } of MODEL_PROFILES) {
        await adminApi.modelConfig.saveRoute({ profile_key: key, provider_config_id: providerId, model: models[key].trim(), provider_options: {}, enabled: true, sort: 0 });
      }
      setEditing(undefined);
      await load();
      toast(`中转站「${payload.name}」已保存`);
    } catch (error) {
      toast(`保存中转站失败：${error.message}`);
    }
  };
  const deleteProvider = async () => {
    try {
      await adminApi.modelConfig.deleteProvider(confirmDelete.id);
      setConfirmDelete(null);
      await load();
      toast(`中转站「${confirmDelete.name}」已删除`);
    } catch (error) {
      toast(`删除中转站失败：${error.message}`);
    }
  };
  const switchProvider = async (profile, provider) => {
    const route = getProviderRoute(provider, profile.key);
    if (!route) return;
    try {
      await Promise.all(providers.map(async (item) => {
        const itemRoute = getProviderRoute(item, profile.key);
        if (!itemRoute || item.id === provider.id) return;
        return adminApi.modelConfig.saveRoute({ profile_key: profile.key, provider_config_id: Number(item.id), model: itemRoute.model, provider_options: itemRoute.provider_options || {}, enabled: false, sort: itemRoute.sort || 0 });
      }));
      await adminApi.modelConfig.saveRoute({ profile_key: profile.key, provider_config_id: Number(provider.id), model: route.model, provider_options: route.provider_options || {}, enabled: true, sort: route.sort || 0 });
      await load();
      toast(`${profile.label}调用已切换至「${provider.name}」`);
    } catch (error) {
      toast(`切换${profile.label}中转站失败：${error.message}`);
    }
  };
  return (
    <div className="section-gap">
      <Card title="中转站列表" sub={`共 ${providers.length} 个 · 文本/图片/视频可分别生效在不同中转站 · 配置即时生效`} actions={<button className="btn primary" onClick={() => setEditing(null)}>+ 新建中转站</button>}>
        {loading ? <div className="panel-loading">加载中…</div> : <div className="table-wrap"><table className="table compact"><thead><tr><th>名称</th><th>API 地址</th><th>API Key</th>{MODEL_PROFILES.map(({ label }) => <th key={label}>{label}模型</th>)}<th>操作</th></tr></thead><tbody>
          {providers.map((provider) => <tr key={provider.id}>
            <td style={{ whiteSpace: "nowrap" }}><b>{provider.name}</b><div className="muted small">{provider.driver} · {provider.status === "enabled" ? "启用" : "停用"}</div></td>
            <td className="muted mono" title={provider.base_url} style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{provider.base_url}</td>
            <td className="muted mono" style={{ whiteSpace: "nowrap" }}>{maskApiKey(provider.api_key)}</td>
            {MODEL_PROFILES.map((profile) => { const route = getProviderRoute(provider, profile.key); const active = Boolean(route?.enabled); return <td key={profile.key}><div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}><span className="mono small">{route?.model || "—"}</span>{active ? <Badge tone="yellow">使用中</Badge> : <button className="btn sm" disabled={!route || provider.status !== "enabled"} onClick={() => switchProvider(profile, provider)}>切换到此站</button>}</div></td>; })}
            <td><div style={{ display: "flex", gap: 6 }}><button className="btn sm" onClick={() => setEditing(provider)}>编辑</button><button className="btn sm danger-ghost" onClick={() => setConfirmDelete(provider)}>删除</button></div></td>
          </tr>)}
          {!providers.length && <tr><td colSpan={7}><div className="empty-state">暂无中转站配置</div></td></tr>}
        </tbody></table></div>}
      </Card>
      <Card title="业务模型路由" sub="后端支持的业务 profile_key；当前页面展示文本、图片、视频三类调用路由"><div className="pill-row">{profileKeys.map((key) => <span className="tag-pill" key={key}>{key}</span>)}</div></Card>
      {editing !== undefined && <ProviderDialog provider={editing} onClose={() => setEditing(undefined)} onSave={saveProvider} />}
      {confirmDelete && <ConfirmDialog title="删除该中转站" desc={`将删除「${confirmDelete.name}」及其模型配置，操作不可恢复。`} confirmText="确认删除" onClose={() => setConfirmDelete(null)} onConfirm={deleteProvider} />}
    </div>
  );
}

/* ================= 系统设置 ================= */

function SettingsPage() {
  return (
    <div className="section-gap">
      <Card title="权限与审计"><div className="empty-state">暂无对应后台接口，未展示任何本地数据。</div></Card>
    </div>
  );
}

/* ================= 主壳 ================= */

const NAV = [
  { id: "dashboard", path: "/", label: "仪表盘", icon: Gauge },
  { id: "characters", path: "/characters", label: "角色管理", icon: MaskHappy },
  { id: "presets", path: "/presets", label: "生成预设", icon: ImageSquare },
  { id: "models", path: "/models", label: "模型配置", icon: GearSix },
  { id: "users", path: "/users", label: "用户管理", icon: Users },
  { id: "commerce", path: "/commerce", label: "商业化配置", icon: Coins },
  { id: "analytics", path: "/analytics", label: "数据看板", icon: ChartLineUp },
  { id: "settings", path: "/settings", label: "系统设置", icon: GearSix },
];

export default function Admin() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoute = NAV.find((item) => item.path === location.pathname);
  const page = activeRoute?.id || "dashboard";
  const [editing, setEditing] = useState(null); // 角色编辑器中的角色
  const [charList, setCharList] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [adminToken, setAdminTokenState] = useState(getAdminToken());
  const [apiState, setApiState] = useState("loading");

  const toast = (msg) => setToastMsg(msg);
  useEffect(() => {
    if (!toastMsg) return undefined;
    const t = setTimeout(() => setToastMsg(""), 2200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    const controller = new AbortController();
    setApiState("loading");
    adminApi.characters.list(
      { state: "all", locale: "zh-Hant", page: 1, page_size: 100 },
      { signal: controller.signal },
    ).then((data) => {
      const items = data?.items || [];
      setCharList(items.map((item) => {
        const metrics = item.metrics || {};
        const cover = item.profile?.cover?.asset?.ref || item.profile?.cover?.asset?.preview_ref;
        return {
          id: item.id,
          charCode: item.char_code,
          name: item.profile?.name || item.char_code,
          nameEn: item.char_code,
          subtitle: item.profile?.tagline || "—",
          tags: item.profile?.tags || [],
          status: item.state === "online" ? "已上架" : "草稿",
          image: cover || "",
          cardImage: cover || "",
          lockedImage: "",
          gallery: cover ? [cover] : [],
          video: null,
          chats: metrics.chat_uv || 0,
          msgCount: metrics.msg_cnt || 0,
          msgPer: metrics.msg_avg || 0,
          expPv: metrics.exp_pv || 0,
          expUv: metrics.exp_uv || 0,
          genSubmit: metrics.gen_cnt || 0,
          genRate: metrics.gen_rate == null ? "—" : `${metrics.gen_rate}%`,
        };
      }));
      setApiState("connected");
    }).catch((error) => {
      if (error.name === "AbortError") return;
      setApiState(error.status === 401 ? (adminToken ? "unauthorized" : "token-required") : error.status === 403 ? "forbidden" : "error");
      if (adminToken) toast(error.status === 401 ? "登录已过期" : `角色数据加载失败：${error.message}`);
    });

    return () => controller.abort();
  }, [adminToken]);

  useEffect(() => {
    if (!activeRoute && location.pathname !== "/login") navigate("/", { replace: true });
  }, [activeRoute, navigate]);

  useEffect(() => {
    const unauthenticated = apiState === "token-required" || apiState === "unauthorized" || apiState === "forbidden" || (apiState === "error" && !adminToken);
    if (unauthenticated && location.pathname !== "/login") navigate("/login", { replace: true });
    if (apiState === "connected" && location.pathname === "/login") navigate("/", { replace: true });
  }, [apiState, adminToken, location.pathname, navigate]);

  const navTo = (id) => {
    const route = NAV.find((item) => item.id === id);
    navigate(route?.path || "/");
    setEditing(null);
  };

  const createCharacter = async (character) => {
    try {
      const charCode = character.charCode;
      const asset = await adminApi.media.uploadFile(character.coverFile, charCode);
      const created = await adminApi.characters.create({
          char_code: charCode,
          ai: true,
          data: {
            "zh-Hant": {
              name: character.name,
              tagline: character.subtitle,
              description: character.subtitle,
              prompt: "",
              greetings: [{ kind: "primary", body: character.greeting, enabled: true, sort: 0 }],
              tags: character.tags,
            },
            en: {
              name: character.nameEn,
              tagline: character.subtitle,
              description: character.subtitle,
              prompt: "",
              greetings: [{ kind: "primary", body: character.greeting, enabled: true, sort: 0 }],
              tags: character.tags,
            },
          },
          cover_asset_id: asset.id,
          assets: [{ asset_id: asset.id, role: "cover", access: "public", state: "online", sort: 0 }],
      });
      const next = {
        ...character,
        id: created.id,
        charCode: created.char_code || charCode,
        image: asset.ref,
        cardImage: asset.ref,
        lockedImage: "",
        gallery: [asset.ref],
      };
      delete next.coverFile;
      setCharList((list) => [...list, next]);
      setEditing(next);
      toast(`已创建草稿角色「${next.name}」`);
    } catch (error) {
      toast(`创建角色失败：${error.message}`);
      throw error;
    }
  };

  const updateCharacterStatus = (id, status) => {
    setCharList((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    setEditing((current) => (current?.id === id ? { ...current, status } : current));
  };

  if (location.pathname === "/login") {
    return <AdminLogin state={apiState} onSubmit={(token) => { setAdminToken(token); setAdminTokenState(token); }} />;
  }

  const activeNav = NAV.find((n) => n.id === page);
  const title = editing ? `角色管理 · 编辑 ${editing.name}` : activeNav.label;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark"><Sparkle weight="fill" /></div>
          <div>
            <strong>Emora 运营后台</strong>
            <small>ADMIN CONSOLE</small>
          </div>
        </div>
        <nav className="admin-nav">
          {NAV.map((n) => (
            <button key={n.id} className={page === n.id ? "is-active" : ""} onClick={() => navTo(n.id)}>
              <n.icon weight={page === n.id ? "fill" : "regular"} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <h1>{title}</h1>
          <div className="admin-topbar-right">
            <div className="admin-user">
              <div className="admin-avatar"><UserCircle weight="fill" /></div>
              <div>
                <strong>管理员</strong>
                <small>已通过后台鉴权</small>
              </div>
            </div>
            <button className="btn sm ghost" onClick={() => { setAdminToken(""); setAdminTokenState(""); navigate("/login", { replace: true }); }}>退出</button>
          </div>
        </header>

        <main className="admin-content">
          {apiState !== "connected" ? (
            <ApiAccessGate />
          ) : <>
          {page === "dashboard" && <DashboardPage toast={toast} adminToken={adminToken} />}
          {page === "characters" && !editing && <CharacterListPage list={charList} onEdit={setEditing} onCreate={createCharacter} />}
          {page === "characters" && editing && (
            <CharacterEditorPage
              key={editing.id}
              character={editing}
              onBack={() => setEditing(null)}
              toast={toast}
              onStatusChange={updateCharacterStatus}
              adminToken={adminToken}
            />
          )}
          {page === "presets" && <PresetsPage toast={toast} adminToken={adminToken} />}
          {page === "models" && <ModelConfigPage toast={toast} adminToken={adminToken} />}
          {page === "users" && <UsersPage toast={toast} adminToken={adminToken} />}
          {page === "commerce" && <CommercePage toast={toast} adminToken={adminToken} />}
          {page === "analytics" && <AnalyticsPage toast={toast} adminToken={adminToken} />}
          {page === "settings" && <SettingsPage />}
          </>}
        </main>
      </div>

      {toastMsg && <div className="admin-toast">{toastMsg}</div>}
    </div>
  );
}
