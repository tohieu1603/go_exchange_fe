'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast-provider';
import type { BonusPromotion } from '@/types';

interface UserBonus {
  id: number;
  userId: number;
  promotionId: number;
  bonusAmount: number;
  usedAmount: number;
  status: string;
  createdAt: string;
}

const EMPTY_FORM: Partial<BonusPromotion> = {
  name: '',
  description: '',
  bonusPercent: 0,
  maxBonusAmount: 0,
  targetType: 'ALL',
  triggerType: 'DEPOSIT',
  startAt: '',
  endAt: '',
};

const TARGET_TYPES = ['ALL', 'NEW_USER', 'VIP'];
const TRIGGER_TYPES = ['DEPOSIT', 'TRADE', 'REGISTER'];
const STATUS_FILTERS = ['ALL', 'Active', 'Inactive'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const INPUT_CLS =
  'w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent placeholder:text-text-muted transition-colors';
const SELECT_CLS =
  'w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors';
const LABEL_CLS = 'block text-xs text-text-muted mb-1 uppercase tracking-wide';

function fmt(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function toLocalDatetime(dateStr: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Slide-out panel for create / edit
// ---------------------------------------------------------------------------

interface FormPanelProps {
  open: boolean;
  editing: BonusPromotion | null;
  onClose: () => void;
  onSaved: () => void;
}

function FormPanel({ open, editing, onClose, onSaved }: FormPanelProps) {
  const { success, error } = useToast();
  const [form, setForm] = useState<Partial<BonusPromotion>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        startAt: toLocalDatetime(editing.startAt),
        endAt: toLocalDatetime(editing.endAt),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editing, open]);

  function set<K extends keyof BonusPromotion>(key: K, val: BonusPromotion[K]) {
    setForm((p) => ({ ...p, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      const res = editing
        ? await api.admin.updatePromotion(editing.id, payload)
        : await api.admin.createPromotion(payload);
      if (res.success) {
        success(editing ? 'Promotion updated' : 'Promotion created');
        onSaved();
        onClose();
      } else {
        error(res.message || 'Operation failed');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] max-w-full bg-bg-secondary border-l border-border z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              {editing ? 'Edit Promotion' : 'New Promotion'}
            </h3>
            {editing && (
              <p className="text-xs text-text-muted mt-0.5">ID #{editing.id}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors px-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={LABEL_CLS}>Promotion Name *</label>
            <input
              value={form.name || ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Welcome Bonus"
              className={INPUT_CLS}
            />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of this promotion..."
              rows={3}
              className={`${INPUT_CLS} resize-none`}
            />
          </div>

          {/* Bonus % and Max Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Bonus %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.bonusPercent ?? ''}
                onChange={(e) => set('bonusPercent', Number(e.target.value))}
                placeholder="0.0"
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Max Bonus Amount</label>
              <input
                type="number"
                min="0"
                value={form.maxBonusAmount ?? ''}
                onChange={(e) => set('maxBonusAmount', Number(e.target.value))}
                placeholder="0"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Target and Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Target Type</label>
              <select
                value={form.targetType || 'ALL'}
                onChange={(e) => set('targetType', e.target.value)}
                className={SELECT_CLS}
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Trigger Type</label>
              <select
                value={form.triggerType || 'DEPOSIT'}
                onChange={(e) => set('triggerType', e.target.value)}
                className={SELECT_CLS}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Start Date</label>
              <input
                type="datetime-local"
                value={form.startAt || ''}
                onChange={(e) => set('startAt', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>End Date</label>
              <input
                type="datetime-local"
                value={form.endAt || ''}
                onChange={(e) => set('endAt', e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {editing && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={`relative w-10 h-5 transition-colors ${form.isActive ? 'bg-accent' : 'bg-bg-tertiary border border-border'}`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
              <span className="text-xs text-text-secondary">
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 bg-accent text-black text-sm font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  promo: BonusPromotion | null;
  onClose: () => void;
  onEdit: (p: BonusPromotion) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
}

function DetailModal({ promo, onClose, onEdit, onDelete, onToggle }: DetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setConfirmDelete(false); }, [promo]);

  if (!promo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border w-full max-w-lg z-10">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">{promo.name}</h3>
            <p className="text-xs text-text-muted mt-0.5">Promotion ID #{promo.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                promo.isActive ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
              }`}
            >
              {promo.isActive ? 'Active' : 'Inactive'}
            </span>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary px-1 transition-colors" aria-label="Close"><X className="w-4 h-4" strokeWidth={2} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {promo.description && (
            <p className="text-sm text-text-secondary leading-relaxed">{promo.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-tertiary border border-border px-4 py-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Bonus</div>
              <div className="text-xl font-bold text-accent">+{promo.bonusPercent}%</div>
            </div>
            <div className="bg-bg-tertiary border border-border px-4 py-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Max Amount</div>
              <div className="text-xl font-bold text-text-primary">{promo.maxBonusAmount.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Target</div>
              <span className="px-2 py-0.5 bg-bg-tertiary border border-border text-xs text-text-secondary font-medium">
                {promo.targetType}
              </span>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Trigger</div>
              <span className="px-2 py-0.5 bg-bg-tertiary border border-border text-xs text-text-secondary font-medium">
                {promo.triggerType}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Start</div>
              <div className="text-text-primary">{fmt(promo.startAt)}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">End</div>
              <div className="text-text-primary">{fmt(promo.endAt)}</div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-sell flex-1">Confirm delete?</span>
              <button
                onClick={() => { onDelete(promo.id); onClose(); }}
                className="px-4 py-1.5 bg-sell/20 text-sell text-xs font-bold hover:bg-sell/30 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-1.5 border border-border text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { onEdit(promo); onClose(); }}
                className="flex-1 py-2 border border-border text-text-secondary text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { onToggle(promo.id); onClose(); }}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  promo.isActive
                    ? 'bg-sell/20 text-sell hover:bg-sell/30'
                    : 'bg-buy/20 text-buy hover:bg-buy/30'
                }`}
              >
                {promo.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 bg-sell/20 text-sell text-xs font-semibold hover:bg-sell/30 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User bonuses lookup
// ---------------------------------------------------------------------------

function UserBonusSection() {
  const { error } = useToast();
  const [userId, setUserId] = useState('');
  const [bonuses, setBonuses] = useState<UserBonus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const id = userId.trim();
    if (!id) return;
    setLoading(true);
    setSearched(false);
    try {
      const res = await api.admin.userBonus(Number(id));
      if (res.success && res.data) {
        const data = Array.isArray(res.data) ? res.data : [res.data];
        setBonuses(data);
      } else {
        setBonuses([]);
        if (res.message) error(res.message);
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    ACTIVE: 'text-buy',
    USED: 'text-text-muted',
    EXPIRED: 'text-sell',
    PENDING: 'text-accent',
  };

  return (
    <div className="bg-bg-secondary border border-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">User Bonus Lookup</h3>
      </div>

      {/* Search */}
      <div className="px-5 py-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID..."
            className="flex-1 px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent placeholder:text-text-muted transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-accent text-black text-xs font-bold hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Lookup'}
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div className="border-t border-border">
          {bonuses.length === 0 ? (
            <div className="px-5 py-4 text-xs text-text-muted text-center">
              No bonuses found for user #{userId}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {bonuses.map((b) => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-primary">Bonus #{b.id}</span>
                      <span className={`text-[10px] font-bold uppercase ${STATUS_COLOR[b.status] || 'text-text-muted'}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">
                      Promo #{b.promotionId} · {fmt(b.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-primary font-semibold">
                      {b.bonusAmount.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      used {b.usedAmount.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Promotion card
// ---------------------------------------------------------------------------

interface PromoCardProps {
  promo: BonusPromotion;
  onView: (p: BonusPromotion) => void;
  onToggle: (id: number) => void;
}

function PromoCard({ promo, onView, onToggle }: PromoCardProps) {
  const isExpired = promo.endAt && new Date(promo.endAt) < new Date();

  return (
    <div
      className="bg-bg-secondary border border-border hover:border-accent/40 transition-colors cursor-pointer"
      onClick={() => onView(promo)}
    >
      {/* Top bar */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary truncate">{promo.name}</span>
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                promo.isActive && !isExpired ? 'bg-buy/20 text-buy' : 'bg-sell/20 text-sell'
              }`}
            >
              {isExpired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {promo.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-1">{promo.description}</p>
          )}
        </div>
        {/* Bonus % badge */}
        <div className="ml-3 shrink-0 text-right">
          <div className="text-xl font-bold text-accent">+{promo.bonusPercent}%</div>
          <div className="text-[10px] text-text-muted">max {promo.maxBonusAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
        <span className="px-2 py-0.5 bg-bg-tertiary border border-border text-[10px] text-text-secondary font-medium uppercase">
          {promo.targetType}
        </span>
        <span className="px-2 py-0.5 bg-bg-tertiary border border-border text-[10px] text-text-secondary font-medium uppercase">
          {promo.triggerType}
        </span>
        <span className="text-[10px] text-text-muted ml-auto">
          {fmt(promo.startAt)} — {fmt(promo.endAt)}
        </span>
      </div>

      {/* Footer action */}
      <div
        className="border-t border-border px-4 py-2 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-text-muted">ID #{promo.id}</span>
        <button
          onClick={() => onToggle(promo.id)}
          className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${
            promo.isActive
              ? 'bg-sell/20 text-sell hover:bg-sell/30'
              : 'bg-buy/20 text-buy hover:bg-buy/30'
          }`}
        >
          {promo.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BonusPanel
// ---------------------------------------------------------------------------

export function BonusPanel() {
  const { success, error } = useToast();

  // Data
  const [promos, setPromos] = useState<BonusPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [targetFilter, setTargetFilter] = useState('ALL');
  const [triggerFilter, setTriggerFilter] = useState('ALL');

  // UI state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BonusPromotion | null>(null);
  const [viewing, setViewing] = useState<BonusPromotion | null>(null);
  const [tab, setTab] = useState<'promotions' | 'users'>('promotions');

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.bonusPromotions(0, 100);
      if (res.success && res.data) {
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data as { content?: BonusPromotion[] }).content ?? [];
        setPromos(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Actions
  async function handleToggle(id: number) {
    const res = await api.admin.togglePromotion(id);
    if (res.success) {
      success('Status updated');
      load();
    } else {
      error(res.message || 'Failed to update');
    }
  }

  async function handleDelete(id: number) {
    const res = await api.admin.deletePromotion(id);
    if (res.success) {
      success('Promotion deleted');
      load();
    } else {
      error(res.message || 'Failed to delete');
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(p: BonusPromotion) {
    setEditing(p);
    setFormOpen(true);
  }

  // Filter
  const filtered = promos.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'Active' && !p.isActive) return false;
    if (statusFilter === 'Inactive' && p.isActive) return false;
    if (targetFilter !== 'ALL' && p.targetType !== targetFilter) return false;
    if (triggerFilter !== 'ALL' && p.triggerType !== triggerFilter) return false;
    return true;
  });

  const activeCount = promos.filter((p) => p.isActive).length;

  return (
    <>
      {/* Form slide-out */}
      <FormPanel
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      {/* Detail modal */}
      <DetailModal
        promo={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => { setViewing(null); openEdit(p); }}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />

      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wider">Bonus Promotions</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {promos.length} total · {activeCount} active
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-accent text-black text-xs font-bold hover:bg-accent-hover transition-colors"
          >
            + New Promotion
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['promotions', 'users'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t === 'promotions' ? 'Promotions' : 'User Lookup'}
            </button>
          ))}
        </div>

        {tab === 'users' ? (
          <UserBonusSection />
        ) : (
          <>
            {/* Filters */}
            <div className="bg-bg-secondary border border-border px-4 py-3 space-y-3">
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search promotions by name..."
                className="w-full px-3 py-2 bg-bg-tertiary border border-border text-text-primary text-sm outline-none focus:border-accent placeholder:text-text-muted transition-colors"
              />

              {/* Filter row */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Status filter */}
                <div className="flex items-center gap-0 border border-border">
                  {STATUS_FILTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                        statusFilter === s
                          ? 'bg-accent text-black'
                          : 'text-text-muted hover:text-text-secondary bg-bg-tertiary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Target filter */}
                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-secondary text-xs outline-none focus:border-accent transition-colors"
                >
                  <option value="ALL">All Targets</option>
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Trigger filter */}
                <select
                  value={triggerFilter}
                  onChange={(e) => setTriggerFilter(e.target.value)}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border text-text-secondary text-xs outline-none focus:border-accent transition-colors"
                >
                  <option value="ALL">All Triggers</option>
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Result count */}
                <span className="ml-auto text-xs text-text-muted">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Promotion grid */}
            {loading ? (
              <div className="py-12 text-center">
                <div className="text-xs text-text-muted animate-pulse">Loading promotions...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center bg-bg-secondary border border-border">
                <div className="text-sm text-text-secondary font-medium">No promotions found</div>
                {(search || statusFilter !== 'ALL' || targetFilter !== 'ALL' || triggerFilter !== 'ALL') && (
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('ALL'); setTargetFilter('ALL'); setTriggerFilter('ALL'); }}
                    className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                {promos.length === 0 && (
                  <button
                    onClick={openCreate}
                    className="mt-3 px-4 py-2 bg-accent text-black text-xs font-bold hover:bg-accent-hover transition-colors"
                  >
                    Create first promotion
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map((p) => (
                  <PromoCard
                    key={p.id}
                    promo={p}
                    onView={setViewing}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
