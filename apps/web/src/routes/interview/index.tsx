import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, Button, Badge, Spinner } from '@enheritage/ui';
import { InterviewStatus } from '@enheritage/types';
import { useInterviewStore } from '@/stores/interviewStore';
import { useInterviews } from '@/hooks/useInterviews';
import { createSession, deleteSession, connectSignaling } from '@/api/interviews';

interface TranscriptLine {
  speaker: 'interviewer' | 'subject';
  text: string;
  timestamp: string;
}

const DEFAULT_PROMPTS = [
  'Tell me about your earliest memory.',
  'What was your home like growing up?',
  'Who was the most influential person in your childhood?',
  'What was your first job?',
  'How did you meet your spouse/partner?',
];

// ── New interview setup form ─────────────────────────────────────────────────

function NewInterviewForm() {
  const navigate = useNavigate();
  const { user } = useAuth0();
  const { addInterview } = useInterviews();
  const { startSession } = useInterviewStore();
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectName.trim()) return;
    setIsStarting(true);
    setError('');

    try {
      const interviewId = crypto.randomUUID();
      const ownerId = user?.sub ?? crypto.randomUUID();
      const session = await createSession(interviewId, ownerId);

      addInterview({
        id: session.sessionId,
        interviewId,
        title: title.trim(),
        subjectName: subjectName.trim(),
        status: InterviewStatus.ACTIVE,
        date: new Date().toISOString().split('T')[0],
      });

      startSession(session.sessionId);
      navigate(`/interview/${session.sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Could not connect to the interview service. Make sure it is running.');
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-[#101828] mb-6">Start New Interview</h1>
      <Card title="New Session" subtitle="Set up your interview session details">
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">
              Interview Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grandma Rose's Childhood"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#344054] mb-1">
              Subject's Name
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Rose Cohen"
              className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2B5BA8] focus:border-transparent"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <p className="text-sm text-[#667085]">
            You'll be connected via video or audio with your loved one. Our AI will guide
            the conversation with thoughtful prompts and transcribe the session in real time.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isStarting}
            className="w-full"
          >
            {isStarting ? 'Starting session…' : 'Start Interview Session'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ── Active interview session ─────────────────────────────────────────────────

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeSession, startSession, endSession, isConnected, setWsConnection, setIsConnected } =
    useInterviewStore();
  const { interviews, updateInterview } = useInterviews();
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState('');
  const transcriptRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  const isNew = id === 'new';
  const interview = interviews.find((i) => i.id === id);

  // Start session state & WebSocket on load
  useEffect(() => {
    if (isNew || !id) return;

    if (!activeSession) {
      startSession(id);
    }

    startTimeRef.current = Date.now();

    const ws = connectSignaling(
      id,
      (msg) => {
        if (msg.type === 'connected') {
          setIsConnected(true);
        } else if (msg.type === 'error') {
          setSessionError(String(msg.error ?? 'Signaling error'));
        } else if (msg.type === 'transcript-line') {
          // Future: real-time transcript lines from transcription service
          const payload = msg.payload as { speaker: string; text: string } | undefined;
          if (payload) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            setTranscript((prev) => [
              ...prev,
              {
                speaker: payload.speaker === 'subject' ? 'subject' : 'interviewer',
                text: payload.text,
                timestamp: `${mins}:${secs}`,
              },
            ]);
          }
        }
      },
      () => setIsConnected(true),
      () => setIsConnected(false),
    );

    setWsConnection(ws);
    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleEndSession = async () => {
    if (id) {
      const durationMinutes = Math.round((Date.now() - startTimeRef.current) / 60_000);
      updateInterview(id, {
        status: InterviewStatus.COMPLETED,
        durationMinutes: Math.max(1, durationMinutes),
      });
      try {
        await deleteSession(id);
      } catch {
        // Best-effort cleanup
      }
    }
    endSession();
    navigate('/');
  };

  if (isNew) {
    return <NewInterviewForm />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#101828]">
              {interview?.title ?? 'Interview Session'}
            </h1>
            {interview?.subjectName && (
              <p className="text-sm text-[#667085]">Subject: {interview.subjectName}</p>
            )}
          </div>
          <Badge variant={isConnected ? 'success' : 'warning'} size="sm">
            {isConnected ? 'Connected' : 'Connecting…'}
          </Badge>
        </div>
        <Button variant="danger" size="sm" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      {sessionError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {sessionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Video area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex-1 bg-[#0D1D35] rounded-xl flex items-center justify-center relative min-h-[280px]">
            {!isConnected ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Spinner size="md" color="#C8973A" />
                <p className="text-sm text-white/70">Waiting for participant…</p>
              </div>
            ) : (
              <div className="text-white/40 text-sm">Remote video stream</div>
            )}
            {/* Self-view PiP */}
            <div className="absolute bottom-3 right-3 w-28 h-20 bg-[#1B3A6B] rounded-lg flex items-center justify-center">
              <span className="text-white/40 text-xs">You</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Prompt cards */}
          <Card title="Interview Prompts" className="flex-shrink-0">
            <ul className="space-y-2 -mx-2">
              {DEFAULT_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => setActivePrompt(prompt)}
                    className={[
                      'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
                      activePrompt === prompt
                        ? 'bg-[#E8EEF7] text-[#1B3A6B] font-medium'
                        : 'text-[#344054] hover:bg-[#F2F4F7]',
                    ].join(' ')}
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Transcript */}
          <Card title="Live Transcript" className="flex-1 overflow-hidden flex flex-col">
            <div ref={transcriptRef} className="flex-1 overflow-y-auto space-y-3 max-h-60">
              {transcript.length === 0 ? (
                <p className="text-xs text-[#98A2B3] italic">
                  Transcript will appear here as the conversation progresses.
                </p>
              ) : (
                transcript.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-[#98A2B3] w-10 flex-shrink-0 mt-0.5">
                      {line.timestamp}
                    </span>
                    <div>
                      <span
                        className={[
                          'text-xs font-medium',
                          line.speaker === 'interviewer' ? 'text-[#2B5BA8]' : 'text-[#C8973A]',
                        ].join(' ')}
                      >
                        {line.speaker === 'interviewer' ? 'You' : interview?.subjectName ?? 'Subject'}
                      </span>
                      <p className="text-sm text-[#344054] mt-0.5">{line.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[#E4E7EC] flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#D0D5DD]'}`} />
              <span className="text-xs text-[#667085]">
                {isConnected ? 'Transcribing in real time…' : 'Waiting for connection…'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
