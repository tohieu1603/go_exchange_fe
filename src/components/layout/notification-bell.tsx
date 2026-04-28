'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Zap, AlertTriangle,
  DollarSign, CheckCircle, FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useChannel } from '@/hooks/use-ws';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast-provider';
import type { Notification } from '@/types';

// Map notification types to lucide icons. Unknown types fall back to FileText.
const TYPE_ICONS: Record<string, LucideIcon> = {
  POSITION_OPENED: TrendingUp,
  POSITION_CLOSED: TrendingDown,
  POSITION_LIQUIDATED: Zap,
  MARGIN_CALL: AlertTriangle,
  DEPOSIT_CONFIRMED: DollarSign,
  ORDER_FILLED: CheckCircle,
};

const TYPE_COLORS: Record<string, string> = {
  POSITION_LIQUIDATED: 'border-l-sell',
  MARGIN_CALL: 'border-l-sell',
  DEPOSIT_CONFIRMED: 'border-l-buy',
  POSITION_OPENED: 'border-l-accent',
  POSITION_CLOSED: 'border-l-text-secondary',
  ORDER_FILLED: 'border-l-buy',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [listRes, countRes] = await Promise.allSettled([
        api.notifications.list(1, 20),
        api.notifications.unreadCount(),
      ]);
      if (listRes.status === 'fulfilled' && listRes.value.success && listRes.value.data && 'content' in listRes.value.data) {
        setNotifications((listRes.value.data as { content: Notification[] }).content);
      }
      if (countRes.status === 'fulfilled' && countRes.value.success && countRes.value.data) {
        setUnreadCount(countRes.value.data.count);
      }
    } catch {
      // API unreachable — silently ignore, will retry on next interval
    }
  }, [user]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return; // don't poll when logged out
    fetchNotifications();
    const iv = setInterval(fetchNotifications, 30000);
    return () => clearInterval(iv);
  }, [user, fetchNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Realtime WS: new notifications
  const channel = user?.id ? `notification@${user.id}` : '';
  useChannel(channel, (data) => {
    const notif = data as Notification;
    if (notif && notif.title) {
      // Show toast for realtime notification
      const isError = notif.type === 'POSITION_LIQUIDATED' || notif.type === 'MARGIN_CALL';
      if (isError) {
        toast.error(`${notif.title}: ${notif.message}`);
      } else {
        toast.success(`${notif.title}: ${notif.message}`);
      }
      // Prepend to list
      setNotifications((prev) => [notif, ...prev].slice(0, 20));
      setUnreadCount((c) => c + 1);
    }
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleMarkAllRead() {
    await api.notifications.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handleMarkRead(id: number) {
    await api.notifications.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
      >
        {/* Bell icon */}
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-sell text-white text-[9px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-bg-secondary border border-border shadow-2xl z-50 flex flex-col" style={{ maxHeight: '400px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-[12px] font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-accent hover:text-accent-hover cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-[11px]">No notifications</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`w-full text-left px-3 py-2 border-l-2 border-b border-border/40 hover:bg-bg-hover transition-colors cursor-pointer ${
                    TYPE_COLORS[n.type] || 'border-l-border'
                  } ${!n.isRead ? 'bg-bg-tertiary/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {(() => {
                      const Icon = TYPE_ICONS[n.type] ?? FileText;
                      return <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text-secondary" strokeWidth={2} />;
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-medium truncate ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-text-muted shrink-0">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 bg-accent rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
