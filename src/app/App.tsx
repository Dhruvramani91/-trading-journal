import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '@/store/authStore';

export function App() {
  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  return <RouterProvider router={router} />;
}