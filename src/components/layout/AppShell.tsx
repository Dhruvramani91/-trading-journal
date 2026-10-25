import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageLoader } from '@/components/ui/Loader';

export function AppShell() {
  useEffect(() => {
    const preventBrowserBackspace = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target.matches('input, textarea, select, [role="textbox"]') ||
        target.closest('[contenteditable="true"], [role="textbox"]')
      )) return;
      event.preventDefault();
    };

    window.addEventListener('keydown', preventBrowserBackspace);
    return () => window.removeEventListener('keydown', preventBrowserBackspace);
  }, []);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-bg-0 text-fg">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-0">
        <MobileNav />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-24 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8 lg:pt-7 md:pb-7">
          <div className="mx-auto min-h-full w-full max-w-[1600px]">
            <Suspense fallback={<PageLoader title="Loading page…" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
