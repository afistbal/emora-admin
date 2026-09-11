import { defineConfig } from "umi";

const environmentKey = process.env.EMORA_ENV === "prod" ? "prod" : "dev";

const adminRoutes = [
  "/login",
  "/",
  "/analytics",
  "/token-usage",
  "/characters",
  "/presets",
  "/models",
  "/users",
  "/user-ledger",
  "/messages",
  "/messages/:messageId",
  "/orders",
  "/subscriptions",
  "/commerce",
  "/settings",
];

export default defineConfig({
  npmClient: "npm",
  title: "Emora 运营后台",
  metas: [
    { name: "description", content: "Emora 运营后台" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  ],
  outputPath: environmentKey === "prod" ? "dist-prod" : "dist-dev",
  hash: true,
  // 多个异步路由分包使用 IIFE 隔离 esbuild 辅助变量，避免生产压缩后的全局命名冲突。
  esbuildMinifyIIFE: true,
  history: { type: "browser" },
  define: {
    "process.env.EMORA_ENV": environmentKey,
  },
  routes: [
    {
      path: "/",
      component: "@/pages/AdminApp",
      routes: [
        ...adminRoutes.map((path) => ({ path, component: "@/pages/AdminRoutePage" })),
        { path: "*", component: "@/pages/AdminRoutePage" },
      ],
    },
  ],
});
