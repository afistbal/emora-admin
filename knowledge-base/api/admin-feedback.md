# 用户反馈接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 1 个接口；全部使用 JSON POST。

## 目录

- [查询用户反馈列表](#adminfeedbacklist) — `/admin/feedback/list`

<a id="adminfeedbacklist"></a>
## 查询用户反馈列表

- **操作 ID**：`adminFeedbackList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/feedback/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：查询已登录用户提交的帮助与反馈。仅管理员可访问，默认按提交时间倒序返回。 一期只提供分页查询，不提供详情、回复、状态流转或删除操作。

### 请求字段

类型：`AdminFeedbackListRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| page | 否 | integer | default: 1; min: 1 |  |
| page_size | 否 | integer | default: 20; min: 1; max: 100 |  |

### 请求示例

```json
{
  "page": 1,
  "page_size": 20
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | AdminFeedbackListSuccess |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

---

