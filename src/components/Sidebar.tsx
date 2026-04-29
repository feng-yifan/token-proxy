import { useNavigate, useLocation } from 'react-router-dom';
import { Nav } from '@douyinfe/semi-ui';
import {
  IconServerStroked,
  IconRoute,
  IconHistogram,
  IconSettingStroked,
} from '@douyinfe/semi-icons';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { itemKey: 'services', text: 'API 服务', icon: <IconServerStroked /> },
    { itemKey: 'access-points', text: '接入点', icon: <IconRoute /> },
    { itemKey: 'logs', text: '请求日志', icon: <IconHistogram /> },
    { itemKey: 'settings', text: '设置', icon: <IconSettingStroked /> },
  ];

  const selectedKeys = [location.pathname.replace('/', '') || 'services'];

  return (
    <Nav
      defaultSelectedKeys={selectedKeys}
      selectedKeys={selectedKeys}
      onSelect={({ itemKey }) => navigate(`/${itemKey}`)}
      items={items}
      style={{ height: '100%' }}
    />
  );
}
