import axios, { AxiosError, type AxiosInstance } from 'axios';

// Auth0 token getter is injected at runtime to avoid circular deps
let _getAccessToken: (() => Promise<string>) | null = null;

export function setTokenGetter(fn: () => Promise<string>) {
  _getAccessToken = fn;
}

function attachInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    if (_getAccessToken) {
      try {
        const token = await _getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // Token fetch failed — continue without auth header; server will 401
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        if (error.response.status === 401) {
          window.location.assign('/');
        }
        if (error.response.status >= 500) {
          console.error('[API] Server error:', error.response.status, error.response.data);
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export function makeServiceClient(baseURL: string): AxiosInstance {
  return attachInterceptors(
    axios.create({ baseURL, headers: { 'Content-Type': 'application/json' }, timeout: 30_000 }),
  );
}

const apiClient = makeServiceClient(import.meta.env.VITE_API_BASE_URL as string);
export default apiClient;
