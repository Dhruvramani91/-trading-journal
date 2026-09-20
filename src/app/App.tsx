import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '@/store/authStore';
import { initTheme } from '@/store/themeStore';

export function App() {
  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  return <RouterProvider router={router} />;
}

initTheme();