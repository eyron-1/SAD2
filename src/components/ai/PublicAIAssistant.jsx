import { useEffect, useRef, useState } from "react";
import { useSupabaseTable } from "../../lib/useSupabaseTable";
import { createPublicAIContext } from "../../lib/aiContext";
import { requestAIAssistant } from "../../lib/aiAssistant";
import { Bot, Send, X } from "lucide-react";

export default function PublicAIAssistant({ barangay, variant = "floating" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [useBarangayData, setUseBarangayData] = useState(true);
  const scrollRef = useRef(null);
  const [position, setPosition] = useState(null);
  const assistantRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const barangayId = barangay?.id;
  const { rows: allocations } = useSupabaseTable("budget_allocations", barangayId);
  const { rows: expenses } = useSupabaseTable("expenses", barangayId, {
    orderBy: "date_incurred",
  });
  const { rows: programs } = useSupabaseTable("programs", barangayId);
  const { rows: officials } = useSupabaseTable("profiles", barangayId, {
    select: "full_name,role,term_start,term_end,is_active",
    filter: { is_active: true },
  });
  const { rows: skFunds } = useSupabaseTable("sk_fund_sources", barangayId);
  const { rows: skAllocations } = useSupabaseTable("sk_budget", barangayId);
  const { rows: skExpenses } = useSupabaseTable("sk_expenses", barangayId, {
    orderBy: "date_incurred",
  });
  const { rows: skPrograms } = useSupabaseTable("sk_programs", barangayId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const handleSend = async (questionToRetry) => {
    const retrying = typeof questionToRetry === "string";
    const question = (retrying ? questionToRetry : input).trim();
    if (!question || sending || !barangay) return;

    const newMessages = retrying
      ? messages
      : [...messages, { role: "user", content: question }];
    if (!retrying) {
      setMessages(newMessages);
      setInput("");
    }
    setSending(true);
    setError("");

    try {
      const context = useBarangayData
        ? createPublicAIContext({
            barangay,
            officials,
            allocations,
            expenses,
            programs,
            skFunds,
            skAllocations,
            skExpenses,
            skPrograms,
          })
        : undefined;
      const response = await requestAIAssistant({
        mode: "public_qa",
        messages: newMessages.slice(-12),
        context,
      });
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (requestError) {
      setError(requestError.message || "The assistant could not answer right now.");
    } finally {
      setSending(false);
    }
  };

  const startDragging = (event) => {
    if (event.button !== 0 || !assistantRef.current) return;
    const bounds = assistantRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveAssistant = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (!movedRef.current && Math.hypot(deltaX, deltaY) < 4) return;

    movedRef.current = true;
    const maxLeft = Math.max(8, window.innerWidth - drag.width - 8);
    const maxTop = Math.max(8, window.innerHeight - drag.height - 8);
    const left = Math.min(Math.max(drag.left + deltaX, 8), maxLeft);
    const top = Math.min(Math.max(drag.top + deltaY, 8), maxTop);
    setPosition({
      right: window.innerWidth - left - drag.width,
      bottom: window.innerHeight - top - drag.height,
    });
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const toggleAssistant = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((isOpen) => !isOpen);
  };

  if (variant === "page") {
    return (
      <section className="mx-auto flex min-h-[min(42rem,calc(100dvh-14rem))] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-civic-navy px-5 py-4 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Bot className="h-6 w-6 text-civic-emerald" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Ask the Barangay Assistant
            </h1>
            <p className="text-xs text-slate-300">
              Ask about {barangay?.name || "your barangay"}, SK, or general topics
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="mx-auto max-w-xl py-12 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 text-civic-emerald" />
              <h2 className="font-semibold text-civic-navy">
                How can we help?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Ask about published barangay or SK officials, programs, budgets,
                and services. You can also ask general questions.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "ml-auto bg-civic-navy font-medium text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-800"
              }`}
            >
              {message.content}
            </div>
          ))}
          {sending && (
            <p className="text-sm text-slate-500">Preparing an answer...</p>
          )}
          {error && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p>{error}</p>
              {messages[messages.length - 1]?.role === "user" && (
                <button
                  type="button"
                  onClick={() => handleSend(messages[messages.length - 1].content)}
                  className="mt-1 font-semibold underline"
                >
                  Try again
                </button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
          <label className="mb-3 flex cursor-pointer items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={useBarangayData}
              onChange={(event) => setUseBarangayData(event.target.checked)}
              className="mt-0.5 accent-civic-emerald"
            />
            <span>
              <span className="block font-medium text-slate-700">
                Base answers on barangay data
              </span>
              <span>Use published barangay and SK records for answers.</span>
            </span>
          </label>
          <div className="flex gap-2">
            <textarea
              rows={2}
              maxLength={1200}
              aria-label="Ask a question"
              className="input-field flex-1 resize-none"
              placeholder="Type your question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !input.trim() || !barangay}
              className="btn-emerald self-end px-4 py-3"
              aria-label="Send question"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      ref={assistantRef}
      style={position ? { right: position.right, bottom: position.bottom } : undefined}
      className={`fixed z-50 flex flex-col items-end font-body ${
        position ? "" : "bottom-4 right-4 sm:bottom-6 sm:right-6"
      }`}
    >
      {open && (
        <section
          aria-label="Public AI assistant"
          className="mb-3 flex h-[min(34rem,calc(100dvh-7rem))] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover"
        >
          <div
            onPointerDown={startDragging}
            onPointerMove={moveAssistant}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className="flex shrink-0 cursor-grab select-none touch-none items-center justify-between border-b border-slate-800 bg-civic-dark px-4 py-3.5 text-white active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-civic-emerald" />
              <div>
                <h2 className="text-sm font-bold text-white">
                  Ask the Barangay Assistant
                </h2>
                <p className="text-[10px] text-slate-300">
                  Questions about {barangay?.name || "your barangay"} and SK
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-300 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="py-8 px-4 text-center text-xs leading-relaxed text-slate-500">
                Ask about published barangay or SK programs, budgets, and
                services. You can also ask general questions.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  message.role === "user"
                    ? "ml-8 bg-civic-navy font-medium text-white"
                    : "mr-8 border border-slate-200/60 bg-slate-100 text-slate-800"
                }`}
              >
                {message.content}
              </div>
            ))}
            {sending && (
              <p className="px-1 text-xs text-slate-500">Preparing an answer...</p>
            )}
            {error && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                <p>{error}</p>
                {messages[messages.length - 1]?.role === "user" && (
                  <button
                    type="button"
                    onClick={() => handleSend(messages[messages.length - 1].content)}
                    className="mt-1 font-semibold underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-2.5">
            <label className="mb-2 flex cursor-pointer items-start gap-2 text-[10px] leading-relaxed text-slate-600">
              <input
                type="checkbox"
                checked={useBarangayData}
                onChange={(event) => setUseBarangayData(event.target.checked)}
                className="mt-0.5 accent-civic-emerald"
              />
              <span>
                <span className="block font-medium text-slate-700">
                  Base answers on barangay data
                </span>
                Use published barangay and SK records for answers.
              </span>
            </label>
            <div className="flex gap-2">
              <textarea
                rows={1}
                maxLength={1200}
                aria-label="Ask a question"
                className="input-field flex-1 resize-none py-2 text-xs"
                placeholder="Type your question..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !input.trim() || !barangay}
                className="btn-emerald self-end px-3 py-2 text-xs"
                aria-label="Send question"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={toggleAssistant}
        onPointerDown={startDragging}
        onPointerMove={moveAssistant}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-white/20 bg-civic-navy text-white shadow-card-hover transition-all hover:scale-105"
        aria-label={open ? "Close AI assistant" : "Open public AI assistant"}
        aria-expanded={open}
        title="Drag to move"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>
    </div>
  );
}
