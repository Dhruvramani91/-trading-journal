import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { RefreshCw, Home, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/layout/Brand';
import { isChunkLoadError } from '@/lib/lazyWithRetry';

export function RootErrorBoundary() {
  const error = useRouteError();
  const isChunk = isChunkLoadError(error);

  function handleReload() {
    window.location.reload();
  }

  const title = isChunk ? 'New version available' : 'Something went wrong';
  const description = isChunk
    ? 'A new version of ThePrecisionLab was deployed. Please reload the page to load the latest application.'
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText || 'Page error'}`
      : (error as Error)?.message || 'An unexpected error occurred while rendering this page.';

  return (
    <main role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-bg-0 px-4 py-12 text-fg sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-bg-2 p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <BrandLogo size="sm" />
          <span className="text-sm font-semibold tracking-tight text-fg-muted">ThePrecisionLab</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button variant="primary" onClick={handleReload} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Reload page
          </Button>
          {!isChunk && (
            <Button asChild variant="secondary" leftIcon={<Home className="h-4 w-4" />}>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

