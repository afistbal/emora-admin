# 用户与金币接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 8 个接口；全部使用 JSON POST。

## 目录

- [查询后台用户列表](#adminuserlist) — `/admin/users/list`
- [查询后台用户详情](#adminuserdetail) — `/admin/users/detail`
- [设置或取消管理员](#adminuseradminstatus) — `/admin/users/admin/status`
- [查询用户金币流水](#adminuserwallethistory) — `/admin/users/wallet/history`
- [查询全局用户流水](#adminuserwalletflows) — `/admin/users/wallet/flows`
- [后台补发金币](#adminusergrantcoins) — `/admin/users/coins/grant`
- [重置用户今日免费额度](#adminuserresetfreequota) — `/admin/users/free-quota/reset`
- [封禁或解除封禁用户](#adminuseraccountstatus) — `/admin/users/status`

<a id="adminuserlist"></a>
## 查询后台用户列表

- **操作 ID**：`adminUserList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：仅管理员可访问。user_id 返回 users.unique_id；当其为空时回退为 users.id。session_count 当前为 null，等待消息服务提供统一统计接口；数据库 `users.status` 使用 `1=正常、0=已封禁`，接口继续返回字符串枚举以保持兼容。

### 请求字段

类型：`AdminUserListRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string | maxLength: 100 | 按 users.unique_id、users.id 或昵称模糊查询。 |
| page | 否 | integer | default: 1; min: 1 |  |
| page_size | 否 | integer | default: 20; min: 1; max: 100 |  |

### 请求示例

```json
{
  "keyword": "u_8f2k1a90",
  "page": 1,
  "page_size": 20
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台用户列表 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AdminUserListData |  |  |
| d.items | 是 | array<AdminUserListItem> |  |  |
| d.items[].user_id | 是 | string |  | users.unique_id；为空时回退为 users.id 字符串。 |
| d.items[].internal_id | 是 | integer |  |  |
| d.items[].nickname | 是 | string |  |  |
| d.items[].registered_at | 是 | integer |  | Unix timestamp。 |
| d.items[].is_vip | 是 | boolean |  |  |
| d.items[].vip_expires_at | 否 | integer |  |  |
| d.items[].is_admin | 是 | boolean |  | 是否为管理员。 |
| d.items[].coin_balance | 是 | integer |  |  |
| d.items[].session_count | 是 | integer |  | 等消息服务接口接入后填充。 |
| d.items[].status | 是 | string | enum: "normal" / "blocked" | 正常或已封禁。 |
| d.page | 是 | integer |  |  |
| d.page_size | 是 | integer |  |  |
| d.total | 是 | integer |  |  |
| d.keyword | 是 | string |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "items": [
      {
        "user_id": "u_8f2k1a90",
        "internal_id": 12,
        "nickname": "深夜电台常客",
        "registered_at": 1780368000,
        "is_vip": true,
        "vip_expires_at": 1785628800,
        "coin_balance": 1280,
        "session_count": null,
        "status": "normal"
      }
    ],
    "page": 1,
    "page_size": 20,
    "total": 1,
    "keyword": "u_8f2k1a90"
  }
}
```

---

<a id="adminuseradminstatus"></a>
## 设置或取消管理员

- **操作 ID**：`adminUserAdminStatus`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/admin/status`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：仅管理员可访问。不能取消当前操作者自己的管理员权限，也不能取消最后一个管理员的权限。

### 请求字段

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| user_id | 是 | string | maxLength: 100 | users.unique_id；也支持传数字 users.id。 |
| is_admin | 是 | boolean |  | `true` 设置管理员，`false` 取消管理员。 |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 管理员状态更新成功 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 用户不存在 |
| 409 | 不允许取消当前操作者或最后一个管理员 |
| 422 | 参数校验失败 |

成功响应数据：

```json
{
  "user_id": "u_8f2k1a90",
  "internal_id": 12,
  "is_admin": true
}
```

---

<a id="adminuserdetail"></a>
## 查询后台用户详情

- **操作 ID**：`adminUserDetail`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/detail`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：user_id 支持 users.unique_id 或数字 users.id。

### 请求字段

类型：`AdminUserIdentifierRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| user_id | 是 | string | maxLength: 100 | users.unique_id；也支持传数字 users.id。 |

### 请求示例

```json
{
  "user_id": "u_8f2k1a90"
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台用户详情 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AdminUserDetailData |  |  |
| d.user_id | 是 | string |  |  |
| d.internal_id | 是 | integer |  |  |
| d.is_admin | 是 | boolean |  | 是否为管理员。 |
| d.profile | 是 | AdminUserProfile |  |  |
| d.profile.nickname | 否 | string |  |  |
| d.profile.email | 否 | string | email |  |
| d.profile.gender | 否 | string |  |  |
| d.profile.age_range | 否 | string |  |  |
| d.profile.avatar | 否 | string |  |  |
| d.profile.bio | 否 | string |  |  |
| d.profile.registration_channel | 否 | string |  | 当前用户表未记录来源，待用户身份来源设计确定。 |
| d.profile.registered_at | 否 | integer |  | Unix timestamp。 |
| d.membership | 是 | AdminUserMembership |  |  |
| d.membership.is_vip | 否 | boolean |  |  |
| d.membership.vip_expires_at | 否 | integer |  | Unix timestamp；详情页无论当前是否仍为 VIP 都展示已记录的有效期，未记录时显示空值。 |
| d.wallet | 是 | AdminUserWallet |  |  |
| d.wallet.balance | 否 | integer |  |  |
| d.wallet.total | 否 | integer |  |  |
| d.wallet.buy_total | 否 | integer |  |  |
| d.wallet.reward_total | 否 | integer |  |  |
| d.session_count | 是 | integer |  |  |
| d.status | 是 | string | enum: "normal" / "blocked" | 正常或已封禁。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "user_id": "u_8f2k1a90",
    "internal_id": 12,
    "profile": {
      "nickname": "深夜电台常客",
      "email": "user@example.com",
      "gender": "男性",
      "age_range": null,
      "avatar": null,
      "bio": null,
      "registration_channel": null,
      "registered_at": 1780368000
    },
    "membership": {
      "is_vip": true,
      "vip_expires_at": 1785628800
    },
    "wallet": {
      "balance": 1280,
      "total": 2000,
      "buy_total": 1800,
      "reward_total": 200
    },
    "session_count": null,
    "status": "normal"
  }
}
```

---

<a id="adminuserresetfreequota"></a>
## 重置用户今日免费额度

- **操作 ID**：`adminUserResetFreeQuota`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/free-quota/reset`
- **鉴权**：Bearer Admin Token
- **说明**：`ai.access.free_text_daily_limit` 定义每位非会员用户每天的免费次数。本接口不修改该配置，只按 `AI_QUOTA_TIMEZONE` 确定当天，将目标用户的已使用次数归零。操作与聊天额度扣减使用相同加锁顺序，并写入后台用户操作审计。

请求体：

```json
{ "user_id": "12" }
```

成功响应数据：

```json
{
  "user_id": "u_8f2k1a90",
  "internal_id": 12,
  "usage_date": "2026-09-10",
  "previous_used_count": 7,
  "used_count": 0,
  "free_limit": 10
}
```

状态码：200 成功；401 未登录；403 无管理员权限；404 用户不存在；422 参数错误。

---

<a id="adminuseraccountstatus"></a>
## 封禁或解除封禁用户

- **操作 ID**：`adminUserAccountStatus`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/status`
- **鉴权**：Bearer Admin Token
- **说明**：`is_blocked=true` 时封禁并撤销目标用户全部 Sanctum Token；封禁用户登录和携带尚未失效 Token 的请求统一返回 HTTP 401、`c=401`、`reason=account_blocked`。普通无效或过期 Token 同样返回 HTTP 401，但没有该 reason。禁止封禁自己，并保证至少保留一个正常管理员。封禁和解封均写操作审计。

请求体：

```json
{ "user_id": "12", "is_blocked": true }
```

成功响应数据：

```json
{
  "user_id": "u_8f2k1a90",
  "internal_id": 12,
  "status": "blocked",
  "is_blocked": true
}
```

状态码：200 成功；401 未登录；403 无管理员权限；404 用户不存在；409 禁止自封或会导致无可用管理员；422 参数错误。

---

<a id="adminuserwallethistory"></a>
## 查询用户金币流水

- **操作 ID**：`adminUserWalletHistory`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/wallet/history`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：返回不可变金币账本。type 为账本方向：1 表示增加，2 表示扣减；source_type 用于进一步筛选 purchase、generation_charge、admin_adjustment 等来源。

### 请求字段

类型：`AdminUserHistoryRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| user_id | 是 | string | maxLength: 100 | users.unique_id；也支持传数字 users.id。 |
| cursor | 否 | string |  | opaque cursor，直接透传上一次响应的 next_cursor。 |
| page_size | 否 | integer | default: 20; min: 1; max: 50 |  |
| type | 否 | integer | enum: 1 / 2 | 账本方向，1 增加，2 扣减。 |
| source_type | 否 | string | maxLength: 50 |  |

### 请求示例

```json
{
  "user_id": "u_8f2k1a90",
  "page_size": 20,
  "source_type": "admin_adjustment"
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 用户金币流水 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AdminUserHistoryData |  |  |
| d.user_id | 是 | string |  |  |
| d.items | 是 | array<AdminUserHistoryItem> |  |  |
| d.items[].id | 否 | integer |  |  |
| d.items[].change | 否 | integer |  |  |
| d.items[].balance_after | 否 | integer |  |  |
| d.items[].type | 否 | integer | enum: 1 / 2 |  |
| d.items[].source_type | 否 | string |  |  |
| d.items[].title_key | 否 | string |  |  |
| d.items[].note | 否 | string |  |  |
| d.items[].target | 否 | integer |  |  |
| d.items[].occurred_at | 否 | integer |  | Unix timestamp。 |
| d.next_cursor | 是 | string |  |  |
| d.has_more | 是 | boolean |  |  |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "user_id": "u_8f2k1a90",
    "items": [
      {
        "id": 20,
        "change": 100,
        "balance_after": 1380,
        "type": 1,
        "source_type": "admin_adjustment",
        "title_key": "admin_adjustment",
        "note": "客服补偿",
        "target": null,
        "occurred_at": 1786415100
      }
    ],
    "next_cursor": null,
    "has_more": false
  }
}
```

---

<a id="adminuserwalletflows"></a>
## 查询全局用户流水

- **操作 ID**：`adminUserWalletFlows`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/wallet/flows`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：供运营管理中的“用户流水”页面使用。按不可变金币流水 ID 倒序分页，并在同一次查询中返回关联用户信息；不会逐条请求用户详情。

### 请求字段

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string | maxLength: 100 | 按用户内部 ID、unique_id、user_uuid、邮箱或昵称查询。 |
| type | 否 | integer | enum: 1 / 2 | 流水方向：1 收入，2 支出。 |
| page | 否 | integer | default: 1; min: 1 | 页码。 |
| page_size | 否 | integer | default: 20; min: 1; max: 100 | 每页数量。 |

### 请求示例

```json
{
  "keyword": "1234567890",
  "type": 2,
  "page": 1,
  "page_size": 20
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 全局用户流水列表 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应数据：

```json
{
  "items": [
    {
      "id": 21,
      "internal_user_id": 12,
      "user_id": "u_8f2k1a90",
      "user_uuid": "1234567890",
      "nickname": "深夜电台常客",
      "email": "user@example.com",
      "change": -20,
      "balance_after": 1360,
      "type": 2,
      "source_type": "generation_charge",
      "title_key": "generation_charge",
      "note": null,
      "target": 601,
      "occurred_at": 1786415200
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1,
  "keyword": "1234567890",
  "type": 2
}
```

---

<a id="adminusergrantcoins"></a>
## 后台补发金币

- **操作 ID**：`adminUserGrantCoins`
- **请求**：`POST https://testapi.weshow.cc/api/admin/users/coins/grant`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：使用金币账本的事务和幂等能力写入一笔 admin_adjustment。当前沿用统一 admin 管理员校验，不引入细粒度 RBAC；额度上限和会员等其他高危操作不在本接口处理。

### 请求字段

类型：`AdminUserGrantCoinsRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| user_id | 是 | string | maxLength: 100 |  |
| amount | 是 | integer | min: 1 |  |
| note | 否 | string | default: "后台补币"; maxLength: 255 |  |
| idempotency_key | 是 | string | maxLength: 120 | 调用方生成的幂等键。 |

### 请求示例

```json
{
  "user_id": "u_8f2k1a90",
  "amount": 100,
  "note": "客服补偿",
  "idempotency_key": "admin-grant-u_8f2k1a90-20260811-001"
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 后台补币结果 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在或当前用户无权访问 |
| 422 | 参数校验失败 |

成功响应结构：`object`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  |  |
| m | 是 | string |  |  |
| d | 是 | AdminUserGrantCoinsData |  |  |
| d.ledger_id | 是 | integer |  |  |
| d.change | 是 | integer |  |  |
| d.balance_after | 是 | integer |  |  |
| d.already_processed | 是 | boolean |  | 是否命中已有幂等流水。 |

成功响应示例：

```json
{
  "c": 0,
  "m": null,
  "d": {
    "ledger_id": 20,
    "change": 100,
    "balance_after": 1380,
    "already_processed": false
  }
}
```

---

