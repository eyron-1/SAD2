export const PROGRAM_MEDIA_BUCKET = 'program-media';
export const MAX_PROGRAM_MEDIA_SIZE = 50 * 1024 * 1024;

const MEDIA_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm'],
  'video/quicktime': ['mov'],
};

export function getProgramMediaFileError(file) {
  if (!file) return 'Choose a photo or video to upload.';
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!MEDIA_TYPES[file.type]?.includes(extension)) {
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

export function getProgramMediaExtension(file) {
  return file.name.split('.').pop().toLowerCase();
}
