import type { Metadata, Viewport } from 'next'
import { Nunito, Caveat, Playfair_Display, Righteous, Space_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import BottomNav from '@/components/BottomNav'

const nunito = Nunito({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-caveat',
  display: 'swap',
})
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})
const righteous = Righteous({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-righteous',
  display: 'swap',
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aloha Tran Home',
  description: 'Quản lý nhà trọ thông minh',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Aloha Home',
  },
  icons: {
    icon:  [{ url: '/icons/icon-192x192.svg' }],
    apple: [{ url: '/icons/apple-touch-icon.svg' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#1D9E75',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${nunito.variable} ${caveat.variable} ${playfairDisplay.variable} ${righteous.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Aloha Home" />
      </head>
      <body className="antialiased">
        {children}
        <BottomNav />
        <ServiceWorkerRegister />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  )
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered:', reg.scope); })
                .catch(function(err) { console.log('SW error:', err); });
            });
          }
        `,
      }}
    />
  )
}
