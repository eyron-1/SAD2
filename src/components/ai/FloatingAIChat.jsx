import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseTable } from '../../lib/useSupabaseTable';
import { Bot, X, Send, Database } from 'lucide-react';

const MODES = [
  { id: 'report_draft', label: 'Report', placeholder: 'Draft a quarterly accomplishment summary for health program…' },
  { id: 'inquiry', label: 'Ask', placeholder: 'What is the required minimum SK budget allocation from IRA?' },
  { id: 'budget_forecast', label: 'Forecast', placeholder: 'Forecast next fiscal year\'s budget based on spend…' },
  { id: 'accomplishment_report', label: 'Accomplishment', placeholder: 'Write an accomplishment report for completed projects…' },
];

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export default function FloatingAIChat() {
  const { profile, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('report_draft');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [includeData, setIncludeData] = useState(true);
  const scrollRef = useRef(null);

  const { rows: allocations } = useSupabaseTable('budget_allocations', profile?.barangay_id);
  const { rows: expenses } = useSupabaseTable('expenses', profile?.barangay_id);
  const { rows: programs } = useSupabaseTable('programs', profile?.barangay_id);

  const activeMode = MODES.find((m) => m.id === mode);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setSending(true);
    setError('');

    const context = includeData
      ? { budget_allocations: allocations.slice(0, 50), expenses: expenses.slice(0, 50), programs: programs.slice(0, 50) }
      : null;

    let aiText = '';

    // Primary: Call Supabase Edge function (Groq enabled)
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const token = session?.access_token || anonKey;
      const groqKey = localStorage.getItem('groq_api_key');

      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: anonKey,
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode, messages: newMessages, context, apiKey: groqKey || undefined }),
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch (_) { data = { error: raw }; }

      if (res.ok && data?.text) {
        aiText = data.text;
      }
    } catch (_) {}

    // Fallback: Direct Groq API Client Fetch
    if (!aiText) {
      try {
        const apiKeyToUse = localStorage.getItem('groq_api_key') || import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKeyToUse) {
          throw new Error('Groq API Key needed. Open AI Assistant page in sidebar to set your free key.');
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${apiKeyToUse}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: `You are a Philippine Barangay AI Assistant (${activeMode.label}). Context: ${JSON.stringify(context || {}).slice(0, 4000)}` },
              ...newMessages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
            ],
            temperature: 0.5,
            max_tokens: 1200,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.choices?.[0]?.message?.content) {
          aiText = resData.choices[0].message.content;
        } else {
          throw new Error(resData.error?.message || 'Groq request failed');
        }
      } catch (err) {
        setError(err.message);
      }
    }

    setSending(false);

    if (aiText) {
      setMessages([...newMessages, { role: 'assistant', content: aiText }]);
    }
  };

  const handleModeChange = (id) => {
    setMode(id);
    setMessages([]);
    setError('');
  };

  if (!profile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-body">
      {open && (
        <div className="mb-3 w-[380px] max-w-[92vw] h-[540px] max-h-[80vh] bg-white rounded-2xl shadow-card-hover border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-civic-dark text-white px-4 py-3.5 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-civic-emerald/20 text-civic-emerald flex items-center justify-center border border-civic-emerald/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">Groq AI Assistant</h3>
                <p className="text-[10px] text-slate-400">Llama 3.3 70B Model</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-200 shrink-0 overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap ${
                  mode === m.id
                    ? 'bg-civic-emerald text-white border-civic-emerald shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-600 px-3 pt-2 shrink-0 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={includeData}
              onChange={(e) => setIncludeData(e.target.checked)}
              className="rounded border-slate-300 text-civic-emerald focus:ring-civic-emerald"
            />
            <Database className="w-3 h-3 text-civic-emerald" />
            Include barangay data context
          </label>

          {/* Chat Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-slate-400 text-xs italic text-center py-8 px-4">{activeMode.placeholder}</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs whitespace-pre-wrap rounded-xl px-3.5 py-2.5 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-civic-navy text-white ml-8 shadow-xs font-medium'
                    : 'bg-slate-100 text-slate-800 mr-8 border border-slate-200/60'
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="text-slate-500 text-xs italic px-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-civic-emerald" /> Thinking…
              </div>
            )}
            {error && <div className="text-rose-600 text-xs px-2 py-1 bg-rose-50 rounded-lg border border-rose-200">{error}</div>}
          </div>

          {/* Input Footer */}
          <div className="border-t border-slate-200 p-2.5 flex gap-2 shrink-0 bg-slate-50">
            <textarea
              rows={1}
              className="input-field text-xs flex-1 resize-none py-2"
              placeholder="Ask Groq AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-emerald text-xs px-3 py-2">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-2xl bg-civic-navy text-white shadow-card-hover flex items-center justify-center hover:scale-105 transition-all duration-200 border border-white/20"
        aria-label="Open Groq AI Assistant"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <Bot className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-civic-navy animate-pulse"></span>
          </div>
        )}
      </button>
    </div>
  );
}
