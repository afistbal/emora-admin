# Emora Admin

Emora 运营后台，使用 React 19、React Router、Vite 6 与 Ant Design 6 开发。

## 当前约定

- 本地地址：`http://localhost:8666/`
- 使用 React Router 的 Browser History 路由：`/characters`、`/presets`、`/models`、`/users`、`/user-ledger`、`/messages`、`/orders`、`/subscriptions`、`/commerce`、`/analytics`、`/token-usage`、`/settings`。
- 未认证访问会跳转到 `/login`；本地存在 Token 时直接进入后台，真实业务接口返回 401/403 后清除 Token 并返回登录页。
- 开发与预览端口固定为 `8666`，端口被占用时直接报错。
- `npm run dev` 使用测试环境 API；`npm run prod` 与 `npm run build` 使用正式环境 API。实际基址统一维护在 `src/config/environments.json`。
- API 客户端只允许调用 `/admin/*`；根 `/ai/*` 被代码级拦截。
- 登录页使用 OpenAPI 的邮箱验证码接口：`/auth/email/code`、`/auth/email/login`；登录后再校验 Admin 权限。
- 接口失败或未认证时不展示原型 mock 数据。

## 命令

```bash
npm install
npm run dev
npm run validate
```

`npm run validate` 会检查知识库链接、后台接口的客户端覆盖和 Vite 生产构建；接口数量以命令的实际输出为准。

## 文档

开发前请从 [knowledge-base/README.md](./knowledge-base/README.md) 开始阅读。需求、原型和接口契约分别维护，未确认的对应关系不会被强行实现。
