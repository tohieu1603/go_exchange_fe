'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Select, Button, Space, Tag, Spin, Tooltip } from 'antd';
import { MonitorOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuditLog, PageResponse } from '@/types';
import type { ColumnsType } from 'antd/es/table';

const { Search } = Input;
const { Option } = Select;

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Sign In',
  LOGOUT: 'Sign Out',
  LOGOUT_ALL: 'Sign Out All',
  PASSWORD_CHANGE: 'Password Change',
  TWO_FA_ENABLE: '2FA Enabled',
  TWO_FA_DISABLE: '2FA Disabled',
  PROFILE_UPDATE: 'Profile Update',
  WITHDRAWAL_REQUEST: 'Withdrawal',
  API_KEY_CREATE: 'API Key Created',
  API_KEY_REVOKE: 'API Key Revoked',
  STEP_UP: 'Device Verified',
  ADMIN_KYC_APPROVE: 'KYC Approved',
  ADMIN_KYC_REJECT: 'KYC Rejected',
  ADMIN_LOCK_USER: 'User Locked',
  ADMIN_UNLOCK_USER: 'User Unlocked',
};

function humanize(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const PAGE_SIZE = 20;

export default function AdminAuditPage() {
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Applied filters (only update on Apply)
  const [applied, setApplied] = useState({ userId: '', action: '', outcome: '', from: '', to: '' });

  const load = useCallback(async (p: number, filters: typeof applied) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.admin.audit({
        page: p - 1,
        size: PAGE_SIZE,
        userId: filters.userId ? parseInt(filters.userId, 10) : undefined,
        action: filters.action || undefined,
        outcome: filters.outcome || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      if (res.success && res.data) {
        const d = res.data as PageResponse<AuditLog>;
        setData(d.content);
        setTotal(d.totalElements);
      } else {
        setData([]);
        setTotal(0);
      }
    } catch {
      setData([]);
      setTotal(0);
    }
    setLoading(false);
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    load(page, applied);
  }, [page, applied, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleApply() {
    setPage(1);
    setApplied({ userId, action, outcome, from: fromDate, to: toDate });
  }

  function handleReset() {
    setUserId(''); setAction(''); setOutcome(''); setFromDate(''); setToDate('');
    setPage(1);
    setApplied({ userId: '', action: '', outcome: '', from: '', to: '' });
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70,
      render: (v: number) => <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.6 }}>#{v}</span>,
    },
    {
      title: 'Time',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => (
        <Tooltip title={new Date(v).toLocaleString()}>
          <div style={{ fontSize: 12 }}>
            <div>{new Date(v).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ opacity: 0.5, fontSize: 10 }}>{timeAgo(v)}</div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'User',
      width: 180,
      render: (_: unknown, row: AuditLog) => (
        <div style={{ fontSize: 12 }}>
          {row.userId && <div style={{ fontFamily: 'monospace', opacity: 0.6, fontSize: 10 }}>#{row.userId}</div>}
          {row.email && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{row.email}</div>}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: 160,
      render: (v: string) => <Tag color="blue" style={{ fontSize: 11 }}>{humanize(v)}</Tag>,
    },
    {
      title: 'Outcome',
      dataIndex: 'outcome',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'success' ? 'green' : 'red'} style={{ fontSize: 11 }}>
          {v}
        </Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 120,
      render: (v?: string) => <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>{v || '—'}</span>,
    },
    {
      title: 'Device',
      width: 100,
      render: (_: unknown, row: AuditLog) => (
        <div style={{ fontSize: 11 }}>
          {row.deviceId ? (
            <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>…{row.deviceId.slice(-6)}</span>
          ) : '—'}
          {row.newDevice && (
            <Tag color="orange" style={{ fontSize: 9, marginLeft: 4, padding: '0 4px' }}>NEW</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Detail',
      dataIndex: 'detail',
      render: (v?: string) => v ? (
        <Tooltip title={v}>
          <span style={{ fontSize: 11, opacity: 0.6, cursor: 'help', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' }}>
            {v}
          </span>
        </Tooltip>
      ) : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <MonitorOutlined style={{ fontSize: 18, color: '#f0b90b' }} />
        <span style={{ fontSize: 18, fontWeight: 700 }}>Platform Audit Log</span>
      </div>

      {/* Filters */}
      <div style={{ background: '#1f1f1f', border: '1px solid #303030', padding: '16px', borderRadius: 4, marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
            onSearch={handleApply}
            style={{ width: 120 }}
            size="small"
            allowClear
          />
          <Select
            placeholder="Action"
            value={action || undefined}
            onChange={(v) => setAction(v ?? '')}
            style={{ width: 160 }}
            size="small"
            allowClear
          >
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <Option key={k} value={k}>{v}</Option>
            ))}
          </Select>
          <Select
            placeholder="Outcome"
            value={outcome || undefined}
            onChange={(v) => setOutcome(v ?? '')}
            style={{ width: 120 }}
            size="small"
            allowClear
          >
            <Option value="success">Success</Option>
            <Option value="failure">Failure</Option>
          </Select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ background: '#141414', border: '1px solid #424242', color: '#ffffffd9', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}
            placeholder="From"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ background: '#141414', border: '1px solid #424242', color: '#ffffffd9', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}
            placeholder="To"
          />
          <Button type="primary" size="small" onClick={handleApply}>Apply</Button>
          <Button size="small" onClick={handleReset}>Reset</Button>
        </Space>
      </div>

      {loading && data.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table<AuditLog>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t.toLocaleString()} events`,
            onChange: (p) => setPage(p),
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center', opacity: 0.5 }}>
                <MonitorOutlined style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                No audit events found
              </div>
            ),
          }}
          scroll={{ x: 900 }}
        />
      )}
    </div>
  );
}
