import axios from 'axios';

// Production (Vercel): use '' so requests go to /api/* which Next.js rewrites to Fly.io
// Local dev: point directly to localhost:3001
const baseURL =
  typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (refresh) {
        try {
          await api.post('/api/v1/auth/refresh', { refresh });
          return api.request(err.config);
        } catch {
          localStorage.removeItem('refresh_token');
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(err);
  }
);
