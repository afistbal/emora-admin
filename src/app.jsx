import { useEffect, useState } from "react";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";
import "antd/dist/reset.css";
import "./admin/admin.css";

const sharedTheme = {
  cssVar: true,
};

function AdminThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // 在 Umi 渲染业务路由前读取持久化主题，避免页面先以白色主题闪烁。
    const savedTheme = window.localStorage.getItem("emora-admin-theme");
    return savedTheme === "dark"
      || (savedTheme === null && document.documentElement.dataset.theme === "dark");
  });

  useEffect(() => {
    // 现有主题开关继续通过 data-theme 驱动，统一同步 Ant Design 的主题算法。
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.dataset.theme === "dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
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

export function rootContainer(container) {
  return <AdminThemeProvider>{container}</AdminThemeProvider>;
}
