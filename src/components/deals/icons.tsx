// src/components/deals/icons.tsx

export function ClockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ThumbUpIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M7 10 13 3a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2l-1 6a2 2 0 0 1-2 2H7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function ThumbDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7 14V4H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M7 14 13 21a2 2 0 0 0 3-2l-1-5h5a2 2 0 0 0 2-2l-1-6a2 2 0 0 0-2-2H7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M12 2l1.3 5.2L18 8.5l-4.7 1.3L12 15l-1.3-5.2L6 8.5l4.7-1.3L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M19 13l.8 3.2L23 17l-3.2.8L19 21l-.8-3.2L15 17l3.2-.8L19 13Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
