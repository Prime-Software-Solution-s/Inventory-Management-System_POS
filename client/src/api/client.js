import axios from 'axios';

const TOKEN_KEY = 'inventoryos-token';

const normalizeApiOrigin = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/api') {
    return null;
  }

  // Allow providing either the origin (`https://x`) or the API base (`https://x/api`).
  const withoutApiSuffix = trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;

  // Reject relative paths in production; those would point to the Vercel frontend origin.
  if (import.meta.env.PROD && withoutApiSuffix.startsWith('/')) {
    return null;
  }

  return withoutApiSuffix;
};

const configuredApiOrigin = normalizeApiOrigin(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL);
const resolvedApiBaseUrl = configuredApiOrigin ? `${configuredApiOrigin}/api` : '/api';

if (import.meta.env.PROD && !configuredApiOrigin) {
  // In production (e.g. Vercel), `/api` points to the frontend origin unless you deploy an API there too.
  console.warn(
    'VITE_API_URL is not set. Configure it (e.g. https://<your-railway-backend-url>) to avoid 404s on /api/*.'
  );
}
if (import.meta.env.PROD && configuredApiOrigin?.includes('.railway.internal')) {
  console.warn(
    'VITE_API_URL points to a Railway internal domain (*.railway.internal) which is not reachable from the browser. Use the public Railway domain (*.up.railway.app) or a custom domain.'
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
  return configuredApiOrigin || window.location.origin;
};

export { TOKEN_KEY, api, getApiRoot, getErrorMessage };
