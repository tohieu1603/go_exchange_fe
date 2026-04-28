'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Order } from '@/types';

interface Props {
  pair?: string;
}

export function OrderHistory({ pair }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.trading.orders(1, 50).then((res) => {
      if (res.data && 'content' in res.data) {
        const all = (res.data as { content: Order[] }).content;
        setOrders(pair ? all.filter((o) => o.pair === pair) : all);
      } else if (Array.isArray(res.data)) {
        const all = res.data as Order[];
        setOrders(pair ? all.filter((o) => o.pair === pair) : all);
      }
    });
  }, [pair]);

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-[11px]">
        No order history
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-2 h-7 font-normal text-text-muted">Date</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted">Pair</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted">Side</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted">Type</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted">Price</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted">Amount</th>
            <th className="text-right px-2 h-7 font-normal text-text-muted">Filled</th>
            <th className="text-left px-2 h-7 font-normal text-text-muted">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const date = new Date(order.createdAt);
            const dateStr = `${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            const filledPct = order.amount > 0 ? ((order.filledAmount / order.amount) * 100).toFixed(1) : '0.0';
            return (
              <tr key={order.id} className="hover:bg-bg-hover border-b border-border/40" style={{ height: '28px' }}>
                <td className="px-2 font-mono text-text-muted whitespace-nowrap">{dateStr}</td>
                <td className="px-2 font-mono text-text-primary">{order.pair}</td>
                <td className="px-2">
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium ${order.side === 'BUY' ? 'text-buy bg-buy-bg' : 'text-sell bg-sell-bg'}`}>
                    {order.side}
                  </span>
                </td>
                <td className="px-2 text-text-secondary">{order.type}</td>
                <td className="px-2 text-right font-mono tabular-nums text-text-primary">
                  {order.price > 0 ? order.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : 'Market'}
                </td>
                <td className="px-2 text-right font-mono tabular-nums text-text-primary">{order.amount.toFixed(5)}</td>
                <td className="px-2 text-right text-text-muted tabular-nums">{filledPct}%</td>
                <td className="px-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 ${
                    order.status === 'FILLED' ? 'text-buy bg-buy-bg'
                    : order.status === 'CANCELLED' ? 'text-text-muted bg-bg-tertiary'
                    : 'text-accent bg-accent/10'
                  }`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
