/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is handled by cookies, but we can also use localStorage backup
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Clear auth storage
      localStorage.removeItem('auth-storage');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Ensure error has proper structure for consistent handling
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (typeof error.response.data === 'string') {
        // If response is a string (HTML error page), wrap it
        error.response.data = { error: 'Server error: ' + error.response.statusText };
      }
    } else if (error.request) {
      // The request was made but no response was received
      error.response = {
        status: 0,
        data: { error: 'No response from server' },
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      error.response = {
        status: 0,
        data: { error: error.message },
      };
    }
    
    return Promise.reject(error);
  }
);

export { api };
export default api;
