import { useEffect, useState } from "react";
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import { adminApi, getApiErrorMessage } from "./api/client.js";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "./pagination.js";

export default function CharacterTagsPage() {
  const { message, modal } = App.useApp();
  const [overview, setOverview] = useState(null);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [classEditor, setClassEditor] = useState(null);
  const [tagEditor, setTagEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [organizationPreview, setOrganizationPreview] = useState(null);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [batchClassOpen, setBatchClassOpen] = useState(false);
  const [batchClassId, setBatchClassId] = useState(null);
  const [classForm] = Form.useForm();
  const [tagForm] = Form.useForm();

  const classes = overview?.classes || [];
  const selectedClass = classes.find((item) => item.id === selectedClassId) || null;

  const loadOverview = async (signal) => {
    const data = await adminApi.characterTags.overview({}, { signal });
    setOverview(data);
  };

  const loadTags = async (signal) => {
    const data = await adminApi.characterTags.list({
      ...(selectedClassId ? { class_id: selectedClassId } : {}),
      page,
      page_size: pageSize,
    }, { signal });
    setResult(data || { items: [], total: 0 });
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([loadOverview(controller.signal), loadTags(controller.signal)])
      .catch((requestError) => {
        if (requestError?.name !== "AbortError") setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedClassId, page, pageSize]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadOverview(), loadTags()]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const openClassEditor = (item = null) => {
    setClassEditor(item || {});
    classForm.setFieldsValue({
      name: item?.name || "",
      description: item?.description || "",
      sort_order: item?.sort_order ?? 0,
    });
  };

  const saveClass = async () => {
    const values = await classForm.validateFields();
    setSaving(true);
    try {
      if (classEditor?.id) await adminApi.characterTags.updateClass({ id: classEditor.id, ...values });
      else await adminApi.characterTags.createClass(values);
      message.success(classEditor?.id ? "分类已更新" : "分类已创建");
      setClassEditor(null);
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteClass = async (item) => {
    try {
      await adminApi.characterTags.deleteClass({ id: item.id });
      if (selectedClassId === item.id) setSelectedClassId(null);
      message.success("分类已删除");
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    }
  };

  const openTagEditor = (item = null) => {
    setTagEditor(item || {});
    tagForm.setFieldsValue({
      class_id: item?.class_id || selectedClassId || classes[0]?.id,
      name: item?.name || "",
      description: item?.description || "",
      sort_order: item?.sort_order ?? 0,
    });
  };

  const saveTag = async () => {
    const values = await tagForm.validateFields();
    setSaving(true);
    try {
      if (tagEditor?.id) await adminApi.characterTags.update({ id: tagEditor.id, ...values });
      else await adminApi.characterTags.create(values);
      message.success(tagEditor?.id ? "标签已更新，相关角色数据已同步" : "标签已创建");
      setTagEditor(null);
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async (item) => {
    try {
      await adminApi.characterTags.remove({ id: item.id });
      setSelectedTagIds((ids) => ids.filter((id) => id !== item.id));
      message.success("标签及角色版本中的对应值已删除");
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    }
  };

  const confirmDeleteTag = (item) => {
    modal.confirm({
      title: `删除标签「${item.name}」`,
      content: "删除后会同时从所有角色版本中移除该标签，操作不可恢复。",
      okText: "确认删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => deleteTag(item),
    });
  };

  const toggleTagSelection = (tagId, checked) => {
    setSelectedTagIds((ids) => checked
      ? Array.from(new Set([...ids, tagId]))
      : ids.filter((id) => id !== tagId));
  };

  const moveSelectedTags = async () => {
    if (!batchClassId || selectedTagIds.length === 0) return;
    setSaving(true);
    try {
      await adminApi.characterTags.moveClass({ tag_ids: selectedTagIds, class_id: batchClassId });
      message.success(`已移动 ${selectedTagIds.length} 个标签`);
      setSelectedTagIds([]);
      setBatchClassOpen(false);
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const downloadForAi = async () => {
    try {
      const data = await adminApi.characterTags.exportOrganization();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `character-tags-for-ai-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      message.success("已导出标签整理文件");
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    }
  };

  const readOrganizationFile = async (file) => {
    setOrganizationLoading(true);
    setOrganizationPreview(null);
    try {
      const parsed = JSON.parse(await file.text());
      const preview = await adminApi.characterTags.previewOrganization({ organization: parsed });
      setOrganization(parsed);
      setOrganizationPreview(preview);
      message.success("AI 整理结果校验通过，请确认后应用");
    } catch (requestError) {
      setOrganization(null);
      message.error(requestError instanceof SyntaxError ? "JSON 文件格式错误" : getApiErrorMessage(requestError));
    } finally {
      setOrganizationLoading(false);
    }
    return false;
  };

  const applyOrganization = async () => {
    if (!organization) return;
    setOrganizationLoading(true);
    try {
      await adminApi.characterTags.applyOrganization({ organization });
      message.success("AI 标签整理结果已应用");
      setOrganizerOpen(false);
      setOrganization(null);
      setOrganizationPreview(null);
      setPage(1);
      await refresh();
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError));
    } finally {
      setOrganizationLoading(false);
    }
  };

  const tagColors = ["blue", "cyan", "geekblue", "purple", "magenta", "gold", "lime", "green", "volcano"];

  return (
    <div className="character-tags-page">
      <header className="character-tags-header">
        <div className="character-tags-heading">
          <Typography.Title level={3}>角色标签管理</Typography.Title>
          <Typography.Text type="secondary">所有 Tags 都归属于 Class；标签改名或删除会同步角色版本与发现页索引。</Typography.Text>
        </div>
        <Space wrap>
          <Button onClick={refresh} loading={loading}>刷新</Button>
          <Button onClick={() => { setOrganizerOpen(true); setOrganization(null); setOrganizationPreview(null); }}>一键整理 Tags（AI）</Button>
        </Space>
      </header>

      {error && <Alert type="error" showIcon message="标签数据加载失败" description={error} action={<Button onClick={refresh}>重试</Button>} />}

      <div className="character-tags-layout">
        <Card
          className="character-tag-classes"
          title="Class 分组"
          extra={<Button type="link" onClick={() => openClassEditor()}>新增</Button>}
        >
          <Button type="text" className={`character-tag-class-item character-tag-class-all ${selectedClassId === null ? "is-active" : ""}`} onClick={() => { setSelectedClassId(null); setPage(1); }}>
            <span>全部标签</span><b>{overview?.summary?.tag_count || 0}</b>
          </Button>
          {classes.map((item) => (
            <div key={item.id} className={`character-tag-class-item ${selectedClassId === item.id ? "is-active" : ""}`}>
              <Button type="text" onClick={() => { setSelectedClassId(item.id); setPage(1); }}>
                <span>{item.name}</span><b>{item.tag_count}</b>
              </Button>
              <Space size={0}>
                <Button type="text" onClick={() => openClassEditor(item)}>编辑</Button>
                {!item.is_system && (
                  <Popconfirm title="删除空分类" description="分类下存在标签时不可删除。" onConfirm={() => deleteClass(item)}>
                    <Button type="text" danger>删除</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          ))}
        </Card>

        <Card
          className="character-tags-table-card"
          title={(
            <Breadcrumb
              items={[
                {
                  title: <Typography.Link onClick={() => { setSelectedClassId(null); setPage(1); }}>全部 Tags</Typography.Link>,
                },
                ...(selectedClass ? [{ title: selectedClass.name }] : []),
              ]}
            />
          )}
          extra={<Button disabled={selectedTagIds.length === 0} onClick={() => { setBatchClassId(selectedClassId || classes[0]?.id || null); setBatchClassOpen(true); }}>批量移动 Class（{selectedTagIds.length}）</Button>}
        >
          {loading ? <div className="ant-loading-state"><Spin size="large" /><span>正在加载标签…</span></div> : result.items.length ? (
            <>
              <div className="character-tag-cloud" aria-label="Tags">
                {result.items.map((item) => {
                  const isSelected = selectedTagIds.includes(item.id);
                  const tooltip = (
                    <div className="character-tag-tooltip">
                      <b>{item.name}</b>
                      <span>Class：{item.class_name || "—"}</span>
                      <span>说明：{item.description || "—"}</span>
                      <span>使用角色：{item.character_count} · 版本引用：{item.version_count}</span>
                      <span>点击标签编辑，勾选后可批量移动。</span>
                    </div>
                  );
                  return (
                    <Tooltip key={item.id} title={tooltip} placement="top">
                      <Tag
                        className={`character-tag-pill ${isSelected ? "is-selected" : ""}`}
                        color={tagColors[Math.abs(Number(item.class_id || 0)) % tagColors.length]}
                        closable
                        icon={<Checkbox checked={isSelected} onClick={(event) => event.stopPropagation()} onChange={(event) => toggleTagSelection(item.id, event.target.checked)} />}
                        onClick={() => openTagEditor(item)}
                        onClose={(event) => { event.preventDefault(); event.stopPropagation(); confirmDeleteTag(item); }}
                      >
                        <span>{item.name}</span>
                        {Number(item.character_count || 0) > 0 && <small>{item.character_count}</small>}
                      </Tag>
                    </Tooltip>
                  );
                })}
                <Button type="dashed" className="character-tag-add" onClick={() => openTagEditor()}>＋ 新增 Tag</Button>
              </div>
              <div className="admin-pagination"><Pagination current={page} pageSize={pageSize} total={Number(result.total || 0)} showSizeChanger pageSizeOptions={PAGE_SIZE_OPTIONS} showTotal={(total) => `共 ${total} 条`} onChange={(nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPageSize !== pageSize ? 1 : nextPage); }} /></div>
            </>
          ) : (
            <div className="character-tag-empty">
              <Empty description="当前筛选下没有标签" />
              <Button type="dashed" onClick={() => openTagEditor()}>＋ 新增 Tag</Button>
            </div>
          )}
        </Card>
      </div>

      <Modal title={classEditor?.id ? "编辑 Class" : "新增 Class"} open={classEditor !== null} onCancel={() => setClassEditor(null)} onOk={saveClass} confirmLoading={saving} destroyOnHidden>
        <Form form={classForm} layout="vertical">
          <Form.Item label="Class 名称" name="name" rules={[{ required: true, message: "请输入 Class 名称" }, { max: 100 }]}><Input /></Form.Item>
          <Form.Item label="说明" name="description" rules={[{ max: 500 }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
          <Form.Item label="排序" name="sort_order"><InputNumber min={0} precision={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={tagEditor?.id ? "编辑 Tag" : "新增 Tag"} open={tagEditor !== null} onCancel={() => setTagEditor(null)} onOk={saveTag} confirmLoading={saving} destroyOnHidden>
        <Form form={tagForm} layout="vertical">
          <Form.Item label="所属 Class" name="class_id" rules={[{ required: true, message: "请选择 Class" }]}>
            <Select options={classes.map((item) => ({ value: item.id, label: item.name }))} />
          </Form.Item>
          <Form.Item label="Tag 名称" name="name" rules={[{ required: true, message: "请输入 Tag 名称" }, { max: 100 }]}><Input /></Form.Item>
          <Form.Item label="说明" name="description" rules={[{ max: 500 }]}><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
          <Form.Item label="排序" name="sort_order"><InputNumber min={0} precision={0} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="一键整理 Tags（AI）"
        open={organizerOpen}
        onCancel={() => setOrganizerOpen(false)}
        okText="确认应用"
        okButtonProps={{ disabled: !organizationPreview }}
        confirmLoading={organizationLoading}
        onOk={applyOrganization}
        width={720}
      >
        <Alert type="info" showIcon message="AI 只生成整理文件，不直接操作数据库" description="先导出当前 Class/Tags JSON，交给 AI 调整分组和说明，再上传结果。服务端会预检重复项和不存在的 ID；文件中遗漏的标签保持原状，不会被自动删除。" />
        <Space className="character-tags-ai-actions" wrap>
          <Button onClick={downloadForAi}>1. 导出给 AI</Button>
          <Typography.Text type="secondary">2. AI 整理 JSON</Typography.Text>
          <Typography.Text type="secondary">3. 上传并确认</Typography.Text>
        </Space>
        <Upload.Dragger accept="application/json,.json" maxCount={1} showUploadList beforeUpload={readOrganizationFile} disabled={organizationLoading}>
          <p className="ant-upload-drag-icon">JSON</p>
          <p className="ant-upload-text">点击或拖入 AI 整理后的 JSON</p>
          <p className="ant-upload-hint">上传只进行预检，点击“确认应用”后才会写入。</p>
        </Upload.Dragger>
        {organizationPreview && (
          <Alert
            className="character-tags-ai-preview"
            type="success"
            showIcon
            message="整理结果校验通过"
            description={`包含 ${organizationPreview.class_count} 个 Class、${organizationPreview.tag_count} 个 Tag；新增 ${organizationPreview.new_tag_count} 个，文件未涉及 ${organizationPreview.untouched_tag_count} 个现有 Tag。`}
          />
        )}
      </Modal>

      <Modal title="批量移动到 Class" open={batchClassOpen} onCancel={() => setBatchClassOpen(false)} onOk={moveSelectedTags} confirmLoading={saving} okButtonProps={{ disabled: !batchClassId }}>
        <Typography.Paragraph type="secondary">已选择 {selectedTagIds.length} 个标签。只调整分类，不修改角色版本中的标签内容。</Typography.Paragraph>
        <Select value={batchClassId} onChange={setBatchClassId} style={{ width: "100%" }} options={classes.map((item) => ({ value: item.id, label: `${item.name}（${item.tag_count}）` }))} />
      </Modal>
    </div>
  );
}
