import axios from 'axios';
import { usePOSStore } from '@/app/store/usePOSStore';

const axiosInstance = axios.create({
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Solo redirigir al login si ya había una sesión activa (token expirado, revocado, etc.)
      // NO redirigir en intentos de login/register fallidos — esos 401 son esperados.
      const isAuthEndpoint =
        err.config?.url?.includes('/api/auth/') ||
        err.config?.url?.includes('/api/setup/');

      if (!isAuthEndpoint && typeof window !== 'undefined') {
        usePOSStore.getState().logout();
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
