import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type StickerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'pink' | 'yellow' | 'ink' | 'plain';
  fullWidth?: boolean;
  disabledReason?: string;
};

export function StickerButton({
  tone = 'pink',
  fullWidth = false,
  disabledReason,
  className,
  disabled,
  children,
  ...props
}: StickerButtonProps) {
  const reasonId = props.id && disabledReason ? `${props.id}-reason` : undefined;

  return (
    <div className={clsx('button-stack', fullWidth && 'button-stack--full')}>
      <button
        type="button"
        className={clsx('sticker-button', `sticker-button--${tone}`, fullWidth && 'sticker-button--full', className)}
        disabled={disabled}
        aria-describedby={reasonId}
        {...props}
      >
        {children}
      </button>
      {disabled && disabledReason ? (
        <span id={reasonId} className="control-reason">
          {disabledReason}
        </span>
      ) : null}
    </div>
  );
}

