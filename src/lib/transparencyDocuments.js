export const DOCUMENT_BUCKET = 'transparency-documents';
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;

const DOCUMENT_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

export function getDocumentFileError(file) {
  if (!file) return 'Choose a document to upload.';

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!DOCUMENT_TYPES[file.type]?.includes(extension)) {
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
