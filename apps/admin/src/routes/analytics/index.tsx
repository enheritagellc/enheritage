import React from 'react';
import { Card, Badge } from '@enheritage/ui';

interface MetricCard {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  sub: string;
}

const METRICS: MetricCard[] = [
  { label: 'Total Users', value: '1,284', delta: '+12%', deltaPositive: true, sub: 'vs last month' },
  { label: 'Active Interviews', value: '47', delta: '+5', deltaPositive: true, sub: 'right now' },
  { label: 'Biographies Generated', value: '392', delta: '+34', deltaPositive: true, sub: 'this month' },
  { label: 'Revenue (MRR)', value: '$28,450', delta: '+8.3%', deltaPositive: true, sub: 'vs last month' },
  { label: 'Churn Rate', value: '2.1%', delta: '-0.4pp', deltaPositive: true, sub: 'vs last month' },
  { label: 'Avg Session Length', value: '38 min', delta: '+3 min', deltaPositive: true, sub: 'vs last month' },
];

interface TierBreakdown {
  tier: string;
  count: number;
  pct: number;
  color: string;
}

const TIER_BREAKDOWN: TierBreakdown[] = [
  { tier: 'FREE', count: 720, pct: 56, color: '#98A2B3' },
  { tier: 'STANDARD', count: 310, pct: 24, color: '#2B5BA8' },
  { tier: 'PREMIUM', count: 180, pct: 14, color: '#C8973A' },
  { tier: 'ELITE', count: 54, pct: 4, color: '#8F6420' },
  { tier: 'ENTERPRISE', count: 20, pct: 2, color: '#065F46' },
];

const WEEKLY_INTERVIEWS = [
  { week: 'Feb 26', count: 38 },
  { week: 'Mar 4',  count: 51 },
  { week: 'Mar 11', count: 44 },
  { week: 'Mar 18', count: 67 },
  { week: 'Mar 25', count: 59 },
];

const maxCount = Math.max(...WEEKLY_INTERVIEWS.map((w) => w.count));

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[#101828]">Analytics</h1>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m) => (
          <Card key={m.label}>
            <p className="text-sm text-[#667085]">{m.label}</p>
            <p className="text-2xl font-bold text-[#101828] mt-1">{m.value}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={[
                  'text-xs font-medium',
                  m.deltaPositive ? 'text-[#10B981]' : 'text-[#EF4444]',
                ].join(' ')}
              >
                {m.delta}
              </span>
              <span className="text-xs text-[#98A2B3]">{m.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly interviews bar chart */}
        <Card title="Weekly Interviews" subtitle="Last 5 weeks">
          <div className="flex items-end gap-3 h-40 pt-4">
            {WEEKLY_INTERVIEWS.map((w) => {
              const heightPct = (w.count / maxCount) * 100;
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[#667085]">{w.count}</span>
                  <div
                    className="w-full bg-[#2B5BA8] rounded-t-sm transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-xs text-[#98A2B3] whitespace-nowrap">{w.week}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Tier breakdown */}
        <Card title="User Tier Breakdown" subtitle="Distribution across all tiers">
          <div className="space-y-3 mt-1">
            {TIER_BREAKDOWN.map((t) => (
              <div key={t.tier} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#344054] font-medium">{t.tier}</span>
                  <span className="text-[#667085]">{t.count.toLocaleString()} ({t.pct}%)</span>
                </div>
                <div className="w-full bg-[#E4E7EC] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${t.pct}%`, backgroundColor: t.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card title="Recent Activity" subtitle="System events from the last 24 hours">
        <div className="space-y-3">
          {[
            { time: '11:42', event: 'Biography published', detail: 'Rose Cohen — owner: Sarah Johnson', type: 'success' as const },
            { time: '11:15', event: 'Interview completed', detail: 'Life in the 1950s — 63 min', type: 'info' as const },
            { time: '10:33', event: 'New user registered', detail: 'carlos.m@example.com — FREE tier', type: 'default' as const },
            { time: '09:58', event: 'Interview failed', detail: 'Family Recipes Collection — WebRTC timeout', type: 'error' as const },
            { time: '09:20', event: 'Keepsake order placed', detail: 'ENH-2026-0003 · $59.97', type: 'success' as const },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs text-[#98A2B3] w-10 flex-shrink-0 mt-0.5">{item.time}</span>
              <Badge variant={item.type} size="sm" className="flex-shrink-0 mt-0.5">{item.event}</Badge>
              <span className="text-sm text-[#667085]">{item.detail}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
