import { Download, FileText, X } from 'lucide-react';
import {
  getPublicDocumentDownloadUrl,
  getPublicDocumentFileName,
  getPublicDocumentPreviewType,
} from '../../lib/publicDocumentPreview';

export default function PublicDocumentPreview({ item, fileUrl, onClose }) {
  const fileName = getPublicDocumentFileName(item, fileUrl);
  const previewType = getPublicDocumentPreviewType(item, fileUrl);
  const downloadUrl = getPublicDocumentDownloadUrl(fileUrl, fileName) || fileUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`View ${item.title}`}>
      <button type="button" className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} aria-label="Close preview" />
      <section className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-civic-navy">{item.title}</h2>
            <p className="truncate text-xs text-slate-500">{fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={downloadUrl}
              download={fileName}
              className="inline-flex items-center gap-2 rounded-lg bg-civic-navy px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-4 w-4" /> Save
            </a>
            <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-3 sm:p-5">
          {previewType === 'image' ? (
            <img src={fileUrl} alt={item.title} className="max-h-[calc(100dvh-7rem)] max-w-full rounded-lg object-contain shadow-sm" />
          ) : previewType === 'pdf' ? (
            <iframe title={`Preview of ${item.title}`} src={fileUrl} className="h-[75vh] w-full rounded-lg border border-slate-200 bg-white" />
          ) : (
            <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-civic-emerald" />
              <p className="mt-3 font-semibold text-civic-navy">Preview unavailable</p>
              <p className="mt-1 text-sm text-slate-600">This file type cannot be previewed here. Use Save to download it.</p>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
