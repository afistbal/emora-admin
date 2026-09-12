import environments from "../../config/environments.json";

// Umi 在构建时固化目标环境，继续复用原来的 dev/prod 接口配置，不改变任何请求契约。
const environmentKey = process.env.EMORA_ENV === "prod" ? "prod" : "dev";
export const API_ENVIRONMENT = environments[environmentKey];
export const API_BASE_URL = API_ENVIRONMENT.apiBaseUrl;

const TOKEN_KEY = "emora.admin.token";

export function getAdminToken() {
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  const value = token.trim();
  if (value) window.localStorage.setItem(TOKEN_KEY, value);
  else window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("emora:token-change", { detail: value }));
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const VALIDATION_FIELD_LABELS = {
  char_code: "角色名称",
  "data.name": "角色名称",
  ver: "角色卡版本",
  data: "角色数据",
  cover_asset_id: "角色封面",
  assets: "角色资产",
};

function firstValidationError(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  for (const [field, messages] of Object.entries(data)) {
    const message = Array.isArray(messages) ? messages.find((item) => typeof item === "string") : messages;
    if (typeof message === "string" && message.trim()) return { field, message: message.trim() };
  }

  return null;
}

/**
 * 将后端 422 校验明细转换成管理员可直接处理的提示，避免只展示笼统的 Validation failed。
 */
export function getApiErrorMessage(error, fallback = "请求失败，请稍后重试") {
  const validationError = firstValidationError(error instanceof ApiError ? error.data : null);
  if (validationError) {
    const fieldLabel = VALIDATION_FIELD_LABELS[validationError.field] || validationError.field;
    const detail = validationError.message;

    if (/already been taken|already exists/i.test(detail)) {
      return `${fieldLabel}已存在，请修改后重试`;
    }
    if (/required|must be present/i.test(detail)) return `${fieldLabel}不能为空`;
    if (/must not be greater than\s+(\d+)\s+characters/i.test(detail)) {
      const [, limit] = detail.match(/must not be greater than\s+(\d+)\s+characters/i) || [];
      return `${fieldLabel}不能超过 ${limit} 个字符`;
    }

    return `${fieldLabel}：${detail}`;
  }

  const message = error instanceof Error ? error.message.trim() : "";
  return message && !/^validation failed\.?$/i.test(message) ? message : fallback;
}

async function jsonPost(path, body = {}, options = {}) {
  const token = options.withToken === false ? "" : getAdminToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (token && options.withToken !== false && (response.status === 401 || response.status === 403)) {
    // 不再额外请求角色列表验证权限；由真实业务请求的鉴权结果统一通知后台退出登录。
    window.dispatchEvent(new CustomEvent("emora:admin-auth-invalid", {
      detail: { status: response.status },
    }));
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(`接口返回了非 JSON 内容（HTTP ${response.status}）`, {
      status: response.status,
    });
  }

  if (!response.ok || payload?.c !== 0) {
    throw new ApiError(payload?.m || `请求失败（HTTP ${response.status}）`, {
      status: response.status,
      code: payload?.c,
      data: payload?.d,
    });
  }

  return payload.d;
}

export function adminPost(path, body = {}, options = {}) {
  if (!path.startsWith("/admin/")) {
    throw new Error(`拒绝调用非后台接口：${path}`);
  }
  return jsonPost(path, body, options);
}

function authPost(path, body = {}, options = {}) {
  if (!["/auth/email/code", "/auth/email/login"].includes(path)) {
    throw new Error(`拒绝调用未批准的认证接口：${path}`);
  }
  return jsonPost(path, body, { ...options, withToken: false });
}

async function uploadMediaFile(file, charCode) {
  const policy = await adminPost("/admin/media/upload-policy", {
    type: file.type.startsWith("video/") ? "video" : "image",
    mime: file.type || "application/octet-stream",
    filename: file.name,
    ...(charCode ? { char_code: charCode } : {}),
  });
  const form = new FormData();
  for (const [key, value] of Object.entries(policy.fields || {})) form.append(key, String(value));
  form.append("file", file);
  const uploadUrl = String(policy.url || "").trim();
  if (!uploadUrl) throw new ApiError("上传凭证无效，请重试");
  const upload = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });
  if (!upload.ok) {
    throw new ApiError(`图片上传失败（HTTP ${upload.status}）`, { status: upload.status });
  }
  const registered = await adminPost("/admin/media/upload", {
    type: file.type.startsWith("video/") ? "video" : "image",
    mime: file.type || "application/octet-stream",
    ref: policy.key,
  });
  return registered.asset;
}

export const adminApi = {
  auth: {
    sendEmailCode: (params, options) => authPost("/auth/email/code", params, options),
    emailLogin: (params, options) => authPost("/auth/email/login", params, options),
  },
  characters: {
    list: (params, options) => adminPost("/admin/characters/list", params, options),
    detail: (params, options) => adminPost("/admin/characters/detail", params, options),
    versions: (params, options) => adminPost("/admin/characters/versions", params, options),
    create: (params, options) => adminPost("/admin/characters/create", params, options),
    updateJson: (params, options) => adminPost("/admin/characters/json/update", params, options),
    saveDraft: (params, options) => adminPost("/admin/characters/draft/save", params, options),
    publish: (params, options) => adminPost("/admin/characters/publish", params, options),
    rollback: (params, options) => adminPost("/admin/characters/rollback", params, options),
    remove: (params, options) => adminPost("/admin/characters/delete", params, options),
    setAssetStatus: (params, options) => adminPost("/admin/characters/assets/status", params, options),
    removeAsset: (params, options) => adminPost("/admin/characters/assets/remove", params, options),
  },
  media: {
    list: (params, options) => adminPost("/admin/media/list", params, options),
    registerUpload: (params, options) => adminPost("/admin/media/upload", params, options),
    uploadPolicy: (params, options) => adminPost("/admin/media/upload-policy", params, options),
    uploadFile: uploadMediaFile,
  },
  presets: {
    list: (params, options) => adminPost("/admin/ai/presets/list", params, options),
    create: (params, options) => adminPost("/admin/ai/presets/create", params, options),
    update: (params, options) => adminPost("/admin/ai/presets/update", params, options),
    status: (params, options) => adminPost("/admin/ai/presets/status", params, options),
    remove: (params, options) => adminPost("/admin/ai/presets/delete", params, options),
  },
  modelConfig: {
    list: (params = {}, options) => adminPost("/admin/ai/model-config/list", params, options),
    saveProvider: (params, options) => adminPost("/admin/ai/model-config/provider/save", params, options),
    providerStatus: (params, options) => adminPost("/admin/ai/model-config/provider/status", params, options),
    saveRoute: (params, options) => adminPost("/admin/ai/model-config/route/save", params, options),
    routeStatus: (params, options) => adminPost("/admin/ai/model-config/route/status", params, options),
    deleteRoute: (params, options) => adminPost("/admin/ai/model-config/route/delete", params, options),
    deleteProvider: (providerId, params = {}, options) => adminPost("/admin/ai/model-config/provider/delete", { ...params, id: Number(providerId) }, options),
  },
  users: {
    list: (params, options) => adminPost("/admin/users/list", params, options),
    detail: (params, options) => adminPost("/admin/users/detail", params, options),
    adminStatus: (params, options) => adminPost("/admin/users/admin/status", params, options),
    resetFreeQuota: (params, options) => adminPost("/admin/users/free-quota/reset", params, options),
    accountStatus: (params, options) => adminPost("/admin/users/status", params, options),
    walletHistory: (params, options) => adminPost("/admin/users/wallet/history", params, options),
    walletFlows: (params, options) => adminPost("/admin/users/wallet/flows", params, options),
    grantCoins: (params, options) => adminPost("/admin/users/coins/grant", params, options),
  },
  billing: {
    orders: (params, options) => adminPost("/admin/orders/list", params, options),
    subscriptions: (params, options) => adminPost("/admin/subscriptions/list", params, options),
  },
  messages: {
    list: (params, options) => adminPost("/admin/messages/list", params, options),
    detail: (params, options) => adminPost("/admin/messages/detail", params, options),
  },
  feedback: {
    list: (params, options) => adminPost("/admin/feedback/list", params, options),
  },
  products: {
    list: (params, options) => adminPost("/admin/products/list", params, options),
    create: (params, options) => adminPost("/admin/products/create", params, options),
    update: (params, options) => adminPost("/admin/products/update", params, options),
    status: (params, options) => adminPost("/admin/products/status", params, options),
    remove: (params, options) => adminPost("/admin/products/delete", params, options),
  },
  settings: {
    list: (params = {}, options) => adminPost("/admin/settings/list", params, options),
    create: (params, options) => adminPost("/admin/settings/create", params, options),
    update: (params, options) => adminPost("/admin/settings/update", params, options),
    commerceBenefits: (params = {}, options) => adminPost("/admin/settings/commerce/benefits", params, options),
    saveCommerceBenefits: (params, options) => adminPost("/admin/settings/commerce/benefits/save", params, options),
    dialogueRules: (params = {}, options) => adminPost("/admin/settings/dialogue-rules", params, options),
    saveDialogueRules: (params, options) => adminPost("/admin/settings/dialogue-rules/save", params, options),
    mediaSystemPrompts: (params = {}, options) => adminPost("/admin/settings/media-system-prompts", params, options),
    saveMediaSystemPrompt: (params, options) => adminPost("/admin/settings/media-system-prompts/save", params, options),
  },
  analytics: {
    query: (params, options) => adminPost("/admin/analytics/query", params, options),
  },
};
