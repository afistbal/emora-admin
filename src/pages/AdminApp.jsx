import Admin from "../admin/Admin.jsx";

// Umi 统一注册所有后台 URL；业务状态暂由现有后台根组件持有，保证迁移不改变接口与交互语义。
export default function AdminApp() {
  return <Admin />;
}
