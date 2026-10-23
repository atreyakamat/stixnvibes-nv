export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display inline-flex items-center gap-[0.18em] text-[1.35rem] leading-none ${className}`}>
      <span>Stix</span>
      <span
        aria-hidden="true"
        className="inline-grid size-[1.05em] -rotate-12 place-items-center rounded-full bg-lemon text-[0.62em] text-ink"
      >
        N
      </span>
      <span className="sr-only">N</span>
      <span>Vibes</span>
    </span>
  );
}
