# 范围与资料来源

## 项目范围

目标是在 `D:\JJ-TV\emora-admin` 开发 Emora 运营后台，技术栈为 React。界面参考现有 Emora 原型，业务范围以 Word 需求文档为主，接口字段以本地 OpenAPI 为准。

## 资料优先级

| 优先级 | 资料 | 用途 | 注意事项 |
|---:|---|---|---|
| 1 | `C:\Users\Administrator\Downloads\testwww.yogoshort.com\testwww.yogoshort.com\test-api-docs\openapi.yaml` | 请求路径、字段、响应和鉴权契约 | 只使用 `/admin/` 路径 |
| 2 | `C:\Users\Administrator\Downloads\2026.7.24 Emora 后台需求文档.docx` | 产品范围、页面功能和业务规则 | 不代表一定已有对应接口 |
| 3 | `C:\Users\Administrator\Downloads\emora\emora` | 视觉、布局和交互参考 | 原型内仍有旧品牌名 Luma，开发统一改为 Emora |

发生冲突时：接口调用按 OpenAPI；页面和业务按需求文档；视觉细节按原型。无法由资料确认的内容记录到待确认清单，不自行猜测。

## 接口环境

- 运行基址：`https://testapi.weshow.cc/api`
- OpenAPI：`3.0.3`
- 文档版本：`0.2.0`
- 后台接口：当前已登记 30 个，全部为 `POST`；其中会员权益查询/保存来自新版接口文档，字段契约待补充。
- 鉴权：`Authorization: Bearer <admin-token>`
- 连通性：已请求 `/api/admin/characters/list`，服务返回 HTTP 401 与 `Unauthenticated.`，证明域名和路由可达，业务访问需要有效后台 Token。

## 明确排除

- OpenAPI 中根路径 `/ai/*` 的 14 个 C 端聊天接口。
- 没有需求依据时，仅因 OpenAPI 存在而新增的页面。
- 没有接口依据时，自行杜撰的接口、字段或成功响应。
