'use client';

import { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Input, Typography, Flex, message } from 'antd';
import { SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import type { FraudLog, PageResponse } from '@/types';

const { Title, Text } = Typography;

const ACTION_COLOR: Record<string, string> = {
  FLAGGED: 'orange',
  ACCOUNTS_LOCKED: 'red',
  BONUS_REVOKED: 'red',
  DISMISSED: 'default',
};

export default function FraudPage() {
  const [logs, setLogs] = useState<FraudLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);

  const loadLogs = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const res = await api.admin.fraudLogs(p, 20, s);
      if (res.success && res.data) {
        const raw = res.data as PageResponse<FraudLog> | FraudLog[];
        if (Array.isArray(raw)) {
          setLogs(raw);
          setTotal(raw.length);
        } else if (raw && 'content' in raw) {
          setLogs(raw.content);
          setTotal(raw.totalElements);
        } else {
          setLogs([]);
          setTotal(0);
        }
      } else {
        message.error(res.message || 'Failed to load fraud logs');
      }
    } catch {
      message.error('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(page, search); }, [page, search, loadLogs]);

  function handleSearch() {
    setPage(1);
    setSearch(searchInput);
  }

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: 'User IDs',
      dataIndex: 'userIds',
      key: 'userIds',
      width: 140,
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</Text>
      ),
    },
    {
      title: 'Fraud Type',
      dataIndex: 'fraudType',
      key: 'fraudType',
      width: 150,
      render: (v: string) => <Tag color="orange">{v}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (v: string) => (
        <Text ellipsis={{ tooltip: v }} style={{ maxWidth: 260 }}>{v}</Text>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (v: string) => (
        <Tag color={ACTION_COLOR[v] ?? 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Admin Note',
      dataIndex: 'adminNote',
      key: 'adminNote',
      ellipsis: true,
      render: (v: string) => v ? (
        <Text ellipsis={{ tooltip: v }} type="secondary" style={{ maxWidth: 200 }}>{v}</Text>
      ) : <Text type="secondary">-</Text>,
    },
  ];

  function renderExpandedRow(record: FraudLog) {
    return (
      <div style={{ padding: '12px 16px', background: '#1a1a1a', borderRadius: 6 }}>
        <div style={{ marginBottom: 12 }}>
          <Text strong style={{ marginRight: 8 }}>
            <WarningOutlined style={{ marginRight: 4, color: '#faad14' }} />
            Description:
          </Text>
          <Text>{record.description || '-'}</Text>
        </div>
        {record.adminNote && (
          <div>
            <Text strong style={{ marginRight: 8 }}>Admin Note:</Text>
            <Text type="secondary">{record.adminNote}</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Fraud Logs</Title>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={handleSearch}
          allowClear
          onClear={() => { setSearchInput(''); setSearch(''); setPage(1); }}
          style={{ width: 240 }}
        />
      </Flex>

      <Table
        dataSource={logs}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        expandable={{
          expandedRowRender: renderExpandedRow,
          rowExpandable: (record) => !!(record.description || record.adminNote),
        }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Total ${t}`,
        }}
      />
    </div>
  );
}
