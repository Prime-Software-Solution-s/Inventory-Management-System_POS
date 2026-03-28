import axios from 'axios';

const TOKEN_KEY = 'inventoryos-token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  return baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
};

export { TOKEN_KEY, api, getApiRoot, getErrorMessage };
