'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Form, InputNumber, Switch, Button, Card, Typography, Spin, Divider, Flex, message,
} from 'antd';
import { SaveOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import type { PlatformSettings } from '@/types';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.settings();
      if (res.success && res.data) {
        form.setFieldsValue(res.data);
      } else {
        message.error(res.message || 'Failed to load settings');
      }
    } catch {
      message.error('Network error loading settings');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function handleSave(values: Partial<PlatformSettings>) {
    setSaving(true);
    try {
      const res = await api.admin.updateSettings(values);
      if (res.success) {
        message.success('Settings saved successfully');
      } else {
        message.error(res.message || 'Failed to save settings');
      }
    } catch {
      message.error('Network error saving settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 300 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Flex align="center" gap={8} style={{ marginBottom: 20 }}>
        <SettingOutlined style={{ fontSize: 20, color: '#f0b90b' }} />
        <Title level={4} style={{ margin: 0 }}>Platform Settings</Title>
      </Flex>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Title level={5} style={{ marginBottom: 16 }}>Fee Configuration</Title>

          <Flex gap={16}>
            <Form.Item
              name="depositFeePercent"
              label="Deposit Fee (%)"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                precision={4}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item
              name="withdrawFeePercent"
              label="Withdraw Fee (%)"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                precision={4}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
            <Form.Item
              name="tradingFeePercent"
              label="Trading Fee (%)"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                precision={4}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
          </Flex>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>Deposit Limits</Title>

          <Flex gap={16}>
            <Form.Item
              name="minDeposit"
              label="Min Deposit"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/,/g, '') ?? 0) as unknown as 0}
              />
            </Form.Item>
            <Form.Item
              name="maxDeposit"
              label="Max Deposit"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/,/g, '') ?? 0) as unknown as 0}
              />
            </Form.Item>
          </Flex>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>Withdrawal Limits</Title>

          <Flex gap={16}>
            <Form.Item
              name="minWithdraw"
              label="Min Withdrawal"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/,/g, '') ?? 0) as unknown as 0}
              />
            </Form.Item>
            <Form.Item
              name="maxWithdraw"
              label="Max Withdrawal"
              rules={[{ required: true, message: 'Required' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={1}
                style={{ width: '100%' }}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/,/g, '') ?? 0) as unknown as 0}
              />
            </Form.Item>
          </Flex>

          <Divider />

          <Title level={5} style={{ marginBottom: 16 }}>Compliance</Title>

          <Form.Item
            name="kycRequired"
            label="KYC Required"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Required"
              unCheckedChildren="Optional"
            />
          </Form.Item>
          <Text type="secondary" style={{ display: 'block', marginTop: -8, marginBottom: 16, fontSize: 12 }}>
            When enabled, users must complete KYC verification before depositing or trading.
          </Text>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size="middle"
            >
              Save Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
