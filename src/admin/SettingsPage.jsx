import { useEffect, useState } from "react";
import { Alert, App as AntApp, Button, Card, Empty, Form, Input, Modal, Pagination, Select, Space, Spin, Switch, Table, Tag, Typography } from "antd";
import { adminApi } from "./api/client.js";
import "./settings.css";

const EMPTY_FILTERS = { keyword: "", status: undefined };

function formatJson(value) {
  const formatted = JSON.stringify(value, null, 2);
  return formatted === undefined ? "null" : formatted;
}

function valueType(value) {
  if (Array.isArray(value)) return "数组";
  if (value === null) return "空值";
  return { string: "字符串", number: "数字", boolean: "布尔值", object: "对象" }[typeof value] || typeof value;
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
    try {
      const updated = await adminApi.settings.update({ id: item.id, value: item.value, status: checked ? 1 : 0, version: item.version });
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
    }
  };

  const saveEditing = async () => {
    let value;
    try {
      value = JSON.parse(editing.valueText);
    } catch {
      message.error("配置值不是有效的 JSON，请检查引号、逗号和括号");
      return;
    }

    setSavingId(editing.id);
    try {
      const updated = await adminApi.settings.update({
        id: editing.id,
        value,
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
    }
  };

  const columns = [
    { title: "配置键", dataIndex: "config_key", key: "config_key", width: 320, render: (value, item) => <div className="settings-key"><Typography.Text code copyable>{value}</Typography.Text><small>ID {item.id}</small></div> },
    { title: "配置值", dataIndex: "value", key: "value", render: (value) => <div className="settings-value"><Tag>{valueType(value)}</Tag><pre>{formatJson(value)}</pre></div> },
    { title: "状态", dataIndex: "status", key: "status", width: 110, render: (status, item) => <Switch checked={Number(status) === 1} loading={savingId === item.id} checkedChildren="启用" unCheckedChildren="停用" onChange={(checked) => toggleStatus(item, checked)} /> },
    { title: "版本", dataIndex: "version", key: "version", width: 90, render: (value) => <Tag color="blue">v{value}</Tag> },
    { title: "最后更新", key: "updated", width: 190, render: (_, item) => <div className="settings-meta"><span>{item.updated_at || "—"}</span><small>操作人：{item.updated_by || "—"}</small></div> },
    { title: "操作", key: "action", width: 90, render: (_, item) => <Button type="link" onClick={() => setEditing({ ...item, status: Number(item.status) === 1, valueText: formatJson(item.value) })}>编辑</Button> },
  ];

  return <div className="section-gap settings-page">
    <header className="settings-heading">
      <div><h2>系统设置</h2><p>管理 settings 表中的现有业务配置，配置键保持只读。</p></div>
      <Button loading={loading} onClick={() => setRefresh((value) => value + 1)}>刷新</Button>
    </header>

    <Card>
      <Form className="settings-filters" layout="inline" onFinish={applyFilters}>
        <Form.Item label="配置键"><Input allowClear placeholder="输入配置键关键词" value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} /></Form.Item>
        <Form.Item label="状态"><Select allowClear placeholder="全部状态" value={draft.status} options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} onChange={(status) => setDraft((current) => ({ ...current, status }))} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={resetFilters}>重置</Button></Space></Form.Item>
      </Form>
    </Card>

    <Card>
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={() => setRefresh((value) => value + 1)}>重试</Button>} />}
      {!error && loading && <div className="empty-state"><Spin description="正在加载配置…" /></div>}
      {!error && !loading && !result?.items?.length && <Empty description="没有符合条件的配置" />}
      {!error && !loading && Boolean(result?.items?.length) && <Table rowKey="id" columns={columns} dataSource={result.items} pagination={false} scroll={{ x: 1100 }} />}
      {!error && Number(result?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
    </Card>

    <Modal open={Boolean(editing)} title="编辑系统配置" okText="保存" cancelText="取消" confirmLoading={savingId === editing?.id} width={760} onOk={saveEditing} onCancel={() => setEditing(null)} destroyOnHidden>
      {editing && <Form layout="vertical">
        <Form.Item label="配置键"><Input value={editing.config_key} readOnly /></Form.Item>
        <Form.Item label="配置值（JSON）" extra="字符串必须保留双引号；数字、布尔值、数组和对象请使用标准 JSON 格式。"><Input.TextArea className="settings-editor" rows={14} value={editing.valueText} onChange={(event) => setEditing((current) => ({ ...current, valueText: event.target.value }))} /></Form.Item>
        <Form.Item label="状态"><Switch checked={editing.status} checkedChildren="启用" unCheckedChildren="停用" onChange={(status) => setEditing((current) => ({ ...current, status }))} /></Form.Item>
        <Alert type="warning" showIcon message={`保存后版本将从 v${editing.version} 更新为 v${editing.version + 1}`} description="停用配置后，业务代码会使用该配置对应的默认值或降级行为。" />
      </Form>}
    </Modal>
  </div>;
}
