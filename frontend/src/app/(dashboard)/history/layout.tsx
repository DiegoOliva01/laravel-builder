import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Historial de Generaciones',
  description: 'Revisá el historial de proyectos y código Laravel generado. Descargá y gestioná versiones anteriores.',
}

export default function HistoryPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
