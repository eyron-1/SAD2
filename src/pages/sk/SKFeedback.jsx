import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';
import { MessageSquare, Phone, Calendar, Image as ImageIcon, UserCheck, Sparkles } from 'lucide-react';

const STATUSES = ['new', 'in_review', 'resolved', 'closed'];

export default function SKFeedback() {
  const { profile } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [responses, setResponses] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch only feedback addressed to SK for this barangay
  useEffect(() => {
    if (!profile?.barangay_id) return;
    setLoading(true);
    supabase
      .from('feedback')
      .select('*')
      .eq('barangay_id', profile.barangay_id)
      .eq('addressed_to', 'sk')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setFetchError(error.message);
        else setRows(data || []);
        setLoading(false);
      });
  }, [profile?.barangay_id]);

  const handleRespond = async (row, status) => {
    setSavingId(row.id);
    setActionError('');
    const payload = { status, responded_by: profile.id, responded_at: new Date().toISOString() };
    if (responses[row.id] !== undefined) payload.official_response = responses[row.id];
    const { error } = await supabase.from('feedback').update(payload).eq('id', row.id);
    setSavingId(null);
    if (error) {
      setActionError(error.message);
    } else {
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, ...payload } : r));
    }
  };

  const filteredRows = statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-civic-navy flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-emerald-500" /> SK Community Feedback
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Feedback and concerns submitted directly to the Sangguniang Kabataan by community members.
        </p>
      </div>

      <ErrorBanner message={fetchError || actionError} />

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            statusFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All ({rows.length})
        </button>
        {STATUSES.map((s) => {
          const count = rows.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1.5 ${
                statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {s.replace(/_/g, ' ')}
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {loading && <p className="text-slate-400 text-center py-8">Loading SK feedback entries…</p>}
        {!loading && filteredRows.length === 0 && (
          <div className="card text-center py-12 text-slate-500">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            No SK feedback found for this filter.
          </div>
        )}

        {filteredRows.map((row) => (
          <div key={row.id} className="card space-y-4 hover:border-emerald-200 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-civic-navy text-base">{row.resident_name}</span>
                  <span className="text-xs text-slate-500 font-medium px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {row.category}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    → SK
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-civic-emerald" />
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                  {row.contact_number && (
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Phone className="w-3 h-3 text-civic-emerald" /> {row.contact_number}
                    </span>
                  )}
                </div>
              </div>

              <Badge status={row.status} />
            </div>

            <p className="text-sm text-slate-800 leading-relaxed font-sans bg-slate-50 p-4 rounded-xl border border-slate-100">
              "{row.message}"
            </p>

            {row.photo_urls?.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-civic-emerald" /> Photo Attachments ({row.photo_urls.length})
                </span>
                <div className="flex gap-2 flex-wrap">
                  {row.photo_urls.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="group relative">
                      <img src={url} alt="Attachment" className="w-20 h-20 object-cover rounded-xl border border-slate-200 group-hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {row.official_response && (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> SK Official Response
                </div>
                <p className="text-slate-800 font-sans text-sm">{row.official_response}</p>
              </div>
            )}

            {/* SK Response Composer */}
            <div className="pt-2 space-y-3 border-t border-slate-100">
              <textarea
                className="input-field text-xs font-sans"
                rows={2}
                placeholder="Write SK official response to this concern..."
                value={responses[row.id] ?? row.official_response ?? ''}
                onChange={(e) => setResponses({ ...responses, [row.id]: e.target.value })}
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400">Update Status:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={savingId === row.id}
                      onClick={() => handleRespond(row, s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border capitalize transition-all ${
                        row.status === s
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {savingId === row.id ? 'Saving...' : s.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
