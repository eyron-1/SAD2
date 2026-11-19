import { useState } from 'react';
import { X } from 'lucide-react';

const PREVIEW_LENGTH = 120;

function getPreview(text) {
  const preview = text.slice(0, PREVIEW_LENGTH);
  const wordBoundary = preview.lastIndexOf(' ');
  return `${preview.slice(0, wordBoundary > 0 ? wordBoundary : PREVIEW_LENGTH).trimEnd()}…`;
}

export default function ExpandableDescription({ description, className = '', emptyText = '—' }) {
  const [open, setOpen] = useState(false);
  const text = typeof description === 'string' ? description.trim() : '';

  if (!text) return <span className={className}>{emptyText}</span>;

  const hasMore = text.length > PREVIEW_LENGTH;

  return (
    <>
      <div className={className}>
        <p className="break-words">{hasMore ? getPreview(text) : text}</p>
        {hasMore && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 text-xs font-semibold text-civic-emerald hover:underline"
            aria-haspopup="dialog"
          >
            See all descriptions
          </button>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="full-description-title">
          <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <h2 id="full-description-title" className="font-bold text-civic-navy">Full description</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close description" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{text}</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
