const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export function getPublicDocumentFileName(item, fileUrl) {
  if (item?.file_name) return item.file_name;

  try {
    const lastPathSegment = new URL(fileUrl).pathname.split('/').filter(Boolean).pop();
    return lastPathSegment ? decodeURIComponent(lastPathSegment) : 'public-document';
  } catch {
    return 'public-document';
  }
}

export function getPublicDocumentPreviewType(item, fileUrl) {
  const mimeType = item?.mime_type?.toLowerCase();
  if (IMAGE_TYPES.has(mimeType)) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';

  const extension = getPublicDocumentFileName(item, fileUrl).split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  return 'unsupported';
}

export function getPublicDocumentDownloadUrl(fileUrl, fileName) {
  try {
    const url = new URL(fileUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.searchParams.set('download', fileName);
    return url.toString();
  } catch {
    return '';
  }
}
