'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Withdrawal {
  id: number;
  userEmail?: string;
  amount: number;
  bankCode: string;
  bankAccount?: string;
  accountNumber?: string;
  accountName: string;
  status: string;
  adminNote?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <ClockCircleOutlined />,
  APPROVED: <CheckCircleOutlined />,
  REJECTED: <CloseCircleOutlined />,
};

function maskAccount(account?: string): string {
  if (!account) return '—';
  if (account.length <= 4) return account;
  const visible = account.slice(-4);
  return '*'.repeat(Math.min(account.length - 4, 6)) + visible;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function normalizePageResponse(data: unknown): { items: Withdrawal[]; total: number } {
  if (!data) return { items: [], total: 0 };
  if (Array.isArray(data)) return { items: data as Withdrawal[], total: data.length };
  const page = data as { content?: Withdrawal[]; totalElements?: number; items?: Withdrawal[]; total?: number };
  if (page.content) return { items: page.content, total: page.totalElements ?? page.content.length };
  if (page.items) return { items: page.items, total: page.total ?? page.items.length };
  return { items: [], total: 0 };
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Summary stats derived from current page — supplemented by dedicated counters when available
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Action modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    record: Withdrawal | null;
  }>({ open: false, type: 'approve', record: null });
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const fetchWithdrawals = useCallback(async (pg: number, size: number, q: string, status: string) => {
    setLoading(true);
    try {
      const res = await api.admin.withdrawals(pg, size, q, status);
      if (res.success && res.data) {
        const { items, total: t } = normalizePageResponse(res.data);
        setWithdrawals(items);
        setTotal(t);
      } else {
        messageApi.error(res.message || 'Failed to fetch withdrawals');
      }
    } catch {
      messageApi.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  // Fetch pending summary (all-status query, first page, small size just for counts)
  const fetchPendingSummary = useCallback(async () => {
    try {
      const res = await api.admin.withdrawals(1, 1000, '', 'PENDING');
      if (res.success && res.data) {
        const { items, total: t } = normalizePageResponse(res.data);
        setPendingCount(t);
        // Use items we got; if server returns all PENDING items sum them up
        const sum = items.reduce((acc, w) => acc + (w.amount || 0), 0);
        setPendingAmount(sum);
      }
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals(page, pageSize, search, statusFilter);
  }, [page, pageSize, search, statusFilter, fetchWithdrawals]);

  useEffect(() => {
    fetchPendingSummary();
  }, [fetchPendingSummary]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 20);
  }

  function openAction(type: 'approve' | 'reject', record: Withdrawal) {
    setActionModal({ open: true, type, record });
    setAdminNote('');
  }

  function closeAction() {
    setActionModal({ open: false, type: 'approve', record: null });
    setAdminNote('');
  }

  async function confirmAction() {
    if (!actionModal.record) return;
    setActionLoading(true);
    const { type, record } = actionModal;
    try {
      const res = type === 'approve'
        ? await api.admin.approveWithdrawal(record.id, adminNote)
        : await api.admin.rejectWithdrawal(record.id, adminNote);

      if (res.success) {
        messageApi.success(`Withdrawal ${type === 'approve' ? 'approved' : 'rejected'} successfully`);
        closeAction();
        fetchWithdrawals(page, pageSize, search, statusFilter);
        fetchPendingSummary();
      } else {
        messageApi.error(res.message || 'Action failed');
      }
    } catch {
      messageApi.error('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  const expandedRowRender = (record: Withdrawal) => (
    <Card size="small" style={{ background: 'transparent', border: 'none' }}>
      <Row gutter={[24, 8]}>
        <Col span={6}>
          <Text type="secondary">Bank Code</Text>
          <br />
          <Text strong>{record.bankCode || '—'}</Text>
        </Col>
        <Col span={6}>
          <Text type="secondary">Full Account Number</Text>
          <br />
          <Text strong>{record.bankAccount || record.accountNumber || '—'}</Text>
        </Col>
        <Col span={6}>
          <Text type="secondary">Account Name</Text>
          <br />
          <Text strong>{record.accountName || '—'}</Text>
        </Col>
        <Col span={6}>
          <Text type="secondary">Status</Text>
          <br />
          <Tag color={STATUS_COLORS[record.status] || 'default'} icon={STATUS_ICONS[record.status]}>
            {record.status}
          </Tag>
        </Col>
        {record.adminNote && (
          <Col span={24}>
            <Text type="secondary">Admin Note</Text>
            <br />
            <Text>{record.adminNote}</Text>
          </Col>
        )}
      </Row>
    </Card>
  );

  const columns: ColumnsType<Withdrawal> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <Text style={{ fontFamily: 'monospace' }}>#{id}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) =>
        val ? new Date(val).toLocaleString('vi-VN', { hour12: false }) : '—',
    },
    {
      title: 'User Email',
      dataIndex: 'userEmail',
      key: 'userEmail',
      ellipsis: true,
      render: (email?: string) => email || <Text type="secondary">—</Text>,
    },
    {
      title: 'Amount (VND)',
      dataIndex: 'amount',
      key: 'amount',
      width: 160,
      align: 'right',
      render: (amount: number) => (
        <Text strong style={{ color: '#faad14' }}>
          {formatVND(amount)}
        </Text>
      ),
    },
    {
      title: 'Bank Code',
      dataIndex: 'bankCode',
      key: 'bankCode',
      width: 110,
      render: (code: string) => <Tag>{code || '—'}</Tag>,
    },
    {
      title: 'Account',
      key: 'account',
      width: 130,
      render: (_: unknown, record: Withdrawal) => (
        <Text style={{ fontFamily: 'monospace' }}>
          {maskAccount(record.bankAccount || record.accountNumber)}
        </Text>
      ),
    },
    {
      title: 'Account Name',
      dataIndex: 'accountName',
      key: 'accountName',
      ellipsis: true,
      render: (name: string) => name || <Text type="secondary">—</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || 'default'} icon={STATUS_ICONS[status]}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: Withdrawal) => {
        if (record.status !== 'PENDING') return <Text type="secondary">—</Text>;
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openAction('approve', record)}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => openAction('reject', record)}
            >
              Reject
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      {contextHolder}

      <div style={{ padding: '24px' }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          Withdrawal Management
        </Title>

        {/* Summary stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Withdrawals"
                value={pendingCount}
                prefix={<Badge status="warning" />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Pending Amount"
                value={pendingAmount}
                prefix={<DollarOutlined style={{ color: '#faad14' }} />}
                formatter={(val) => formatVND(Number(val))}
                valueStyle={{ color: '#faad14', fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={14} md={10}>
              <Input.Search
                placeholder="Search by email or bank account..."
                allowClear
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onSearch={handleSearch}
                onPressEnter={() => handleSearch(searchInput)}
                onClear={() => handleSearch('')}
              />
            </Col>
            <Col xs={24} sm={10} md={6}>
              <Select
                style={{ width: '100%' }}
                value={statusFilter || 'ALL'}
                onChange={(val) => handleStatusChange(val === 'ALL' ? '' : val)}
                options={[
                  { label: 'All Statuses', value: 'ALL' },
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Approved', value: 'APPROVED' },
                  { label: 'Rejected', value: 'REJECTED' },
                ]}
              />
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card>
          <Table<Withdrawal>
            rowKey="id"
            columns={columns}
            dataSource={withdrawals}
            loading={loading}
            expandable={{ expandedRowRender }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (t) => `Total ${t} withdrawals`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1000 }}
            size="middle"
          />
        </Card>
      </div>

      {/* Approve / Reject Modal */}
      <Modal
        open={actionModal.open}
        title={
          actionModal.type === 'approve' ? (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              Approve Withdrawal #{actionModal.record?.id}
            </Space>
          ) : (
            <Space>
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              Reject Withdrawal #{actionModal.record?.id}
            </Space>
          )
        }
        onCancel={closeAction}
        onOk={confirmAction}
        okText={actionModal.type === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{
          danger: actionModal.type === 'reject',
          type: actionModal.type === 'approve' ? 'primary' : 'default',
          loading: actionLoading,
        }}
        cancelButtonProps={{ disabled: actionLoading }}
        destroyOnClose
      >
        {actionModal.record && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={[12, 8]}>
              <Col span={12}>
                <Text type="secondary">Amount</Text>
                <br />
                <Text strong style={{ color: '#faad14' }}>
                  {formatVND(actionModal.record.amount)}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Bank</Text>
                <br />
                <Text strong>{actionModal.record.bankCode}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Account</Text>
                <br />
                <Text strong>
                  {actionModal.record.bankAccount || actionModal.record.accountNumber || '—'}
                </Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">Account Name</Text>
                <br />
                <Text strong>{actionModal.record.accountName}</Text>
              </Col>
            </Row>

            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
                Admin Note {actionModal.type === 'reject' ? '(required)' : '(optional)'}
              </Text>
              <TextArea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'Optional note for approval...'
                    : 'Reason for rejection...'
                }
                maxLength={500}
                showCount
              />
            </div>
          </Space>
        )}
      </Modal>
    </>
  );
}
