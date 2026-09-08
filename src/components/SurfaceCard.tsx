import type { HTMLAttributes, PropsWithChildren } from 'react';
import { clsx } from 'clsx';

type SurfaceCardProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: 'section' | 'div' | 'article';
};

export function SurfaceCard({ as: Element = 'section', className, children, ...props }: SurfaceCardProps) {
  return (
    <Element className={clsx('surface-card', className)} {...props}>
      {children}
    </Element>
  );
}

