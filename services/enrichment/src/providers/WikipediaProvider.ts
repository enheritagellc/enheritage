/**
 * Wikipedia REST API provider.
 *
 * Uses the Wikimedia REST API (no key required):
 *   GET /page/summary/{title}  — structured page summary with thumbnail
 *   GET /page/search/title     — search for best-matching title
 */
import axios from 'axios';
import { config } from '../config.js';

const BASE = config.WIKIPEDIA_API_URL; // https://en.wikipedia.org/api/rest_v1

export interface WikipediaResult {
  title: string;
  url: string;
  snippet: string;
  thumbnailUrl?: string;
}

const http = axios.create({ baseURL: BASE, timeout: 8_000 });

/** Search for a Wikipedia article by term, return first plausible match. */
async function searchTitle(term: string): Promise<string | null> {
  try {
    const { data } = await http.get<{ pages?: { title?: string }[] }>(
      `/page/search/title`,
      { params: { q: term, limit: 1 } },
    );
    return data.pages?.[0]?.title ?? null;
  } catch {
    return null;
  }
}

/** Fetch a structured summary for a known Wikipedia title. */
async function fetchSummary(title: string): Promise<WikipediaResult | null> {
  try {
    const encoded = encodeURIComponent(title.replace(/ /g, '_'));
    const { data } = await http.get<{
      title?: string;
      content_urls?: { desktop?: { page?: string } };
      extract?: string;
      thumbnail?: { source?: string };
    }>(`/page/summary/${encoded}`);

    const url = data.content_urls?.desktop?.page;
    const snippet = data.extract ?? '';
    if (!url || !snippet) return null;

    return {
      title: data.title ?? title,
      url,
      snippet: snippet.slice(0, 200),
      thumbnailUrl: data.thumbnail?.source,
    };
  } catch {
    return null;
  }
}

export async function enrichWithWikipedia(term: string): Promise<WikipediaResult | null> {
  // Try direct title fetch first (faster path for well-known terms)
  let result = await fetchSummary(term);
  if (result) return result;

  // Fall back to search
  const title = await searchTitle(term);
  if (!title) return null;

  result = await fetchSummary(title);
  return result;
}
