export const API_BASE_URL = "https://testapi.weshow.cc/api";

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
    saveDraft: (params, options) => adminPost("/admin/characters/draft/save", params, options),
    publish: (params, options) => adminPost("/admin/characters/publish", params, options),
    rollback: (params, options) => adminPost("/admin/characters/rollback", params, options),
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
    walletHistory: (params, options) => adminPost("/admin/users/wallet/history", params, options),
    grantCoins: (params, options) => adminPost("/admin/users/coins/grant", params, options),
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
    commerceBenefits: (params = {}, options) => adminPost("/admin/settings/commerce/benefits", params, options),
    saveCommerceBenefits: (params, options) => adminPost("/admin/settings/commerce/benefits/save", params, options),
  },
  analytics: {
    query: (params, options) => adminPost("/admin/analytics/query", params, options),
  },
};
