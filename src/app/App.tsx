import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { AppShell } from '../components/AppShell';

const GamePreview = import.meta.env.DEV ? lazy(() => import('../dev/GamePreview')) : null;
const LandingPage = lazy(() => import('../features/entry/LandingPage'));
const RoomPage = lazy(() => import('../features/room/RoomPage'));
const NotFoundPage = lazy(() => import('../features/errors/NotFoundPage'));

function RouteFallback() {
  return (
    <div className="route-status" role="status" aria-live="polite">
      화면을 준비하고 있어요
    </div>
  );
}

export function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <AppShell>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {GamePreview ? <Route path="/__preview/game" element={<GamePreview />} /> : null}
                <Route path="/" element={<LandingPage />} />
                <Route path="/r/:slug" element={<RoomPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AppShell>
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
