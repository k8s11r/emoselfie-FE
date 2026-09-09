type SubmissionCounterProps = {
  submitted: number;
  total: number;
  label?: string;
};

export function SubmissionCounter({ submitted, total, label = '제출 완료' }: SubmissionCounterProps) {
  const safeTotal = Math.max(0, total);
  const safeSubmitted = Math.min(Math.max(0, submitted), safeTotal);

  return (
    <span className="submission-counter" aria-label={`${safeTotal}명 중 ${safeSubmitted}명 ${label}`}>
      {safeSubmitted} / {safeTotal}
    </span>
  );
}

