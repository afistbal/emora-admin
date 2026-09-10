import { useEffect, useState } from "react";
import { Alert, App as AntApp, Button, Card, Empty, Form, Input, Modal, Pagination, Select, Space, Spin, Switch, Table, Tag, Typography } from "antd";
import { adminApi } from "./api/client.js";
import "./settings.css";

const EMPTY_FILTERS = { keyword: "", status: undefined, is_public: undefined };
const VALUE_TYPE_OPTIONS = [
  { value: "string", label: "字符串" },
  { value: "integer", label: "整数" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "array", label: "数组" },
  { value: "object", label: "对象" },
];
const VALUE_TYPE_LABELS = Object.fromEntries(VALUE_TYPE_OPTIONS.map((item) => [item.value, item.label]));
const EMPTY_SETTING = { configKey: "", description: "", valueType: "string", valueText: "", isPublic: false, status: true };

function formatJson(value) {
  const formatted = JSON.stringify(value, null, 2);
  return formatted === undefined ? "null" : formatted;
}

function inferValueType(value) {
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function formatSettingEditorValue(value, valueType) {
  if (valueType === "object" && Array.isArray(value) && value.length === 0) return "{}";
  return valueType === "string" ? String(value ?? "") : formatJson(value);
}

function parseSettingEditorValue(valueText, valueType) {
  const trimmedValue = valueText.trim();
  if (valueType === "string") return valueText;
  if (valueType === "integer") {
    if (!/^-?\d+$/.test(trimmedValue) || !Number.isSafeInteger(Number(trimmedValue))) throw new Error("请输入有效的安全整数");
    return Number(trimmedValue);
  }
  if (valueType === "number") {
    const value = Number(trimmedValue);
    if (trimmedValue === "" || !Number.isFinite(value)) throw new Error("请输入有效数字");
    return value;
  }
  if (valueType === "boolean") {
    if (trimmedValue !== "true" && trimmedValue !== "false") throw new Error("布尔值只能填写 true 或 false");
    return trimmedValue === "true";
  }

  let value;
  try {
    value = JSON.parse(trimmedValue);
  } catch {
    throw new Error(`${VALUE_TYPE_LABELS[valueType]}格式不正确，请检查引号、逗号和括号`);
  }
  if (valueType === "array" && !Array.isArray(value)) throw new Error("配置值必须是 JSON 数组");
  if (valueType === "object" && (value === null || Array.isArray(value) || typeof value !== "object")) throw new Error("配置值必须是 JSON 对象");
  return value;
}

export default function SettingsPage({ adminToken }) {
  const { message } = AntApp.useApp();
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [savingId, setSavingId] = useState(null);
  const [savingField, setSavingField] = useState(null);
  const [creating, setCreating] = useState(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    adminApi.settings.list({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then((data) => { if (active) setResult(data); })
      .catch((requestError) => { if (active && requestError.name !== "AbortError") setError(requestError.message || "配置列表加载失败"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [adminToken, filters, page, pageSize, refresh]);

  const applyFilters = () => {
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== "" && value !== undefined)));
    setPage(1);
  };
  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters({});
    setPage(1);
  };
  const replaceItem = (updated) => setResult((current) => ({
    ...current,
    items: (current?.items || []).map((item) => item.id === updated.id ? updated : item),
  }));

  const toggleStatus = async (item, checked) => {
    setSavingId(item.id);
    setSavingField("status");
    try {
      const updated = await adminApi.settings.update({ id: item.id, value_type: item.value_type, value: item.value, is_public: Number(item.is_public) === 1 ? 1 : 0, status: checked ? 1 : 0, version: item.version });
      if (filters.status === undefined) replaceItem(updated);
      else {
        setPage(1);
        setRefresh((value) => value + 1);
      }
      message.success(`${item.config_key} 已${checked ? "启用" : "停用"}`);
    } catch (requestError) {
      message.error(requestError.message || "配置状态更新失败");
      if (requestError.status === 409) setRefresh((value) => value + 1);
    } finally {
      setSavingId(null);
      setSavingField(null);
    }
  };

  const togglePublic = async (item, checked) => {
    setSavingId(item.id);
    setSavingField("is_public");
    try {
      // 更新接口要求同时提交配置值、状态和版本；切换公开范围时保留其余业务字段不变。
      const updated = await adminApi.settings.update({
        id: item.id,
        value_type: item.value_type,
        value: item.value,
        is_public: checked ? 1 : 0,
        status: Number(item.status) === 1 ? 1 : 0,
        version: item.version,
      });
      if (filters.is_public === undefined) replaceItem(updated);
      else {
        setPage(1);
        setRefresh((value) => value + 1);
      }
      message.success(`${item.config_key} 已设为${checked ? "公开" : "内部"}配置`);
    } catch (requestError) {
      message.error(requestError.message || "公开范围更新失败");
      if (requestError.status === 409) setRefresh((value) => value + 1);
    } finally {
      setSavingId(null);
      setSavingField(null);
    }
  };

  const saveEditing = async () => {
    let value;
    try {
      value = parseSettingEditorValue(editing.valueText, editing.valueType);
    } catch (parseError) {
      message.error(parseError.message);
      return;
    }

    setSavingId(editing.id);
    setSavingField("edit");
    try {
      const updated = await adminApi.settings.update({
        id: editing.id,
        description: editing.description?.trim() || null,
        value_type: editing.valueType,
        value,
        is_public: editing.isPublic ? 1 : 0,
        status: editing.status ? 1 : 0,
        version: editing.version,
      });
      replaceItem(updated);
      setEditing(null);
      message.success("配置已保存");
    } catch (requestError) {
      message.error(requestError.message || "配置保存失败");
      if (requestError.status === 409) {
        setEditing(null);
        setRefresh((current) => current + 1);
      }
    } finally {
      setSavingId(null);
      setSavingField(null);
    }
  };

  const saveCreating = async () => {
    const configKey = creating.configKey.trim();
    if (!configKey) {
      message.error("请输入配置键");
      return;
    }

    let value;
    try {
      value = parseSettingEditorValue(creating.valueText, creating.valueType);
    } catch (parseError) {
      message.error(parseError.message);
      return;
    }

    setCreateSaving(true);
    try {
      const created = await adminApi.settings.create({
        config_key: configKey,
        description: creating.description.trim() || null,
        value_type: creating.valueType,
        value,
        is_public: creating.isPublic ? 1 : 0,
        status: creating.status ? 1 : 0,
      });
      setCreating(null);
      // 创建后按新键定位列表，避免当前筛选或分页让刚创建的配置不可见。
      const nextFilters = { keyword: created.config_key };
      setDraft({ keyword: created.config_key, status: undefined });
      setFilters(nextFilters);
      setPage(1);
      setRefresh((current) => current + 1);
      message.success("配置键已添加");
    } catch (requestError) {
      message.error(requestError.message || "配置添加失败");
    } finally {
      setCreateSaving(false);
    }
  };

  const columns = [
    { title: "配置键", dataIndex: "config_key", key: "config_key", width: 320, render: (value, item) => <div className="settings-key"><Typography.Text code copyable>{value}</Typography.Text><small>ID {item.id}</small></div> },
    { title: "配置说明", dataIndex: "description", key: "description", width: 260, render: (value) => value || "—" },
    { title: "配置值", dataIndex: "value", key: "value", render: (value, item) => <div className="settings-value"><Tag>{VALUE_TYPE_LABELS[item.value_type] || item.value_type || "未知"}</Tag><pre>{formatJson(value)}</pre></div> },
    { title: "公开范围", dataIndex: "is_public", key: "is_public", width: 110, render: (value, item) => <Switch checked={Number(value) === 1} loading={savingId === item.id && savingField === "is_public"} disabled={savingId !== null} checkedChildren="公开" unCheckedChildren="内部" aria-label={`${item.config_key} 公开范围`} onChange={(checked) => togglePublic(item, checked)} /> },
    { title: "状态", dataIndex: "status", key: "status", width: 110, render: (status, item) => <Switch checked={Number(status) === 1} loading={savingId === item.id && savingField === "status"} disabled={savingId !== null} checkedChildren="启用" unCheckedChildren="停用" onChange={(checked) => toggleStatus(item, checked)} /> },
    { title: "版本", dataIndex: "version", key: "version", width: 90, render: (value) => <Tag color="blue">v{value}</Tag> },
    { title: "最后更新", key: "updated", width: 190, render: (_, item) => <div className="settings-meta"><span>{item.updated_at || "—"}</span><small>操作人：{item.updated_by || "—"}</small></div> },
    { title: "操作", key: "action", width: 80, render: (_, item) => <Button type="link" disabled={savingId !== null} onClick={() => { const itemValueType = item.value_type || inferValueType(item.value); setEditing({ ...item, valueType: itemValueType, isPublic: Number(item.is_public) === 1, status: Number(item.status) === 1, valueText: formatSettingEditorValue(item.value, itemValueType) }); }}>编辑</Button> },
  ];

  return <div className="section-gap settings-page">
    <header className="settings-heading">
      <div><h2>系统设置</h2><p>管理 settings 表中的业务配置，配置键创建后保持只读。</p></div>
      <Space>
        <Button type="primary" onClick={() => setCreating(EMPTY_SETTING)}>+ 添加配置键</Button>
        <Button loading={loading} onClick={() => setRefresh((value) => value + 1)}>刷新</Button>
      </Space>
    </header>

    <Card>
      <Form className="settings-filters" layout="inline" onFinish={applyFilters}>
        <Form.Item label="配置键"><Input allowClear placeholder="输入配置键关键词" value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} /></Form.Item>
        <Form.Item label="状态"><Select allowClear placeholder="全部状态" value={draft.status} options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} onChange={(status) => setDraft((current) => ({ ...current, status }))} /></Form.Item>
        <Form.Item label="公开范围"><Select allowClear placeholder="全部范围" value={draft.is_public} options={[{ value: 1, label: "公开" }, { value: 0, label: "内部" }]} onChange={(isPublic) => setDraft((current) => ({ ...current, is_public: isPublic }))} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={resetFilters}>重置</Button></Space></Form.Item>
      </Form>
    </Card>

    <Card>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRefresh((value) => value + 1)}>重试</Button>} />}
      {!error && loading && <div className="empty-state"><Spin description="正在加载配置…" /></div>}
      {!error && !loading && !result?.items?.length && <Empty description="没有符合条件的配置" />}
      {!error && !loading && Boolean(result?.items?.length) && <Table rowKey="id" columns={columns} dataSource={result.items} pagination={false} scroll={{ x: 1460 }} />}
      {!error && Number(result?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
    </Card>

    <Modal open={Boolean(creating)} title="添加系统配置键" okText="添加" cancelText="取消" confirmLoading={createSaving} width={760} onOk={saveCreating} onCancel={() => setCreating(null)} destroyOnHidden>
      {creating && <Form layout="vertical">
        <Form.Item label="配置键" required extra="仅允许字母、数字、点、下划线和连字符，创建后不可修改。">
          <Input autoFocus maxLength={128} placeholder="例如：feature.example.enabled" value={creating.configKey} onChange={(event) => setCreating((current) => ({ ...current, configKey: event.target.value }))} />
        </Form.Item>
        <Form.Item label="配置说明" extra="可选，填写配置用途和影响范围，最多 500 个字符。">
          <Input.TextArea rows={3} maxLength={500} showCount value={creating.description} onChange={(event) => setCreating((current) => ({ ...current, description: event.target.value }))} />
        </Form.Item>
        <Form.Item label="配置值类型" required extra="类型会随配置一起保存，用于区分文本与数字、布尔值等数据。">
          <Select options={VALUE_TYPE_OPTIONS} value={creating.valueType} onChange={(valueType) => setCreating((current) => ({ ...current, valueType }))} />
        </Form.Item>
        <Form.Item label="配置值" required extra={creating.valueType === "string" ? "字符串按原文保存，不需要添加双引号。" : `请填写有效的${VALUE_TYPE_LABELS[creating.valueType]}值，不支持 null。`}>
          <Input.TextArea className="settings-editor" rows={14} value={creating.valueText} onChange={(event) => setCreating((current) => ({ ...current, valueText: event.target.value }))} />
        </Form.Item>
        <Form.Item label="公开配置" extra="打开后，启用状态下会通过无需登录的公共配置接口返回给客户端。">
          <Switch checked={creating.isPublic} checkedChildren="公开" unCheckedChildren="内部" onChange={(isPublic) => setCreating((current) => ({ ...current, isPublic }))} />
        </Form.Item>
        <Form.Item label="状态"><Switch checked={creating.status} checkedChildren="启用" unCheckedChildren="停用" onChange={(status) => setCreating((current) => ({ ...current, status }))} /></Form.Item>
        <Alert type="warning" showIcon message={creating.isPublic ? "该配置将对未登录客户端公开，请确认值中不含密钥、提示词或内部信息。" : "新增配置可能立即影响读取该配置键的业务，请确认键名和值的类型正确。"} />
      </Form>}
    </Modal>

    <Modal open={Boolean(editing)} title="编辑系统配置" okText="保存" cancelText="取消" confirmLoading={savingId === editing?.id} width={760} onOk={saveEditing} onCancel={() => setEditing(null)} destroyOnHidden>
      {editing && <Form layout="vertical">
        <Form.Item label="配置键"><Input value={editing.config_key} readOnly /></Form.Item>
        <Form.Item label="配置说明" extra="可选，填写配置用途和影响范围，最多 500 个字符。">
          <Input.TextArea rows={3} maxLength={500} showCount value={editing.description || ""} onChange={(event) => setEditing((current) => ({ ...current, description: event.target.value }))} />
        </Form.Item>
        <Form.Item label="配置值类型" required><Select options={VALUE_TYPE_OPTIONS} value={editing.valueType} onChange={(valueType) => setEditing((current) => ({ ...current, valueType }))} /></Form.Item>
        <Form.Item label="配置值" extra={editing.valueType === "string" ? "字符串按原文保存，不需要添加双引号。" : `请填写有效的${VALUE_TYPE_LABELS[editing.valueType]}值，不支持 null。`}><Input.TextArea className="settings-editor" rows={14} value={editing.valueText} onChange={(event) => setEditing((current) => ({ ...current, valueText: event.target.value }))} /></Form.Item>
        <Form.Item label="公开配置" extra="打开后，启用状态下会通过无需登录的公共配置接口返回给客户端。"><Switch checked={editing.isPublic} checkedChildren="公开" unCheckedChildren="内部" onChange={(isPublic) => setEditing((current) => ({ ...current, isPublic }))} /></Form.Item>
        <Form.Item label="状态"><Switch checked={editing.status} checkedChildren="启用" unCheckedChildren="停用" onChange={(status) => setEditing((current) => ({ ...current, status }))} /></Form.Item>
        <Alert type="warning" showIcon message={`保存后版本将从 v${editing.version} 更新为 v${editing.version + 1}`} description="停用后按各配置的业务规则处理；图片或视频金币价格停用会直接阻断对应生成。" />
      </Form>}
    </Modal>
  </div>;
}
