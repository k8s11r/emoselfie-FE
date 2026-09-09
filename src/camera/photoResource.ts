export type PhotoResource = { blob: Blob; url: string };

export function createPhotoResource(blob: Blob): PhotoResource {
  return { blob, url: URL.createObjectURL(blob) };
}

export function releasePhotoResource(photo: PhotoResource | null): void {
  if (photo) URL.revokeObjectURL(photo.url);
}
