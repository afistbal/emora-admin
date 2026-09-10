# 角色与版本接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 9 个接口；全部使用 JSON POST。

## 目录

- [角色列表](#admincharacterlist) — `/admin/characters/list`
- [角色详情和版本快照](#admincharacterdetail) — `/admin/characters/detail`
- [角色版本历史](#admincharacterversions) — `/admin/characters/versions`
- [创建角色草稿](#admincharactercreate) — `/admin/characters/create`
- [保存角色草稿](#admincharacterdraftsave) — `/admin/characters/draft/save`
- [发布角色草稿](#admincharacterpublish) — `/admin/characters/publish`
- [回滚角色版本](#admincharacterrollback) — `/admin/characters/rollback`
- [修改角色资产绑定状态](#admincharacterassetstatus) — `/admin/characters/assets/status`
- [移除角色资产绑定](#admincharacterassetremove) — `/admin/characters/assets/remove`

<a id="admincharacterlist"></a>
## 角色列表

- **操作 ID**：`adminCharacterList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`CharacterListRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string |  |  |
| state | 否 | string | enum: "all" / "draft" / "online" |  |
| day | 否 | string | date |  |
| page | 否 | integer | min: 1 |  |
| page_size | 否 | integer | min: 1; max: 100 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色列表 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterListData |  |  |
| d.items | 否 | array<CharacterListItem> |  |  |
| d.items[].id | 否 | integer |  |  |
| d.items[].char_code | 否 | string |  |  |
| d.items[].state | 否 | string |  |  |
| d.items[].profile | 否 | object |  | 已发布角色返回当前线上版本资料；没有线上版本时回退返回草稿资料。 |
| d.items[].profile.version | 否 | string |  | 当前列表资料对应的版本号；已发布角色为线上版本号。 |
| d.items[].profile.name | 否 | string |  |  |
| d.items[].profile.tagline | 否 | string |  |  |
| d.items[].profile.tags | 否 | array<string> |  |  |
| d.items[].profile.cover | 否 | AssetBindingOutput |  |  |
| d.items[].profile.cover.id | 否 | integer |  |  |
| d.items[].profile.cover.ver_id | 否 | integer |  |  |
| d.items[].profile.cover.asset_id | 否 | integer |  |  |
| d.items[].profile.cover.role | 否 | string |  |  |
| d.items[].profile.cover.access | 否 | string |  |  |
| d.items[].profile.cover.preview_id | 否 | integer |  |  |
| d.items[].profile.cover.price | 否 | number |  |  |
| d.items[].profile.cover.state | 否 | string |  |  |
| d.items[].profile.cover.sort | 否 | integer |  |  |
| d.items[].profile.cover.asset | 否 | MediaAsset |  |  |
| d.items[].profile.cover.preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.items[].metrics | 否 | CharacterMetrics |  |  |
| d.items[].metrics.day | 否 | string | date |  |
| d.items[].metrics.chat_uv | 否 | integer |  |  |
| d.items[].metrics.msg_cnt | 否 | integer |  |  |
| d.items[].metrics.msg_avg | 否 | number |  |  |
| d.items[].metrics.exp_pv | 否 | integer |  |  |
| d.items[].metrics.exp_uv | 否 | integer |  |  |
| d.items[].metrics.gen_cnt | 否 | integer |  |  |
| d.items[].metrics.gen_ok | 否 | integer |  |  |
| d.items[].metrics.gen_rate | 否 | number |  |  |
| d.items[].updated_at | 否 | string | date-time |  |
| d.page | 否 | integer |  |  |
| d.page_size | 否 | integer |  |  |
| d.total | 否 | integer |  |  |
| d.day | 否 | string | date |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "items": [
      {
        "id": 1,
        "char_code": "char_night_walker",
        "state": "online",
        "profile": {
          "name": "夜航者",
          "tagline": "安静的陪伴者",
          "tags": [
            "陪伴",
            "夜晚"
          ],
          "cover": null
        },
        "metrics": {
          "day": "2026-08-01",
          "chat_uv": 10,
          "msg_cnt": 55,
          "msg_avg": null,
          "exp_pv": 120,
          "exp_uv": 80,
          "gen_cnt": 12,
          "gen_ok": 10,
          "gen_rate": 0.8333
        },
        "updated_at": "2026-08-01T10:00:00.000000Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "day": "2026-08-01"
  }
}
```

---

<a id="admincharacterdetail"></a>
## 角色详情和版本快照

- **操作 ID**：`adminCharacterDetail`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/detail`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`CharacterIdRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer | min: 1 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色详情 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterDetailData |  |  |
| d.character | 否 | CharacterSummary |  |  |
| d.character.id | 否 | integer |  |  |
| d.character.char_code | 否 | string |  |  |
| d.character.im_user_id | 否 | string |  | 对应的 IM 用户 ID |
| d.character.ai | 否 | boolean |  |  |
| d.character.state | 否 | string |  |  |
| d.character.pub_ver_id | 否 | integer |  |  |
| d.character.draft_ver_id | 否 | integer |  |  |
| d.character.updated_at | 否 | string | date-time |  |
| d.published | 否 | object |  |  |
| d.published.id | 否 | integer |  |  |
| d.published.char_id | 否 | integer |  |  |
| d.published.ver | 否 | string | maxLength: 64 |  |
| d.published.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.published.data | 否 | CharacterData |  |  |
| d.published.data.character_version | 否 | string | maxLength: 64 |  |
| d.published.data.creator | 否 | string | maxLength: 128 |  |
| d.published.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.published.data.name | 否 | string | maxLength: 100 |  |
| d.published.data.tagline | 否 | string | maxLength: 100 |  |
| d.published.data.description | 否 | string | maxLength: 500 |  |
| d.published.data.personality | 否 | string |  |  |
| d.published.data.scenario | 否 | string |  |  |
| d.published.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.published.data.avatar_notes | 否 | string |  |  |
| d.published.data.mes_example | 否 | array<-> |  |  |
| d.published.data.greetings | 否 | array<Greeting> |  |  |
| d.published.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.published.data.greetings[].body | 是 | string |  |  |
| d.published.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.published.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.published.data.tags | 否 | array<string> |  |  |
| d.published.hash | 否 | string |  |  |
| d.published.created_by | 否 | integer |  |  |
| d.published.pub_by | 否 | integer |  |  |
| d.published.pub_at | 否 | integer |  |  |
| d.published.assets | 否 | array<AssetBindingOutput> |  |  |
| d.published.assets[].id | 否 | integer |  |  |
| d.published.assets[].ver_id | 否 | integer |  |  |
| d.published.assets[].asset_id | 否 | integer |  |  |
| d.published.assets[].role | 否 | string |  |  |
| d.published.assets[].access | 否 | string |  |  |
| d.published.assets[].preview_id | 否 | integer |  |  |
| d.published.assets[].price | 否 | number |  |  |
| d.published.assets[].state | 否 | string |  |  |
| d.published.assets[].sort | 否 | integer |  |  |
| d.published.assets[].asset | 否 | MediaAsset |  |  |
| d.published.assets[].asset.id | 否 | integer |  |  |
| d.published.assets[].asset.type | 否 | string |  |  |
| d.published.assets[].asset.mime | 否 | string |  |  |
| d.published.assets[].asset.state | 否 | string |  |  |
| d.published.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.published.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.published.assets[].asset.owner_id | 否 | integer |  |  |
| d.published.assets[].asset.created_at | 否 | string | date-time |  |
| d.published.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.published.assets[].preview.id | 否 | integer |  |  |
| d.published.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.published.assets[].preview.mime | 否 | string |  |  |
| d.published.assets[].preview.state | 否 | string |  |  |
| d.published.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |
| d.draft | 否 | object |  |  |
| d.draft.id | 否 | integer |  |  |
| d.draft.char_id | 否 | integer |  |  |
| d.draft.ver | 否 | string | maxLength: 64 |  |
| d.draft.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.draft.data | 否 | CharacterData |  |  |
| d.draft.data.character_version | 否 | string | maxLength: 64 |  |
| d.draft.data.creator | 否 | string | maxLength: 128 |  |
| d.draft.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.draft.data.name | 否 | string | maxLength: 100 |  |
| d.draft.data.tagline | 否 | string | maxLength: 100 |  |
| d.draft.data.description | 否 | string | maxLength: 500 |  |
| d.draft.data.personality | 否 | string |  |  |
| d.draft.data.scenario | 否 | string |  |  |
| d.draft.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.draft.data.avatar_notes | 否 | string |  |  |
| d.draft.data.mes_example | 否 | array<-> |  |  |
| d.draft.data.greetings | 否 | array<Greeting> |  |  |
| d.draft.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.draft.data.greetings[].body | 是 | string |  |  |
| d.draft.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.draft.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.draft.data.tags | 否 | array<string> |  |  |
| d.draft.hash | 否 | string |  |  |
| d.draft.created_by | 否 | integer |  |  |
| d.draft.pub_by | 否 | integer |  |  |
| d.draft.pub_at | 否 | integer |  |  |
| d.draft.assets | 否 | array<AssetBindingOutput> |  |  |
| d.draft.assets[].id | 否 | integer |  |  |
| d.draft.assets[].ver_id | 否 | integer |  |  |
| d.draft.assets[].asset_id | 否 | integer |  |  |
| d.draft.assets[].role | 否 | string |  |  |
| d.draft.assets[].access | 否 | string |  |  |
| d.draft.assets[].preview_id | 否 | integer |  |  |
| d.draft.assets[].price | 否 | number |  |  |
| d.draft.assets[].state | 否 | string |  |  |
| d.draft.assets[].sort | 否 | integer |  |  |
| d.draft.assets[].asset | 否 | MediaAsset |  |  |
| d.draft.assets[].asset.id | 否 | integer |  |  |
| d.draft.assets[].asset.type | 否 | string |  |  |
| d.draft.assets[].asset.mime | 否 | string |  |  |
| d.draft.assets[].asset.state | 否 | string |  |  |
| d.draft.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.draft.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.draft.assets[].asset.owner_id | 否 | integer |  |  |
| d.draft.assets[].asset.created_at | 否 | string | date-time |  |
| d.draft.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.draft.assets[].preview.id | 否 | integer |  |  |
| d.draft.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.draft.assets[].preview.mime | 否 | string |  |  |
| d.draft.assets[].preview.state | 否 | string |  |  |
| d.draft.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |
| d.metrics | 否 | CharacterMetrics |  |  |
| d.metrics.day | 否 | string | date |  |
| d.metrics.chat_uv | 否 | integer |  |  |
| d.metrics.msg_cnt | 否 | integer |  |  |
| d.metrics.msg_avg | 否 | number |  |  |
| d.metrics.exp_pv | 否 | integer |  |  |
| d.metrics.exp_uv | 否 | integer |  |  |
| d.metrics.gen_cnt | 否 | integer |  |  |
| d.metrics.gen_ok | 否 | integer |  |  |
| d.metrics.gen_rate | 否 | number |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "character": {
      "id": 1,
      "char_code": "char_night_walker",
      "ai": true,
      "state": "online",
      "pub_ver_id": 3,
      "draft_ver_id": 4,
      "updated_at": "2026-08-01T10:00:00.000000Z"
    },
    "published": null,
    "draft": null,
    "metrics": {
      "day": "2026-08-01",
      "chat_uv": 0,
      "msg_cnt": 0,
      "msg_avg": null,
      "exp_pv": 0,
      "exp_uv": 0,
      "gen_cnt": 0,
      "gen_ok": 0,
      "gen_rate": null
    }
  }
}
```

---

<a id="admincharacterversions"></a>
## 角色版本历史

- **操作 ID**：`adminCharacterVersions`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/versions`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`CharacterIdRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer | min: 1 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色版本历史 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterVersionsData |  |  |
| d.items | 否 | array<VersionHistoryItem> |  |  |
| d.items[].id | 否 | integer |  |  |
| d.items[].ver | 否 | string | maxLength: 64 |  |
| d.items[].state | 否 | string |  |  |
| d.items[].hash | 否 | string |  |  |
| d.items[].created_by | 否 | integer |  |  |
| d.items[].pub_by | 否 | integer |  |  |
| d.items[].pub_at | 否 | string | date-time |  |
| d.items[].created_at | 否 | string | date-time |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "items": [
      {
        "id": 3,
        "ver": "1",
        "state": "published",
        "hash": "sha256-hash",
        "created_by": 1,
        "pub_by": 1,
        "pub_at": "2026-08-01T10:00:00.000000Z",
        "created_at": "2026-08-01T09:00:00.000000Z"
      }
    ]
  }
}
```

---

<a id="admincharactercreate"></a>
## 创建角色草稿

- **操作 ID**：`adminCharacterCreate`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/create`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`CharacterCreateRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_code | 否 | string | maxLength: 64 | 简化创建时可显式传入；传入 data 的 JSON 导入模式下，服务端直接使用 data.name 作为 char_code。 |
| ai | 否 | boolean | default: true |  |
| data | 否 | CharacterData |  |  |
| data.character_version | 否 | string | maxLength: 64 |  |
| data.creator | 否 | string | maxLength: 128 |  |
| data.creator_notes | 否 | string | maxLength: 2000 |  |
| data.name | 条件必填 | string | maxLength: 100；作为 char_code 时最大 64 字符 | JSON 导入模式必须提供非空名称，缺失时返回错误。 |
| data.tagline | 否 | string | maxLength: 100 |  |
| data.description | 否 | string | maxLength: 500 |  |
| data.personality | 否 | string |  |  |
| data.scenario | 否 | string |  |  |
| data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| data.avatar_notes | 否 | string |  |  |
| data.mes_example | 否 | array<-> |  |  |
| data.greetings | 否 | array<Greeting> |  |  |
| data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| data.greetings[].body | 是 | string |  |  |
| data.greetings[].enabled | 否 | boolean | default: true |  |
| data.greetings[].sort | 否 | integer | min: 0 |  |
| data.tags | 否 | array<string> |  |  |
| name | 否 | string |  |  |
| tagline | 否 | string |  |  |
| description | 否 | string |  |  |
| greeting | 否 | string |  |  |
| tags | 否 | string |  |  |
| cover_asset_id | 否 | integer |  |  |
| assets | 否 | array<AssetBinding> |  |  |
| assets[].asset_id | 是 | integer |  |  |
| assets[].role | 是 | string | enum: "cover" / "gallery" / "private" / "poster" |  |
| assets[].access | 否 | string | enum: "public" / "private"; default: "public" |  |
| assets[].preview_id | 否 | integer |  |  |
| assets[].price | 否 | number | float; min: 0 |  |
| assets[].state | 否 | string | enum: "online" / "offline" |  |
| assets[].sort | 否 | integer | min: 0 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色保存、发布或回滚结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterPayload |  |  |
| d.id | 否 | integer |  |  |
| d.char_code | 否 | string |  |  |
| d.im_user_id | 否 | string |  | 对应的 IM 用户 ID |
| d.ai | 否 | boolean |  |  |
| d.state | 否 | string |  |  |
| d.pub_ver_id | 否 | integer |  |  |
| d.draft_ver_id | 否 | integer |  |  |
| d.updated_at | 否 | string | date-time |  |
| d.published | 否 | object |  |  |
| d.published.id | 否 | integer |  |  |
| d.published.char_id | 否 | integer |  |  |
| d.published.ver | 否 | string | maxLength: 64 |  |
| d.published.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.published.data | 否 | CharacterData |  |  |
| d.published.data.character_version | 否 | string | maxLength: 64 |  |
| d.published.data.creator | 否 | string | maxLength: 128 |  |
| d.published.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.published.data.name | 否 | string | maxLength: 100 |  |
| d.published.data.tagline | 否 | string | maxLength: 100 |  |
| d.published.data.description | 否 | string | maxLength: 500 |  |
| d.published.data.personality | 否 | string |  |  |
| d.published.data.scenario | 否 | string |  |  |
| d.published.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.published.data.avatar_notes | 否 | string |  |  |
| d.published.data.mes_example | 否 | array<-> |  |  |
| d.published.data.greetings | 否 | array<Greeting> |  |  |
| d.published.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.published.data.greetings[].body | 是 | string |  |  |
| d.published.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.published.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.published.data.tags | 否 | array<string> |  |  |
| d.published.hash | 否 | string |  |  |
| d.published.created_by | 否 | integer |  |  |
| d.published.pub_by | 否 | integer |  |  |
| d.published.pub_at | 否 | integer |  |  |
| d.published.assets | 否 | array<AssetBindingOutput> |  |  |
| d.published.assets[].id | 否 | integer |  |  |
| d.published.assets[].ver_id | 否 | integer |  |  |
| d.published.assets[].asset_id | 否 | integer |  |  |
| d.published.assets[].role | 否 | string |  |  |
| d.published.assets[].access | 否 | string |  |  |
| d.published.assets[].preview_id | 否 | integer |  |  |
| d.published.assets[].price | 否 | number |  |  |
| d.published.assets[].state | 否 | string |  |  |
| d.published.assets[].sort | 否 | integer |  |  |
| d.published.assets[].asset | 否 | MediaAsset |  |  |
| d.published.assets[].asset.id | 否 | integer |  |  |
| d.published.assets[].asset.type | 否 | string |  |  |
| d.published.assets[].asset.mime | 否 | string |  |  |
| d.published.assets[].asset.state | 否 | string |  |  |
| d.published.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.published.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.published.assets[].asset.owner_id | 否 | integer |  |  |
| d.published.assets[].asset.created_at | 否 | string | date-time |  |
| d.published.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.published.assets[].preview.id | 否 | integer |  |  |
| d.published.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.published.assets[].preview.mime | 否 | string |  |  |
| d.published.assets[].preview.state | 否 | string |  |  |
| d.published.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |
| d.draft | 否 | object |  |  |
| d.draft.id | 否 | integer |  |  |
| d.draft.char_id | 否 | integer |  |  |
| d.draft.ver | 否 | string | maxLength: 64 |  |
| d.draft.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.draft.data | 否 | CharacterData |  |  |
| d.draft.data.character_version | 否 | string | maxLength: 64 |  |
| d.draft.data.creator | 否 | string | maxLength: 128 |  |
| d.draft.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.draft.data.name | 否 | string | maxLength: 100 |  |
| d.draft.data.tagline | 否 | string | maxLength: 100 |  |
| d.draft.data.description | 否 | string | maxLength: 500 |  |
| d.draft.data.personality | 否 | string |  |  |
| d.draft.data.scenario | 否 | string |  |  |
| d.draft.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.draft.data.avatar_notes | 否 | string |  |  |
| d.draft.data.mes_example | 否 | array<-> |  |  |
| d.draft.data.greetings | 否 | array<Greeting> |  |  |
| d.draft.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.draft.data.greetings[].body | 是 | string |  |  |
| d.draft.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.draft.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.draft.data.tags | 否 | array<string> |  |  |
| d.draft.hash | 否 | string |  |  |
| d.draft.created_by | 否 | integer |  |  |
| d.draft.pub_by | 否 | integer |  |  |
| d.draft.pub_at | 否 | integer |  |  |
| d.draft.assets | 否 | array<AssetBindingOutput> |  |  |
| d.draft.assets[].id | 否 | integer |  |  |
| d.draft.assets[].ver_id | 否 | integer |  |  |
| d.draft.assets[].asset_id | 否 | integer |  |  |
| d.draft.assets[].role | 否 | string |  |  |
| d.draft.assets[].access | 否 | string |  |  |
| d.draft.assets[].preview_id | 否 | integer |  |  |
| d.draft.assets[].price | 否 | number |  |  |
| d.draft.assets[].state | 否 | string |  |  |
| d.draft.assets[].sort | 否 | integer |  |  |
| d.draft.assets[].asset | 否 | MediaAsset |  |  |
| d.draft.assets[].asset.id | 否 | integer |  |  |
| d.draft.assets[].asset.type | 否 | string |  |  |
| d.draft.assets[].asset.mime | 否 | string |  |  |
| d.draft.assets[].asset.state | 否 | string |  |  |
| d.draft.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.draft.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.draft.assets[].asset.owner_id | 否 | integer |  |  |
| d.draft.assets[].asset.created_at | 否 | string | date-time |  |
| d.draft.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.draft.assets[].preview.id | 否 | integer |  |  |
| d.draft.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.draft.assets[].preview.mime | 否 | string |  |  |
| d.draft.assets[].preview.state | 否 | string |  |  |
| d.draft.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "id": 1,
    "char_code": "char_night_walker",
    "ai": true,
    "state": "online",
    "pub_ver_id": 3,
    "draft_ver_id": null,
    "published": null,
    "draft": null
  }
}
```

---

<a id="admincharacterdraftsave"></a>
## 保存角色草稿

- **操作 ID**：`adminCharacterDraftSave`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/draft/save`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`CharacterDraftSaveRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer |  |  |
| data | 否 | CharacterData |  |  |
| data.character_version | 否 | string | maxLength: 64 |  |
| data.creator | 否 | string | maxLength: 128 |  |
| data.creator_notes | 否 | string | maxLength: 2000 |  |
| data.name | 否 | string | maxLength: 100 |  |
| data.tagline | 否 | string | maxLength: 100 |  |
| data.description | 否 | string | maxLength: 500 |  |
| data.personality | 否 | string |  |  |
| data.scenario | 否 | string |  |  |
| data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| data.avatar_notes | 否 | string |  |  |
| data.mes_example | 否 | array<-> |  |  |
| data.greetings | 否 | array<Greeting> |  |  |
| data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| data.greetings[].body | 是 | string |  |  |
| data.greetings[].enabled | 否 | boolean | default: true |  |
| data.greetings[].sort | 否 | integer | min: 0 |  |
| data.tags | 否 | array<string> |  |  |
| assets | 否 | array<AssetBinding> |  |  |
| assets[].asset_id | 是 | integer |  |  |
| assets[].role | 是 | string | enum: "cover" / "gallery" / "private" / "poster" |  |
| assets[].access | 否 | string | enum: "public" / "private"; default: "public" |  |
| assets[].preview_id | 否 | integer |  |  |
| assets[].price | 否 | number | float; min: 0 |  |
| assets[].state | 否 | string | enum: "online" / "offline" |  |
| assets[].sort | 否 | integer | min: 0 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 草稿版本 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | VersionPayload |  |  |
| d.id | 否 | integer |  |  |
| d.char_id | 否 | integer |  |  |
| d.ver | 否 | string | maxLength: 64 |  |
| d.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.data | 否 | CharacterData |  |  |
| d.data.character_version | 否 | string | maxLength: 64 |  |
| d.data.creator | 否 | string | maxLength: 128 |  |
| d.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.data.name | 否 | string | maxLength: 100 |  |
| d.data.tagline | 否 | string | maxLength: 100 |  |
| d.data.description | 否 | string | maxLength: 500 |  |
| d.data.personality | 否 | string |  |  |
| d.data.scenario | 否 | string |  |  |
| d.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.data.avatar_notes | 否 | string |  |  |
| d.data.mes_example | 否 | array<-> |  |  |
| d.data.greetings | 否 | array<Greeting> |  |  |
| d.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.data.greetings[].body | 是 | string |  |  |
| d.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.data.tags | 否 | array<string> |  |  |
| d.hash | 否 | string |  |  |
| d.created_by | 否 | integer |  |  |
| d.pub_by | 否 | integer |  |  |
| d.pub_at | 否 | integer |  |  |
| d.assets | 否 | array<AssetBindingOutput> |  |  |
| d.assets[].id | 否 | integer |  |  |
| d.assets[].ver_id | 否 | integer |  |  |
| d.assets[].asset_id | 否 | integer |  |  |
| d.assets[].role | 否 | string |  |  |
| d.assets[].access | 否 | string |  |  |
| d.assets[].preview_id | 否 | integer |  |  |
| d.assets[].price | 否 | number |  |  |
| d.assets[].state | 否 | string |  |  |
| d.assets[].sort | 否 | integer |  |  |
| d.assets[].asset | 否 | MediaAsset |  |  |
| d.assets[].asset.id | 否 | integer |  |  |
| d.assets[].asset.type | 否 | string |  |  |
| d.assets[].asset.mime | 否 | string |  |  |
| d.assets[].asset.state | 否 | string |  |  |
| d.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.assets[].asset.owner_id | 否 | integer |  |  |
| d.assets[].asset.created_at | 否 | string | date-time |  |
| d.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.assets[].preview.id | 否 | integer |  |  |
| d.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.assets[].preview.mime | 否 | string |  |  |
| d.assets[].preview.state | 否 | string |  |  |
| d.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "id": 4,
    "char_id": 1,
    "ver": "2",
    "state": "draft",
    "data": {},
    "hash": "sha256-hash",
    "created_by": 1,
    "pub_by": null,
    "pub_at": null,
    "assets": []
  }
}
```

---

<a id="admincharacterpublish"></a>
## 发布角色草稿

- **操作 ID**：`adminCharacterPublish`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/publish`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer |  |  |
| ver_id | 否 | integer |  | 不传则使用当前 draft_ver_id |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色保存、发布或回滚结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterPayload |  |  |
| d.id | 否 | integer |  |  |
| d.char_code | 否 | string |  |  |
| d.im_user_id | 否 | string |  | 对应的 IM 用户 ID |
| d.ai | 否 | boolean |  |  |
| d.state | 否 | string |  |  |
| d.pub_ver_id | 否 | integer |  |  |
| d.draft_ver_id | 否 | integer |  |  |
| d.updated_at | 否 | string | date-time |  |
| d.published | 否 | object |  |  |
| d.published.id | 否 | integer |  |  |
| d.published.char_id | 否 | integer |  |  |
| d.published.ver | 否 | string | maxLength: 64 |  |
| d.published.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.published.data | 否 | CharacterData |  |  |
| d.published.data.character_version | 否 | string | maxLength: 64 |  |
| d.published.data.creator | 否 | string | maxLength: 128 |  |
| d.published.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.published.data.name | 否 | string | maxLength: 100 |  |
| d.published.data.tagline | 否 | string | maxLength: 100 |  |
| d.published.data.description | 否 | string | maxLength: 500 |  |
| d.published.data.personality | 否 | string |  |  |
| d.published.data.scenario | 否 | string |  |  |
| d.published.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.published.data.avatar_notes | 否 | string |  |  |
| d.published.data.mes_example | 否 | array<-> |  |  |
| d.published.data.greetings | 否 | array<Greeting> |  |  |
| d.published.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.published.data.greetings[].body | 是 | string |  |  |
| d.published.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.published.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.published.data.tags | 否 | array<string> |  |  |
| d.published.hash | 否 | string |  |  |
| d.published.created_by | 否 | integer |  |  |
| d.published.pub_by | 否 | integer |  |  |
| d.published.pub_at | 否 | integer |  |  |
| d.published.assets | 否 | array<AssetBindingOutput> |  |  |
| d.published.assets[].id | 否 | integer |  |  |
| d.published.assets[].ver_id | 否 | integer |  |  |
| d.published.assets[].asset_id | 否 | integer |  |  |
| d.published.assets[].role | 否 | string |  |  |
| d.published.assets[].access | 否 | string |  |  |
| d.published.assets[].preview_id | 否 | integer |  |  |
| d.published.assets[].price | 否 | number |  |  |
| d.published.assets[].state | 否 | string |  |  |
| d.published.assets[].sort | 否 | integer |  |  |
| d.published.assets[].asset | 否 | MediaAsset |  |  |
| d.published.assets[].asset.id | 否 | integer |  |  |
| d.published.assets[].asset.type | 否 | string |  |  |
| d.published.assets[].asset.mime | 否 | string |  |  |
| d.published.assets[].asset.state | 否 | string |  |  |
| d.published.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.published.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.published.assets[].asset.owner_id | 否 | integer |  |  |
| d.published.assets[].asset.created_at | 否 | string | date-time |  |
| d.published.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.published.assets[].preview.id | 否 | integer |  |  |
| d.published.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.published.assets[].preview.mime | 否 | string |  |  |
| d.published.assets[].preview.state | 否 | string |  |  |
| d.published.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |
| d.draft | 否 | object |  |  |
| d.draft.id | 否 | integer |  |  |
| d.draft.char_id | 否 | integer |  |  |
| d.draft.ver | 否 | string | maxLength: 64 |  |
| d.draft.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.draft.data | 否 | CharacterData |  |  |
| d.draft.data.character_version | 否 | string | maxLength: 64 |  |
| d.draft.data.creator | 否 | string | maxLength: 128 |  |
| d.draft.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.draft.data.name | 否 | string | maxLength: 100 |  |
| d.draft.data.tagline | 否 | string | maxLength: 100 |  |
| d.draft.data.description | 否 | string | maxLength: 500 |  |
| d.draft.data.personality | 否 | string |  |  |
| d.draft.data.scenario | 否 | string |  |  |
| d.draft.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.draft.data.avatar_notes | 否 | string |  |  |
| d.draft.data.mes_example | 否 | array<-> |  |  |
| d.draft.data.greetings | 否 | array<Greeting> |  |  |
| d.draft.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.draft.data.greetings[].body | 是 | string |  |  |
| d.draft.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.draft.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.draft.data.tags | 否 | array<string> |  |  |
| d.draft.hash | 否 | string |  |  |
| d.draft.created_by | 否 | integer |  |  |
| d.draft.pub_by | 否 | integer |  |  |
| d.draft.pub_at | 否 | integer |  |  |
| d.draft.assets | 否 | array<AssetBindingOutput> |  |  |
| d.draft.assets[].id | 否 | integer |  |  |
| d.draft.assets[].ver_id | 否 | integer |  |  |
| d.draft.assets[].asset_id | 否 | integer |  |  |
| d.draft.assets[].role | 否 | string |  |  |
| d.draft.assets[].access | 否 | string |  |  |
| d.draft.assets[].preview_id | 否 | integer |  |  |
| d.draft.assets[].price | 否 | number |  |  |
| d.draft.assets[].state | 否 | string |  |  |
| d.draft.assets[].sort | 否 | integer |  |  |
| d.draft.assets[].asset | 否 | MediaAsset |  |  |
| d.draft.assets[].asset.id | 否 | integer |  |  |
| d.draft.assets[].asset.type | 否 | string |  |  |
| d.draft.assets[].asset.mime | 否 | string |  |  |
| d.draft.assets[].asset.state | 否 | string |  |  |
| d.draft.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.draft.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.draft.assets[].asset.owner_id | 否 | integer |  |  |
| d.draft.assets[].asset.created_at | 否 | string | date-time |  |
| d.draft.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.draft.assets[].preview.id | 否 | integer |  |  |
| d.draft.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.draft.assets[].preview.mime | 否 | string |  |  |
| d.draft.assets[].preview.state | 否 | string |  |  |
| d.draft.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "id": 1,
    "char_code": "char_night_walker",
    "ai": true,
    "state": "online",
    "pub_ver_id": 3,
    "draft_ver_id": null,
    "published": null,
    "draft": null
  }
}
```

---

<a id="admincharacterrollback"></a>
## 回滚角色版本

- **操作 ID**：`adminCharacterRollback`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/rollback`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer |  |  |
| ver_id | 是 | integer |  |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色保存、发布或回滚结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | CharacterPayload |  |  |
| d.id | 否 | integer |  |  |
| d.char_code | 否 | string |  |  |
| d.im_user_id | 否 | string |  | 对应的 IM 用户 ID |
| d.ai | 否 | boolean |  |  |
| d.state | 否 | string |  |  |
| d.pub_ver_id | 否 | integer |  |  |
| d.draft_ver_id | 否 | integer |  |  |
| d.updated_at | 否 | string | date-time |  |
| d.published | 否 | object |  |  |
| d.published.id | 否 | integer |  |  |
| d.published.char_id | 否 | integer |  |  |
| d.published.ver | 否 | string | maxLength: 64 |  |
| d.published.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.published.data | 否 | CharacterData |  |  |
| d.published.data.character_version | 否 | string | maxLength: 64 |  |
| d.published.data.creator | 否 | string | maxLength: 128 |  |
| d.published.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.published.data.name | 否 | string | maxLength: 100 |  |
| d.published.data.tagline | 否 | string | maxLength: 100 |  |
| d.published.data.description | 否 | string | maxLength: 500 |  |
| d.published.data.personality | 否 | string |  |  |
| d.published.data.scenario | 否 | string |  |  |
| d.published.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.published.data.avatar_notes | 否 | string |  |  |
| d.published.data.mes_example | 否 | array<-> |  |  |
| d.published.data.greetings | 否 | array<Greeting> |  |  |
| d.published.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.published.data.greetings[].body | 是 | string |  |  |
| d.published.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.published.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.published.data.tags | 否 | array<string> |  |  |
| d.published.hash | 否 | string |  |  |
| d.published.created_by | 否 | integer |  |  |
| d.published.pub_by | 否 | integer |  |  |
| d.published.pub_at | 否 | integer |  |  |
| d.published.assets | 否 | array<AssetBindingOutput> |  |  |
| d.published.assets[].id | 否 | integer |  |  |
| d.published.assets[].ver_id | 否 | integer |  |  |
| d.published.assets[].asset_id | 否 | integer |  |  |
| d.published.assets[].role | 否 | string |  |  |
| d.published.assets[].access | 否 | string |  |  |
| d.published.assets[].preview_id | 否 | integer |  |  |
| d.published.assets[].price | 否 | number |  |  |
| d.published.assets[].state | 否 | string |  |  |
| d.published.assets[].sort | 否 | integer |  |  |
| d.published.assets[].asset | 否 | MediaAsset |  |  |
| d.published.assets[].asset.id | 否 | integer |  |  |
| d.published.assets[].asset.type | 否 | string |  |  |
| d.published.assets[].asset.mime | 否 | string |  |  |
| d.published.assets[].asset.state | 否 | string |  |  |
| d.published.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.published.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.published.assets[].asset.owner_id | 否 | integer |  |  |
| d.published.assets[].asset.created_at | 否 | string | date-time |  |
| d.published.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.published.assets[].preview.id | 否 | integer |  |  |
| d.published.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.published.assets[].preview.mime | 否 | string |  |  |
| d.published.assets[].preview.state | 否 | string |  |  |
| d.published.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |
| d.draft | 否 | object |  |  |
| d.draft.id | 否 | integer |  |  |
| d.draft.char_id | 否 | integer |  |  |
| d.draft.ver | 否 | string | maxLength: 64 |  |
| d.draft.state | 否 | string | enum: "draft" / "published" / "archived" |  |
| d.draft.data | 否 | CharacterData |  |  |
| d.draft.data.character_version | 否 | string | maxLength: 64 |  |
| d.draft.data.creator | 否 | string | maxLength: 128 |  |
| d.draft.data.creator_notes | 否 | string | maxLength: 2000 |  |
| d.draft.data.name | 否 | string | maxLength: 100 |  |
| d.draft.data.tagline | 否 | string | maxLength: 100 |  |
| d.draft.data.description | 否 | string | maxLength: 500 |  |
| d.draft.data.personality | 否 | string |  |  |
| d.draft.data.scenario | 否 | string |  |  |
| d.draft.data.prompt | 否 | string |  | 选填的历史后指令；为空时不影响保存或发布。 |
| d.draft.data.avatar_notes | 否 | string |  |  |
| d.draft.data.mes_example | 否 | array<-> |  |  |
| d.draft.data.greetings | 否 | array<Greeting> |  |  |
| d.draft.data.greetings[].kind | 否 | string | enum: "primary" / "alternate" |  |
| d.draft.data.greetings[].body | 是 | string |  |  |
| d.draft.data.greetings[].enabled | 否 | boolean | default: true |  |
| d.draft.data.greetings[].sort | 否 | integer | min: 0 |  |
| d.draft.data.tags | 否 | array<string> |  |  |
| d.draft.hash | 否 | string |  |  |
| d.draft.created_by | 否 | integer |  |  |
| d.draft.pub_by | 否 | integer |  |  |
| d.draft.pub_at | 否 | integer |  |  |
| d.draft.assets | 否 | array<AssetBindingOutput> |  |  |
| d.draft.assets[].id | 否 | integer |  |  |
| d.draft.assets[].ver_id | 否 | integer |  |  |
| d.draft.assets[].asset_id | 否 | integer |  |  |
| d.draft.assets[].role | 否 | string |  |  |
| d.draft.assets[].access | 否 | string |  |  |
| d.draft.assets[].preview_id | 否 | integer |  |  |
| d.draft.assets[].price | 否 | number |  |  |
| d.draft.assets[].state | 否 | string |  |  |
| d.draft.assets[].sort | 否 | integer |  |  |
| d.draft.assets[].asset | 否 | MediaAsset |  |  |
| d.draft.assets[].asset.id | 否 | integer |  |  |
| d.draft.assets[].asset.type | 否 | string |  |  |
| d.draft.assets[].asset.mime | 否 | string |  |  |
| d.draft.assets[].asset.state | 否 | string |  |  |
| d.draft.assets[].asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.draft.assets[].asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.draft.assets[].asset.owner_id | 否 | integer |  |  |
| d.draft.assets[].asset.created_at | 否 | string | date-time |  |
| d.draft.assets[].preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.draft.assets[].preview.id | 否 | integer |  |  |
| d.draft.assets[].preview.type | 否 | string | enum: "image" / "video" |  |
| d.draft.assets[].preview.mime | 否 | string |  |  |
| d.draft.assets[].preview.state | 否 | string |  |  |
| d.draft.assets[].preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "id": 1,
    "char_code": "char_night_walker",
    "ai": true,
    "state": "online",
    "pub_ver_id": 3,
    "draft_ver_id": null,
    "published": null,
    "draft": null
  }
}
```

---

<a id="admincharacterassetstatus"></a>
## 修改角色资产绑定状态

- **操作 ID**：`adminCharacterAssetStatus`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/assets/status`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer |  |  |
| binding_id | 是 | integer |  |  |
| state | 是 | string | enum: "online" / "offline" |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 角色资产绑定 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AssetBindingOutput |  |  |
| d.id | 否 | integer |  |  |
| d.ver_id | 否 | integer |  |  |
| d.asset_id | 否 | integer |  |  |
| d.role | 否 | string |  |  |
| d.access | 否 | string |  |  |
| d.preview_id | 否 | integer |  |  |
| d.price | 否 | number |  |  |
| d.state | 否 | string |  |  |
| d.sort | 否 | integer |  |  |
| d.asset | 否 | MediaAsset |  |  |
| d.asset.id | 否 | integer |  |  |
| d.asset.type | 否 | string |  |  |
| d.asset.mime | 否 | string |  |  |
| d.asset.state | 否 | string |  |  |
| d.asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.asset.owner_id | 否 | integer |  |  |
| d.asset.created_at | 否 | string | date-time |  |
| d.preview | 否 | object |  | 独立预览媒体资源；视频首帧和私密媒体预览通过此字段返回。 |
| d.preview.id | 否 | integer |  |  |
| d.preview.type | 否 | string | enum: "image" / "video" |  |
| d.preview.mime | 否 | string |  |  |
| d.preview.state | 否 | string |  |  |
| d.preview.ref | 否 | string | uri | 预览媒体的完整资源 URL。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "id": 20,
    "ver_id": 4,
    "asset_id": 7,
    "role": "gallery",
    "access": "public",
    "preview_id": null,
    "price": null,
    "state": "online",
    "sort": 0,
    "asset": null
  }
}
```

---

<a id="admincharacterassetremove"></a>
## 移除角色资产绑定

- **操作 ID**：`adminCharacterAssetRemove`
- **请求**：`POST https://testapi.weshow.cc/api/admin/characters/assets/remove`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| char_id | 是 | integer |  |  |
| binding_id | 是 | integer |  |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 资产绑定已移除 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AssetRemoveData |  |  |
| d.binding_id | 否 | integer |  |  |
| d.deleted | 否 | boolean |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "binding_id": 20,
    "deleted": true
  }
}
```

---
