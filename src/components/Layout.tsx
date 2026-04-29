import { Outlet } from 'react-router-dom';
import { Layout as SemiLayout } from '@douyinfe/semi-ui';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

const { Sider, Content } = SemiLayout;

export default function Layout() {
  return (
    <SemiLayout
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'row',
      }}
    >
      <Sider
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: '1px solid var(--semi-color-border)',
          overflow: 'auto',
        }}
      >
        <Sidebar />
      </Sider>
      <SemiLayout
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Content
          style={{
            flex: 1,
            padding: 24,
            overflow: 'auto',
            backgroundColor: 'var(--semi-color-bg-0)',
          }}
        >
          <Outlet />
        </Content>
        <StatusBar />
      </SemiLayout>
    </SemiLayout>
  );
}
