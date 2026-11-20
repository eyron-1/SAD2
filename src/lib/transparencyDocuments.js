export const DOCUMENT_BUCKET = 'transparency-documents';
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

const DOCUMENT_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function getDocumentFileError(file) {
  if (!file) return 'Choose a document to upload.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  const expectedMimeType = DOCUMENT_MIME_TYPES[extension];
  const providedMimeType = file.type?.toLowerCase();
  if (
    !expectedMimeType
    || (providedMimeType && providedMimeType !== expectedMimeType && providedMimeType !== 'application/octet-stream')
  ) {
    return 'Use a JPG, PNG, WEBP, PDF, XLS, XLSX, DOC, or DOCX file.';
  }
  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE) {
    return 'The file must be smaller than 20 MB.';
  }

  return '';
}

export function getDocumentExtension(file) {
  return file.name.split('.').pop().toLowerCase();
}

export function getDocumentMimeType(file) {
  return DOCUMENT_MIME_TYPES[getDocumentExtension(file)] || '';
}
