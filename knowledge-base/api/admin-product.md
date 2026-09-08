# 商品与商业化接口

> 基址：`https://testapi.weshow.cc/api`  
> 鉴权：`Authorization: Bearer <admin-token>`  
> 本页共 5 个接口；全部使用 JSON POST。

## 目录

- [查询后台商品列表](#adminproductlist) — `/admin/products/list`
- [创建后台商品](#adminproductcreate) — `/admin/products/create`
- [编辑后台商品](#adminproductupdate) — `/admin/products/update`
- [上下架商品](#adminproductstatus) — `/admin/products/status`
- [下架后台商品](#adminproductdelete) — `/admin/products/delete`

<a id="adminproductlist"></a>
## 查询后台商品列表

- **操作 ID**：`adminProductList`
- **请求**：`POST https://testapi.weshow.cc/api/admin/products/list`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：仅管理员可访问。type=1 为金币商品，type=2 为会员订阅商品；status=1 为上架，status=0 为下架。 商品列表只读取本地 products 配置，不调用第三方商店。

### 请求字段

类型：`AdminProductListRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| keyword | 否 | string | maxLength: 100 |  |
| plate_form | 否 | integer | enum: 1 / 2 | 1 Android，2 iOS。 |
| type | 否 | integer | enum: 1 / 2 | 1 金币商品，2 会员订阅。 |
| status | 否 | integer | enum: 0 / 1 | 0 下架，1 上架。 |
| page | 否 | integer | default: 1; min: 1 |  |
| page_size | 否 | integer | default: 20; min: 1; max: 100 |  |

### 请求示例

```json
{
  "type": 2,
  "status": 1,
  "page": 1,
  "page_size": 20
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 成功 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`ApiResponse`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  | 业务码，0 表示成功 |
| m | 是 | string |  |  |
| d | 是 | - |  | 业务数据 |

---

<a id="adminproductcreate"></a>
## 创建后台商品

- **操作 ID**：`adminProductCreate`
- **请求**：`POST https://testapi.weshow.cc/api/admin/products/create`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：创建一条平台商品配置；商品类型和平台身份创建后不通过 update 修改。

### 请求字段

类型：`AdminProductCreateRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| plate_form | 是 | integer | enum: 1 / 2 |  |
| pkg_name | 是 | string | maxLength: 30 |  |
| product_id | 是 | string | maxLength: 100 |  |
| base_plan_id | 否 | string | maxLength: 100 |  |
| name | 是 | string | maxLength: 255 |  |
| price | 是 | string |  | 售价/原价，金额字符串。 |
| first_price | 否 | string |  | 会员首次优惠价；金币商品传 0。 |
| coin | 否 | integer | min: 0 | 金币数量；会员商品传 0。 |
| bonus | 否 | string |  | 赠送数量；会员商品传 0。 |
| type | 是 | integer | enum: 1 / 2 |  |
| status | 否 | integer | enum: 0 / 1; default: 1 |  |
| extra | 否 | object |  |  |

### 请求示例

```json
{
  "plate_form": 1,
  "pkg_name": "com.yogotv.app",
  "product_id": "demo_emora_coin_200",
  "name": "200 Coins",
  "price": "12.00",
  "coin": 200,
  "bonus": "20.00",
  "type": 1,
  "status": 1
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 成功 |
| 401 | 未登录或 token 无效 |
| 403 | 无权限 |
| 422 | 参数校验失败 |

成功响应结构：`ApiResponse`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| c | 是 | integer |  | 业务码，0 表示成功 |
| m | 是 | string |  |  |
| d | 是 | - |  | 业务数据 |

---

<a id="adminproductupdate"></a>
## 编辑后台商品

- **操作 ID**：`adminProductUpdate`
- **请求**：`POST https://testapi.weshow.cc/api/admin/products/update`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：只编辑名称、价格、金币数量、赠送数量和状态，保留商品平台身份与类型。

### 请求字段

类型：`AdminProductUpdateRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |
| name | 否 | string | maxLength: 255 |  |
| price | 否 | string |  |  |
| first_price | 否 | string |  |  |
| coin | 否 | integer | min: 0 |  |
| bonus | 否 | string |  |  |
| status | 否 | integer | enum: 0 / 1 |  |

### 请求示例

```json
{
  "id": 1,
  "name": "200 Coins",
  "price": "12.00",
  "coin": 200,
  "bonus": "20.00"
}
```

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 成功 |
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

---

<a id="adminproductstatus"></a>
## 上下架商品

- **操作 ID**：`adminProductStatus`
- **请求**：`POST https://testapi.weshow.cc/api/admin/products/status`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：status=0 为下架，status=1 为上架。

### 请求字段

类型：`AdminProductStatusRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |
| status | 是 | integer | enum: 0 / 1 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 成功 |
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

---

<a id="adminproductdelete"></a>
## 下架后台商品

- **操作 ID**：`adminProductDelete`
- **请求**：`POST https://testapi.weshow.cc/api/admin/products/delete`
- **鉴权**：Bearer Admin Token
- **Content-Type**：`application/json`
- **说明**：商品可能已被订单引用，delete 不物理删除，只将 status 置为 0。

### 请求字段

类型：`AdminProductDeleteRequest`

| 字段 | 必填 | 类型 | 约束 | 说明 |
|---|---:|---|---|---|
| id | 是 | integer | min: 1 |  |

### 响应

| 状态码 | 定义 |
|---:|---|
| 200 | 成功 |
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

---


### 商品扩展配置更新

`/admin/products/update` 支持可选 `extra`：JSON 对象或数组；显式传 `null` 清空，未传保留原值。新增和编辑页面均可填写；商品仅分 iOS/安卓及订阅/一次性商品，会员权益展示配置不属于商品类型。

订阅商品使用 `extra.subscription_type`，编码为 `1=周、2=月、3=年`，例如 `{"subscription_type":3}`。接口兼容纯数字字符串 `"1"`、`"2"`、`"3"`，后台下拉框写入整数。历史请求可不传该键；传入时不能为空或其他值。包含该键时，`original_price` 如有传入，必须是非负数字或数字字符串。该配置不替代支付平台的计费周期，更新时应携带需保留的其他 extra 字段。

商品响应增加顶层 `subscription_type`：订阅商品返回数字 `1`（周）、`2`（月）、`3`（年）；历史中文周期由服务端兼容读取，未配置、非法历史值或一次性商品返回 `null`。适用于后台商品列表及新增/编辑/状态/删除响应、`applePay/products` 的商品项、`ggPay/products` 的一次性商品项及 `subscription[].plans[]`；安卓订阅分组不提供单一周期。
