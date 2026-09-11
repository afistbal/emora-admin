import Admin from "../admin/Admin.jsx";

// 作为 Umi 的持久布局承载鉴权、导航和跨页面状态，路由切换时不重复初始化后台。
export default function AdminApp() {
  return <Admin />;
}
