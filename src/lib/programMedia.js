export const PROGRAM_MEDIA_BUCKET = 'program-media';
export const MAX_PROGRAM_MEDIA_SIZE = 50 * 1024 * 1024;

export const PROGRAM_MEDIA_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const ALLOWED_MIME_VARIANTS = {
  jpg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  mp4: ['video/mp4'],
  webm: ['video/webm'],
  mov: ['video/quicktime', 'video/mp4'],
};

export function getProgramMediaExtension(file) {
  if (!file?.name) return '';
  return file.name.split('.').pop()?.toLowerCase() || '';
}

export function getProgramMediaMimeType(file) {
  const extension = getProgramMediaExtension(file);
  return PROGRAM_MEDIA_MIME_TYPES[extension] || file?.type || '';
}

export function getProgramMediaFileError(file) {
  if (!file) return 'Choose a photo or video to upload.';
  const extension = getProgramMediaExtension(file);
  const expectedMimeType = PROGRAM_MEDIA_MIME_TYPES[extension];
  if (!expectedMimeType) {
    return 'Use a JPG, PNG, WEBP, MP4, WEBM, or MOV file.';
  }

  const providedMimeType = file.type?.toLowerCase();
  if (
    providedMimeType
    && providedMimeType !== 'application/octet-stream'
    && !ALLOWED_MIME_VARIANTS[extension]?.includes(providedMimeType)
    && providedMimeType !== expectedMimeType
  ) {
    return 'Use a JPG, PNG, WEBP, MP4, WEBM, or MOV file.';
  }

  if (file.size <= 0 || file.size > MAX_PROGRAM_MEDIA_SIZE) {
    return 'The photo or video must be smaller than 50 MB.';
  }
  return '';
}

export function getProgramMediaFilesError(files) {
  if (!files?.length) return 'Choose at least one photo or video to upload.';
  for (const file of files) {
    const error = getProgramMediaFileError(file);
    if (error) return `${file.name}: ${error}`;
  }
  return '';
}

