import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createAIContext } from "../../lib/aiContext";
import { requestAIAssistant } from "../../lib/aiAssistant";
import { useSupabaseTable } from "../../lib/useSupabaseTable";
import ErrorBanner from "../../components/ui/ErrorBanner";
import {
  Bot,
  Send,
  Copy,
  Check,
  Database,
  RefreshCw,
  FileText,
  HelpCircle,
  TrendingUp,
  Award,
} from "lucide-react";

const MODES = [
  {
    id: "report_draft",
    label: "Draft Report",
    icon: FileText,
    placeholder:
      "e.g. Draft a quarterly accomplishment summary for the health program covering Jan–Mar, 320 beneficiaries, ₱85,000 spent.",
  },
  {
    id: "inquiry",
    label: "Governance Q&A",
    icon: HelpCircle,
    placeholder:
      "e.g. What is the required minimum SK budget allocation from the barangay IRA according to RA 7160?",
  },
  {
    id: "budget_forecast",
    label: "Budget Forecast",
    icon: TrendingUp,
    placeholder:
      "e.g. Forecast next fiscal year's infrastructure budget based on our last 2 years of allocations.",
  },
  {
    id: "accomplishment_report",
    label: "Accomplishment",
    icon: Award,
    placeholder:
      "e.g. Write an accomplishment report for the completed disaster-preparedness program.",
  },
];

export default function AIAssistant() {
  const { profile } = useAuth();
  const [mode, setMode] = useState("report_draft");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [includeData, setIncludeData] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const { rows: allocations } = useSupabaseTable(
    "budget_allocations",
    profile?.barangay_id,
  );
  const { rows: expenses } = useSupabaseTable("expenses", profile?.barangay_id);
  const { rows: programs } = useSupabaseTable("programs", profile?.barangay_id);

  const activeMode = MODES.find((m) => m.id === mode);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    setError("");

    const context = includeData
      ? createAIContext({ allocations, expenses, programs })
      : null;

    try {
      const aiResponse = await requestAIAssistant({
        mode,
        messages: newMessages,
        context,
      });
      setMessages([...newMessages, { role: "assistant", content: aiResponse }]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleModeChange = (id) => {
    setMode(id);
    setMessages([]);
    setError("");
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-civic-navy">
            <Bot className="w-8 h-8 text-civic-emerald" />
            Groq AI Barangay Assistant
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Powered by <strong>Groq GPT-OSS 120B</strong> · Draft reports,
            calculate forecasts, and get legal governance advice grounded in
            your barangay records.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Shared AI service · No device-specific key needed
        </p>
      </div>

      {/* Modes Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col gap-1.5 ${
                mode === m.id
                  ? "bg-civic-navy text-white border-civic-navy shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${mode === m.id ? "text-civic-emerald" : "text-slate-400"}`}
              />
              <span className="font-semibold text-xs">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Context Checkbox */}
      <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2.5 rounded-lg border border-slate-200/80 text-xs">
        <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={includeData}
            onChange={(e) => setIncludeData(e.target.checked)}
            className="rounded border-slate-300 text-civic-emerald focus:ring-civic-emerald"
          />
          <Database className="w-3.5 h-3.5 text-civic-emerald" />
          Feed current Barangay Records (Budgets, Expenses, Programs) into Groq
          AI Prompt
        </label>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className="w-3 h-3" /> Clear Chat
          </button>
        )}
      </div>

      {/* Chat Display Box */}
      <div className="card min-h-[350px] max-h-[500px] flex flex-col justify-between overflow-hidden p-0 border border-slate-200">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-civic-emerald mx-auto flex items-center justify-center border border-emerald-100">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-civic-navy text-base">
                {activeMode.label} Mode Active
              </h3>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                {activeMode.placeholder}
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-civic-navy text-white ml-12"
                  : "bg-slate-50 text-slate-800 border border-slate-200 mr-12 space-y-2"
              }`}
            >
              <div className="flex items-center justify-between mb-1 opacity-75 text-[11px] font-semibold uppercase tracking-wider">
                <span>{m.role === "user" ? "You" : "Groq Llama 3.3 AI"}</span>
                {m.role === "assistant" && (
                  <button
                    onClick={() => handleCopy(m.content, i)}
                    className="hover:text-civic-emerald flex items-center gap-1 text-[10px] font-normal"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedIndex === i ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap font-sans">{m.content}</div>
            </div>
          ))}

          {sending && (
            <div className="bg-slate-50 text-slate-500 p-4 rounded-xl text-xs italic flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-civic-emerald" />{" "}
              Groq AI is generating report response…
            </div>
          )}
        </div>

        {/* Error Banner inside card */}
        {error && (
          <div className="px-6 py-2">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
          <textarea
            className="input-field flex-1 resize-none font-sans"
            rows={2}
            placeholder={activeMode.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="btn-emerald self-end px-5 py-3"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
