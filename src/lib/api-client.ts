const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://app.useezly.com';

export async function apiClient(path: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
