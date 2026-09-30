import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicBarangay } from '../../lib/usePublicBarangay';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import ErrorBanner from '../../components/ui/ErrorBanner';
import Badge from '../../components/ui/Badge';

import { Users, Calendar, Tag, ShieldCheck, Info, Layers, Building2, Search } from 'lucide-react';

const parseBeneficiary = (row) => {
  let cat = row.beneficiary_category || '';
  let desc = row.description || '';
  if (!cat && desc.startsWith('[Beneficiary: ')) {
    const match = desc.match(/^\[Beneficiary:\s*([^\]]+)\]\s*/);
    if (match) {
      cat = match[1];
      desc = desc.slice(match[0].length);
    }
  }
  return {
    beneficiary_category: cat || (row.beneficiaries_count ? 'General Residents' : ''),
    clean_description: desc,
  };
};

function ProgramCard({ row }) {
  const { beneficiary_category, clean_description } = parseBeneficiary(row);

  return (
    <div className="card space-y-3 hover:border-slate-300 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-civic-navy text-base">{row.title}</h3>
        <Badge status={row.status} />
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{clean_description || 'No description provided.'}</p>

      <div className="flex flex-wrap items-center gap-2.5 text-xs pt-2 border-t border-slate-100">
        {row.category && (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium border border-slate-200">
            <Tag className="w-3 h-3 text-civic-emerald" /> {row.category}
          </span>
        )}

        {(row.beneficiaries_count > 0 || beneficiary_category) && (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md font-medium border border-blue-200/60">
            <Users className="w-3 h-3 text-blue-600" />
            <span>{row.beneficiaries_count ? Number(row.beneficiaries_count).toLocaleString() : '0'}</span>
            {beneficiary_category && (
              <>
                <span className="text-blue-300">·</span>
                <span className="font-semibold">{beneficiary_category}</span>
              </>
            )}
          </span>
        )}

        <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
          ₱{Number(row.budget_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>

        {(row.start_date || row.end_date) && (
          <span className="inline-flex items-center gap-1 text-slate-500 ml-auto text-xs">
            <Calendar className="w-3 h-3 text-slate-400" />
            {row.start_date || 'TBD'} {row.end_date && `– ${row.end_date}`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PublicPrograms() {
  const { slug } = useParams();
  const { barangay, loading: bLoading } = usePublicBarangay(slug);
  const { rows: programs, loading: l1, error: e1 } = useSupabaseTable('programs', barangay?.id);
  const { rows: skPrograms, loading: l2, error: e2 } = useSupabaseTable('sk_programs', barangay?.id);

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'barangay' | 'sk'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrograms = useMemo(() => {
    return programs.filter(item => 
      !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [programs, searchTerm]);

  const filteredSkPrograms = useMemo(() => {
    return skPrograms.filter(item => 
      !searchTerm || 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skPrograms, searchTerm]);

  if (bLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <div className="w-10 h-10 border-4 border-civic-navy/20 border-t-civic-navy rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading programs…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-civic-navy/5 via-civic-emerald/5 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-civic-navy/10 text-civic-navy border border-civic-navy/15">
              <ShieldCheck className="w-3.5 h-3.5 text-civic-emerald" />
              Official Full Disclosure Transparency Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-display text-civic-navy font-bold">
              Barangay & SK Programs
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Explore ongoing and planned community programs and youth initiatives in{' '}
              <span className="font-semibold text-civic-navy">{barangay?.name || 'the barangay'}</span>. Every project is tracked for public visibility and transparency.
            </p>
          </div>
        </div>

        {/* Informational Guidance Callout */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border">
          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <span className="font-semibold text-slate-800">How to read this portal:</span>{' '}
            <span className="text-slate-600">
              This page lists official programs, projects, and activities led by the <strong>Barangay Government</strong> and the <strong>Sangguniang Kabataan (SK)</strong>.
            </span>
          </div>
        </div>
      </div>

      <ErrorBanner message={e1 || e2} />

      {/* Scope Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-civic-navy shadow-sm'
                : 'text-slate-600 hover:text-civic-navy hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4 text-civic-slate" />
            Combined Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('barangay')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'barangay'
                ? 'bg-white text-civic-navy shadow-sm'
                : 'text-slate-600 hover:text-civic-navy hover:bg-white/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-civic-navy" />
            Barangay Government
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'sk'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-white/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Sangguniang Kabataan (SK)
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search programs…"
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:border-civic-navy focus:ring-1 focus:ring-civic-navy/20 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {(activeTab === 'all' || activeTab === 'barangay') && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-civic-navy/10 text-civic-navy flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-civic-navy">Barangay Government</h2>
              <p className="text-xs text-slate-500">Official barangay community programs and initiatives</p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {l1 && <p className="text-civic-slate text-sm">Loading…</p>}
            {!l1 && filteredPrograms.length === 0 && <p className="text-civic-slate text-sm">No programs found.</p>}
            {filteredPrograms.map((row) => <ProgramCard key={row.id} row={row} />)}
          </div>
        </section>
      )}

      {(activeTab === 'all' || activeTab === 'sk') && (
        <section className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-950">Sangguniang Kabataan (SK)</h2>
              <p className="text-xs text-emerald-800/70">Youth empowerment programs and activities</p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {l2 && <p className="text-civic-slate text-sm">Loading…</p>}
            {!l2 && filteredSkPrograms.length === 0 && <p className="text-civic-slate text-sm">No SK programs found.</p>}
            {filteredSkPrograms.map((row) => <ProgramCard key={row.id} row={row} />)}
          </div>
        </section>
      )}
    </div>
  );
}
