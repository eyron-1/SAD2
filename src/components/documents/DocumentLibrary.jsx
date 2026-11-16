import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError } from '../../lib/validation';
import {
  DOCUMENT_BUCKET,
  getDocumentExtension,
  getDocumentFileError,
} from '../../lib/transparencyDocuments';
import ErrorBanner from '../ui/ErrorBanner';
import { Download, FileText, LockKeyholeOpen, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';

const CATEGORIES = [
  'Budget and financial reports',
  'Procurement and contracts',
  'Programs and projects',
  'Resolutions and ordinances',
  'Meeting minutes',
  'Other public records',
];

const formatFileSize = (size) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DocumentLibrary({
  barangay,
  scope,
  canManage = false,
  uploadedBy,
  isResidentPortal = false,
}) {
  const [documents, setDocuments] = useState([]);
  const [requestedDocuments, setRequestedDocuments] = useState([]);
  const [expenseReceipts, setExpenseReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [expenseLoadError, setExpenseLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [file, setFile] = useState(null);
  const isSk = scope === 'sk';
  const portalLabel = isSk ? 'SK' : 'Barangay';

  const fetchDocuments = useCallback(async () => {
    if (!barangay?.id) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    setExpenseLoadError('');
    const expenseTable = scope === 'sk' ? 'sk_expenses' : 'expenses';
    const [documentsResult, expensesResult] = await Promise.all([
      supabase
        .from('transparency_documents')
        .select('*')
        .eq('barangay_id', barangay.id)
        .eq('scope', scope)
        .order('created_at', { ascending: false }),
      isResidentPortal
        ? supabase
          .from(expenseTable)
          .select('id, category, amount, description, date_incurred, receipt_url')
          .eq('barangay_id', barangay.id)
          .not('receipt_url', 'is', null)
          .order('date_incurred', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (documentsResult.error) {
      setLoadError(friendlySupabaseError(documentsResult.error));
    } else {
      setDocuments(documentsResult.data || []);
    }
    if (expensesResult.error) {
      setExpenseLoadError(friendlySupabaseError(expensesResult.error));
    } else {
      setExpenseReceipts(expensesResult.data || []);
    }
    setLoading(false);
  }, [barangay?.id, isResidentPortal, scope]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setNotice('');

    const cleanTitle = title.trim();
    const cleanCategory = category.trim();
    if (!cleanTitle || cleanTitle.length > 160) {
      setSubmitError('Enter a document title between 1 and 160 characters.');
      return;
    }
    if (!cleanCategory || cleanCategory.length > 80) {
      setSubmitError('Choose a document category.');
      return;
    }
    if (!file) {
      setSubmitError('Choose a document to upload.');
      return;
    }
    const fileError = getDocumentFileError(file);
    if (fileError) {
      setSubmitError(fileError);
      return;
    }
    if (!barangay?.id || !uploadedBy) {
      setSubmitError('Your official account is not ready to upload documents.');
      return;
    }

    setSubmitting(true);
    const filePath = `${barangay.id}/${scope}/${crypto.randomUUID()}.${getDocumentExtension(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setSubmitError(friendlySupabaseError(uploadError));
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('transparency_documents')
      .insert({
        barangay_id: barangay.id,
        scope,
        title: cleanTitle,
        category: cleanCategory,
        description: description.trim() || null,
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();

    if (insertError) {
      const { error: cleanupError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath]);
      const cleanupMessage = cleanupError
        ? ` The upload could not be removed from storage: ${friendlySupabaseError(cleanupError)}`
        : '';
      setSubmitError(`${friendlySupabaseError(insertError)}${cleanupMessage}`);
      setSubmitting(false);
      return;
    }

    setDocuments((current) => [data, ...current]);
    setTitle('');
    setCategory(CATEGORIES[0]);
    setDescription('');
    setFile(null);
    event.target.reset();
    setNotice('Document published. Residents can request and download it now without official approval.');
    setSubmitting(false);
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Remove "${document.title}" from the public document library?`)) return;
    setSubmitError('');
    setNotice('');
    setDeletingId(document.id);

    const { error: storageError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([document.file_path]);
    if (storageError) {
      setSubmitError(friendlySupabaseError(storageError));
      setDeletingId('');
      return;
    }

    const { error: deleteError } = await supabase
      .from('transparency_documents')
      .delete()
      .eq('id', document.id)
      .eq('barangay_id', barangay.id)
      .eq('scope', scope);
    if (deleteError) {
      setSubmitError(`The file was removed, but its library record could not be deleted: ${friendlySupabaseError(deleteError)}`);
      setDeletingId('');
      return;
    }

    setDocuments((current) => current.filter((item) => item.id !== document.id));
    setDeletingId('');
  };

  const requestableItems = [
    ...documents.map((document) => ({ ...document, requestId: `document-${document.id}`, requestType: 'document' })),
    ...expenseReceipts
      .filter((expense) => expense.receipt_url)
      .map((expense) => ({
        ...expense,
        id: expense.id,
        title: `${isSk ? 'SK ' : ''}Expense receipt — ${expense.category} · ${expense.date_incurred}`,
        category: 'Expense receipt / proof',
        requestId: `expense-${expense.id}`,
        requestType: 'receipt',
      })),
  ];
  const availableDocuments = requestableItems.filter(
    (item) => !requestedDocuments.some((requested) => requested.requestId === item.requestId),
  );

  const handleRequestDocument = (event) => {
    event.preventDefault();
    const item = availableDocuments.find((entry) => entry.requestId === selectedDocumentId);
    if (!item) return;

    setRequestedDocuments((current) => (
      current.some((requested) => requested.requestId === item.requestId)
        ? current
        : [item, ...current]
    ));
    setSelectedDocumentId('');
    setNotice(`Request sent. "${item.title}" is now available in Requested documents.`);
  };

  if (!barangay?.id) {
    return <p className="text-sm text-slate-500">Loading barangay information...</p>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-civic-emerald/10 text-civic-emerald">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-civic-emerald">{portalLabel} transparency</p>
            <h1 className="mt-1 text-2xl font-bold text-civic-navy">Public Documents</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              {canManage
                ? `Publish ${portalLabel} records for residents to request. Requested documents become available in the resident portal without another official's approval.`
                : `Choose an uploaded ${portalLabel} document to request. It will appear in Requested documents; no personal details or official approval are needed.`}
            </p>
          </div>
        </div>
      </header>

      <ErrorBanner message={loadError} onRetry={loadError ? fetchDocuments : undefined} />
      <ErrorBanner message={expenseLoadError} onRetry={expenseLoadError ? fetchDocuments : undefined} />
      <ErrorBanner message={submitError} />
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      {canManage && (
        <section className="card space-y-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-civic-emerald" />
            <h2 className="text-lg font-bold text-civic-navy">Upload a disclosure document</h2>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <LockKeyholeOpen className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Uploaded files are publicly accessible. Residents must request a copy before a download link appears in their portal, but anyone with a direct file URL may still access it. Do not upload confidential records or documents containing personal information that should not be disclosed.
            </p>
          </div>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Document title
              <input
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input-field"
                placeholder="e.g. 2026 Annual Budget"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field">
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="input-field"
                placeholder="Add context to help residents find the right record."
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              File <span className="font-normal text-slate-400">- JPG, PNG, WEBP, PDF, XLS, XLSX, DOC, or DOCX - up to 20 MB</span>
              <input
                required
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx,.doc,.docx"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:font-semibold file:text-slate-700"
              />
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={submitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
                <UploadCloud className="h-4 w-4" />
                {submitting ? 'Publishing...' : 'Upload and publish'}
              </button>
            </div>
          </form>
        </section>
      )}

      {isResidentPortal ? (
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-bold text-civic-navy">Request a document</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the document you want. After you send the request, its link will appear below.
            </p>
          </div>
          {loading ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Loading available documents...</p>
          ) : availableDocuments.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              {documents.length + expenseReceipts.filter((expense) => expense.receipt_url).length === 0
                ? 'There are no documents or expense receipts available to request yet.'
                : 'You have already requested all available documents.'}
            </p>
          ) : (
            <form onSubmit={handleRequestDocument} className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="document-request">Choose a document</label>
              <select
                id="document-request"
                required
                value={selectedDocumentId}
                onChange={(event) => setSelectedDocumentId(event.target.value)}
                className="input-field flex-1"
              >
                <option value="">Choose a document...</option>
                {availableDocuments.map((item) => (
                  <option key={item.requestId} value={item.requestId}>
                    {item.title} - {item.category}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={!selectedDocumentId} className="btn-primary shrink-0 disabled:opacity-50">
                Send request
              </button>
            </form>
          )}
        </section>
      ) : (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-civic-navy">{barangay.name} {portalLabel} documents</h2>
              <p className="mt-1 text-sm text-slate-500">Public copies are available as soon as they are uploaded.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
          </div>

          {loading && <p className="text-sm text-slate-500">Loading documents...</p>}
          {!loading && documents.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">No public documents have been uploaded yet.</p>
            </div>
          )}
          {!loading && documents.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {documents.map((document) => {
                const { data } = supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(document.file_path);
                return (
                  <li key={document.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-civic-emerald" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800">{document.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {document.category} · {document.file_name} · {formatFileSize(document.file_size)} · {new Date(document.created_at).toLocaleDateString()}
                        </p>
                        {document.description && <p className="mt-2 text-sm text-slate-600">{document.description}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                      <a
                        href={data.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary py-2 text-xs"
                      >
                        <Download className="h-4 w-4" />
                        Open / download
                      </a>
                      {canManage && (
                        <button
                          type="button"
                          disabled={deletingId === document.id}
                          onClick={() => handleDelete(document)}
                          aria-label={`Remove ${document.title}`}
                          className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {isResidentPortal && requestedDocuments.length > 0 && (
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-bold text-civic-navy">Requested documents</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your selected documents are ready. No personal information or official approval is required.
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {requestedDocuments.map((document) => {
              const fileUrl = document.requestType === 'receipt'
                ? document.receipt_url
                : supabase.storage.from(DOCUMENT_BUCKET).getPublicUrl(document.file_path).data.publicUrl;
              return (
                <li key={document.requestId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-slate-800">{document.title}</p>
                    <p className="text-xs text-slate-500">
                      {document.requestType === 'receipt'
                        ? `${document.category} · ₱${Number(document.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${document.description ? ` · ${document.description}` : ''}`
                        : document.file_name}
                    </p>
                  </div>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary py-2 text-xs"
                  >
                    <Download className="h-4 w-4" />
                    Open / download
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
