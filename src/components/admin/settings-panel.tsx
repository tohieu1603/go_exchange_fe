'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';
import type { PlatformSettings } from '@/types';

export function SettingsPanel() {
  const { success, error } = useToast();
  const [settings, setSettings] = useState<Partial<PlatformSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.admin.settings().then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await api.admin.updateSettings(settings);
    if (res.success) success('Settings saved');
    else error(res.message || 'Failed to save');
    setSaving(false);
  }

  function set(key: keyof PlatformSettings, value: string | boolean) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  const numFields: { key: keyof PlatformSettings; label: string; step?: string }[] = [
    { key: 'depositFeePercent', label: 'Deposit Fee %', step: '0.01' },
    { key: 'withdrawFeePercent', label: 'Withdraw Fee %', step: '0.01' },
    { key: 'tradingFeePercent', label: 'Trading Fee %', step: '0.001' },
    { key: 'minDeposit', label: 'Min Deposit (VND)' },
    { key: 'maxDeposit', label: 'Max Deposit (VND)' },
    { key: 'minWithdraw', label: 'Min Withdraw (VND)' },
    { key: 'maxWithdraw', label: 'Max Withdraw (VND)' },
  ];

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-text-primary mb-4">Platform Settings</h2>
      <div className="bg-bg-secondary border border-border p-6 space-y-4">
        {numFields.map(({ key, label, step }) => (
          <div key={key}>
            <label className="block text-xs text-text-secondary mb-1">{label}</label>
            <input type="number" step={step || '1'} value={String(settings[key] ?? '')}
              onChange={(e) => set(key, e.target.value)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent" />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-secondary">KYC Required</label>
          <button onClick={() => set('kycRequired', !settings.kycRequired)}
            className={`relative w-10 h-5 rounded-full transition-colors ${settings.kycRequired ? 'bg-accent' : 'bg-bg-tertiary border border-border'}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.kycRequired ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-text-primary">{settings.kycRequired ? 'Yes' : 'No'}</span>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-2.5 bg-accent text-black font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
