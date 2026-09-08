import { z } from 'zod';
import { ApiError, toApiError } from './errors';

export const submissionAcceptedSchema = z.object({
  submissionId: z.string(),
  acceptedAtMs: z.number(),
  status: z.literal('processing'),
});

export type SubmissionAccepted = z.infer<typeof submissionAcceptedSchema>;

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// Rejected before the request, so the capture token is still unused and the
// user can retake. A server 413/415 arrives after the token was consumed.
export class LocalImageError extends ApiError {}

export function validateCaptureImage(image: Blob): LocalImageError | null {
  if (image.type !== 'image/jpeg') {
    return new LocalImageError('UNSUPPORTED_MEDIA', 'JPEG 사진만 제출할 수 있어요.', 415);
  }
  if (image.size === 0 || image.size > MAX_UPLOAD_BYTES) {
    return new LocalImageError('PAYLOAD_TOO_LARGE', '사진 크기가 올바르지 않아요.', 413);
  }
  return null;
}

export async function uploadSubmission(input: {
  slug: string;
  roundId: string;
  captureToken: string;
  image: Blob;
}): Promise<SubmissionAccepted> {
  const invalid = validateCaptureImage(input.image);
  if (invalid) throw invalid;

  const body = new FormData();
  body.append('image', input.image, 'capture.jpg');
  const response = await fetch(`/api/rooms/${input.slug}/rounds/${input.roundId}/submissions`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Capture-Token': input.captureToken },
    body,
  });

  if (!response.ok) throw await toApiError(response);
  const payload: unknown = await response.json();
  return submissionAcceptedSchema.parse(payload);
}
