import React, { useState } from 'react';
import { Card, Badge, Button } from '@enheritage/ui';

type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'NEEDS_REVISION' | 'PUBLISHED';

interface AdminBiography {
  id: string;
  subjectName: string;
  ownerName: string;
  status: ReviewStatus;
  wordCount: number;
  chapterCount: number;
  generatedAt: string;
  reviewedBy?: string;
}

const MOCK_BIOS: AdminBiography[] = [
  { id: 'b1', subjectName: 'Rose Cohen', ownerName: 'Sarah Johnson', status: 'PENDING_REVIEW', wordCount: 4200, chapterCount: 6, generatedAt: '2026-03-22' },
  { id: 'b2', subjectName: 'Harold Adelman', ownerName: 'Sarah Johnson', status: 'APPROVED', wordCount: 3850, chapterCount: 5, generatedAt: '2026-03-15', reviewedBy: 'admin@enheritage.com' },
  { id: 'b3', subjectName: 'Chen Wei', ownerName: 'Michael Chen', status: 'NEEDS_REVISION', wordCount: 2100, chapterCount: 3, generatedAt: '2026-03-19', reviewedBy: 'admin@enheritage.com' },
  { id: 'b4', subjectName: 'Maria Rodriguez', ownerName: 'Emma Rodriguez', status: 'PUBLISHED', wordCount: 5600, chapterCount: 8, generatedAt: '2026-02-28', reviewedBy: 'admin@enheritage.com' },
];

const statusVariantMap: Record<ReviewStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING_REVIEW: 'warning',
  APPROVED: 'success',
  NEEDS_REVISION: 'error',
  PUBLISHED: 'info',
};

const pendingCount = MOCK_BIOS.filter((b) => b.status === 'PENDING_REVIEW').length;

export default function BiographiesPage() {
  const [filter, setFilter] = useState<ReviewStatus | ''>('');

  const filtered = filter === '' ? MOCK_BIOS : MOCK_BIOS.filter((b) => b.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[#101828]">Biography Review Queue</h1>
          {pendingCount > 0 && (
            <Badge variant="warning" size="sm">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['', 'PENDING_REVIEW', 'APPROVED', 'NEEDS_REVISION', 'PUBLISHED'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={[
              'px-3 py-1.5 rounded-md text-sm transition-colors',
              filter === s
                ? 'bg-[#2B5BA8] text-white font-medium'
                : 'bg-white text-[#667085] border border-[#E4E7EC] hover:bg-[#F9FAFB]',
            ].join(' ')}
          >
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card>
        <div className="-mx-6 -my-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                {['Subject', 'Owner', 'Status', 'Words', 'Chapters', 'Generated', 'Reviewer', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {filtered.map((bio) => (
                <tr key={bio.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#344054]">{bio.subjectName}</td>
                  <td className="px-4 py-3 text-[#667085]">{bio.ownerName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariantMap[bio.status]} size="sm">
                      {bio.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{bio.wordCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#667085]">{bio.chapterCount}</td>
                  <td className="px-4 py-3 text-[#667085]">{bio.generatedAt}</td>
                  <td className="px-4 py-3 text-[#667085] text-xs">{bio.reviewedBy ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" className="text-xs text-[#2B5BA8] hover:underline">
                        Review
                      </button>
                      {bio.status === 'PENDING_REVIEW' && (
                        <button type="button" className="text-xs text-[#10B981] hover:underline">
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#98A2B3]">
                    No biographies in this queue.
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
