import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg-0 p-0 sm:p-2 md:p-4 lg:p-6">
      <div className="min-h-screen sm:min-h-0 sm:h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] flex bg-bg-1 sm:rounded-2xl md:rounded-shell sm:shadow-shell sm:border sm:border-line overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          <MobileNav />
          <Topbar />
          <main className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 bg-bg-3">
            <div className="mx-auto max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
