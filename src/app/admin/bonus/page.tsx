'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, Switch,
  Typography, Space, Divider, Spin, Flex, message,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import type { BonusPromotion, UserBonus, PageResponse } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function BonusPage() {
  const [promotions, setPromotions] = useState<BonusPromotion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [userIdInput, setUserIdInput] = useState('');
  const [userBonuses, setUserBonuses] = useState<UserBonus[]>([]);
  const [bonusLoading, setBonusLoading] = useState(false);

  const [form] = Form.useForm();

  const loadPromotions = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.admin.bonusPromotions(p, 20);
      if (res.success && res.data) {
        const raw = res.data as BonusPromotion[] | PageResponse<BonusPromotion>;
        if (Array.isArray(raw)) {
          setPromotions(raw);
          setTotal(raw.length);
        } else if (raw && 'content' in raw) {
          setPromotions(raw.content);
          setTotal(raw.totalElements);
        } else {
          setPromotions([]);
        }
      } else {
        message.error(res.message || 'Failed to load promotions');
      }
    } catch {
      message.error('Network error');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadPromotions(page); }, [page, loadPromotions]);

  async function handleToggle(id: number) {
    setTogglingId(id);
    try {
      const res = await api.admin.togglePromotion(id);
      if (res.success) {
        message.success('Promotion status toggled');
        loadPromotions(page);
      } else {
        message.error(res.message || 'Failed to toggle promotion');
      }
    } catch {
      message.error('Network error');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate(values: Record<string, unknown>) {
    setCreating(true);
    try {
      const payload: Partial<BonusPromotion> = {
        name: values.name as string,
        description: values.description as string,
        bonusPercent: values.bonusPercent as number,
        maxBonusAmount: values.maxBonusAmount as number,
        targetType: values.targetType as string,
        triggerType: values.triggerType as string,
        startAt: (values.startAt as ReturnType<typeof dayjs>)?.toISOString(),
        endAt: (values.endAt as ReturnType<typeof dayjs>)?.toISOString(),
      };
      const res = await api.admin.createPromotion(payload);
      if (res.success) {
        message.success('Promotion created');
        setCreateOpen(false);
        form.resetFields();
        loadPromotions(1);
        setPage(1);
      } else {
        message.error(res.message || 'Failed to create promotion');
      }
    } catch {
      message.error('Network error');
    } finally {
      setCreating(false);
    }
  }

  async function handleUserBonusLookup() {
    const uid = parseInt(userIdInput, 10);
    if (!uid || isNaN(uid)) {
      message.warning('Enter a valid user ID');
      return;
    }
    setBonusLoading(true);
    try {
      const res = await api.admin.userBonus(uid);
      if (res.success && res.data) {
        const raw = res.data as UserBonus[] | PageResponse<UserBonus>;
        if (Array.isArray(raw)) {
          setUserBonuses(raw);
        } else if (raw && 'content' in raw) {
          setUserBonuses(raw.content);
        } else {
          setUserBonuses([]);
        }
        if (
          (Array.isArray(raw) && raw.length === 0) ||
          (!Array.isArray(raw) && 'content' in raw && raw.content.length === 0)
        ) {
          message.info('No bonuses found for this user');
        }
      } else {
        message.error(res.message || 'Failed to load user bonuses');
        setUserBonuses([]);
      }
    } catch {
      message.error('Network error');
    } finally {
      setBonusLoading(false);
    }
  }

  const promoColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Bonus %',
      dataIndex: 'bonusPercent',
      key: 'bonusPercent',
      render: (v: number) => `${v}%`,
      width: 90,
    },
    {
      title: 'Max Bonus',
      dataIndex: 'maxBonusAmount',
      key: 'maxBonusAmount',
      render: (v: number) => v?.toLocaleString(),
      width: 110,
    },
    {
      title: 'Target',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (v: string) => <Tag>{v}</Tag>,
      width: 110,
    },
    {
      title: 'Trigger',
      dataIndex: 'triggerType',
      key: 'triggerType',
      render: (v: string) => <Tag color="blue">{v}</Tag>,
      width: 110,
    },
    {
      title: 'Start',
      dataIndex: 'startAt',
      key: 'startAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
      width: 110,
    },
    {
      title: 'End',
      dataIndex: 'endAt',
      key: 'endAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
      width: 110,
    },
    {
      title: 'Active',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (active: boolean, record: BonusPromotion) => (
        <Switch
          checked={active}
          loading={togglingId === record.id}
          onChange={() => handleToggle(record.id)}
          size="small"
        />
      ),
    },
  ];

  const userBonusColumns = [
    { title: 'Bonus ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Promotion ID', dataIndex: 'promotionId', key: 'promotionId', width: 110 },
    {
      title: 'Bonus Amount',
      dataIndex: 'bonusAmount',
      key: 'bonusAmount',
      render: (v: number) => v?.toLocaleString(),
    },
    {
      title: 'Used Amount',
      dataIndex: 'usedAmount',
      key: 'usedAmount',
      render: (v: number) => v?.toLocaleString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={v === 'ACTIVE' ? 'green' : v === 'USED' ? 'blue' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Promotions & Bonuses</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          New Promotion
        </Button>
      </Flex>

      <Table
        dataSource={promotions}
        columns={promoColumns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => setPage(p),
          showTotal: (t) => `Total ${t}`,
        }}
        style={{ marginBottom: 32 }}
      />

      <Divider />

      <Title level={5} style={{ marginBottom: 12 }}>User Bonus Lookup</Title>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Enter User ID"
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          onPressEnter={handleUserBonusLookup}
          style={{ width: 200 }}
        />
        <Button
          icon={<SearchOutlined />}
          onClick={handleUserBonusLookup}
          loading={bonusLoading}
        >
          Search
        </Button>
      </Space>

      {bonusLoading ? (
        <Spin />
      ) : userBonuses.length > 0 ? (
        <Table
          dataSource={userBonuses}
          columns={userBonusColumns}
          rowKey="id"
          size="small"
          pagination={false}
        />
      ) : null}

      <Modal
        title="Create Promotion"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Create"
        okButtonProps={{ loading: creating }}
        destroyOnClose
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="Promotion name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Description" />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item
              name="bonusPercent"
              label="Bonus %"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder="e.g. 10" />
            </Form.Item>
            <Form.Item
              name="maxBonusAmount"
              label="Max Bonus Amount"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 1000" />
            </Form.Item>
          </Flex>
          <Flex gap={16}>
            <Form.Item
              name="targetType"
              label="Target"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Select target">
                <Select.Option value="ALL">ALL</Select.Option>
                <Select.Option value="NEW_USER">NEW_USER</Select.Option>
                <Select.Option value="VIP">VIP</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="triggerType"
              label="Trigger"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <Select placeholder="Select trigger">
                <Select.Option value="DEPOSIT">DEPOSIT</Select.Option>
                <Select.Option value="TRADE">TRADE</Select.Option>
                <Select.Option value="REGISTER">REGISTER</Select.Option>
              </Select>
            </Form.Item>
          </Flex>
          <Flex gap={16}>
            <Form.Item name="startAt" label="Start Date" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endAt" label="End Date" style={{ flex: 1 }}>
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}
