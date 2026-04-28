'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { SkeletonCard } from '@/components/ui/skeleton';
import type { FeeTier } from '@/types';

function fmtVol(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

interface MyTier { tier: number; volume30d: number; makerFee: number; takerFee: number; nextTierVolume?: number; }

export default function FeeTierPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [myTier, setMyTier] = useState<MyTier | null>(null);
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    let cancelled = false;
    Promise.all([api.feeTier.mine(), api.feeTier.list()]).then(([myRes, tierRes]) => {
      if (cancelled) return;
      if (myRes.success && myRes.data) setMyTier(myRes.data);
      if (tierRes.success && tierRes.data) setTiers(tierRes.data);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, router]);

  const nextTier = myTier && tiers.find((t) => t.tier === myTier.tier + 1);
  const progressPct = myTier && nextTier
    ? Math.min(100, (myTier.volume30d / nextTier.volume30dRequired) * 100)
    : myTier ? 100 : 0;

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-text-primary mb-6">Fee Tier</h1>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : !myTier ? (
        <div className="py-16 text-center text-text-secondary text-sm">Unable to load fee tier</div>
      ) : (
        <>
          {/* Current tier card */}
          <div className="bg-bg-secondary border border-border p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-text-secondary mb-1">Current Tier</div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-accent">Tier {myTier.tier}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary mb-1">30d Volume</div>
                <div className="text-xl font-bold font-mono text-text-primary">{fmtVol(myTier.volume30d)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-bg-tertiary border border-border p-3">
                <div className="text-xs text-text-secondary mb-0.5">Maker Fee</div>
                <div className="text-lg font-bold font-mono text-buy">{(myTier.makerFee * 100).toFixed(3)}%</div>
              </div>
              <div className="bg-bg-tertiary border border-border p-3">
                <div className="text-xs text-text-secondary mb-0.5">Taker Fee</div>
                <div className="text-lg font-bold font-mono text-sell">{(myTier.takerFee * 100).toFixed(3)}%</div>
              </div>
            </div>

            {nextTier ? (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-secondary">Progress to Tier {nextTier.tier}</span>
                  <span className="text-text-muted font-mono">{fmtVol(myTier.volume30d)} / {fmtVol(nextTier.volume30dRequired)}</span>
                </div>
                <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {fmtVol(nextTier.volume30dRequired - myTier.volume30d)} more volume needed to reach Tier {nextTier.tier}
                </div>
              </div>
            ) : (
              <div className="text-xs text-accent font-medium">You are at the highest tier!</div>
            )}
          </div>

          {/* Tier ladder */}
          <div className="bg-bg-secondary border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-text-primary">Fee Schedule</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="text-left px-4 py-2.5 font-medium">#</th>
                  <th className="text-right px-4 py-2.5 font-medium">30d Volume Required</th>
                  <th className="text-right px-4 py-2.5 font-medium">Maker</th>
                  <th className="text-right px-4 py-2.5 font-medium">Taker</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => {
                  const isCurrent = t.tier === myTier.tier;
                  return (
                    <tr
                      key={t.tier}
                      className={`border-b border-border last:border-0 ${isCurrent ? 'border-l-2 border-l-accent bg-accent/5' : 'hover:bg-bg-hover'}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={isCurrent ? 'text-accent font-bold' : 'text-text-primary'}>Tier {t.tier}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-accent text-black">YOU</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-secondary">{fmtVol(t.volume30dRequired)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-buy">{(t.makerFee * 100).toFixed(3)}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sell">{(t.takerFee * 100).toFixed(3)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
