import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper function to get full image URL
export const getImageUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

export default apiClient;
export { API_BASE_URL };
