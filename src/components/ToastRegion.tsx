type ToastRegionProps = { message: string | null };

export function ToastRegion({ message }: ToastRegionProps) {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

