import { Suspense, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from '@/store/authStore';

export function App() {
  useEffect(() => {
    void useAuthStore.getState().init();
  }, []);

  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-bg-0 text-sm text-fg-muted" role="status">Loading workspace…</main>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
