const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://prolinkbackend.vercel.app/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('prolink_token');
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem('prolink_token', accessToken);
  localStorage.setItem('prolink_refresh_token', refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem('prolink_token');
  localStorage.removeItem('prolink_refresh_token');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
