import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { friendlySupabaseError } from '../../lib/validation';
import {
  getProgramMediaExtension,
  getProgramMediaFilesError,
  getProgramMediaMimeType,
  PROGRAM_MEDIA_BUCKET,
} from '../../lib/programMedia';
import ErrorBanner from '../ui/ErrorBanner';
import { ArrowLeft, ChevronRight, Download, Image, Play, Trash2, UploadCloud, X } from 'lucide-react';

const formatSize = (size) => size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;

export default function ProgramMediaGallery({
  barangayId,
  programId,
  programType,
  programStatus,
  canManage = false,
  uploadedBy,
  programTitle = 'project',
}) {
  const [media, setMedia] = useState([]);
  const [files, setFiles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewingMediaId, setViewingMediaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchMedia = useCallback(async () => {
    if (!barangayId || !programId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('program_media')
      .select('*')
      .eq('barangay_id', barangayId)
      .eq('program_id', programId)
      .eq('program_type', programType)
      .order('created_at', { ascending: false });
    if (fetchError) setError(friendlySupabaseError(fetchError));
    else setMedia(data || []);
    setLoading(false);
  }, [barangayId, programId, programType]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setViewingMediaId('');
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    const fileError = getProgramMediaFilesError(files);
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!barangayId || !uploadedBy) {
      setError('Your official account is not ready to upload documentation.');
      return;
    }

    setSubmitting(true);
    const uploadedPaths = [];
    const records = [];
    let uploadFailure = '';
    for (const [index, file] of files.entries()) {
      setUploadProgress(`Uploading ${index + 1} of ${files.length}…`);
      const ext = getProgramMediaExtension(file);
      const mimeType = getProgramMediaMimeType(file);
      const filePath = `${barangayId}/${programType}/${programId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PROGRAM_MEDIA_BUCKET)
        .upload(filePath, file, { contentType: mimeType, upsert: false });
      if (uploadError) {
        const isPermissionError = uploadError.code === '42501'
          || uploadError.message?.toLowerCase().includes('row-level security')
          || uploadError.message?.toLowerCase().includes('policy')
          || uploadError.message?.toLowerCase().includes('bucket');
        uploadFailure = `${file.name}: ${isPermissionError
          ? `Supabase Storage denied this upload. Ensure the "${PROGRAM_MEDIA_BUCKET}" bucket and storage policies exist on your Supabase project.`
          : friendlySupabaseError(uploadError)}`;
        break;
      }
      uploadedPaths.push(filePath);
      records.push({
        barangay_id: barangayId,
        program_id: programId,
        program_type: programType,
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 160) || programTitle,
        file_name: file.name,
        file_path: filePath,
        mime_type: mimeType,
        file_size: file.size,
        uploaded_by: uploadedBy,
      });
    }

    if (uploadFailure) {
      const { error: cleanupError } = uploadedPaths.length
        ? await supabase.storage.from(PROGRAM_MEDIA_BUCKET).remove(uploadedPaths)
        : { error: null };
      setError(`${uploadFailure}${cleanupError ? ` Previously uploaded files could not all be removed: ${friendlySupabaseError(cleanupError)}` : ''}`);
      setSubmitting(false);
      setUploadProgress('');
      return;
    }
    const { data, error: insertError } = await supabase
      .from('program_media')
      .insert(records)
      .select();
    if (insertError) {
      const { error: cleanupError } = await supabase.storage.from(PROGRAM_MEDIA_BUCKET).remove(uploadedPaths);
      const cleanupMessage = cleanupError
        ? ` Uploaded files could not all be removed from storage: ${friendlySupabaseError(cleanupError)}`
        : '';
      const isPermissionError = insertError.code === '42501'
        || insertError.message?.toLowerCase().includes('row-level security')
        || insertError.message?.toLowerCase().includes('policy');
      const errorMessage = isPermissionError
        ? `Supabase denied saving the documentation record. If this project is ongoing or not marked completed, ensure the updated program media migration has been run in your Supabase SQL Editor (or mark the project as Completed).`
        : friendlySupabaseError(insertError);
      setError(`${errorMessage}${cleanupMessage}`);
    } else {
      setMedia((current) => [...data, ...current]);
      setFiles([]);
      event.target.reset();
      setNotice(`${data.length} documentation file${data.length === 1 ? '' : 's'} published for public viewing.`);
    }
    setSubmitting(false);
    setUploadProgress('');
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from this public project documentation?`)) return;
    setError('');
    setDeletingId(item.id);
    const { error: storageError } = await supabase.storage
      .from(PROGRAM_MEDIA_BUCKET)
      .remove([item.file_path]);
    if (storageError) {
      setError(friendlySupabaseError(storageError));
      setDeletingId('');
      return;
    }
    const { error: deleteError } = await supabase
      .from('program_media')
      .delete()
      .eq('id', item.id)
      .eq('barangay_id', barangayId);
    if (deleteError) setError(friendlySupabaseError(deleteError));
    else {
      setMedia((current) => current.filter((entry) => entry.id !== item.id));
      if (viewingMediaId === item.id) setViewingMediaId('');
    }
    setDeletingId('');
  };

  const handleDownload = async (item) => {
    setError('');
    setDownloadingId(item.id);
    const { data, error: downloadError } = await supabase.storage
      .from(PROGRAM_MEDIA_BUCKET)
      .download(item.file_path);
    if (downloadError) {
      setError(friendlySupabaseError(downloadError));
      setDownloadingId('');
      return;
    }

    const objectUrl = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = item.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    setDownloadingId('');
  };

  if (loading && media.length === 0) return null;
  if (!canManage && media.length === 0) return null;

  return (
    <section className="border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex max-w-full items-center gap-1.5 py-1 text-left text-civic-navy transition hover:text-civic-emerald"
      >
        <Image className="h-4 w-4 shrink-0 text-civic-emerald" />
        <span className="truncate text-xs font-semibold">
          {media.length > 0 ? 'See all documentation' : (canManage ? 'Add documentation' : 'Documentation')}
        </span>
        <span className="shrink-0 text-[10px] font-semibold text-slate-500">({media.length})</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOpen(false);
              setViewingMediaId('');
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`program-media-title-${programId}`}
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Public project records</p>
                <h2 id={`program-media-title-${programId}`} className="truncate text-lg font-bold text-civic-navy">
                  {programTitle} documentation
                </h2>
                <p className="text-xs text-slate-500">{media.length} photo{media.length === 1 ? '' : 's'} or video{media.length === 1 ? '' : 's'}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setViewingMediaId(''); }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close documentation"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 sm:p-6">
              {viewingMediaId ? (
                (() => {
                  const item = media.find((entry) => entry.id === viewingMediaId);
                  if (!item) return null;
                  const { data: urlData } = supabase.storage.from(PROGRAM_MEDIA_BUCKET).getPublicUrl(item.file_path);
                  const isVideo = item.mime_type.startsWith('video/');
                  return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => setViewingMediaId('')} className="btn-secondary text-sm">
                          <ArrowLeft className="h-4 w-4" /> All documentation
                        </button>
                        <button type="button" onClick={() => handleDownload(item)} disabled={downloadingId === item.id} className="btn-emerald text-sm">
                          <Download className="h-4 w-4" />{downloadingId === item.id ? 'Preparing…' : 'Save file'}
                        </button>
                      </div>
                      <div className="flex min-h-[45vh] items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                        {isVideo ? (
                          <video src={urlData.publicUrl} controls autoPlay className="max-h-[65vh] w-full object-contain" />
                        ) : (
                          <img src={urlData.publicUrl} alt={item.title} className="max-h-[65vh] max-w-full object-contain" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{item.title}</h3>
                        <p className="text-xs text-slate-500">{item.file_name} · {formatSize(item.file_size)}</p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-5">
                  {media.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {media.map((item) => {
                        const { data: urlData } = supabase.storage.from(PROGRAM_MEDIA_BUCKET).getPublicUrl(item.file_path);
                        const isVideo = item.mime_type.startsWith('video/');
                        return (
                          <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() => setViewingMediaId(item.id)}
                              className="relative block w-full bg-slate-100 text-left"
                              aria-label={`View ${item.title}`}
                            >
                              {isVideo ? (
                                <span className="flex h-32 items-center justify-center bg-slate-900 text-white">
                                  <Play className="h-9 w-9" />
                                </span>
                              ) : (
                                <img src={urlData.publicUrl} alt={item.title} className="h-32 w-full object-cover" loading="lazy" />
                              )}
                            </button>
                            <div className="flex items-center justify-between gap-2 p-2.5">
                              <button type="button" onClick={() => setViewingMediaId(item.id)} className="min-w-0 text-left">
                                <span className="block truncate text-xs font-semibold text-slate-700">{item.title}</span>
                                <span className="block text-[10px] text-slate-400">{isVideo ? 'Video' : 'Photo'} · {formatSize(item.file_size)}</span>
                              </button>
                              <div className="flex shrink-0 items-center gap-1">
                                <button type="button" onClick={() => handleDownload(item)} disabled={downloadingId === item.id} className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700" aria-label={`Save ${item.file_name}`} title="Save file">
                                  <Download className="h-4 w-4" />
                                </button>
                                {canManage && (
                                  <button type="button" onClick={() => handleDelete(item)} disabled={deletingId === item.id} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" aria-label={`Delete ${item.title}`} title="Delete documentation">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">No documentation has been uploaded yet.</p>
                  )}

                  {canManage && programStatus !== 'cancelled' && (
                    <form onSubmit={handleUpload} className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-civic-navy">Add project documentation</p>
                          <p className="text-xs text-slate-600">Select multiple photos or videos. Files are publicly viewable and labeled with their filenames.</p>
                        </div>
                        {programStatus && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-800">
                            {programStatus} project
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
                          onChange={(event) => {
                            setError('');
                            setFiles(Array.from(event.target.files || []));
                          }}
                          className="input-field min-w-0 flex-1 text-xs"
                        />
                        <button type="submit" disabled={submitting || files.length === 0} className="btn-emerald shrink-0 text-xs">
                          <UploadCloud className="h-4 w-4" />
                          {submitting ? uploadProgress : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
                        </button>
                      </div>
                      {files.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100/80 pt-2 text-xs text-slate-600">
                          <p className="font-medium text-slate-700">
                            {files.length} file{files.length === 1 ? '' : 's'} selected ({formatSize(files.reduce((sum, f) => sum + f.size, 0))}) · max 50 MB each
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setFiles([]);
                              const input = document.querySelector('input[type="file"]');
                              if (input) input.value = '';
                            }}
                            className="text-[11px] font-semibold text-rose-600 underline hover:text-rose-700"
                          >
                            Clear selection
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                  {canManage && programStatus === 'cancelled' && (
                    <p className="text-xs text-slate-500">Documentation uploads are disabled because this project is cancelled.</p>
                  )}
                  {notice && <p className="text-xs font-semibold text-emerald-700">{notice}</p>}
                </div>
              )}
              {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
