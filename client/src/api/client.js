import axios from 'axios';

const TOKEN_KEY = 'inventoryos-token';

const resolvedApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
if (import.meta.env.PROD && resolvedApiBaseUrl === '/api') {
  // In production (e.g. Vercel), `/api` points to the frontend origin unless you deploy an API there too.
  console.warn('VITE_API_BASE_URL is not set. Configure it (e.g. https://<your-api-domain>/api) to avoid 404s on /api/*.');
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
