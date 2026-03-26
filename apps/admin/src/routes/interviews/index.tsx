import React, { useState } from 'react';
import { Card, Badge, Input } from '@enheritage/ui';
import { InterviewStatus, InterviewFormat } from '@enheritage/types';

interface AdminInterview {
  id: string;
  title: string;
  ownerName: string;
  status: InterviewStatus;
  format: InterviewFormat;
  scheduledAt?: string;
  startedAt: string;
  durationMinutes?: number;
  hasTranscript: boolean;
}

const MOCK_INTERVIEWS: AdminInterview[] = [
  { id: 'i1', title: "Grandma Rose's Childhood", ownerName: 'Sarah Johnson', status: InterviewStatus.COMPLETED, format: InterviewFormat.VIDEO, startedAt: '2026-03-20', durationMinutes: 47, hasTranscript: true },
  { id: 'i2', title: "Dad's War Stories", ownerName: 'Michael Chen', status: InterviewStatus.SCHEDULED, format: InterviewFormat.VIDEO, scheduledAt: '2026-03-28', startedAt: '2026-03-28', hasTranscript: false },
  { id: 'i3', title: "Mom's Immigration", ownerName: 'Emma Rodriguez', status: InterviewStatus.ACTIVE, format: InterviewFormat.AUDIO_ONLY, startedAt: '2026-03-25', durationMinutes: 12, hasTranscript: true },
  { id: 'i4', title: 'Family Recipes Collection', ownerName: 'David Williams', status: InterviewStatus.FAILED, format: InterviewFormat.ASYNC_UPLOAD, startedAt: '2026-03-22', hasTranscript: false },
  { id: 'i5', title: 'Life in the 1950s', ownerName: 'Lena Fischer', status: InterviewStatus.COMPLETED, format: InterviewFormat.VIDEO, startedAt: '2026-03-18', durationMinutes: 63, hasTranscript: true },
];

const statusVariantMap: Record<InterviewStatus, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  [InterviewStatus.COMPLETED]: 'success',
  [InterviewStatus.ACTIVE]: 'info',
  [InterviewStatus.SCHEDULED]: 'warning',
  [InterviewStatus.WAITING]: 'default',
  [InterviewStatus.PAUSED]: 'default',
  [InterviewStatus.FAILED]: 'error',
};

export default function InterviewsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | ''>('');

  const filtered = MOCK_INTERVIEWS.filter((i) => {
    const matchesSearch =
      search === '' ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#101828]">All Interviews</h1>
        <div className="text-sm text-[#667085]">{MOCK_INTERVIEWS.length} total</div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-64">
          <Input
            label=""
            placeholder="Search interviews…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | '')}
          className="px-3 py-2 text-sm border border-[#D0D5DD] rounded-lg text-[#344054] focus:outline-none focus:border-[#2B5BA8] focus:ring-2 focus:ring-[#2B5BA8]/30"
        >
          <option value="">All statuses</option>
          {Object.values(InterviewStatus).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card>
        <div className="-mx-6 -my-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                {['Title', 'Owner', 'Status', 'Format', 'Duration', 'Date', 'Transcript', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {filtered.map((interview) => (
                <tr key={interview.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#344054]">{interview.title}</td>
                  <td className="px-4 py-3 text-[#667085]">{interview.ownerName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariantMap[interview.status]} size="sm">
                      {interview.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#667085] text-xs">{interview.format}</td>
                  <td className="px-4 py-3 text-[#667085]">
                    {interview.durationMinutes != null ? `${interview.durationMinutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{interview.startedAt}</td>
                  <td className="px-4 py-3">
                    <Badge variant={interview.hasTranscript ? 'success' : 'default'} size="sm">
                      {interview.hasTranscript ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-xs text-[#2B5BA8] hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#98A2B3]">
                    No interviews match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
