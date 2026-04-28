'use client';
import { useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useTradingStore } from '@/stores/trading-store';
import { useToast } from '@/components/ui/toast-provider';

interface Props {
  pair?: string;
}

export function OpenOrders({ pair }: Props) {
  const { openOrders, setOpenOrders, removeOrder } = useTradingStore();
  const toast = useToast();

  const fetchOrders = useCallback(async () => {
    const res = await api.trading.openOrders();
    if (res.data) setOpenOrders(res.data);
  }, [setOpenOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const displayed = pair ? openOrders.filter((o) => o.pair === pair) : openOrders;

  async function handleCancel(id: number) {
    if (!confirm('Cancel this order?')) return;
    const res = await api.trading.cancelOrder(id);
    if (res.success !== false) {
      removeOrder(id);
      toast.success('Order cancelled');
    } else {
      toast.error('Failed to cancel order');
    }
  }

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
        <svg className="w-8 h-8 text-text-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-text-muted text-[11px]">No open orders</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-2 h-7 font-normal text-text-muted whitespace-nowrap">Date</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted whitespace-nowrap">Pair</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted whitespace-nowrap">Side</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted whitespace-nowrap">Type</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted whitespace-nowrap">Price</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted whitespace-nowrap">Amount</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted whitespace-nowrap">Filled%</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted whitespace-nowrap">Cancel</th>
          </tr>
        </thead>
        <tbody>
          {displayed.map((order) => {
            const filledPct = order.amount > 0
              ? ((order.filledAmount / order.amount) * 100).toFixed(1)
              : '0.0';
            const date = new Date(order.createdAt);
            const dateStr = `${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            return (
              <tr
                key={order.id}
                className="hover:bg-bg-hover border-b border-border/40"
                style={{ height: '28px' }}
              >
                <td className="px-2 font-mono text-text-muted whitespace-nowrap">{dateStr}</td>
                <td className="px-2 font-mono text-text-primary">{order.pair}</td>
                <td className="px-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium ${order.side === 'BUY' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                    {order.side}
                  </span>
                </td>
                <td className="px-2 text-text-secondary">{order.type}</td>
                <td className="px-2 text-right font-mono tabular-nums text-text-primary">
                  {order.price > 0
                    ? order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
                    : 'Market'}
                </td>
                <td className="px-2 text-right font-mono tabular-nums text-text-primary">
                  {order.amount.toFixed(5)}
                </td>
                <td className="px-2 text-right text-text-muted tabular-nums">{filledPct}%</td>
                <td className="px-2 text-right">
                  <button
                    onClick={() => handleCancel(order.id)}
                    className="text-text-secondary hover:text-sell transition-colors text-[11px]"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
