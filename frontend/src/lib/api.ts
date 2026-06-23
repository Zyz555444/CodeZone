import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let cachedToken: string | null = null;
let cachedTokenTs = 0;
const TOKEN_CACHE_TTL = 2000;

function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const now = Date.now();
  if (cachedToken !== null && now - cachedTokenTs < TOKEN_CACHE_TTL) {
    return cachedToken;
  }
  const match = document.cookie.match(/(?:^|;\s*)auth-token=([^;]*)/);
  cachedToken = match ? decodeURIComponent(match[1]) : null;
  cachedTokenTs = now;
  return cachedToken;
}

export function clearCachedToken() {
  cachedToken = null;
  cachedTokenTs = 0;
}

export function setCachedToken(token: string | null) {
  cachedToken = token;
  cachedTokenTs = Date.now();
}

api.interceptors.request.use((config) => {
  const token = getTokenFromCookie();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof document !== 'undefined') {
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        clearCachedToken();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
