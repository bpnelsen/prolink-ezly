const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://app.useezly.com';

export async function apiClient(path: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${path}`;
  
  // Retrieve token from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('prolink_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}
