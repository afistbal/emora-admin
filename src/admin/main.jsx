import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import "antd/dist/reset.css";
import Admin from "./Admin.jsx";
import "./admin.css";

const sharedTheme = {
  cssVar: true,
};

function AdminThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // 首屏直接读取与后台主题开关相同的持久化值，避免子组件写入 data-theme 前 Ant 先按白色主题渲染。
    const savedTheme = window.localStorage.getItem("emora-admin-theme");
    return savedTheme === "dark" || (savedTheme === null && document.documentElement.dataset.theme === "dark");
  });

  useEffect(() => {
    // 后台原有主题开关通过 data-theme 切换；监听属性后同步 Ant Design 的主题算法。
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <ConfigProvider
      theme={{
        ...sharedTheme,
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <AdminThemeProvider>
    <BrowserRouter>
      <Admin />
    </BrowserRouter>
  </AdminThemeProvider>
);
