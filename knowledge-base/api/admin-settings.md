# 后台设置接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页当前登记 4 个接口；全部使用 JSON POST。

## 查询系统配置列表

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/list`
- **说明**：分页查询 `settings` 表中的现有记录。配置键只读，页面不会创建或删除业务配置。

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| keyword | 否 | string | 按 `config_key` 模糊筛选，最长 128 个字符。 |
| status | 否 | integer | `1` 启用，`0` 停用。 |
| page | 否 | integer | 页码，默认 1。 |
| page_size | 否 | integer | 每页数量，默认 10，范围 1–100。 |

响应 `d` 包含 `items`、`page`、`page_size`、`total`。每条记录包含 `id`、`config_key`、`value`、`status`、`version`、创建/更新人和创建/更新时间。

## 更新系统配置

- **请求**：`POST https://testapi.weshow.cc/api/admin/settings/update`
- **说明**：更新现有配置的 JSON 值和状态。必须传入读取时获得的 `version`；版本过期返回 HTTP 409，防止覆盖其他管理员刚保存的内容。保存成功后版本递增，并清理对应业务缓存。

| 字段 | 必填 | 类型 | 说明 |
|---|---:|---|---|
| id | 是 | integer | settings 主键。 |
| value | 是 | JSON | 字符串、数字、布尔值、数组或对象；不能为 JSON null。 |
| status | 是 | integer | `1` 启用，`0` 停用。 |
| version | 是 | integer | 当前版本号，用于并发校验。 |

```json
{
  "id": 1,
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
