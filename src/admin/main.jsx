import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import "antd/dist/reset.css";
import Admin from "./Admin.jsx";
import "./admin.css";

const sharedTheme = {
  cssVar: true,
  token: {
    colorPrimary: "#1677ff",
    colorInfo: "#1677ff",
    colorSuccess: "#20a779",
    colorWarning: "#d89614",
    colorError: "#e35d6a",
    borderRadius: 10,
    borderRadiusLG: 16,
    controlHeight: 38,
    colorBgLayout: "#f5f7fa",
    colorText: "#173b5d",
    colorTextSecondary: "#6b8eae",
    colorBorder: "#d8e8f5",
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: { fontWeight: 600 },
    Card: { headerFontSize: 15 },
    Table: { headerBg: "#f5f8fc", headerColor: "#557997", rowHoverBg: "#f5faff" },
  },
};

function AdminThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === "dark");

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
        token: isDark
          ? { ...sharedTheme.token, colorPrimary: "#f5ed18", colorBgLayout: "#000000", colorText: "#f5f5f5", colorTextSecondary: "#8a8a8a", colorBorder: "#242424" }
          : sharedTheme.token,
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
