import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/hooks/use-theme'
import { THEME_STORAGE_KEY } from '@/lib/themes'
import './globals.css'

// Анти-мигание: выставляем тему до первой отрисовки, читая выбор пользователя.
const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var ok=['dark','light','graphite','ocean','sepia'].indexOf(t)>=0;if(!ok)t='dark';var light=(t==='light'||t==='sepia');var e=document.documentElement;e.setAttribute('data-theme',t);e.classList.toggle('dark',!light);e.style.colorScheme=light?'light':'dark';}catch(e){}})();`

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AURUM — Финансовый учёт сервиса',
  description:
    'Профессиональная CRM-система бухгалтерского учёта: баланс, статистика и аналитика чистой прибыли сервиса.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0b12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
