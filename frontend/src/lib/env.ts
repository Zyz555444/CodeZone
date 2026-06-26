const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '/socket.io';

export function apiUrl(path: string): string {
  // 如果 API_URL 以 /api 结尾，且 path 也以 /api 开头，避免双前缀
  const baseEndsWithApi = API_URL.endsWith('/api');
  const pathStartsWithApi = path.startsWith('/api');
  if (baseEndsWithApi && pathStartsWithApi) {
    // 将 /api 前缀从 path 中去掉，因为 baseURL 已经包含了
    return `${API_URL}${path.slice(4)}`;
  }
  return `${API_URL}${path}`;
}

export function wsUrl(): string {
  return WS_URL;
}
