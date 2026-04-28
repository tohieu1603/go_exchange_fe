'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Col, Row, Statistic, Typography, Spin, Button, Space } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  UploadOutlined,
  RocketOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title, Text } = Typography;

interface Stats {
  totalUsers?: number;
  volume24h?: number;
  activeOrders?: number;
  totalDeposited?: number;
  pendingWithdrawalsCount?: number;
  pendingWithdrawalsSum?: number;
  activeFuturesPositions?: number;
  pendingKyc?: number;
  pendingDeposits?: number;
}

interface ChartData {
  userGrowth?: { date: string; count: number }[];
  pendingKyc?: number;
  pendingDeposits?: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({});
  const [chartData, setChartData] = useState<ChartData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [statsRes, chartsRes] = await Promise.allSettled([
        api.admin.stats(),
        api.admin.charts ? api.admin.charts() : Promise.resolve({ success: false, data: undefined }),
      ]);
      if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
        setStats(statsRes.value.data as Stats);
      }
      if (chartsRes.status === 'fulfilled' && chartsRes.value.success && (chartsRes.value as { data?: unknown }).data) {
        setChartData((chartsRes.value as { data: ChartData }).data);
      }
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(iv);
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers ?? 0, icon: <UserOutlined />, color: '#f0b90b', suffix: '' },
    { title: '24h Volume', value: stats.volume24h ?? 0, icon: <DollarOutlined />, color: '#0ecb81', prefix: '$', precision: 2 },
    { title: 'Active Orders', value: stats.activeOrders ?? 0, icon: <SwapOutlined />, color: '#1890ff' },
    { title: 'Total Deposited', value: stats.totalDeposited ?? 0, icon: <DownloadOutlined />, color: '#0ecb81', prefix: '$', precision: 2 },
    { title: 'Pending Withdrawals', value: stats.pendingWithdrawalsCount ?? 0, icon: <UploadOutlined />, color: '#f6465d' },
    { title: 'Pending Withdrawal Amt', value: stats.pendingWithdrawalsSum ?? 0, icon: <DollarOutlined />, color: '#f6465d', prefix: '$', precision: 2 },
    { title: 'Open Futures', value: stats.activeFuturesPositions ?? 0, icon: <RocketOutlined />, color: '#722ed1' },
    { title: 'Pending KYC', value: chartData.pendingKyc ?? stats.pendingKyc ?? 0, icon: <SafetyCertificateOutlined />, color: '#fa8c16' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Auto-refreshes every 30s
          </Text>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            size="small"
            onClick={() => fetchData(true)}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Stats Grid */}
      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={12} sm={12} md={8} lg={6} key={card.title}>
            <Card size="small" hoverable style={{ borderLeft: `3px solid ${card.color}` }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{card.title}</span>}
                value={card.value}
                prefix={card.prefix}
                precision={card.precision}
                valueStyle={{ color: card.color, fontSize: 22, fontWeight: 600 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* User Growth Chart */}
      {chartData.userGrowth && chartData.userGrowth.length > 0 && (
        <Card size="small" title="User Growth (Last 30 Days)" style={{ marginTop: 20 }}>
          <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
            {(() => {
              const data = chartData.userGrowth!;
              const max = Math.max(...data.map((d) => d.count), 1);
              return data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 9, color: '#ffffffa6' }}>{d.count || ''}</Text>
                  <div
                    style={{
                      width: '100%', maxWidth: 20,
                      height: `${Math.max((d.count / max) * 160, 2)}px`,
                      background: d.count > 0 ? '#f0b90b' : '#303030',
                      borderRadius: 2, transition: 'height 0.3s',
                    }}
                  />
                  <Text style={{ fontSize: 8, color: '#ffffff45', writingMode: 'vertical-rl' }}>
                    {d.date.slice(5)}
                  </Text>
                </div>
              ));
            })()}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card size="small" title="Quick Actions" style={{ marginTop: 20 }}>
        <Space wrap>
          <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => router.push('/admin/kyc')}>
            Review KYC ({chartData.pendingKyc ?? 0})
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => router.push('/admin/deposits')}>
            Process Deposits ({chartData.pendingDeposits ?? 0})
          </Button>
          <Button danger icon={<UploadOutlined />} onClick={() => router.push('/admin/withdrawals')}>
            Process Withdrawals ({stats.pendingWithdrawalsCount ?? 0})
          </Button>
          <Button icon={<UserOutlined />} onClick={() => router.push('/admin/users')}>
            Manage Users
          </Button>
        </Space>
      </Card>
    </div>
  );
}
