export default function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="bg-civic-clay/10 border border-civic-clay/30 text-civic-clay rounded-md px-4 py-3 text-sm flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline shrink-0 font-medium">
          Retry
        </button>
      )}
    </div>
  );
}
