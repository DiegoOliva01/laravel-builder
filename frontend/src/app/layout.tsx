import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'
import ParticleBackground from '@/components/ParticleBackground'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
})


export const metadata: Metadata = {
  metadataBase: new URL('https://laravel-builder.vercel.app'),
  title: {
    default: 'Laravel Builder — Generador de Proyectos Laravel con IA',
    template: '%s | Laravel Builder',
  },
  description:
    'Genera proyectos Laravel completos a partir de diagramas DER o scripts SQL con inteligencia artificial. Modelos, migraciones, controladores y más.',
  keywords: [
    'laravel',
    'generador',
    'SQL',
    'DER',
    'inteligencia artificial',
    'migraciones',
    'modelos',
    'CRUD',
    'PHP',
    'proyecto laravel',
  ],
  authors: [{ name: 'Laravel Builder Team' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Laravel Builder',
    title: 'Laravel Builder — Generador de Proyectos Laravel con IA',
    description:
      'Genera proyectos Laravel completos a partir de diagramas DER o scripts SQL con inteligencia artificial.',
    url: 'https://laravel-builder.vercel.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Laravel Builder — Generador de Proyectos Laravel con IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laravel Builder — Generador con IA',
    description: 'Genera proyectos Laravel completos desde SQL o DER.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${jetbrainsMono.variable} ${hankenGrotesk.variable}`}>
      <body>
        <a
          href="#main-content"
          className="skip-nav"
        >
          Saltar al contenido
        </a>
        <AuthProvider>
          <ParticleBackground />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
