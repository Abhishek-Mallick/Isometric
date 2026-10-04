/** The mark: a cube in the figures' lines, its top face lit. Same as public/logo.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
      <path d="M16 3.5 26.8 9.75 16 16 5.2 9.75z" fill="currentColor" />
      <path d="M5.2 9.75v12.5L16 28.5l10.8-6.25V9.75M16 16v12.5" />
    </svg>
  )
}
