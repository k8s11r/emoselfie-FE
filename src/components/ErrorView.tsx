import { Link } from 'react-router';
import { StickerButton } from './StickerButton';

type ErrorViewProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorView({ title, description, actionLabel = '다시 시도', onRetry }: ErrorViewProps) {
  return (
    <main className="error-view" role="alert">
      <span className="error-view__emoji" aria-hidden="true">🫠</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="error-view__actions">
        {onRetry ? <StickerButton onClick={onRetry}>{actionLabel}</StickerButton> : null}
        <Link className="text-link" to="/">처음으로</Link>
      </div>
    </main>
  );
}
