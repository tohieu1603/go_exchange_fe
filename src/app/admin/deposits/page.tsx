'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Button,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Typography,
  message,
  Descriptions,
} from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import type { Deposit, PageResponse } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface AdminDeposit extends Deposit {
  userEmail?: string;
  userId?: number;
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  CONFIRMED: 'green',
  FAILED: 'red',
  REJECTED: 'red',
};

function formatCurrency(amount: number, currency = 'VND'): string {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function normalizePageResponse(data: unknown): { rows: AdminDeposit[]; total: number } {
  if (!data) return { rows: [], total: 0 };
  if (Array.isArray(data)) return { rows: data as AdminDeposit[], total: data.length };
  const pr = data as PageResponse<AdminDeposit>;
  if (Array.isArray(pr.content)) return { rows: pr.content, total: pr.totalElements ?? pr.content.length };
  return { rows: [], total: 0 };
}

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [messageApi, contextHolder] = message.useMessage();

  const fetchDeposits = useCallback(async (pg = page, q = search, st = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.admin.deposits(pg, pageSize, q, st);
      if (res.success && res.data != null) {
        const { rows, total: t } = normalizePageResponse(res.data);
        setDeposits(rows);
        setTotal(t);
      } else {
        setDeposits([]);
        setTotal(0);
      }
    } catch {
      messageApi.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, pageSize, messageApi]);

  useEffect(() => {
    fetchDeposits(page, search, statusFilter);
  }, [page, search, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    const v = value.trim();
    setSearch(v);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
  };

  const handleConfirm = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'confirm' }));
    try {
      const res = await api.admin.confirmDeposit(id);
      if (res.success) {
        messageApi.success('Deposit confirmed successfully');
        fetchDeposits(page, search, statusFilter);
      } else {
        messageApi.error(res.message || 'Failed to confirm deposit');
      }
    } catch {
      messageApi.error('Failed to confirm deposit');
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'reject' }));
    try {
      const res = await api.admin.rejectDeposit(id);
      if (res.success) {
        messageApi.success('Deposit rejected');
        fetchDeposits(page, search, statusFilter);
      } else {
        messageApi.error(res.message || 'Failed to reject deposit');
      }
    } catch {
      messageApi.error('Failed to reject deposit');
    } finally {
      setActionLoading((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  };

  // Summary stats derived from current page data (best-effort without a dedicated endpoint)
  const totalCount = total;
  const pendingCount = deposits.filter((d) => d.status === 'PENDING').length;

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (v: number) => <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>#{v}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 155,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{formatDate(v)}</Text>,
    },
    {
      title: 'User Email',
      dataIndex: 'userEmail',
      key: 'userEmail',
      ellipsis: true,
      render: (v: string) => v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 145,
      align: 'right' as const,
      render: (v: number, row: AdminDeposit) => (
        <Text strong style={{ color: '#0ecb81' }}>
          {formatCurrency(v, row.currency || 'VND')}
        </Text>
      ),
    },
    {
      title: 'Order Code',
      dataIndex: 'orderCode',
      key: 'orderCode',
      width: 160,
      render: (v: string) => (
        <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || '—'}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 165,
      render: (_: unknown, row: AdminDeposit) => {
        if (row.status !== 'PENDING') return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        const isActing = !!actionLoading[row.id];
        return (
          <Space size={6}>
            <Popconfirm
              title="Confirm this deposit?"
              description="This action will mark the deposit as CONFIRMED."
              onConfirm={() => handleConfirm(row.id)}
              okText="Confirm"
              cancelText="Cancel"
              okType="primary"
              disabled={isActing}
            >
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                loading={actionLoading[row.id] === 'confirm'}
                disabled={isActing}
              >
                Confirm
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Reject this deposit?"
              description="This action will mark the deposit as REJECTED."
              onConfirm={() => handleReject(row.id)}
              okText="Reject"
              cancelText="Cancel"
              okType="danger"
              disabled={isActing}
            >
              <Button
                danger
                size="small"
                icon={<CloseCircleOutlined />}
                loading={actionLoading[row.id] === 'reject'}
                disabled={isActing}
              >
                Reject
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const expandedRowRender = (record: AdminDeposit) => (
    <Descriptions
      size="small"
      bordered
      column={{ xs: 1, sm: 2, md: 3 }}
      style={{ background: 'transparent' }}
    >
      <Descriptions.Item label="Deposit ID">{record.id}</Descriptions.Item>
      <Descriptions.Item label="User ID">{record.userId ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="User Email">{record.userEmail ?? '—'}</Descriptions.Item>
      <Descriptions.Item label="Amount">
        {formatCurrency(record.amount, record.currency || 'VND')}
      </Descriptions.Item>
      <Descriptions.Item label="Currency">{record.currency || 'VND'}</Descriptions.Item>
      <Descriptions.Item label="Status">
        <Tag color={STATUS_COLOR[record.status] ?? 'default'}>{record.status}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="Order Code" span={2}>
        <Text copyable style={{ fontFamily: 'monospace' }}>{record.orderCode || '—'}</Text>
      </Descriptions.Item>
      <Descriptions.Item label="Created At">{formatDate(record.createdAt)}</Descriptions.Item>
      {record.qrCodeUrl && (
        <Descriptions.Item label="QR Code URL" span={3}>
          <Text copyable ellipsis style={{ maxWidth: 400, fontSize: 12 }}>{record.qrCodeUrl}</Text>
        </Descriptions.Item>
      )}
    </Descriptions>
  );

  return (
    <div>
      {contextHolder}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <DownloadOutlined style={{ marginRight: 8, color: '#0ecb81' }} />
          Deposits Management
        </Title>
        <Button
          icon={<ReloadOutlined />}
          size="small"
          loading={loading}
          onClick={() => fetchDeposits(page, search, statusFilter)}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderLeft: '3px solid #1890ff' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total (this page)</span>}
              value={totalCount}
              valueStyle={{ color: '#1890ff', fontSize: 22, fontWeight: 600 }}
              prefix={<DownloadOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card size="small" style={{ borderLeft: '3px solid orange' }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Pending (this page)</span>}
              value={pendingCount}
              valueStyle={{ color: 'orange', fontSize: 22, fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input.Search
            placeholder="Search email or order code..."
            allowClear
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            onClear={() => handleSearch('')}
            style={{ width: 280 }}
            enterButton
          />
          <Select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: 150 }}
            placeholder="Filter by status"
          >
            <Option value="">All Statuses</Option>
            <Option value="PENDING">
              <Tag color="orange" style={{ margin: 0 }}>PENDING</Tag>
            </Option>
            <Option value="CONFIRMED">
              <Tag color="green" style={{ margin: 0 }}>CONFIRMED</Tag>
            </Option>
            <Option value="FAILED">
              <Tag color="red" style={{ margin: 0 }}>FAILED</Tag>
            </Option>
            <Option value="REJECTED">
              <Tag color="red" style={{ margin: 0 }}>REJECTED</Tag>
            </Option>
          </Select>
        </Space>
      </Card>

      {/* Table */}
      <Card size="small" bodyStyle={{ padding: 0 }}>
        <Table<AdminDeposit>
          rowKey="id"
          columns={columns}
          dataSource={deposits}
          loading={loading}
          size="small"
          scroll={{ x: 900 }}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} deposits`,
            position: ['bottomRight'],
          }}
          onChange={handleTableChange}
          rowClassName={(record) =>
            record.status === 'PENDING' ? 'deposit-row-pending' : ''
          }
        />
      </Card>
    </div>
  );
}
