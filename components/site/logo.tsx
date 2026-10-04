/** The mark: a solid cube, its three faces shaded from lit to shadow. Same as public/logo.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M16 3.5 26.8 9.75 16 16 5.2 9.75z" />
      <path d="M5.2 9.75 16 16v12.5L5.2 22.25z" fillOpacity={0.55} />
      <path d="M26.8 9.75 16 16v12.5l10.8-6.25z" fillOpacity={0.22} />
    </svg>
  )
}
