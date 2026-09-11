import { Breadcrumb, Typography } from "antd";

/**
 * 统一管理后台子页面的层级导航；可点击层级返回父页面，末级仅展示当前位置。
 */
export default function PageBreadcrumb({ items }) {
  return (
    <Breadcrumb
      items={items.map(({ title, onClick }) => ({
        title: onClick
          ? <Typography.Link onClick={onClick}>{title}</Typography.Link>
          : title,
      }))}
    />
  );
}
