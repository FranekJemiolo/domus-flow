/**
 * Axios API client for REST backend communication
 * Used when VITE_DEMO_MODE is false
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '@domus-flow/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT token to every outgoing request if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('domus_flow_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Intercept 401 Unauthorized responses to clear stale tokens
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('domus_flow_token');
      localStorage.removeItem('domus_flow_user');
      // Dispatch custom event so app can react if needed
      window.dispatchEvent(new CustomEvent('domus_auth_unauthorized'));
    }
    return Promise.reject(error);
  }
);
