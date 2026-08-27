# 媒体资产接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 3 个接口；全部使用 JSON POST。

## 目录

- [查询媒体资产](#adminmedialist) — `/admin/media/list`
- [登记 COS/OSS 上传结果](#adminmediaregister) — `/admin/media/upload`
- [获取 COS/OSS 表单直传凭证](#adminmediauploadpolicy) — `/admin/media/upload-policy`

<a id="adminmedialist"></a>
## 查询媒体资产

- **操作 ID**：`adminMediaList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/media/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`

### 请求字段

类型：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string |  |  |
| type | 否 | string | enum: "image" / "video" |  |
| state | 否 | string | enum: "ready" / "online" / "offline" |  |
| page | 否 | integer | min: 1 |  |
| page_size | 否 | integer | min: 1; max: 100 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 媒体资产列表 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | MediaListData |  |  |
| d.items | 否 | array<MediaAsset> |  |  |
| d.items[].id | 否 | integer |  |  |
| d.items[].type | 否 | string |  |  |
| d.items[].mime | 否 | string |  |  |
| d.items[].state | 否 | string |  |  |
| d.items[].ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.items[].preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.items[].owner_id | 否 | integer |  |  |
| d.items[].created_at | 否 | string | date-time |  |
| d.page | 否 | integer |  |  |
| d.page_size | 否 | integer |  |  |
| d.total | 否 | integer |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "items": [
      {
        "id": 7,
        "type": "image",
        "mime": "image/png",
        "state": "ready",
        "ref": "https://cos.yogoshort.com/characters/cover.png",
        "preview_ref": null,
        "owner_id": null,
        "created_at": "2026-08-01T10:00:00.000000Z"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1
  }
}
```

---

<a id="adminmediaregister"></a>
## 登记 COS/OSS 上传结果

- **操作 ID**：`adminMediaRegister`
- **请求**：`POST https://testapi.weshow.cc/api/admin/media/upload`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：前端直接上传 COS/OSS 后，将系统返回的资源路径登记到 Emora。 本接口不接受 multipart 文件，不访问 COS/OSS，也不改写 ref。 

### 请求字段

类型：`MediaRegisterRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| type | 是 | string | enum: "image" / "video" |  |
| mime | 是 | string | maxLength: 100 |  |
| ref | 是 | string | maxLength: 500 | COS/OSS 资源填写域名后的 object path，例如 characters/cover.png； 外站资源填写完整 URI。不要填写 cos:// 或 oss:// scheme。 |
| preview_ref | 否 | string | maxLength: 500 | 与 ref 相同的引用规则；视频场景可作为 Poster 引用。 |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 媒体登记结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | MediaRegisterData |  |  |
| d.asset | 否 | MediaAsset |  |  |
| d.asset.id | 否 | integer |  |  |
| d.asset.type | 否 | string |  |  |
| d.asset.mime | 否 | string |  |  |
| d.asset.state | 否 | string |  |  |
| d.asset.ref | 否 | string | uri | 角色管理接口返回的完整资源 URL。 |
| d.asset.preview_ref | 否 | string | uri | 视频 Poster 或预览资源的完整 URL。 |
| d.asset.owner_id | 否 | integer |  |  |
| d.asset.created_at | 否 | string | date-time |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "asset": {
      "id": 7,
      "type": "image",
      "mime": "image/png",
      "state": "ready",
      "ref": "https://cos.yogoshort.com/characters/cover.png",
      "preview_ref": null,
      "owner_id": null,
      "created_at": "2026-08-01T10:00:00.000000Z"
    }
  }
}
```

---

<a id="adminmediauploadpolicy"></a>
## 获取 COS/OSS 表单直传凭证

- **操作 ID**：`adminMediaUploadPolicy`
- **请求**：`POST https://testapi.weshow.cc/api/admin/media/upload-policy`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：返回一次性对象路径和 COS/OSS 表单字段。浏览器使用这些字段 直接上传文件到 COS/OSS，成功后再调用 adminMediaRegister 登记资源。 Emora API 不接收文件字节。 

### 请求字段

类型：`MediaUploadPolicyRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| type | 是 | string | enum: "image" / "video" |  |
| mime | 是 | string | maxLength: 100 |  |
| filename | 是 | string | maxLength: 200 | 原始文件名，仅用于生成扩展名和调试信息。 |
| char_code | 否 | string | maxLength: 64 | 用于生成角色资源 object path 的目录片段。 |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | COS/OSS 表单直传凭证 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | MediaUploadPolicyData |  |  |
| d.url | 是 | string | uri |  |
| d.key | 是 | string |  | 本次直传固定使用的 COS object path。 |
| d.filename | 否 | string |  |  |
| d.mime | 否 | string |  |  |
| d.fields | 是 | object |  | 追加到 multipart/form-data 的 COS 表单字段。 |
| d.expires_at | 是 | string | date-time |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "url": "https://example-bucket.cos.ap-guangzhou.myqcloud.com",
    "key": "characters/char_summer_note/gallery/550e8400-e29b-41d4-a716-446655440000.png",
    "filename": "cover.png",
    "mime": "image/png",
    "fields": {
      "key": "characters/char_summer_note/gallery/550e8400-e29b-41d4-a716-446655440000.png",
      "q-sign-algorithm": "sha1",
      "q-ak": "AKIDEXAMPLE",
      "q-sign-time": "1787037000;1787037600",
      "q-key-time": "1787037000;1787037600",
      "policy": "base64-policy",
      "q-signature": "signature"
    },
    "expires_at": "2026-08-18T08:00:00+00:00"
  }
}
```

---

