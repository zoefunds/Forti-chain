import axios from 'axios';

const baseURL =
  typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001');

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const refresh = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (refresh) {
        try {
          const res = await axios.post(`${baseURL}/api/v1/auth/refresh`, { refresh });
          const newToken = res.data.token;
          if (newToken) localStorage.setItem('access_token', newToken);
          // Retry original request with new token
          err.config.headers['Authorization'] = `Bearer ${newToken}`;
          return api.request(err.config);
        } catch {
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('access_token');
          window.location.href = '/auth/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);
