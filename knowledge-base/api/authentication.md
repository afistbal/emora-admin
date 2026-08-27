# 后台登录前置接口

> 基址：`https://testapi.weshow.cc/api`  
> 来源：本地 OpenAPI 3.0.3。以下两个 `/auth/` 接口是进入后台前获取 Bearer Token 的必要前置，不属于被排除的根 `/ai/*`。

## 发送邮箱验证码

`POST /auth/email/code`

请求：

```json
{
  "email": "admin@example.com"
}
```

成功响应的 `d`：

```json
{
  "challenge_id": "5c9a0d55-0c88-4d45-9309-6f26b39ac4f4",
  "expires_in": 600
}
```

## 邮箱验证码登录

`POST /auth/email/login`

请求：

```json
{
  "email": "admin@example.com",
  "challenge_id": "5c9a0d55-0c88-4d45-9309-6f26b39ac4f4",
  "code": "123456"
}
```

成功响应的 `d` 包含 `access_token`、`expires_at`、`user` 和 `is_new`。前端保存 `access_token` 后，再请求 `/admin/characters/list` 校验该账号是否具有后台权限；返回 403 时拒绝进入后台。

