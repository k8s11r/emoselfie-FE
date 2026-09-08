import { z } from 'zod';
import { ApiError, toApiError } from './errors';

export const submissionAcceptedSchema = z.object({
  submissionId: z.string(),
  acceptedAtMs: z.number(),
  status: z.literal('processing'),
});

export type SubmissionAccepted = z.infer<typeof submissionAcceptedSchema>;

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function uploadSubmission(input: {
  slug: string;
  roundId: string;
  captureToken: string;
  image: Blob;
}): Promise<SubmissionAccepted> {
  if (input.image.type !== 'image/jpeg') {
    throw new ApiError('UNSUPPORTED_MEDIA', 'JPEG 사진만 제출할 수 있어요.', 415);
  }
  if (input.image.size === 0 || input.image.size > MAX_UPLOAD_BYTES) {
    throw new ApiError('PAYLOAD_TOO_LARGE', '사진 크기가 올바르지 않아요. 다시 찍어 주세요.', 413);
  }

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
