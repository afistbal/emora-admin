import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const yamlModule = process.env.YAML_MODULE || "yaml";
const { parse } = await import(
  yamlModule.startsWith("file:") ? yamlModule : `file:///${yamlModule.replaceAll("\\", "/")}`
);

const sourcePath = process.env.EMORA_OPENAPI;
const knowledgeRoot = process.env.KB_ROOT;

if (!sourcePath || !knowledgeRoot) {
  throw new Error("EMORA_OPENAPI and KB_ROOT are required");
}

const source = fs.readFileSync(sourcePath, "utf8");
const spec = parse(source);
const apiDir = path.join(knowledgeRoot, "api");
fs.mkdirSync(apiDir, { recursive: true });

const schemas = spec.components?.schemas || {};
const responses = spec.components?.responses || {};
const refName = (ref) => ref?.split("/").pop() || "";

function dereference(value, kind = "schema") {
  if (!value?.$ref) return value || {};
  const name = refName(value.$ref);
  return (kind === "response" ? responses[name] : schemas[name]) || value;
}

function mergeSchema(schema, seen = new Set()) {
  if (!schema) return {};
  if (schema.$ref) {
    const name = refName(schema.$ref);
    if (seen.has(name)) return { $ref: schema.$ref };
    const next = new Set(seen);
    next.add(name);
    return mergeSchema(schemas[name] || schema, next);
  }

  let output = { ...schema };
  if (schema.allOf) {
    output = { ...output, properties: {}, required: [] };
    for (const part of schema.allOf) {
      const merged = mergeSchema(part, new Set(seen));
      Object.assign(output.properties, merged.properties || {});
      output.required.push(...(merged.required || []));
      for (const [key, value] of Object.entries(merged)) {
        if (!["properties", "required", "allOf"].includes(key) && output[key] === undefined) {
          output[key] = value;
        }
      }
    }
    output.required = [...new Set(output.required)];
    delete output.allOf;
  }
  return output;
}

function typeOf(raw) {
  if (!raw) return "-";
  if (raw.$ref) return refName(raw.$ref);
  const schema = mergeSchema(raw);
  if (schema.type === "array") return `array<${typeOf(schema.items)}>`;
  return schema.type || (schema.properties || schema.allOf ? "object" : "-");
}

function constraints(schema) {
  const values = [];
  if (schema.format) values.push(schema.format);
  if (schema.enum) values.push(`enum: ${schema.enum.map((item) => JSON.stringify(item)).join(" / ")}`);
  if (schema.default !== undefined) values.push(`default: ${JSON.stringify(schema.default)}`);
  if (schema.minimum !== undefined) values.push(`min: ${schema.minimum}`);
  if (schema.maximum !== undefined) values.push(`max: ${schema.maximum}`);
  if (schema.minLength !== undefined) values.push(`minLength: ${schema.minLength}`);
  if (schema.maxLength !== undefined) values.push(`maxLength: ${schema.maxLength}`);
  return values.join("; ");
}

function schemaRows(raw, prefix = "", depth = 0, seen = new Set()) {
  if (!raw || depth > 4) return [];
  const name = raw.$ref ? refName(raw.$ref) : "";
  if (name && seen.has(name)) return [];
  const next = new Set(seen);
  if (name) next.add(name);

  const schema = mergeSchema(raw);
  const required = new Set(schema.required || []);
  const rows = [];

  for (const [key, value] of Object.entries(schema.properties || {})) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const merged = mergeSchema(value);
    rows.push([
      fieldPath,
      required.has(key) ? "是" : "否",
      typeOf(value),
      constraints(merged),
      String(merged.description || value.description || "").replaceAll("\n", " "),
    ]);

    if (depth >= 4) continue;
    if (value.$ref || merged.type === "object" || merged.properties) {
      rows.push(...schemaRows(value, fieldPath, depth + 1, next));
    } else if (
      merged.type === "array" &&
      (merged.items?.$ref || mergeSchema(merged.items).properties)
    ) {
      rows.push(...schemaRows(merged.items, `${fieldPath}[]`, depth + 1, next));
    }
  }
  return rows;
}

const escapeCell = (value) =>
  String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", "<br>");

function markdownTable(rows) {
  if (!rows.length) return "_该结构没有可展开字段，详见类型名或示例。_\n";
  return [
    "| 字段 | 必填 | 类型 | 约束 | 说明 |",
    "|---|---:|---|---|---|",
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
    "",
  ].join("\n");
}

function resolvedResponse(response) {
  if (!response) return {};
  return response.$ref ? dereference(response, "response") : response;
}

const adminOperations = [];
for (const [route, pathItem] of Object.entries(spec.paths || {})) {
  if (!route.startsWith("/admin/")) continue;
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    adminOperations.push({ route, method: method.toUpperCase(), operation });
  }
}

const groups = {
  "Admin Character": ["admin-character.md", "角色与版本"],
  "Admin Media": ["admin-media.md", "媒体资产"],
  "AI Presets": ["admin-presets.md", "生成预设"],
  "Admin User": ["admin-user.md", "用户与金币"],
  "Admin Feedback": ["admin-feedback.md", "用户反馈"],
  "Admin Product": ["admin-product.md", "商品与商业化"],
  Analytics: ["admin-analytics.md", "后台统计"],
};

for (const [tag, [filename, title]] of Object.entries(groups)) {
  const operations = adminOperations.filter(({ operation }) =>
    (operation.tags || []).includes(tag),
  );

  let markdown = `# ${title}接口\n\n`;
  markdown += "> 基址：`https://testapi.weshow.cc/api`  \n";
  markdown += "> 鉴权：`Authorization: Bearer <admin-token>`  \n";
  markdown += `> 本页共 ${operations.length} 个接口；全部使用 JSON POST。\n\n`;
  markdown += "## 目录\n\n";
  markdown += operations
    .map(
      ({ route, operation }) =>
        `- [${operation.summary}](#${operation.operationId.toLowerCase()}) — \`${route}\``,
    )
    .join("\n");
  markdown += "\n\n";

  for (const { route, method, operation } of operations) {
    const bodyContent = operation.requestBody?.content || {};
    const contentType = Object.keys(bodyContent)[0] || "application/json";
    const media = bodyContent[contentType] || {};
    const requestSchema = media.schema;

    markdown += `<a id="${operation.operationId.toLowerCase()}"></a>\n`;
    markdown += `## ${operation.summary}\n\n`;
    markdown += `- **操作 ID**：\`${operation.operationId}\`\n`;
    markdown += `- **请求**：\`${method} https://testapi.weshow.cc/api${route}\`\n`;
    markdown += `- **鉴权**：${(operation.security || spec.security || []).length ? "Bearer Admin Token" : "未声明"}\n`;
    markdown += `- **Content-Type**：\`${contentType}\`\n`;
    if (operation.description) {
      markdown += `- **说明**：${String(operation.description).replaceAll("\n", " ")}\n`;
    }

    if (requestSchema) {
      markdown += `\n### 请求字段\n\n类型：\`${typeOf(requestSchema)}\`\n\n`;
      markdown += markdownTable(schemaRows(requestSchema));
    } else {
      markdown += "\n### 请求字段\n\n无请求体。\n";
    }

    const requestExample = media.example ?? requestSchema?.example;
    if (requestExample !== undefined) {
      markdown += `\n### 请求示例\n\n\`\`\`json\n${JSON.stringify(requestExample, null, 2)}\n\`\`\`\n`;
    }

    markdown += "\n### 响应\n\n| 状态码 | 定义 |\n|---:|---|\n";
    for (const [status, rawResponse] of Object.entries(operation.responses || {})) {
      const response = resolvedResponse(rawResponse);
      markdown += `| ${status} | ${escapeCell(response.description || refName(rawResponse.$ref) || "")} |\n`;
    }

    const successRaw = operation.responses?.["200"] || operation.responses?.["201"];
    const success = resolvedResponse(successRaw);
    const successMedia = success?.content?.["application/json"];
    if (successMedia?.schema) {
      markdown += `\n成功响应结构：\`${typeOf(successMedia.schema)}\`\n\n`;
      markdown += markdownTable(schemaRows(successMedia.schema));
    }
    if (successMedia?.example !== undefined) {
      markdown += `\n成功响应示例：\n\n\`\`\`json\n${JSON.stringify(successMedia.example, null, 2)}\n\`\`\`\n`;
    }
    markdown += "\n---\n\n";
  }

  fs.writeFileSync(path.join(apiDir, filename), markdown, "utf8");
}

const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
let index = "# Admin API 知识库\n\n";
index += "- **运行基址**：`https://testapi.weshow.cc/api`\n";
index += `- **来源文件**：\`${sourcePath}\`\n`;
index += `- **OpenAPI**：${spec.openapi}\n`;
index += `- **文档版本**：${spec.info?.version || "-"}\n`;
index += `- **源文件 SHA-256**：\`${sourceHash}\`\n`;
index += "- **筛选规则**：仅保留路径以 `/admin/` 开头的接口；忽略路径以 `/ai/` 开头的 C 端聊天接口。\n";
index += `- **接口数量**：${adminOperations.length}\n\n`;
index += "## 通用约定\n\n";
index += "- 当前后台接口全部为 POST。\n";
index += "- 业务参数使用 JSON request body；媒体上传策略接口返回表单直传参数。\n";
index += "- 统一响应包络为 `{ c, m, d }`。\n";
index += "- 后台接口声明 `bearerAuth`，请求头使用 `Authorization: Bearer <admin-token>`。\n";
index += "- 已实测运行基址可达：未带 Token 请求返回 HTTP 401 和 `Unauthenticated.`。\n\n";
index += "## 分组\n\n| 分组 | 数量 | 文档 |\n|---|---:|---|\n";

for (const [tag, [filename, title]] of Object.entries(groups)) {
  const count = adminOperations.filter(({ operation }) =>
    (operation.tags || []).includes(tag),
  ).length;
  index += `| ${title} | ${count} | [${filename}](./${filename}) |\n`;
}

index += "\n## 完整接口索引\n\n| # | 方法 | 路径 | 摘要 | 文档 |\n|---:|---|---|---|---|\n";
adminOperations.forEach(({ route, method, operation }, indexNumber) => {
  const group = Object.entries(groups).find(([tag]) =>
    (operation.tags || []).includes(tag),
  );
  index += `| ${indexNumber + 1} | ${method} | \`${route}\` | ${operation.summary} | [查看](./${group?.[1]?.[0]}#${operation.operationId.toLowerCase()}) |\n`;
});

fs.writeFileSync(path.join(apiDir, "README.md"), index, "utf8");
console.log(`Generated 8 Markdown files for ${adminOperations.length} admin operations.`);
