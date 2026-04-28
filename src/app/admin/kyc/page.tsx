'use client';

import { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Modal, Input, Space, Typography, Image, Descriptions, Flex,
  message,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, FileImageOutlined, UserOutlined,
} from '@ant-design/icons';
import { api } from '@/lib/api';
import { kycFileUrl } from '@/lib/kyc-files';
import type { KYCDocument, KYCProfile } from '@/types';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface KYCPendingUser {
  userId: number;
  email: string;
  fullName: string;
  kycStatus: string;
  profile?: KYCProfile;
  documents: KYCDocument[];
}

export default function KYCPage() {
  const [users, setUsers] = useState<KYCPendingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await api.admin.kycPending();
      if (res.success && res.data) {
        const raw = res.data as KYCPendingUser[] | { content: KYCPendingUser[] };
        if (Array.isArray(raw)) {
          setUsers(raw);
        } else if (raw && typeof raw === 'object' && 'content' in raw) {
          setUsers(raw.content);
        } else {
          setUsers([]);
        }
      } else {
        message.error(res.message || 'Failed to load KYC pending list');
      }
    } catch {
      message.error('Network error loading KYC data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPending(); }, []);

  function openAction(userId: number, type: 'approve' | 'reject') {
    setSelectedUserId(userId);
    setActionType(type);
    setNote('');
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!selectedUserId) return;
    setSubmitting(true);
    try {
      const res = actionType === 'approve'
        ? await api.admin.kycApprove(selectedUserId, note)
        : await api.admin.kycReject(selectedUserId, note);
      if (res.success) {
        message.success(`KYC ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
        setModalOpen(false);
        loadPending();
      } else {
        message.error(res.message || `Failed to ${actionType} KYC`);
      }
    } catch {
      message.error('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 80,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Full Name',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Status',
      dataIndex: 'kycStatus',
      key: 'kycStatus',
      render: (status: string) => (
        <Tag color={status === 'PENDING' ? 'orange' : status === 'APPROVED' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Documents',
      dataIndex: 'documents',
      key: 'documents',
      render: (docs: KYCDocument[]) => (
        <Text type="secondary">{docs?.length ?? 0} file(s)</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: KYCPendingUser) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => openAction(record.userId, 'approve')}
          >
            Approve
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => openAction(record.userId, 'reject')}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  function renderExpandedRow(record: KYCPendingUser) {
    const { profile, documents } = record;
    return (
      <div style={{ padding: '12px 0' }}>
        {profile ? (
          <>
            <Title level={5} style={{ marginBottom: 12 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              Profile Details
            </Title>
            <Descriptions
              bordered
              size="small"
              column={3}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="First Name">{profile.firstName}</Descriptions.Item>
              <Descriptions.Item label="Last Name">{profile.lastName}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{profile.dateOfBirth}</Descriptions.Item>
              <Descriptions.Item label="Phone">{profile.phone}</Descriptions.Item>
              <Descriptions.Item label="Occupation">{profile.occupation}</Descriptions.Item>
              <Descriptions.Item label="Income">{profile.income}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>
                {[profile.address, profile.ward, profile.district, profile.city, profile.country]
                  .filter(Boolean).join(', ')}
              </Descriptions.Item>
              <Descriptions.Item label="Purpose">{profile.purpose}</Descriptions.Item>
              <Descriptions.Item label="Trading Exp">{profile.tradingExp}</Descriptions.Item>
            </Descriptions>
          </>
        ) : (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>No profile submitted</Text>
        )}

        {documents && documents.length > 0 && (
          <>
            <Title level={5} style={{ marginBottom: 12 }}>
              <FileImageOutlined style={{ marginRight: 8 }} />
              Documents
            </Title>
            <Flex gap={16} wrap="wrap">
              {documents.map((doc) => (
                <div key={doc.id} style={{ textAlign: 'center' }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                    {doc.docType}
                  </Text>
                  <Image
                    src={kycFileUrl(doc.filePath)}
                    alt={doc.docType}
                    width={160}
                    height={100}
                    style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #303030' }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyBoBHhpjSCphTkVpVkpuVmpiZmpBVnFJeUlmSGVBSWpFSUdJRUVlSWdBZWJlZWNhYmRlY2psYGpjamJuYG5ibGBub2xubmpubmptYWJvamJtYGpjamJuYG5ibGBub2xubmpubmptYWJvamJtYG5j"
                  />
                  <Tag
                    color={doc.status === 'PENDING' ? 'orange' : doc.status === 'APPROVED' ? 'green' : 'red'}
                    style={{ marginTop: 6 }}
                  >
                    {doc.status}
                  </Tag>
                </div>
              ))}
            </Flex>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>KYC Review</Title>
        <Button onClick={loadPending} loading={loading}>Refresh</Button>
      </Flex>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="userId"
        loading={loading}
        expandable={{
          expandedRowRender: renderExpandedRow,
          rowExpandable: (record) => !!(record.profile || (record.documents && record.documents.length > 0)),
        }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
      />

      <Modal
        title={actionType === 'approve' ? 'Approve KYC' : 'Reject KYC'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={actionType === 'approve' ? 'Approve' : 'Reject'}
        okButtonProps={{
          danger: actionType === 'reject',
          loading: submitting,
        }}
        destroyOnClose
      >
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">User ID: {selectedUserId}</Text>
        </div>
        <TextArea
          rows={4}
          placeholder="Admin note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
