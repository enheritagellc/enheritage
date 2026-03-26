import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Badge, Spinner } from '@enheritage/ui';
import { useInterviews } from '@/hooks/useInterviews';
import {
  generateBiography,
  pollBiography,
  getBiography,
  type Biography,
  type BiographyStatus,
} from '@/api/biographies';

const statusMessages: Record<BiographyStatus, string> = {
  queued: 'Queued for generation…',
  processing: 'Writing your biography chapters…',
  complete: 'Complete',
  failed: 'Generation failed',
};

export default function BiographyPage() {
  const { id } = useParams<{ id: string }>();
  const { interviews, updateInterview } = useInterviews();

  const [biography, setBiography] = useState<Biography | null>(null);
  const [genStatus, setGenStatus] = useState<BiographyStatus | 'idle' | 'starting'>('idle');
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [error, setError] = useState('');

  // `id` is either a biographyId (if navigated via "View biography") or a sessionId/transcriptId
  const interview = interviews.find((i) => i.biographyId === id || i.id === id);

  // Determine if `id` is already a biographyId
  const isBiographyId = interview?.biographyId === id;

  useEffect(() => {
    if (!id) return;

    if (isBiographyId) {
      // Fetch existing biography directly
      setGenStatus('processing');
      getBiography(id)
        .then((bio) => {
          setBiography(bio);
          setGenStatus(bio.status);
        })
        .catch(() => {
          setGenStatus('failed');
          setError('Could not load biography. The service may be unavailable.');
        });
    }
    // If not a biographyId, user needs to trigger generation
  }, [id, isBiographyId]);

  const handleGenerate = async () => {
    if (!id || !interview) return;
    setGenStatus('starting');
    setError('');

    try {
      const { biography_id } = await generateBiography({
        transcriptId: interview.id,
        enrichmentJobId: 'none',        // enrichment service not yet built
        subjectName: interview.subjectName || 'the subject',
      });

      // Store the biographyId so dashboard links to it
      updateInterview(interview.id, { biographyId: biography_id });

      setGenStatus('queued');
      const final = await pollBiography(biography_id, (bio) => {
        setGenStatus(bio.status);
        setBiography(bio);
      });
      setBiography(final);
      setGenStatus('complete');
    } catch (err) {
      setGenStatus('failed');
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    }
  };

  const chapters = biography?.chapters ?? [];
  const currentChapter = chapters[activeChapterIdx];

  // ── Not-yet-generated state ────────────────────────────────────────────────
  if (genStatus === 'idle') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#101828] mb-6">Biography</h1>
        <Card
          title="Generate Biography"
          subtitle={interview ? `For: ${interview.subjectName}` : undefined}
        >
          <div className="space-y-4">
            {interview ? (
              <>
                <p className="text-sm text-[#667085]">
                  Ready to turn {interview.subjectName}'s interview into a polished life story.
                  Our AI will write five chapters covering their early life, education, career,
                  family, and legacy.
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2B5BA8] rounded-lg hover:bg-[#1B3A6B] transition-colors"
                >
                  Generate Biography
                </button>
              </>
            ) : (
              <p className="text-sm text-[#667085]">
                No interview found for this ID. Start an interview first.
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Generating state ───────────────────────────────────────────────────────
  if (genStatus === 'starting' || genStatus === 'queued' || genStatus === 'processing') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#101828] mb-6">Biography</h1>
        <Card title="Generating Biography">
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="lg" />
            <p className="text-sm text-[#667085]">{statusMessages[genStatus as BiographyStatus] ?? 'Starting…'}</p>
            {chapters.length > 0 && (
              <p className="text-xs text-[#98A2B3]">
                {chapters.length} of 5 chapters written…
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (genStatus === 'failed') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-[#101828] mb-6">Biography</h1>
        <Card title="Generation Failed">
          <p className="text-sm text-red-600">{error || 'An unexpected error occurred.'}</p>
          <button
            type="button"
            onClick={() => { setGenStatus('idle'); setError(''); }}
            className="mt-4 text-sm text-[#2B5BA8] hover:underline"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // ── Complete state ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828]">
            {biography?.subject_name ? `${biography.subject_name}'s Biography` : 'Biography'}
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            {chapters.length} chapters ·{' '}
            {chapters.reduce((s, c) => s + (c.word_count ?? 0), 0).toLocaleString()} words
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">Complete</Badge>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-[#2B5BA8] rounded-lg hover:bg-[#1B3A6B] transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chapter navigation */}
        <aside className="lg:col-span-1">
          <Card title="Chapters">
            <nav>
              <ul className="space-y-1 -mx-2">
                {chapters.map((chapter, index) => (
                  <li key={chapter.title}>
                    <button
                      type="button"
                      onClick={() => setActiveChapterIdx(index)}
                      className={[
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2',
                        activeChapterIdx === index
                          ? 'bg-[#E8EEF7] text-[#1B3A6B] font-medium'
                          : 'text-[#344054] hover:bg-[#F2F4F7]',
                      ].join(' ')}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#C8973A]/20 text-[#C8973A] text-xs flex items-center justify-center flex-shrink-0 font-medium">
                        {index + 1}
                      </span>
                      {chapter.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </Card>
        </aside>

        {/* Chapter content */}
        {currentChapter && (
          <main className="lg:col-span-3">
            <Card title={currentChapter.title}>
              <article className="prose prose-sm max-w-none">
                {currentChapter.body.split('\n\n').map((para, i) => (
                  <p key={i} className="text-[#344054] leading-relaxed mb-4 last:mb-0">
                    {para.trim()}
                  </p>
                ))}
              </article>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E4E7EC]">
                <button
                  type="button"
                  disabled={activeChapterIdx === 0}
                  onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))}
                  className="text-sm text-[#2B5BA8] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                >
                  ← Previous chapter
                </button>
                <button
                  type="button"
                  disabled={activeChapterIdx === chapters.length - 1}
                  onClick={() => setActiveChapterIdx((i) => Math.min(chapters.length - 1, i + 1))}
                  className="text-sm text-[#2B5BA8] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                >
                  Next chapter →
                </button>
              </div>
            </Card>
          </main>
        )}
      </div>
    </div>
  );
}
