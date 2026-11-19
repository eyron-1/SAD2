import { useEffect, useState } from 'react';
import { Eye, FileText, X } from 'lucide-react';

const formatFileSize = (size) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function SelectedFilePreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const canPreview = isImage || isPdf;

  return (
    <>
      <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt={`Preview of ${file.name}`} className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover" />
        ) : (
          <FileText className="h-8 w-8 shrink-0 text-civic-emerald" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-700">Selected: {file.name}</p>
          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
        </div>
        {canPreview ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!previewUrl}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-civic-navy hover:border-civic-emerald hover:text-civic-emerald disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
        ) : (
          <span className="shrink-0 text-right text-[11px] text-slate-500">Preview unavailable<br />for this file type</span>
        )}
      </div>

      {open && previewUrl && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview ${file.name}`}>
          <section className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-civic-navy">{file.name}</h2>
                <p className="text-xs text-slate-500">Preview only — the file is uploaded when you submit.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close file preview" className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 overflow-auto bg-slate-100 p-3 sm:p-5">
              {isImage ? (
                <img src={previewUrl} alt={`Selected file ${file.name}`} className="mx-auto max-h-[75vh] max-w-full rounded-lg object-contain" />
              ) : (
                <iframe title={`PDF preview of ${file.name}`} src={previewUrl} className="h-[75vh] w-full rounded-lg border border-slate-200 bg-white" />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
