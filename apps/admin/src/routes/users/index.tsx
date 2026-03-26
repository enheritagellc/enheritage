import React, { useState } from 'react';
import { Card, Badge, Button, Input } from '@enheritage/ui';
import { UserTier, UserRole } from '@enheritage/types';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  tier: UserTier;
  role: UserRole;
  joinedAt: string;
  interviewCount: number;
  isActive: boolean;
}

const MOCK_USERS: AdminUser[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', tier: UserTier.PREMIUM, role: UserRole.OWNER, joinedAt: '2026-01-15', interviewCount: 8, isActive: true },
  { id: '2', name: 'Michael Chen', email: 'mchen@example.com', tier: UserTier.STANDARD, role: UserRole.OWNER, joinedAt: '2026-02-03', interviewCount: 3, isActive: true },
  { id: '3', name: 'Emma Rodriguez', email: 'emma.r@example.com', tier: UserTier.FREE, role: UserRole.OWNER, joinedAt: '2026-03-10', interviewCount: 1, isActive: true },
  { id: '4', name: 'David Williams', email: 'dwilliams@corp.com', tier: UserTier.ENTERPRISE, role: UserRole.ENTERPRISE_STAFF, joinedAt: '2026-01-01', interviewCount: 22, isActive: true },
  { id: '5', name: 'Lena Fischer', email: 'lena@example.com', tier: UserTier.ELITE, role: UserRole.OWNER, joinedAt: '2026-02-20', interviewCount: 15, isActive: false },
];

const tierVariantMap: Record<UserTier, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  [UserTier.FREE]: 'default',
  [UserTier.STANDARD]: 'info',
  [UserTier.PREMIUM]: 'warning',
  [UserTier.ELITE]: 'success',
  [UserTier.ENTERPRISE]: 'success',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<UserTier | ''>('');

  const filtered = MOCK_USERS.filter((u) => {
    const matchesSearch =
      search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === '' || u.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#101828]">Users</h1>
        <Button variant="primary" size="sm">
          + Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Input
            label=""
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value as UserTier | '')}
          className="px-3 py-2 text-sm border border-[#D0D5DD] rounded-lg text-[#344054] focus:outline-none focus:border-[#2B5BA8] focus:ring-2 focus:ring-[#2B5BA8]/30"
        >
          <option value="">All tiers</option>
          {Object.values(UserTier).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <Card>
        <div className="-mx-6 -my-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                {['Name', 'Email', 'Tier', 'Role', 'Interviews', 'Joined', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#667085] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E7EC]">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E8EEF7] flex items-center justify-center text-xs font-semibold text-[#2B5BA8]">
                        {user.name[0]}
                      </div>
                      <span className="font-medium text-[#344054]">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tierVariantMap[user.tier]} size="sm">{user.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{user.role}</td>
                  <td className="px-4 py-3 text-[#667085]">{user.interviewCount}</td>
                  <td className="px-4 py-3 text-[#667085]">{user.joinedAt}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? 'success' : 'default'} size="sm">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-xs text-[#2B5BA8] hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#98A2B3]">
                    No users match your filters.
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
