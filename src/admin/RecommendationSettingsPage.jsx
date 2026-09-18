import { useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker, Empty, InputNumber, Modal, Pagination, Select, Space, Spin, Switch, Table, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { adminApi, getApiErrorMessage } from "./api/client.js";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "./pagination.js";

const POOL_OPTIONS = [
  { value: "new", label: "全新池", position: "左上" },
  { value: "recommended", label: "推荐池（人工）", position: "右上" },
  { value: "recent", label: "近期池", position: "左下" },
  { value: "regular", label: "常规池", position: "右下" },
];

const POOL_RULES = {
  recommended: "人工开启推荐、角色已上架且有发布版本，并处于生效时间内；按排序值从小到大取数。",
  new: "角色已上架且有发布版本，首次上架时间在最近 3 天内；按首次上架时间从新到旧取数。",
  recent: "角色已上架且有发布版本，首次上架时间超过 3 天且不超过 30 天；按首次上架时间从新到旧取数。",
  regular: "角色已上架且有发布版本，首次上架超过 30 天或历史发布时间缺失；按发布时间和角色 ID 倒序取数。",
};

const RULE_STATUS = {
  next_round: { color: "processing", label: "下一轮" },
  standby: { color: "default", label: "候选" },
  disabled: { color: "default", label: "已停用" },
  scheduled: { color: "warning", label: "待生效" },
  expired: { color: "error", label: "已过期" },
  unavailable: { color: "error", label: "不可用" },
};

const DEFAULT_SLOTS = Array.from({ length: 10 }, (_, index) => ({
  position: index + 1,
  pool: "regular",
}));

const createPoolPagination = () => Object.fromEntries(
  POOL_OPTIONS.map(({ value }) => [value, { page: 1, pageSize: DEFAULT_PAGE_SIZE }]),
);

export default function RecommendationSettingsPage({ toast }) {
  const [result, setResult] = useState(null);
  const [slots, setSlots] = useState(DEFAULT_SLOTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingSlots, setSavingSlots] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [poolResults, setPoolResults] = useState({});
  const [poolPagination, setPoolPagination] = useState(createPoolPagination);
  const [poolLoading, setPoolLoading] = useState({});
  const [poolError, setPoolError] = useState("");

  const loadConfig = (signal) => {
    setLoading(true);
    setError("");
    return adminApi.homeRecommendation.config(
      { pool: "recommended", pool_page: 1, pool_page_size: DEFAULT_PAGE_SIZE },
      { signal },
    ).then((data) => {
      setResult(data);
      setSlots(Array.isArray(data?.slots) && data.slots.length === 10 ? data.slots : DEFAULT_SLOTS);
    }).catch((requestError) => {
      if (requestError.name !== "AbortError") setError(getApiErrorMessage(requestError, "推荐配置加载失败"));
    }).finally(() => setLoading(false));
  };

  const loadPool = async (pool, pagination, signal) => {
    setPoolLoading((current) => ({ ...current, [pool]: true }));
    try {
      const data = await adminApi.homeRecommendation.config({
        pool,
        pool_page: pagination.page,
        pool_page_size: pagination.pageSize,
        include_preview: false,
      }, { signal });
      setPoolResults((current) => ({ ...current, [pool]: data }));
      return data;
    } finally {
      setPoolLoading((current) => ({ ...current, [pool]: false }));
    }
  };

  const loadAllPools = async (signal) => {
    setPoolError("");
    try {
      await Promise.all(POOL_OPTIONS.map(({ value }) => loadPool(value, poolPagination[value], signal)));
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setPoolError(getApiErrorMessage(requestError, "四个推荐池加载失败"));
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadConfig(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadAllPools(controller.signal);
    return () => controller.abort();
  }, []);

  const updateSlot = (position, patch) => {
    setSlots((current) => current.map((slot) => (slot.position === position ? { ...slot, ...patch } : slot)));
  };

  const moveSlot = (position, direction) => {
    const targetPosition = position + direction;
    if (targetPosition < 1 || targetPosition > 10) return;
    setSlots((current) => {
      const source = current.find((slot) => slot.position === position);
      const target = current.find((slot) => slot.position === targetPosition);
      return current.map((slot) => {
        if (slot.position === position) return { ...slot, pool: target.pool };
        if (slot.position === targetPosition) return { ...slot, pool: source.pool };
        return slot;
      });
    });
  };

  const saveSlots = async () => {
    setSavingSlots(true);
    try {
      // 排序弹窗只维护推荐位和来源池，旧版 remark 字段由后端继续兼容但不再从页面提交。
      const normalizedSlots = slots.map(({ position, pool }) => ({ position, pool }));
      const data = await adminApi.homeRecommendation.saveSlots({ version: Number(result?.version || 0), slots: normalizedSlots });
      setResult(data);
      setSlots(data.slots);
      await loadAllPools();
      setIsSlotModalOpen(false);
      toast("推荐位配置已保存", "success");
    } catch (requestError) {
      toast(getApiErrorMessage(requestError, "推荐位配置保存失败"), "error");
    } finally {
      setSavingSlots(false);
    }
  };

  const updatePoolItem = (pool, id, patch) => {
    setPoolResults((current) => ({
      ...current,
      [pool]: {
        ...current[pool],
        pool_items: (current[pool]?.pool_items || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
      },
    }));
  };

  const savePoolItem = async (pool, item) => {
    setSavingItemId(item.id);
    try {
      const data = await adminApi.homeRecommendation.savePoolItem({
        id: item.id,
        sort_order: Number(item.sort_order || 0),
        enabled: Boolean(item.enabled),
        start_at: item.start_at || null,
        end_at: item.end_at || null,
      });
      setResult((current) => ({
        ...current,
        next_round_slots: data.next_round_slots,
        next_round_scope: data.next_round_scope,
      }));
      await loadAllPools();
      toast(`角色「${item.name}」的推荐配置已保存`, "success");
    } catch (requestError) {
      toast(getApiErrorMessage(requestError, "推荐角色保存失败"), "error");
    } finally {
      setSavingItemId(null);
    }
  };

  const changePoolPage = async (pool, page, pageSize) => {
    const current = poolPagination[pool];
    const nextPagination = { page: pageSize !== current.pageSize ? 1 : page, pageSize };
    setPoolPagination((all) => ({ ...all, [pool]: nextPagination }));
    setPoolError("");
    try {
      await loadPool(pool, nextPagination);
    } catch (requestError) {
      setPoolError(getApiErrorMessage(requestError, `${POOL_OPTIONS.find((item) => item.value === pool)?.label}加载失败`));
    }
  };

  const nextRoundSlots = result?.next_round_slots || [];

  const openSlotModal = () => {
    setSlots(Array.isArray(result?.slots) ? result.slots : DEFAULT_SLOTS);
    setIsSlotModalOpen(true);
  };

  const closeSlotModal = () => {
    setSlots(Array.isArray(result?.slots) ? result.slots : DEFAULT_SLOTS);
    setIsSlotModalOpen(false);
  };

  const getNextRoundPositions = (pool, characterId) => nextRoundSlots
    .filter((slot) => slot.pool === pool && Number(slot.char_id) === Number(characterId))
    .map((slot) => slot.position);

  const commonColumns = (pool) => [
    {
      title: "角色",
      key: "character",
      width: 190,
      render: (_, item) => {
        const nextPositions = getNextRoundPositions(pool, item.char_id);
        return (
          <div>
            <Space wrap size={4}>
              <Typography.Text strong>{item.name}</Typography.Text>
              {nextPositions.length > 0 && <Tag color="processing">下一轮</Tag>}
            </Space>
            {item.char_code !== item.name && <div><Typography.Text type="secondary">{item.char_code}</Typography.Text></div>}
          </div>
        );
      },
    },
    {
      title: "规则判定",
      key: "rule",
      width: 210,
      render: (_, item) => {
        const nextPositions = getNextRoundPositions(pool, item.char_id);
        const status = nextPositions.length > 0 ? RULE_STATUS.next_round : (RULE_STATUS[item.rule_status] || RULE_STATUS.standby);
        const reason = nextPositions.length > 0 ? `第 ${nextPositions.join("、")} 位` : item.rule_reason;
        return (
          <div>
            <div className="recommendation-rule-summary">
              <Tag color={status.color}>{status.label}</Tag>
              {nextPositions.length > 0 && <Typography.Text>{reason}</Typography.Text>}
            </div>
            {nextPositions.length === 0 && <Tooltip title={reason}><div className="recommendation-rule-reason">{item.rule_status === "standby" ? "符合规则，等待推荐" : (reason || "—")}</div></Tooltip>}
          </div>
        );
      },
    },
    ...(pool === "recommended" ? [
      { title: "开关", dataIndex: "enabled", width: 76, render: (value, item) => <Switch checked={value} onChange={(enabled) => updatePoolItem(pool, item.id, { enabled })} /> },
      { title: "排序", dataIndex: "sort_order", width: 110, render: (value, item) => <InputNumber min={0} max={1000000} value={value} onChange={(sortOrder) => updatePoolItem(pool, item.id, { sort_order: sortOrder ?? 0 })} /> },
      { title: "生效时间", key: "range", width: 370, render: (_, item) => <DatePicker.RangePicker showTime allowEmpty={[true, true]} value={[item.start_at ? dayjs(item.start_at) : null, item.end_at ? dayjs(item.end_at) : null]} onChange={(dates) => updatePoolItem(pool, item.id, { start_at: dates?.[0]?.toISOString() || null, end_at: dates?.[1]?.toISOString() || null })} /> },
      { title: "操作", key: "action", width: 70, render: (_, item) => <Button type="link" loading={savingItemId === item.id} disabled={savingItemId !== null} onClick={() => savePoolItem(pool, item)}>保存</Button> },
    ] : [
      { title: "首次上架时间", dataIndex: "first_published_at", width: 180, render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "—") },
    ]),
  ];

  if (loading) return <div className="ant-loading-state"><Spin size="large" /><span>正在加载推荐配置…</span></div>;
  if (error) return <Alert type="error" showIcon message="推荐配置加载失败" description={error} action={<Button onClick={() => loadConfig()}>重新加载</Button>} />;

  return (
    <div className="recommendation-page">
      <div className="recommendation-page-header">
        <div>
          <Typography.Title className="admin-page-title" level={3}>4 个推荐池数据</Typography.Title>
          <Typography.Text type="secondary">四池同屏展示，标记下一轮推荐位置。</Typography.Text>
        </div>
        <Button type="primary" onClick={openSlotModal}>推荐排序配置</Button>
      </div>

      <div className="recommendation-next-round-strip">
        <Typography.Text strong>下一轮 1-10 位：</Typography.Text>
        <Space wrap size={[4, 4]}>
          {nextRoundSlots.length > 0 ? nextRoundSlots.map((slot) => (
            <Tooltip key={slot.position} title={slot.reason || undefined}>
              <Tag color={slot.char_id ? "processing" : "error"}>
                {slot.position}. {slot.name || "暂无候选"}（{POOL_OPTIONS.find((item) => item.value === slot.pool)?.label || slot.pool}）
              </Tag>
            </Tooltip>
          )) : <Typography.Text type="secondary">接口暂未返回下一轮预览</Typography.Text>}
        </Space>
      </div>
      {poolError && <Alert className="recommendation-pool-error" type="error" showIcon message={poolError} action={<Button onClick={() => loadAllPools()}>重新加载四池</Button>} />}
      <div className="recommendation-pool-grid">
        {POOL_OPTIONS.map(({ value, label, position }) => {
          const poolResult = poolResults[value];
          const pagination = poolPagination[value];
          const nextCount = nextRoundSlots.filter((slot) => slot.pool === value).length;
          return (
            <Card
              size="small"
              key={value}
              title={<Space wrap><span>{label}</span><Tag>{position}</Tag><Tag color="processing">下一轮需 {nextCount} 个</Tag></Space>}
              extra={<Typography.Text type="secondary">共 {Number(poolResult?.pool_total || 0)} 个</Typography.Text>}
            >
              <Typography.Paragraph type="secondary" className="recommendation-pool-rule">规则：{POOL_RULES[value]}</Typography.Paragraph>
              <div className="table-wrap">
                <Table
                  size="middle"
                  rowKey={(item) => `${value}-${item.char_id}`}
                  pagination={false}
                  loading={{ spinning: Boolean(poolLoading[value]), tip: "正在加载池子数据…" }}
                  dataSource={poolResult?.pool_items || []}
                  locale={{ emptyText: <Empty description={`${label}暂无角色`} /> }}
                  columns={commonColumns(value)}
                />
              </div>
              {Number(poolResult?.pool_total || 0) > 0 && (
                <div className="admin-pagination recommendation-pool-pagination">
                  <Pagination
                    current={pagination.page}
                    pageSize={pagination.pageSize}
                    total={Number(poolResult.pool_total)}
                    showSizeChanger
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    showTotal={(total) => `共 ${total} 条`}
                    onChange={(page, pageSize) => changePoolPage(value, page, pageSize)}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        title="推荐排序配置"
        open={isSlotModalOpen}
        width="min(900px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto" } }}
        footer={(
          <Space>
            <Button disabled={savingSlots} onClick={closeSlotModal}>取消</Button>
            <Button type="primary" loading={savingSlots} onClick={saveSlots}>保存配置</Button>
          </Space>
        )}
        onCancel={closeSlotModal}
        maskClosable={!savingSlots}
        closable={!savingSlots}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          定义首页卡片位置 1-10 的固定展示来源，并通过上移、下移调整位置顺序。
        </Typography.Paragraph>
        <Table
          className="recommendation-slot-modal-table"
          rowKey="position"
          pagination={false}
          dataSource={slots}
          columns={[
            { title: "位置", dataIndex: "position", width: 80, render: (value) => <Tag>{value}</Tag> },
            { title: "内容来源", dataIndex: "pool", render: (value, slot) => <Select value={value} options={POOL_OPTIONS} style={{ width: "100%" }} onChange={(pool) => updateSlot(slot.position, { pool })} /> },
            { title: "调整", key: "move", width: 150, render: (_, slot) => <Space size={0} wrap><Button type="link" disabled={slot.position === 1} onClick={() => moveSlot(slot.position, -1)}>上移</Button><Button type="link" disabled={slot.position === 10} onClick={() => moveSlot(slot.position, 1)}>下移</Button></Space> },
          ]}
        />
      </Modal>
    </div>
  );
}
