import type { PropsWithChildren } from 'react';
import { clsx } from 'clsx';

type StatusBadgeProps = PropsWithChildren<{ tone?: 'yellow' | 'mint' | 'plain' | 'pink' }>;

export function StatusBadge({ tone = 'plain', children }: StatusBadgeProps) {
  return <span className={clsx('status-badge', `status-badge--${tone}`)}>{children}</span>;
}

