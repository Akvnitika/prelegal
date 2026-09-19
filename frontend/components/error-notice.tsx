"use client";

/** The one way errors render outside the chat bubbles: message + optional
 * retry, in the danger color. */
export function ErrorNotice({
  message,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div role="alert" className={className ?? "space-y-1.5"}>
      <p className="text-sm text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-blue-primary hover:underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
