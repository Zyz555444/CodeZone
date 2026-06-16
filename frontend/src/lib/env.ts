const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10101';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10101';

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function wsUrl(): string {
  return WS_URL;
}
