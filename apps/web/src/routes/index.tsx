import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge } from '@enheritage/ui';
import { InterviewStatus } from '@enheritage/types';
import { useInterviews } from '@/hooks/useInterviews';

const statusVariantMap: Record<InterviewStatus, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  [InterviewStatus.COMPLETED]: 'success',
  [InterviewStatus.ACTIVE]: 'info',
  [InterviewStatus.SCHEDULED]: 'warning',
  [InterviewStatus.WAITING]: 'default',
  [InterviewStatus.PAUSED]: 'default',
  [InterviewStatus.FAILED]: 'error',
};

export default function DashboardPage() {
  const { interviews } = useInterviews();

  const totalMinutes = interviews.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0);
  const activeCount = interviews.filter((i) => i.status === InterviewStatus.ACTIVE).length;
  const completedCount = interviews.filter((i) => i.status === InterviewStatus.COMPLETED).length;
  const biographyCount = interviews.filter((i) => i.biographyId).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828]">Dashboard</h1>
          <p className="text-sm text-[#667085] mt-1">
            Welcome back. Preserve and share your family's stories.
          </p>
        </div>
        <Link
          to="/interview/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B5BA8] text-white rounded-lg text-sm font-medium hover:bg-[#1B3A6B] transition-colors"
        >
          + Start Interview
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-[#667085]">Total Interviews</p>
          <p className="text-3xl font-bold text-[#101828] mt-1">{interviews.length}</p>
          <p className="text-xs text-[#98A2B3] mt-1">{activeCount} active</p>
        </Card>
        <Card>
          <p className="text-sm text-[#667085]">Biographies</p>
          <p className="text-3xl font-bold text-[#101828] mt-1">{biographyCount}</p>
          <p className="text-xs text-[#98A2B3] mt-1">
            {completedCount > biographyCount ? `${completedCount - biographyCount} ready to generate` : 'Up to date'}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[#667085]">Hours Recorded</p>
          <p className="text-3xl font-bold text-[#101828] mt-1">
            {(totalMinutes / 60).toFixed(1)}
          </p>
          <p className="text-xs text-[#98A2B3] mt-1">Across all sessions</p>
        </Card>
      </div>

      {/* Recent interviews */}
      <Card
        title="Recent Interviews"
        subtitle="Your latest recorded sessions"
      >
        {interviews.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[#667085]">No interviews yet.</p>
            <Link to="/interview/new" className="text-sm text-[#2B5BA8] hover:underline mt-1 inline-block">
              Start your first interview →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E4E7EC] -mx-6 -mb-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="flex items-center justify-between px-6 py-3 hover:bg-[#F9FAFB] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[#344054]">{interview.title}</p>
                  <p className="text-xs text-[#98A2B3] mt-0.5">
                    {interview.date}
                    {interview.durationMinutes != null && ` · ${interview.durationMinutes} min`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariantMap[interview.status]} size="sm">
                    {interview.status}
                  </Badge>
                  {interview.biographyId && (
                    <Link
                      to={`/biography/${interview.biographyId}`}
                      className="text-xs text-[#2B5BA8] hover:underline"
                    >
                      View biography
                    </Link>
                  )}
                  {interview.status === InterviewStatus.COMPLETED && !interview.biographyId && (
                    <Link
                      to={`/biography/${interview.id}`}
                      className="text-xs text-[#C8973A] hover:underline"
                    >
                      Generate biography
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick-start CTA */}
      <div className="bg-gradient-to-r from-[#0D1D35] to-[#2B5BA8] rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold">Ready to start a new story?</h2>
        <p className="text-sm text-white/70 mt-1 mb-4">
          Schedule or start an interview session with your loved one in minutes.
        </p>
        <Link
          to="/interview/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8973A] text-white rounded-lg text-sm font-medium hover:bg-[#8F6420] transition-colors"
        >
          Start Interview →
        </Link>
      </div>
    </div>
  );
}
