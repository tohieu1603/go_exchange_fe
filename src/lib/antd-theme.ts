import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

// Maps Binance dark tokens to Ant Design's design system. Applied in admin layout via ConfigProvider.
export const antdDarkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#f0b90b',
    colorSuccess: '#0ecb81',
    colorError: '#f6465d',
    colorWarning: '#fac84e',
    colorInfo: '#3b8eff',
    colorBgBase: '#0b0e11',
    colorBgContainer: '#181a20',
    colorBgElevated: '#1e2329',
    colorBgLayout: '#0b0e11',
    colorBgSpotlight: '#2b3139',
    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.04)',
    colorText: '#eaecef',
    colorTextSecondary: '#b7bdc6',
    colorTextTertiary: '#848e9c',
    colorTextQuaternary: '#5e6673',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    borderRadius: 8,
    borderRadiusLG: 12,
    motionDurationFast: '120ms',
    motionDurationMid: '200ms',
    motionDurationSlow: '320ms',
  },
  components: {
    Table: {
      headerBg: '#1e2329',
      rowHoverBg: 'rgba(240,185,11,0.04)',
      borderColor: 'rgba(255,255,255,0.05)',
    },
    Button: {
      primaryShadow: '0 0 0 transparent',
      defaultBg: '#2b3139',
      defaultBorderColor: 'rgba(255,255,255,0.08)',
      defaultColor: '#eaecef',
    },
    Drawer: { colorBgElevated: '#181a20' },
    Modal: { colorBgElevated: '#181a20' },
    Card: { colorBgContainer: '#181a20' },
    Input: { colorBgContainer: '#181a20', activeBorderColor: '#f0b90b', hoverBorderColor: 'rgba(240,185,11,0.5)' },
    Select: { colorBgContainer: '#181a20', optionSelectedBg: 'rgba(240,185,11,0.1)' },
    Tabs: { itemActiveColor: '#f0b90b', itemHoverColor: '#f0b90b', inkBarColor: '#f0b90b' },
    Pagination: { itemActiveBg: '#f0b90b', colorPrimary: '#0b0e11' },
    Tag: { defaultBg: '#2b3139' },
    Notification: { colorBgElevated: '#181a20' },
    Message: { colorBgElevated: '#181a20' },
  },
  algorithm: theme.darkAlgorithm,
};
