# Emora 后台知识库

本目录是 Emora React 后台开发的唯一事实入口。产品要求、原型说明和接口契约分别保存，不能因为某个页面存在就假设一定有接口，也不能因为接口存在就强行增加产品页面。

## 阅读顺序

1. [范围与资料来源](./00-scope-and-sources.md)
2. [Word 需求原文抽取](./product/source-word-extract.md)
3. [后台产品需求（原型整理稿）](./product/admin-requirements.md)
4. [原型功能设计](./product/prototype-functional-design.md)
5. [数据埋点](./product/analytics-events.md)
6. [Admin API 总索引](./api/README.md)
   - [后台邮箱登录前置接口](./api/authentication.md)
7. [需求与接口覆盖矩阵](./mapping/requirements-api-coverage.md)
8. [待确认事项](./mapping/open-questions.md)
9. [第一版实现状态](./mapping/implementation-status.md)

## 开发硬规则

- API 运行基址固定为 `https://testapi.weshow.cc/api`。
- 只接入 OpenAPI 中以 `/admin/` 开头的接口。
- 登录流程例外接入 `/auth/email/code` 与 `/auth/email/login`，用于获取访问 `/admin/*` 所需的 Bearer Token。
- `/admin/ai/presets/*` 属于后台接口，需要保留。
- 根路径 `/ai/*` 属于 C 端聊天能力，本后台不接入。
- 接口文档是技术契约，产品文档是页面与业务依据；两者不要求一一对应。
- 没有明确接口的产品功能先保留交互或标记待接，不编造请求路径和字段。
- 没有明确产品页面的接口只登记为后台能力，不擅自新增菜单。
