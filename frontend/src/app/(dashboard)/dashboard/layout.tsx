import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Panel de Control',
  description: 'Gestioná tus proyectos Laravel generados con IA. Estadísticas, acciones rápidas y estado de generaciones.',
}

export default function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
