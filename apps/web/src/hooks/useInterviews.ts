import { useState, useCallback } from 'react';
import { InterviewStatus } from '@enheritage/types';

export interface LocalInterview {
  id: string;           // sessionId
  interviewId: string;  // UUID passed to interview service
  title: string;
  subjectName: string;
  status: InterviewStatus;
  date: string;
  durationMinutes?: number;
  biographyId?: string;
  transcriptId?: string;
}

const STORAGE_KEY = 'enheritage:interviews';

function load(): LocalInterview[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LocalInterview[];
  } catch {
    return [];
  }
}

function save(interviews: LocalInterview[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(interviews));
}

export function useInterviews() {
  const [interviews, setInterviews] = useState<LocalInterview[]>(load);

  const addInterview = useCallback((interview: LocalInterview) => {
    setInterviews((prev) => {
      const next = [interview, ...prev];
      save(next);
      return next;
    });
  }, []);

  const updateInterview = useCallback((id: string, patch: Partial<LocalInterview>) => {
    setInterviews((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      save(next);
      return next;
    });
  }, []);

  return { interviews, addInterview, updateInterview };
}
