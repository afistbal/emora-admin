# 生成预设接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 5 个接口；全部使用 JSON POST。
> 新增和编辑只需 `label_i18n.en`（标签名，最多 64 字符）和 `prompt_i18n.en`（英文提示词，最多 4096 字符）；`zh-Hant` 可选，仅兼容旧客户端。编辑可省略整个内容对象，但传入时必须含非空 `en`。上架只检查英文内容，客户端提示词优先返回英文。

## 目录

- [查询 AI 提示语预设](#adminaipromptpresetlist) — `/admin/ai/presets/list`
- [新增 AI 提示语预设](#adminaipromptpresetcreate) — `/admin/ai/presets/create`
- [编辑 AI 提示语预设](#adminaipromptpresetupdate) — `/admin/ai/presets/update`
- [上下架 AI 提示语预设](#adminaipromptpresetstatus) — `/admin/ai/presets/status`
- [删除 AI 提示语预设](#adminaipromptpresetdelete) — `/admin/ai/presets/delete`

<a id="adminaipromptpresetlist"></a>
## 查询 AI 提示语预设

- **操作 ID**：`adminAiPromptPresetList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/ai/presets/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`AdminAiPromptPresetListRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string | maxLength: 64 |  |
| response_type | 否 | string | enum: "image" / "video" |  |
| state | 否 | string | enum: "all" / "online" / "offline"; default: "all" |  |
| page | 否 | integer | min: 1 |  |
| page_size | 否 | integer | min: 1; max: 100 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台 AI 提示语预设列表 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AdminAiPromptPresetListData |  |  |
| d.items | 是 | array<AdminAiPromptPreset> |  |  |
| d.items[].id | 是 | integer |  |  |
| d.items[].preset_code | 是 | string |  |  |
| d.items[].response_type | 是 | string | enum: "image" / "video" |  |
| d.items[].label_i18n | 是 | AiPromptPresetI18nLabel |  |  |
| d.items[].label_i18n.en | 是 | string | maxLength: 64 |  |
| d.items[].label_i18n.zh-Hant | 是 | string | maxLength: 64 |  |
| d.items[].prompt_i18n | 是 | AiPromptPresetI18nPrompt |  |  |
| d.items[].prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| d.items[].prompt_i18n.zh-Hant | 是 | string | maxLength: 4096 |  |
| d.items[].state | 是 | string | enum: "online" / "offline" |  |
| d.items[].sort | 是 | integer |  |  |
| d.items[].created_by | 否 | integer |  |  |
| d.items[].updated_by | 否 | integer |  |  |
| d.items[].created_at | 否 | string | date-time |  |
| d.items[].updated_at | 否 | string | date-time |  |
| d.page | 是 | integer |  |  |
| d.page_size | 是 | integer |  |  |
| d.total | 是 | integer |  |  |

---

<a id="adminaipromptpresetcreate"></a>
## 新增 AI 提示语预设

- **操作 ID**：`adminAiPromptPresetCreate`
- **请求**：`POST https://testapi.weshow.cc/api/admin/ai/presets/create`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：新增记录默认 offline；上架通过 status 接口完成。

### 请求字段

类型：`AdminAiPromptPresetCreateRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| response_type | 是 | string | enum: "image" / "video" |  |
| label_i18n | 是 | AiPromptPresetI18nLabel |  |  |
| label_i18n.en | 是 | string | maxLength: 64 |  |
| label_i18n.zh-Hant | 否 | string | maxLength: 64 |  |
| prompt_i18n | 是 | AiPromptPresetI18nPrompt |  |  |
| prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| prompt_i18n.zh-Hant | 否 | string | maxLength: 4096 |  |
| sort | 否 | integer | default: 0; min: 0 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台 AI 提示语预设 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | object |  |  |
| d.preset | 是 | AdminAiPromptPreset |  |  |
| d.preset.id | 是 | integer |  |  |
| d.preset.preset_code | 是 | string |  |  |
| d.preset.response_type | 是 | string | enum: "image" / "video" |  |
| d.preset.label_i18n | 是 | AiPromptPresetI18nLabel |  |  |
| d.preset.label_i18n.en | 是 | string | maxLength: 64 |  |
| d.preset.label_i18n.zh-Hant | 是 | string | maxLength: 64 |  |
| d.preset.prompt_i18n | 是 | AiPromptPresetI18nPrompt |  |  |
| d.preset.prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| d.preset.prompt_i18n.zh-Hant | 是 | string | maxLength: 4096 |  |
| d.preset.state | 是 | string | enum: "online" / "offline" |  |
| d.preset.sort | 是 | integer |  |  |
| d.preset.created_by | 否 | integer |  |  |
| d.preset.updated_by | 否 | integer |  |  |
| d.preset.created_at | 否 | string | date-time |  |
| d.preset.updated_at | 否 | string | date-time |  |

---

<a id="adminaipromptpresetupdate"></a>
## 编辑 AI 提示语预设

- **操作 ID**：`adminAiPromptPresetUpdate`
- **请求**：`POST https://testapi.weshow.cc/api/admin/ai/presets/update`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`AdminAiPromptPresetUpdateRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |
| label_i18n | 否 | AiPromptPresetI18nLabel |  |  |
| label_i18n.en | 是 | string | maxLength: 64 |  |
| label_i18n.zh-Hant | 否 | string | maxLength: 64 |  |
| prompt_i18n | 否 | AiPromptPresetI18nPrompt |  |  |
| prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| prompt_i18n.zh-Hant | 否 | string | maxLength: 4096 |  |
| sort | 否 | integer | min: 0 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台 AI 提示语预设 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | object |  |  |
| d.preset | 是 | AdminAiPromptPreset |  |  |
| d.preset.id | 是 | integer |  |  |
| d.preset.preset_code | 是 | string |  |  |
| d.preset.response_type | 是 | string | enum: "image" / "video" |  |
| d.preset.label_i18n | 是 | AiPromptPresetI18nLabel |  |  |
| d.preset.label_i18n.en | 是 | string | maxLength: 64 |  |
| d.preset.label_i18n.zh-Hant | 是 | string | maxLength: 64 |  |
| d.preset.prompt_i18n | 是 | AiPromptPresetI18nPrompt |  |  |
| d.preset.prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| d.preset.prompt_i18n.zh-Hant | 是 | string | maxLength: 4096 |  |
| d.preset.state | 是 | string | enum: "online" / "offline" |  |
| d.preset.sort | 是 | integer |  |  |
| d.preset.created_by | 否 | integer |  |  |
| d.preset.updated_by | 否 | integer |  |  |
| d.preset.created_at | 否 | string | date-time |  |
| d.preset.updated_at | 否 | string | date-time |  |

---

<a id="adminaipromptpresetstatus"></a>
## 上下架 AI 提示语预设

- **操作 ID**：`adminAiPromptPresetStatus`
- **请求**：`POST https://testapi.weshow.cc/api/admin/ai/presets/status`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |
| state | 是 | string | enum: "online" / "offline" |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台 AI 提示语预设 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | object |  |  |
| d.preset | 是 | AdminAiPromptPreset |  |  |
| d.preset.id | 是 | integer |  |  |
| d.preset.preset_code | 是 | string |  |  |
| d.preset.response_type | 是 | string | enum: "image" / "video" |  |
| d.preset.label_i18n | 是 | AiPromptPresetI18nLabel |  |  |
| d.preset.label_i18n.en | 是 | string | maxLength: 64 |  |
| d.preset.label_i18n.zh-Hant | 是 | string | maxLength: 64 |  |
| d.preset.prompt_i18n | 是 | AiPromptPresetI18nPrompt |  |  |
| d.preset.prompt_i18n.en | 是 | string | maxLength: 4096 |  |
| d.preset.prompt_i18n.zh-Hant | 是 | string | maxLength: 4096 |  |
| d.preset.state | 是 | string | enum: "online" / "offline" |  |
| d.preset.sort | 是 | integer |  |  |
| d.preset.created_by | 否 | integer |  |  |
| d.preset.updated_by | 否 | integer |  |  |
| d.preset.created_at | 否 | string | date-time |  |
| d.preset.updated_at | 否 | string | date-time |  |

---

<a id="adminaipromptpresetdelete"></a>
## 删除 AI 提示语预设

- **操作 ID**：`adminAiPromptPresetDelete`
- **请求**：`POST https://testapi.weshow.cc/api/admin/ai/presets/delete`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：软删除并同步下架；不删除历史消息和生成任务快照。

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 删除成功 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`ApiResponse`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  | 业务码，0 表示成功 |
| m | 是 | string |  |  |
| d | 是 | - |  | 业务数据 |

成功响应示例：

```json
{
  "c": 0,
  "m": "",
  "d": {
    "id": 2,
    "deleted": true
  }
}
```

---

