# 角色标签分类管理

所有接口均为 `POST /api/admin/character-tags/*`，需要管理员 Bearer Token，响应沿用 `{ c, m, d }`。

角色版本的 `data.tags` 仍是 C 端角色内容事实源；`character_tags` 保存标签主数据，`character_tag_classes` 保存自定义 Class，`character_version_tags` 负责版本引用和发现页查询。新增的未知角色标签自动进入系统 Class“未分类”。

## 查询总览

`POST /admin/character-tags/overview`

返回 `classes`（含 `tag_count`、`character_count`）及 `summary.class_count/tag_count/used_tag_count/unclassified_count`。

## 分页查询 Tags

`POST /admin/character-tags/list`

请求字段：`class_id?`、`keyword?`、`page?`、`page_size?`。返回 `items/page/page_size/total`；每项包含 Class、说明、排序、角色使用数和版本引用数。

## Class CRUD

- `POST /admin/character-tags/classes/create`
- `POST /admin/character-tags/classes/update`
- `POST /admin/character-tags/classes/delete`

新增和修改字段：`name`、`description?`、`sort_order?`。修改和删除需传 `id`。系统“未分类”不能删除；非空 Class 必须先移动或删除其 Tags。

## Tag CRUD

- `POST /admin/character-tags/create`
- `POST /admin/character-tags/update`
- `POST /admin/character-tags/delete`

新增字段：`class_id`、`name`、`description?`、`sort_order?`。修改需传 `id` 和至少一个可编辑字段。

Tag 名称全局唯一，比较时忽略首尾空白、连续空白和大小写。重命名会在同一事务中同步 `char_versions.data.tags`、版本 Hash 与 `character_version_tags`；删除会从全部角色版本中移除该 Tag。成功提交后清理 Hot Tags 和受影响角色资料缓存。

快速归类使用 `POST /admin/character-tags/batch/class`，请求 `{ "tag_ids": [1, 2], "class_id": 3 }`，单次最多移动 500 个 Tags。该操作只改变 Class，不修改角色版本中的标签文字。

## AI 一键整理

- `POST /admin/character-tags/organize/export`：导出当前 Class/Tags 和 `schema_version=1`。
- `POST /admin/character-tags/organize/preview`：上传 `{ organization: 导出或 AI 整理后的对象 }`，仅校验和统计，不写库。
- `POST /admin/character-tags/organize/apply`：人工确认后应用同一对象。

上传结构：

```json
{
  "organization": {
    "schema_version": 1,
    "classes": [
      {
        "id": 2,
        "name": "人物身份",
        "description": "角色的职业与社会身份",
        "sort_order": 10,
        "tags": [
          {
            "id": 18,
            "name": "Teacher",
            "description": "教师身份",
            "sort_order": 1
          }
        ]
      }
    ]
  }
}
```

保留已有 `id` 可精确更新。没有 `id` 的 Class/Tag 按标准化名称匹配，未匹配时创建。文件中遗漏的已有 Tag 保持原状，不做隐式删除；删除必须使用明确的删除接口。

## 发布顺序

先执行 `database/sql/2026_09_18_create_character_tag_management.sql`，确认 `missing_catalog_tag=0`，再发布后端代码和管理后台。回滚 SQL 为 `database/sql/2026_09_18_rollback_character_tag_management.sql`。
