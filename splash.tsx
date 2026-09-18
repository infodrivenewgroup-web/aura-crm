'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

/**
 * Полноэкранная заставка INFO-DRIVE с эффектом свечения.
 * Через 2,5 секунды плавно исчезает и вызывает onDone().
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2200)
    const done = setTimeout(onDone, 2800)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 transition-opacity duration-500 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={leaving}
    >
      <style>{`
        @keyframes idGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(99,102,241,0.55), 0 0 42px rgba(139,92,246,0.35); }
          50% { text-shadow: 0 0 30px rgba(99,102,241,0.95), 0 0 70px rgba(139,92,246,0.6); }
        }
        @keyframes idRise {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes idRing {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .id-rise { animation: idRise 0.9s ease-out both; }
        .id-glow { animation: idGlow 2.2s ease-in-out infinite; }
        .id-ring { animation: idRing 2s ease-out infinite; }
      `}</style>

      <div className="id-rise relative flex size-28 items-center justify-center">
        <span className="id-ring absolute inset-0 rounded-full border border-indigo-400/60" />
        <span
          className="id-ring absolute inset-0 rounded-full border border-violet-400/50"
          style={{ animationDelay: '0.6s' }}
        />
        <span className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_40px_rgba(99,102,241,0.6)]">
          <Search className="size-10 text-white" strokeWidth={2.5} />
        </span>
      </div>

      <h1
        className="id-rise id-glow mt-8 font-mono text-4xl font-extrabold tracking-[0.25em] text-indigo-100 sm:text-5xl"
        style={{ animationDelay: '0.15s' }}
      >
        INFO-DRIVE
      </h1>
      <p
        className="id-rise mt-3 text-sm tracking-widest text-indigo-300/70"
        style={{ animationDelay: '0.3s' }}
      >
        ПОИСКОВИК ДАННЫХ
      </p>
    </div>
  )
}
