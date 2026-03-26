import { makeServiceClient } from './client';

const client = makeServiceClient(
  (import.meta.env.VITE_BIOGRAPHY_API_URL as string) || 'http://localhost:8003',
);

export interface BiographyChapter {
  title: string;
  body: string;
  word_count: number;
}

export type BiographyStatus = 'queued' | 'processing' | 'complete' | 'failed';

export interface Biography {
  biography_id: string;
  subject_name: string;
  transcript_id: string;
  status: BiographyStatus;
  chapters: BiographyChapter[];
  full_text?: string;
  s3_result_key?: string;
  error?: string;
}

export interface GenerateRequest {
  transcriptId: string;
  enrichmentJobId: string;
  subjectName: string;
}

export async function generateBiography(req: GenerateRequest): Promise<{ biography_id: string; status: BiographyStatus }> {
  const { data } = await client.post('/biography/generate', req);
  return data;
}

export async function getBiography(biographyId: string): Promise<Biography> {
  const { data } = await client.get<Biography>(`/biography/${biographyId}`);
  return data;
}

/** Poll every `intervalMs` until status is complete or failed. */
export async function pollBiography(
  biographyId: string,
  onUpdate: (bio: Biography) => void,
  intervalMs = 3000,
): Promise<Biography> {
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const bio = await getBiography(biographyId);
        onUpdate(bio);
        if (bio.status === 'complete' || bio.status === 'failed') {
          clearInterval(timer);
          if (bio.status === 'complete') resolve(bio);
          else reject(new Error(bio.error ?? 'Biography generation failed'));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, intervalMs);
  });
}
