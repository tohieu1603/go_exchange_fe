'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { ConfigProvider, Layout, Menu, Spin, Avatar, Dropdown } from 'antd';
import { antdDarkTheme } from '@/lib/antd-theme';
import {
  DashboardOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
  BankOutlined,
  SettingOutlined,
  GiftOutlined,
  WarningOutlined,
  LogoutOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AuditOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider, Content, Header } = Layout;

const siderMenuItems: MenuProps['items'] = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'users', icon: <UserOutlined />, label: 'Users' },
  { key: 'kyc', icon: <SafetyCertificateOutlined />, label: 'KYC Review' },
  { key: 'deposits', icon: <DollarOutlined />, label: 'Deposits' },
  { key: 'withdrawals', icon: <BankOutlined />, label: 'Withdrawals' },
  { key: 'bonus', icon: <GiftOutlined />, label: 'Promotions' },
  { key: 'fraud', icon: <WarningOutlined />, label: 'Fraud Logs' },
  { type: 'divider' },
  { key: 'audit', icon: <AuditOutlined />, label: 'Audit Log' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
];

const TAB_TO_PATH: Record<string, string> = {
  dashboard: '/admin',
  users: '/admin/users',
  kyc: '/admin/kyc',
  deposits: '/admin/deposits',
  withdrawals: '/admin/withdrawals',
  bonus: '/admin/bonus',
  fraud: '/admin/fraud',
  audit: '/admin/audit',
  settings: '/admin/settings',
};

function pathToKey(pathname: string): string {
  if (pathname === '/admin') return 'dashboard';
  const seg = pathname.replace('/admin/', '').split('/')[0];
  return seg || 'dashboard';
}

// Extracted outside AdminLayout to satisfy react-hooks/static-components
function SiderContent({
  selectedKey,
  collapsed,
  onMenuClick,
}: {
  selectedKey: string;
  collapsed: boolean;
  onMenuClick: (info: { key: string }) => void;
}) {
  return (
    <>
      {/* Logo */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 20px', borderBottom: '1px solid #303030', gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, background: '#f0b90b', display: 'flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0,
        }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 11 }}>CX</span>
        </div>
        {!collapsed && <span style={{ color: '#f0b90b', fontWeight: 700, fontSize: 15 }}>Admin</span>}
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={siderMenuItems}
        onClick={onMenuClick}
        style={{ background: 'transparent', borderRight: 0, marginTop: 4 }}
      />
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout, setUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { router.push('/auth/login'); return; }
    if (!user) {
      api.auth.profile().then((res) => {
        if (res.success && res.data) {
          setUser(res.data);
          if (res.data.role !== 'ADMIN') router.push('/');
          else setReady(true);
        } else {
          logout();
          router.push('/auth/login');
        }
      }).catch(() => { logout(); router.push('/auth/login'); });
    } else if (user.role !== 'ADMIN') {
      router.push('/');
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
    }
  }, [isLoggedIn, user, router, setUser, logout]);

  const selectedKey = pathToKey(pathname);

  function handleMenuClick(info: { key: string }) {
    const path = TAB_TO_PATH[info.key];
    if (path) { router.push(path); setMobileOpen(false); }
  }

  function handleLogout() {
    logout();
    router.push('/auth/login');
  }

  const userDropdown: MenuProps = {
    items: [
      { key: 'home', icon: <HomeOutlined />, label: 'Back to Site', onClick: () => router.push('/') },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout },
    ],
  };

  if (!ready) {
    return (
      <ConfigProvider theme={antdDarkTheme}>
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e11' }}>
          <Spin size="large" />
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={antdDarkTheme}>
      {/* Mobile overlay drawer (<sm) */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}
          onClick={() => setMobileOpen(false)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <div
            style={{ position: 'relative', width: 220, background: '#1f1f1f', height: '100%', zIndex: 201, overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ position: 'absolute', top: 12, right: 12, cursor: 'pointer', color: '#848e9c', zIndex: 1 }}
              onClick={() => setMobileOpen(false)}
            >
              <CloseOutlined style={{ fontSize: 16 }} />
            </div>
            <SiderContent selectedKey={selectedKey} collapsed={false} onMenuClick={handleMenuClick} />
          </div>
        </div>
      )}

      <Layout style={{ minHeight: '100vh' }} hasSider>
        {/* Desktop/tablet sider — hidden on mobile via className */}
        <div className="hidden sm:block">
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={220}
            collapsedWidth={64}
            style={{
              background: '#1f1f1f', borderRight: '1px solid #303030',
              position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100,
            }}
            trigger={null}
          >
            <SiderContent selectedKey={selectedKey} collapsed={collapsed} onMenuClick={handleMenuClick} />
          </Sider>
        </div>

        <Layout>
          {/* Dynamic margin for sm+ breakpoint */}
          <style>{`@media (min-width: 640px) { .admin-content-layout { margin-left: ${collapsed ? 64 : 220}px; transition: margin-left 0.2s; } }`}</style>
          <div className="admin-content-layout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header style={{
              backdropFilter: 'blur(16px)',
              background: 'rgba(24,26,32,0.65)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: '0 16px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              height: 48, position: 'sticky', top: 0, zIndex: 99,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Mobile hamburger */}
                <div
                  className="sm:hidden"
                  style={{ cursor: 'pointer', fontSize: 16, color: '#ffffffa6' }}
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuUnfoldOutlined />
                </div>
                {/* Desktop collapse toggle */}
                <div
                  className="hidden sm:block"
                  style={{ cursor: 'pointer', fontSize: 16, color: '#ffffffa6' }}
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                </div>
                <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#848e9c' }}>
                  Admin
                </nav>
              </div>
              <Dropdown menu={userDropdown} placement="bottomRight" trigger={['click']}>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar size={26} style={{ background: '#f0b90b', color: '#000', fontWeight: 700, fontSize: 12 }}>
                    {user?.email?.[0]?.toUpperCase() || 'A'}
                  </Avatar>
                  <span className="hidden sm:inline" style={{ color: '#ffffffa6', fontSize: 13 }}>{user?.email}</span>
                </div>
              </Dropdown>
            </Header>
            <Content style={{ padding: 16, overflow: 'auto', flex: 1 }}>
              {children}
            </Content>
          </div>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
