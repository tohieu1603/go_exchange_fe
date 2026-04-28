'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Table,
  Input,
  Tag,
  Button,
  Drawer,
  Descriptions,
  Tabs,
  Select,
  Popconfirm,
  message,
  Empty,
  Space,
  Typography,
} from 'antd';
import {
  LockOutlined,
  UnlockOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { api } from '@/lib/api';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: number;
  email: string;
  fullName: string;
  role: string;
  kycStatus: string;
  kycStep?: string | number;
  locked: boolean;
  createdAt?: string;
}

interface WalletRow {
  id?: number;
  currency: string;
  balance: number;
  locked?: number;
  available?: number;
}

interface KycData {
  status?: string;
  step?: string | number;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  country?: string;
  adminNote?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface BonusRow {
  id?: number;
  type?: string;
  amount?: number;
  currency?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleColor(role: string): string {
  return role === 'ADMIN' ? 'gold' : 'default';
}

function kycColor(status: string): string {
  const map: Record<string, string> = {
    VERIFIED: 'green',
    PENDING: 'orange',
    REJECTED: 'red',
    NONE: 'default',
  };
  return map[status] ?? 'default';
}

function normalizeList<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.content)) return d.content as T[];
  return [];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WalletsTab({ userId }: { userId: number }) {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.admin.userWallets(userId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setWallets(normalizeList<WalletRow>(res.data));
      } else {
        setWallets([]);
      }
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const cols: ColumnsType<WalletRow> = [
    { title: 'Currency', dataIndex: 'currency', key: 'currency' },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (v) => Number(v ?? 0).toFixed(8),
    },
    {
      title: 'Locked',
      dataIndex: 'locked',
      key: 'locked',
      render: (v) => Number(v ?? 0).toFixed(8),
    },
    {
      title: 'Available',
      dataIndex: 'available',
      key: 'available',
      render: (v) => (v !== undefined ? Number(v).toFixed(8) : '-'),
    },
  ];

  if (!loading && wallets.length === 0) {
    return <Empty description="No wallets found" />;
  }

  return (
    <Table
      rowKey={(r) => r.currency}
      columns={cols}
      dataSource={wallets}
      loading={loading}
      size="small"
      pagination={false}
    />
  );
}

function KycTab({ userId }: { userId: number }) {
  const [kyc, setKyc] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.admin.userKycStatus(userId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setKyc(res.data as KycData);
      } else {
        setKyc(null);
      }
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!kyc) return <Empty description="No KYC data found" />;

  return (
    <Descriptions bordered size="small" column={1} style={{ marginTop: 8 }}>
      {kyc.status !== undefined && (
        <Descriptions.Item label="Status">
          <Tag color={kycColor(String(kyc.status))}>{String(kyc.status)}</Tag>
        </Descriptions.Item>
      )}
      {kyc.step !== undefined && (
        <Descriptions.Item label="Step">{String(kyc.step)}</Descriptions.Item>
      )}
      {kyc.firstName && (
        <Descriptions.Item label="First Name">{kyc.firstName}</Descriptions.Item>
      )}
      {kyc.lastName && (
        <Descriptions.Item label="Last Name">{kyc.lastName}</Descriptions.Item>
      )}
      {kyc.dateOfBirth && (
        <Descriptions.Item label="Date of Birth">{kyc.dateOfBirth}</Descriptions.Item>
      )}
      {kyc.country && (
        <Descriptions.Item label="Country">{kyc.country}</Descriptions.Item>
      )}
      {kyc.adminNote && (
        <Descriptions.Item label="Admin Note">{kyc.adminNote}</Descriptions.Item>
      )}
      {kyc.updatedAt && (
        <Descriptions.Item label="Updated At">{kyc.updatedAt}</Descriptions.Item>
      )}
    </Descriptions>
  );
}

function BonusesTab({ userId }: { userId: number }) {
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.admin.userBonus(userId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setBonuses(normalizeList<BonusRow>(res.data));
      } else {
        setBonuses([]);
      }
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const cols: ColumnsType<BonusRow> = [
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v) => v ?? '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => v ?? '-' },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', render: (v) => v ?? '-' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => (v ? <Tag>{v}</Tag> : '-'),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => v ?? '-',
    },
  ];

  if (!loading && bonuses.length === 0) {
    return <Empty description="No bonuses found" />;
  }

  return (
    <Table
      rowKey={(_, i) => String(i)}
      columns={cols}
      dataSource={bonuses}
      loading={loading}
      size="small"
      pagination={false}
    />
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  user: UserRow | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function DetailDrawer({ user, open, onClose, onRefresh }: DetailDrawerProps) {
  const [lockReason, setLockReason] = useState('');
  const [lockLoading, setLockLoading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);
  const [msg, msgCtx] = message.useMessage();

  if (!user) return null;

  const handleLock = async () => {
    setLockLoading(true);
    const res = await api.admin.lockUser(user.id, lockReason);
    setLockLoading(false);
    if (res.success) {
      msg.success('User locked');
      setLockReason('');
      onRefresh();
    } else {
      msg.error(res.message || 'Failed to lock user');
    }
  };

  const handleUnlock = async () => {
    setLockLoading(true);
    const res = await api.admin.unlockUser(user.id);
    setLockLoading(false);
    if (res.success) {
      msg.success('User unlocked');
      onRefresh();
    } else {
      msg.error(res.message || 'Failed to unlock user');
    }
  };

  const handleKycChange = async (status: string) => {
    setKycLoading(true);
    const res = await api.admin.updateKYC(user.id, status);
    setKycLoading(false);
    if (res.success) {
      msg.success('KYC status updated');
      onRefresh();
    } else {
      msg.error(res.message || 'Failed to update KYC');
    }
  };

  const handleRoleChange = async (role: string) => {
    setRoleLoading(true);
    const res = await api.admin.updateUser(user.id, { role });
    setRoleLoading(false);
    if (res.success) {
      msg.success('Role updated');
      onRefresh();
    } else {
      msg.error(res.message || 'Failed to update role');
    }
  };

  const tabItems = [
    {
      key: 'wallets',
      label: 'Wallets',
      children: <WalletsTab userId={user.id} />,
    },
    {
      key: 'kyc',
      label: 'KYC',
      children: <KycTab userId={user.id} />,
    },
    {
      key: 'bonuses',
      label: 'Bonuses',
      children: <BonusesTab userId={user.id} />,
    },
  ];

  return (
    <Drawer
      title={`User: ${user.email}`}
      placement="right"
      width={640}
      open={open}
      onClose={onClose}
    >
      {msgCtx}

      <Descriptions bordered size="small" column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
        <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        <Descriptions.Item label="Full Name">{user.fullName || '-'}</Descriptions.Item>
        <Descriptions.Item label="Role">
          <Tag color={roleColor(user.role)}>{user.role}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="KYC Status">
          <Tag color={kycColor(user.kycStatus)}>{user.kycStatus}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="KYC Step">{user.kycStep ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={user.locked ? 'red' : 'green'}>
            {user.locked ? 'Locked' : 'Active'}
          </Tag>
        </Descriptions.Item>
        {user.createdAt && (
          <Descriptions.Item label="Created At">{user.createdAt}</Descriptions.Item>
        )}
      </Descriptions>

      {/* Actions */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }} size="middle">
        <div>
          <Text strong>Role</Text>
          <Select
            style={{ display: 'block', marginTop: 8 }}
            defaultValue={user.role}
            loading={roleLoading}
            onChange={handleRoleChange}
            options={[
              { label: 'USER', value: 'USER' },
              { label: 'ADMIN', value: 'ADMIN' },
            ]}
          />
        </div>

        <div>
          <Text strong>KYC Status</Text>
          <Select
            style={{ display: 'block', marginTop: 8 }}
            defaultValue={user.kycStatus}
            loading={kycLoading}
            onChange={handleKycChange}
            options={[
              { label: 'NONE', value: 'NONE' },
              { label: 'PENDING', value: 'PENDING' },
              { label: 'VERIFIED', value: 'VERIFIED' },
              { label: 'REJECTED', value: 'REJECTED' },
            ]}
          />
        </div>

        <div>
          <Text strong>Lock / Unlock</Text>
          {user.locked ? (
            <div style={{ marginTop: 8 }}>
              <Popconfirm
                title="Unlock this user?"
                onConfirm={handleUnlock}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  icon={<UnlockOutlined />}
                  loading={lockLoading}
                  type="primary"
                  style={{ background: 'green', borderColor: 'green' }}
                >
                  Unlock User
                </Button>
              </Popconfirm>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <Input
                placeholder="Reason for locking..."
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <Popconfirm
                title="Lock this user?"
                description={lockReason ? `Reason: ${lockReason}` : 'No reason given.'}
                onConfirm={handleLock}
                okText="Lock"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  icon={<LockOutlined />}
                  loading={lockLoading}
                  danger
                >
                  Lock User
                </Button>
              </Popconfirm>
            </div>
          )}
        </div>
      </Space>

      <Tabs items={tabItems} />
    </Drawer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [msg, msgCtx] = message.useMessage();

  const fetchUsers = useCallback(
    async (p: number, size: number, q: string) => {
      setLoading(true);
      const res = await api.admin.users(p, size, q);
      setLoading(false);
      if (res.success && res.data) {
        const d = res.data as unknown as Record<string, unknown>;
        if (Array.isArray(d)) {
          setUsers(d as UserRow[]);
          setTotal((d as UserRow[]).length);
        } else if (Array.isArray(d.content)) {
          setUsers(d.content as UserRow[]);
          setTotal(Number(d.totalElements ?? (d.content as unknown[]).length));
        } else {
          setUsers([]);
          setTotal(0);
        }
      } else {
        msg.error(res.message || 'Failed to load users');
      }
    },
    [msg],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchUsers(page, pageSize, search);
  }, [fetchUsers, page, pageSize, search]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 20);
  };

  const handleRowClick = (record: UserRow) => {
    setSelectedUser(record);
    setDrawerOpen(true);
  };

  const handleRefresh = () => {
    fetchUsers(page, pageSize, search);
    // Reopen drawer with refreshed user data
    if (selectedUser) {
      const updated = users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
  };

  const columns: ColumnsType<UserRow> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 90,
      render: (role: string) => <Tag color={roleColor(role)}>{role}</Tag>,
    },
    {
      title: 'KYC Status',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      width: 120,
      render: (status: string) => (
        <Tag color={kycColor(status)}>{status ?? 'NONE'}</Tag>
      ),
    },
    {
      title: 'KYC Step',
      dataIndex: 'kycStep',
      key: 'kycStep',
      width: 90,
      render: (v) => v ?? '-',
    },
    {
      title: 'Status',
      dataIndex: 'locked',
      key: 'locked',
      width: 90,
      render: (locked: boolean) => (
        <Tag color={locked ? 'red' : 'green'}>{locked ? 'Locked' : 'Active'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          icon={<UserOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(record);
          }}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {msgCtx}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Users Management
        </Typography.Title>
        <Input.Search
          placeholder="Search by email or name..."
          allowClear
          enterButton={<SearchOutlined />}
          style={{ width: 320 }}
          onSearch={handleSearch}
        />
      </div>

      <Table<UserRow>
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        size="small"
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `Total ${t} users`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
        scroll={{ x: 900 }}
      />

      <DetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
