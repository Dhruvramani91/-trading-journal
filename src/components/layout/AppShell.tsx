import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-bg-0 text-fg">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-bg-0">
        <MobileNav />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
          <div className="mx-auto w-full max-w-[1600px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
