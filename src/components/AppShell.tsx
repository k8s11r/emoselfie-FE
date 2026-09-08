import type { PropsWithChildren } from 'react';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className="app-shell">
      <div className="app-viewport">{children}</div>
    </main>
  );
}

