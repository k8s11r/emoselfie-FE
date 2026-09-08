import { useEffect, useRef } from 'react';
import { StickerButton } from './StickerButton';

type ConfirmSheetProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmSheet({ open, title, description, confirmLabel, pending = false, onConfirm, onCancel }: ConfirmSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      previousFocus.current?.focus();
    }
  }, [open]);

  useEffect(() => () => previousFocus.current?.focus(), []);

  return (
    <dialog ref={ref} className="confirm-sheet" onCancel={(event) => { event.preventDefault(); if (!pending) onCancel(); }}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="confirm-sheet__actions">
        <StickerButton tone="plain" disabled={pending} onClick={onCancel}>취소</StickerButton>
        <StickerButton disabled={pending} onClick={onConfirm}>{pending ? '처리 중' : confirmLabel}</StickerButton>
      </div>
    </dialog>
  );
}

