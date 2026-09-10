import { defineConfig } from "umi";

const environmentKey = process.env.EMORA_ENV === "prod" ? "prod" : "dev";

export default defineConfig({
  npmClient: "npm",
  title: "Emora 运营后台",
  metas: [
    { name: "description", content: "Emora 运营后台" },
    { name: "viewport", content: "width=device-width, initial-scale=1.0" },
  ],
  outputPath: environmentKey === "prod" ? "dist-prod" : "dist-dev",
  hash: true,
  history: { type: "browser" },
  define: {
    "process.env.EMORA_ENV": environmentKey,
  },
  routes: [
    { path: "/login", component: "@/pages/AdminApp" },
    { path: "/", component: "@/pages/AdminApp" },
    { path: "/analytics", component: "@/pages/AdminApp" },
    { path: "/token-usage", component: "@/pages/AdminApp" },
    { path: "/characters", component: "@/pages/AdminApp" },
    { path: "/presets", component: "@/pages/AdminApp" },
    { path: "/models", component: "@/pages/AdminApp" },
    { path: "/users", component: "@/pages/AdminApp" },
    { path: "/user-ledger", component: "@/pages/AdminApp" },
    { path: "/messages", component: "@/pages/AdminApp" },
    { path: "/messages/:messageId", component: "@/pages/AdminApp" },
    { path: "/orders", component: "@/pages/AdminApp" },
    { path: "/subscriptions", component: "@/pages/AdminApp" },
    { path: "/commerce", component: "@/pages/AdminApp" },
    { path: "/settings", component: "@/pages/AdminApp" },
    { path: "*", component: "@/pages/AdminApp" },
  ],
});
