import { cn } from '@/lib/utils'

export const SERVICE_NAME = 'AURUM'
export const SERVICE_TAGLINE = 'Финансовый учёт сервиса'

/** Векторная монограмма логотипа (ромб с буквой «А» / стрелкой роста). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="14"
        stroke="url(#aurum-stroke)"
        strokeWidth="2.5"
      />
      <path
        d="M20 44L32 18L44 44"
        stroke="var(--primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 36H39"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="18" r="3" fill="var(--accent)" />
      <defs>
        <linearGradient
          id="aurum-stroke"
          x1="6"
          y1="6"
          x2="58"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function Wordmark({
  className,
  subtitle = true,
}: {
  className?: string
  subtitle?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark className="size-9 shrink-0" />
      <div className="leading-none">
        <div className="text-xl font-bold tracking-[0.2em] text-foreground">
          {SERVICE_NAME}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            {SERVICE_TAGLINE}
          </div>
        ) : null}
      </div>
    </div>
  )
}
