/** The mark: one cube, three faces, drawn in the same lines as the figures. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M16 4 27 10.3v12.6L16 29.2 5 22.9V10.3z" className="fill-background" />
      <path d="M5 10.3 16 16.6 27 10.3M16 16.6v12.6" />
    </svg>
  )
}
