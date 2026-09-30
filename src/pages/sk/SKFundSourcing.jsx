import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { validateRequired, validateCurrency, validateFiscalYear, runValidators, formatCurrencyInput, finalizeCurrencyInput, parseCurrencyValue } from '../../lib/validation';
import { isSkEditor } from '../../utils/roles';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';
import { supabase } from '../../lib/supabaseClient';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { Landmark, Plus, Pencil, Trash2, Calendar, TrendingUp, X, Upload, FileText, Eye } from 'lucide-react';

const SOURCE_TYPES = [
  '10% IRA Allotment',
  'National Government Grant',
  'Local Government Subsidy',
  'Donation / Private Grant',
  'Fundraising Activity',
  'Other',
];

const EMPTY = { name: '', source_type: SOURCE_TYPES[0], amount: '', fiscal_year: '', received_date: '', description: '' };

export default function SKFundSourcing() {
  const { profile } = useAuth();
  const canEdit = isSkEditor(profile?.role);
  const { rows, loading, error, insertRow, updateRow, deleteRow } = useSupabaseTable('sk_fund_sources', profile?.barangay_id);

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const validators = {
    name: (v) => validateRequired(v, 'Fund name'),
    source_type: (v) => validateRequired(v, 'Source type'),
    amount: (v) => validateCurrency(v, 'Amount'),
    fiscal_year: validateFiscalYear,
  };

  const resetForm = () => { setForm(EMPTY); setFieldErrors({}); setEditingId(null); setSubmitError(''); setProofFile(null); setModalOpen(false); };
  const openModal = (row = null) => {
    if (row) {
      setForm({ name: row.name, source_type: row.source_type, amount: finalizeCurrencyInput(row.amount), fiscal_year: row.fiscal_year, received_date: row.received_date || '', description: row.description || '' });
      setEditingId(row.id);
    } else {
      setForm({ ...EMPTY, fiscal_year: String(new Date().getFullYear()) });
      setEditingId(null);
    }
    setFieldErrors({}); setSubmitError(''); setProofFile(null); setModalOpen(true);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setSubmitError('Proof document must be a JPG, PNG, WEBP image or PDF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Proof file must be under 5MB.');
      return;
    }
    setSubmitError('');
    setProofFile(file);
  };

  const uploadProof = async () => {
    if (!proofFile) return { url: null };
    try {
      const path = `${profile.barangay_id}/sk-funds-${Date.now()}-${proofFile.name.replace(/\s+/g, '-')}`;
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, proofFile);
      if (!upErr) {
        const { data } = supabase.storage.from('receipts').getPublicUrl(path);
        if (data?.publicUrl) return { url: data.publicUrl };
      }
    } catch (e) {
      console.warn('Storage upload error', e);
    }
    return { url: null };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { errors, isValid } = runValidators(form, validators);
    setFieldErrors(errors);
    if (!isValid) return;

    const isNewOrNoProof = !editingId || !rows.find(r => r.id === editingId)?.proof_url;
    const hasDescriptionProof = editingId && rows.find(r => r.id === editingId)?.description?.includes('[Proof of Funds:');
    if (isNewOrNoProof && !hasDescriptionProof && !proofFile) {
      setSubmitError('A proof document (resolution, deposit slip, grant letter) is strictly required for transparency.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    
    const upload = await uploadProof();
    let payload = {
      ...form,
      amount: parseCurrencyValue(form.amount),
      received_date: form.received_date || null,
      created_by: profile.id,
    };
    
    if (upload.url) {
      payload.proof_url = upload.url;
    }

    let result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    
    if (result.error && (result.error.includes('proof_url') || result.error.includes('column'))) {
      delete payload.proof_url;
      if (upload.url) {
        payload.description = `${payload.description || ''}\n\n[Proof of Funds: ${upload.url}]`.trim();
      }
      result = editingId ? await updateRow(editingId, payload) : await insertRow(payload);
    }

    setSubmitting(false);
    if (result.error) setSubmitError(result.error);
    else resetForm();
  };

  const handleEdit = (row) => {
    setForm({
      name: row.name,
      source_type: row.source_type,
      amount: finalizeCurrencyInput(row.amount),
      fiscal_year: row.fiscal_year,
      received_date: row.received_date || '',
      description: row.description || '',
    });
    setEditingId(row.id);
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this SK fund source?')) return;
    const result = await deleteRow(id);
    if (result.error) setSubmitError(result.error);
  };

  const totalFunds = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  // Group by fiscal year for mini-summary
  const byYear = Object.entries(
    rows.reduce((acc, r) => {
      acc[r.fiscal_year] = (acc[r.fiscal_year] || 0) + Number(r.amount || 0);
      return acc;
    }, {})
  ).slice(0, 2);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
          <Landmark className="w-8 h-8 text-civic-emerald" /> SK Fund Sourcing
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Track and manage Sangguniang Kabataan fund sources — IRA allotments, grants, and donations.
        </p>
        </div>
        {canEdit && <button onClick={() => openModal()} className="btn-emerald"><Plus className="w-4 h-4" /> Add New SK Fund Source</button>}
      </div>

      <ErrorBanner message={error} />

      {/* Summary KPIs */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card bg-civic-navy text-white p-5 rounded-xl">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Total SK Funds</p>
          <p className="text-2xl font-extrabold mt-1">
            ₱{totalFunds.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-white/50 mt-1">{rows.length} source{rows.length !== 1 ? 's' : ''} recorded</p>
        </div>
        {byYear.map(([year, amt]) => (
          <div key={year} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">FY {year}</p>
              <TrendingUp className="w-4 h-4 text-civic-emerald" />
            </div>
            <p className="text-2xl font-extrabold text-civic-navy mt-1">
              ₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {canEdit && modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"><form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="font-bold text-civic-navy flex items-center gap-2"><Plus className="w-4 h-4 text-civic-emerald" />{editingId ? 'Edit Fund Source' : 'Add New SK Fund Source'}</h2>
            <button type="button" onClick={resetForm} aria-label="Close fund source form" className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField
              label="Fund / Source Name"
              placeholder="e.g. 2026 IRA Allotment"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
            />
            <FormField
              as="select"
              label="Source Type"
              value={form.source_type}
              onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              error={fieldErrors.source_type}
            >
              {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </FormField>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField
              type="text"
              inputMode="decimal"
              label="Amount (₱)"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
              onBlur={(e) => setForm({ ...form, amount: finalizeCurrencyInput(e.target.value) })}
              error={fieldErrors.amount}
            />
            <FormField
              label="Fiscal Year"
              placeholder="2026"
              value={form.fiscal_year}
              onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
              error={fieldErrors.fiscal_year}
            />
            <FormField
              type="date"
              label="Date Received (optional)"
              value={form.received_date}
              onChange={(e) => setForm({ ...form, received_date: e.target.value })}
            />
          </div>

          <FormField
            as="textarea"
            rows={2}
            label="Description / Notes (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div>
            <label className="label">Upload Proof Document <span className="text-rose-500">*</span> (JPG, PNG, PDF max 5MB)</label>
            <label className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors border border-slate-200">
              <Upload className="w-4 h-4 text-civic-emerald" /> Choose Proof File...
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileChange} className="hidden" />
            </label>
            {proofFile && <span className="text-xs text-slate-600 font-medium block mt-1">Selected: {proofFile.name}</span>}
          </div>

          <ErrorBanner message={submitError} />

          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Add Fund Source'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
            )}
          </div>
        </form></div>
      )}

      {/* Fund Sources Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-civic-emerald" />
          <h2 className="font-bold text-sm text-civic-navy">All SK Fund Sources</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-civic-navy/5 text-civic-slate text-left">
            <tr>
              <th className="px-4 py-3">Fund Name</th>
              <th className="px-4 py-3">Source Type</th>
              <th className="px-4 py-3">FY</th>
              <th className="px-4 py-3">Date Received</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Proof</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading SK fund sources…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400">No SK fund sources recorded yet.</p>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-civic-navy/5 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {row.source_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.fiscal_year}</td>
                <td className="px-4 py-3 text-slate-500">
                  {row.received_date ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-civic-emerald" />
                      {new Date(row.received_date).toLocaleDateString()}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-civic-navy">
                  ₱{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  {row.proof_url ? (
                    <button type="button" onClick={() => setLightboxUrl(row.proof_url)} className="inline-flex items-center gap-1 text-xs font-semibold text-civic-emerald hover:underline">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : row.description?.includes('[Proof of Funds:') ? (
                    <span className="text-xs text-civic-emerald font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> See Description
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(row)}
                      className="inline-flex items-center gap-1 text-civic-navy hover:underline text-xs mr-3"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="inline-flex items-center gap-1 text-rose-500 hover:underline text-xs"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* In-page Image Lightbox */}
      {lightboxUrl && <ImageLightbox src={lightboxUrl} alt="SK Fund Source Proof" onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
