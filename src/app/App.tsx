import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '@/store/authStore';
import { PageLoader } from '@/components/ui/Loader';

export function App() {
  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  return (
    <Suspense fallback={<PageLoader title="Loading your workspace…" className="min-h-dvh bg-bg-0" />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
