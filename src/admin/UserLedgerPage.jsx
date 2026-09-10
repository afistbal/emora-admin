import { useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Form, Input, Pagination, Select, Space, Spin, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { adminApi } from "./api/client.js";
import "./user-ledger.css";

const EMPTY_FILTERS = { keyword: "", type: undefined };
const SOURCE_LABELS = {
  purchase: "购买入账",
  reward: "奖励",
  admin_adjustment: "后台补币",
  generation_charge: "生成扣费",
  asset_unlock: "资源解锁",
};

const show = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const formatDateTime = (timestamp) => timestamp ? dayjs.unix(Number(timestamp)).format("YYYY-MM-DD HH:mm:ss") : "—";

function UserIdentity({ item }) {
  const internalId = show(item.internal_user_id);
  return <div className="user-ledger-identity">
    <Typography.Text copyable={internalId !== "—" ? { text: internalId, tooltips: ["复制用户 ID", "已复制"] } : false}>ID：{internalId}</Typography.Text>
    <Typography.Text ellipsis={{ tooltip: show(item.user_uuid) }}>user_uuid：{show(item.user_uuid)}</Typography.Text>
    <strong>{show(item.nickname)}</strong>
    <Typography.Text type="secondary" ellipsis={{ tooltip: show(item.email) }}>{show(item.email)}</Typography.Text>
  </div>;
}

export default function UserLedgerPage({ adminToken }) {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    adminApi.users.walletFlows({ ...filters, page, page_size: pageSize }, { signal: controller.signal })
      .then((data) => { if (active) setResult(data); })
      .catch((requestError) => {
        if (active && requestError.name !== "AbortError") setError(requestError.message || "用户流水加载失败");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      controller.abort();
    };
  }, [adminToken, filters, page, pageSize, refreshVersion]);

  const applyFilters = () => {
    const keyword = draft.keyword.trim();
    setFilters({ ...(keyword ? { keyword } : {}), ...(draft.type ? { type: draft.type } : {}) });
    setPage(1);
  };
  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters({});
    setPage(1);
  };

  const columns = [
    { title: "流水 ID", dataIndex: "id", key: "id", width: 100, render: show },
    { title: "用户", key: "user", width: 250, render: (_, item) => <UserIdentity item={item} /> },
    { title: "业务类型", key: "source", width: 135, render: (_, item) => <Space direction="vertical" size={4}><Tag color={item.type === 1 ? "success" : "warning"}>{item.type === 1 ? "收入" : item.type === 2 ? "支出" : `未知 (${show(item.type)})`}</Tag><span>{SOURCE_LABELS[item.source_type] || show(item.source_type)}</span></Space> },
    { title: "变动", dataIndex: "change", key: "change", width: 110, align: "right", render: (value) => <Typography.Text strong type={Number(value) >= 0 ? "success" : "danger"}>{Number(value) > 0 ? "+" : ""}{Number(value || 0).toLocaleString()}</Typography.Text> },
    { title: "变动后余额", dataIndex: "balance_after", key: "balance_after", width: 125, align: "right", render: (value) => Number(value || 0).toLocaleString() },
    { title: "关联记录", dataIndex: "target", key: "target", width: 120, render: show },
    { title: "备注", key: "note", width: 240, render: (_, item) => <Typography.Text ellipsis={{ tooltip: item.note || item.title_key || item.source_type || "—" }}>{item.note || item.title_key || item.source_type || "—"}</Typography.Text> },
    { title: "发生时间", dataIndex: "occurred_at", key: "occurred_at", width: 180, render: formatDateTime },
  ];

  return <div className="section-gap user-ledger-page">
    <header className="user-ledger-heading">
      <div><h2>用户流水</h2><p>查看全部用户的金币收入、支出及变动后余额。</p></div>
      <Button loading={loading} onClick={() => setRefreshVersion((value) => value + 1)}>刷新</Button>
    </header>

    <Card>
      <Form className="user-ledger-filters" layout="inline" onFinish={applyFilters}>
        <Form.Item label="用户关键字"><Input allowClear maxLength={100} placeholder="ID / user_uuid / 邮箱 / 昵称" value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} /></Form.Item>
        <Form.Item label="流水方向"><Select allowClear placeholder="全部" value={draft.type} options={[{ value: 1, label: "收入" }, { value: 2, label: "支出" }]} onChange={(type) => setDraft((current) => ({ ...current, type }))} /></Form.Item>
        <Form.Item><Space><Button type="primary" htmlType="submit">查询</Button><Button onClick={resetFilters}>重置</Button></Space></Form.Item>
      </Form>
    </Card>

    <Card>
      {error && <Alert type="error" showIcon message="用户流水加载失败" description={error} action={<Button onClick={() => setRefreshVersion((value) => value + 1)}>重试</Button>} />}
      {!error && loading && <div className="empty-state"><Spin description="正在加载用户流水…" /></div>}
      {!error && !loading && !result?.items?.length && <Empty description="没有符合条件的用户流水" />}
      {!error && !loading && Boolean(result?.items?.length) && <Table rowKey="id" columns={columns} dataSource={result.items} pagination={false} scroll={{ x: 1260 }} />}
      {!error && Number(result?.total || 0) > 0 && <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total)} showSizeChanger pageSizeOptions={[10, 20, 50, 100]} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>}
    </Card>
  </div>;
}
