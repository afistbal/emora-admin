# 后台设置接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页当前登记 5 个接口；全部使用 JSON POST。

## 查询系统配置列表

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/list`
- **说明**：分页查询 `settings` 表中的现有记录。配置键创建后只读，页面不会删除业务配置。

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| keyword | 否 | string | 按 `config_key` 或 `description` 模糊筛选，最长 128 个字符。 |
| status | 否 | integer | `1` 启用，`0` 停用。 |
| page | 否 | integer | 页码，默认 1。 |
| page_size | 否 | integer | 每页数量，默认 10，范围 1–100。 |

响应 `d` 包含 `items`、`page`、`page_size`、`total`。每条记录包含 `id`、`config_key`、可空的 `description`、`value_type`、`value`、`status`、`version`、创建/更新人和创建/更新时间。`value_type` 取值为 `string`、`integer`、`number`、`boolean`、`array` 或 `object`。

## 添加系统配置键

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/create`
- **说明**：创建新的唯一配置键，初始版本为 1。配置键创建后不可修改；数据库唯一索引保证并发请求不会创建重复键，重复时返回 HTTP 409。

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| config_key | 是 | string | 最长 128 个字符，仅允许字母、数字、点、下划线和连字符，首字符必须是字母或数字。 |
| description | 否 | string/null | 配置用途和影响范围说明，最长 500 个字符；空字符串按 null 保存。 |
| value_type | 否 | string | 配置值类型：`string`、`integer`、`number`、`boolean`、`array` 或 `object`。新版后台必传；旧调用方不传时由后端按实际值推断。 |
| value | 是 | JSON | 字符串、数字、布尔值、数组或对象；不能为 JSON null，编码后最大 1 MB。 |
| status | 是 | integer | `1` 启用，`0` 停用。 |

后台页面先选择配置值类型，再按所选类型解析输入内容。字符串直接按原文保存，不需要添加 JSON 双引号；其他类型必须与 `value_type` 一致。

```json
{
  "config_key": "feature.example.enabled",
  "description": "控制示例功能是否开放",
  "value_type": "boolean",
  "value": true,
  "status": 1
}
```

成功响应 `d` 与列表单条记录结构一致。已知业务配置继续执行对应的类型和范围校验。

## 更新系统配置

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/update`
- **说明**：更新现有配置的说明、配置值和状态。必须传入读取时获得的 `version`；版本过期返回 HTTP 409，防止覆盖其他管理员刚保存的内容。保存成功后版本递增，并清理对应业务缓存。

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| id | 是 | integer | settings 主键。 |
| description | 否 | string/null | 最长 500 个字符；不传保留原说明，传 null 或空字符串清空说明。 |
| value_type | 否 | string | 配置值类型；新版后台必传，旧调用方不传时由后端按本次 `value` 推断。 |
| value | 是 | JSON | 字符串、数字、布尔值、数组或对象；不能为 JSON null。 |
| status | 是 | integer | `1` 启用，`0` 停用。 |
| version | 是 | integer | 当前版本号，用于并发校验。 |

```json
{
  "id": 1,
  "description": "每日免费文本消息额度",
  "value_type": "integer",
  "value": 10,
  "status": 1,
  "version": 1
}
```

已知业务配置继续执行原有范围校验，例如上下文 `top_k` 为 1–50、系统提示词最长 32000 字符、会员权益保持既有数据结构。未知历史配置允许保存有效 JSON，但配置值不能超过 1 MB。

## 查询后台会员权益配置

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/commerce/benefits`
- **说明**：按语言查询完整配置。语言通过层级化 `config_key` 表达，例如 `commerce.membership.benefits.zh-Hant`；未保存过的语言返回空 `items`，不自动使用另一语言覆盖。

### 请求字段

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| locale | 是 | string | 配置语言，例如 `zh-Hant`、`en`。 |

```json
{
  "locale": "zh-Hant"
}
```

### 响应数据

| 字段 | 类型 | 说明 |
|---|---|---|
| config_key | string | 完整配置键。 |
| locale | string | 当前配置语言。 |
| version | integer | 当前配置版本。 |
| items | array | 权益配置列表。 |

`items` 字段结构与保存接口中的权益项一致。

## 保存后台会员权益配置

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/commerce/benefits/save`
- **说明**：覆盖指定语言的会员权益 JSON，保存后版本号递增。同一语言配置内 `key` 必须唯一；`enabled=false` 的权益保留在后台配置中，但不出现在用户侧 `membership/overview` 响应中。本接口只保存展示配置，不改变会员履约、额度或支付事实。

### 请求字段

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| locale | 是 | string | 配置语言。 |
| items | 是 | array | 该语言的完整权益配置，将覆盖原配置。 |
| items[].key | 是 | string | 同一语言内唯一的权益键。 |
| items[].title | 是 | string | 权益标题。 |
| items[].description | 是 | string | 权益描述。 |
| items[].icon_key | 是 | string | C 端图标键。 |
| items[].sort | 是 | integer | 排序值。 |
| items[].enabled | 是 | boolean | 是否在用户侧展示。 |

```json
{
  "locale": "zh-Hant",
  "items": [
    {
      "key": "no_ads",
      "title": "無廣告",
      "description": "享受不中斷的陪伴體驗",
      "icon_key": "no_ads",
      "sort": 10,
      "enabled": true
    }
  ]
}
```
