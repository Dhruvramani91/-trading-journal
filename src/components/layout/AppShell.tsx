import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg-0 p-0 md:p-4 lg:p-6">
      <div className="min-h-screen md:min-h-0 md:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex bg-bg-1 md:rounded-shell md:shadow-shell md:border md:border-line overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <MobileNav />
          <Topbar />
          <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-6 py-6 bg-bg-3">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
