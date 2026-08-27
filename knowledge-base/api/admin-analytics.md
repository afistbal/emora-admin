# 后台统计接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 1 个接口；全部使用 JSON POST。

## 目录

- [查询后台统计](#adminanalyticsquery) — `/admin/analytics/query`

<a id="adminanalyticsquery"></a>
## 查询后台统计

- **操作 ID**：`adminAnalyticsQuery`
- **请求**：`POST https://testapi.weshow.cc/api/admin/analytics/query`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：仅管理员可访问。第一期按原始事件实时聚合，日期范围最多 31 天。 统计日期按 timezone 归属，默认 Asia/Shanghai；不接受 mode 筛选。

### 请求字段

类型：`AnalyticsQueryRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| tab | 否 | string | enum: "all" / "user" / "chat" / "media"; default: "all" |  |
| start_date | 是 | string | date |  |
| end_date | 是 | string | date | 必须不早于 start_date，查询范围最多 31 天。 |
| user_type | 否 | string | enum: "all" / "guest" / "registered"; default: "all" |  |
| char_id | 否 | integer | min: 1 |  |
| timezone | 否 | string | default: "Asia/Shanghai" | PHP/ICU 支持的时区名称，用于统计日期归属。 |

### 请求示例

```json
{
  "tab": "chat",
  "start_date": "2026-08-01",
  "end_date": "2026-08-10",
  "user_type": "all",
  "timezone": "Asia/Shanghai"
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台统计查询结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AnalyticsQueryData |  |  |
| d.tab | 是 | string | enum: "all" / "user" / "chat" / "media" |  |
| d.start_date | 是 | string | date |  |
| d.end_date | 是 | string | date |  |
| d.user_type | 是 | string | enum: "all" / "guest" / "registered" |  |
| d.timezone | 是 | string |  |  |
| d.kpis | 是 | AnalyticsKpis |  |  |
| d.kpis.dau | 否 | integer |  |  |
| d.kpis.app_opens | 否 | integer |  |  |
| d.kpis.character_exposure_pv | 否 | integer |  |  |
| d.kpis.character_exposure_uv | 否 | integer |  |  |
| d.kpis.chat_view_users | 否 | integer |  |  |
| d.kpis.private_unlock_clicks | 否 | integer |  |  |
| d.kpis.private_unlock_successes | 否 | integer |  |  |
| d.kpis.private_unlock_rate | 否 | number | float |  |
| d.kpis.generation_submits | 否 | integer |  |  |
| d.kpis.generation_successes | 否 | integer |  |  |
| d.kpis.generation_failures | 否 | integer |  |  |
| d.kpis.generation_success_rate | 否 | number | float |  |
| d.kpis.coin_store_views | 否 | integer |  | coin_store_view 事件数。 |
| d.kpis.coin_store_view_users | 否 | integer |  | coin_store_view 事件中的去重用户/游客访问者数。 |
| d.kpis.coin_pack_purchases | 否 | integer |  | coin_pack_purchase 服务端事实事件数。 |
| d.kpis.coin_transactions | 否 | integer |  |  |
| d.kpis.coin_purchase_results | 否 | integer |  |  |
| d.kpis.membership_views | 否 | integer |  | membership_view 事件数。 |
| d.kpis.membership_view_users | 否 | integer |  | membership_view 事件中的去重用户/游客访问者数。 |
| d.kpis.membership_plan_selections | 否 | integer |  | membership_plan_select 服务端事实事件数。 |
| d.kpis.membership_purchase_results | 否 | integer |  |  |
| d.kpis.membership_expires | 否 | integer |  | membership_expire 服务端推导事件数。 |
| d.tables | 是 | object |  |  |
| d.tables.by_character | 是 | array<AnalyticsCharacterRow> |  |  |
| d.tables.by_character[].char_id | 否 | integer |  |  |
| d.tables.by_character[].exposure_pv | 否 | integer |  |  |
| d.tables.by_character[].exposure_uv | 否 | integer |  |  |
| d.tables.by_character[].chat_view_uv | 否 | integer |  |  |
| d.tables.by_character[].private_unlock_clicks | 否 | integer |  |  |
| d.tables.preset_distribution | 是 | array<AnalyticsPresetRow> |  |  |
| d.tables.preset_distribution[].mode | 否 | string |  |  |
| d.tables.preset_distribution[].preset_id | 否 | string |  |  |
| d.tables.preset_distribution[].prompt_mode | 否 | string |  |  |
| d.tables.preset_distribution[].count | 否 | integer |  |  |
| d.trend | 是 | array<AnalyticsTrendItem> |  |  |
| d.trend[].date | 否 | string | date |  |
| d.trend[].dau | 否 | integer |  |  |
| d.trend[].exposure_pv | 否 | integer |  |  |
| d.trend[].chat_view_uv | 否 | integer |  |  |
| d.trend[].generation_submits | 否 | integer |  |  |
| d.trend[].generation_successes | 否 | integer |  |  |
| d.definitions | 是 | array<AnalyticsDefinition> |  |  |
| d.definitions[].key | 是 | string |  |  |
| d.definitions[].name | 是 | string |  |  |
| d.definitions[].formula | 是 | string |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "tab": "chat",
    "start_date": "2026-08-01",
    "end_date": "2026-08-10",
    "user_type": "all",
    "timezone": "Asia/Shanghai",
    "kpis": {
      "dau": 8260,
      "app_opens": 12400,
      "character_exposure_pv": 117292,
      "character_exposure_uv": 8260,
      "chat_view_users": 7120,
      "private_unlock_clicks": 1200,
      "private_unlock_successes": 770,
      "private_unlock_rate": 0.6417,
      "generation_submits": 1000,
      "generation_successes": 959,
      "generation_failures": 41,
      "generation_success_rate": 0.959,
      "coin_store_views": 720,
      "coin_store_view_users": 680,
      "coin_pack_purchases": 580,
      "coin_transactions": 2300,
      "coin_purchase_results": 600,
      "membership_views": 410,
      "membership_view_users": 390,
      "membership_plan_selections": 260,
      "membership_purchase_results": 120,
      "membership_expires": 35
    },
    "tables": {
      "by_character": [],
      "preset_distribution": []
    },
    "trend": [],
    "definitions": []
  }
}
```

---

