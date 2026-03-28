import axios from 'axios';

const TOKEN_KEY = 'inventoryos-token';

const normalizeApiBaseUrl = (value) => {
  if (!value) {
    return '/api';
  }

  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (trimmed === '' || trimmed === '/api') {
    return '/api';
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const resolvedApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

if (import.meta.env.PROD && resolvedApiBaseUrl === '/api') {
  // In production (e.g. Vercel), `/api` points to the frontend origin unless you deploy an API there too.
  console.warn('VITE_API_BASE_URL is not set. Configure it (e.g. https://<your-api-domain>/api) to avoid 404s on /api/*.');
}
if (import.meta.env.PROD && resolvedApiBaseUrl.includes('.railway.internal')) {
  console.warn(
    'VITE_API_BASE_URL points to a Railway internal domain (*.railway.internal) which is not reachable from the browser. Use the public Railway domain (*.up.railway.app) or a custom domain.'
  );
}

const api = axios.create({
  baseURL: resolvedApiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong.';

const getApiRoot = () => {
  const baseUrl = resolvedApiBaseUrl;
  return baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
};

export { TOKEN_KEY, api, getApiRoot, getErrorMessage };
