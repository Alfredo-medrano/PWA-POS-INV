import axios from 'axios';
import { usePOSStore } from '@/app/store/usePOSStore';

const axiosInstance = axios.create({
  timeout: 10000,
});

axiosInstance.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        usePOSStore.getState().logout();
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default axiosInstance;
