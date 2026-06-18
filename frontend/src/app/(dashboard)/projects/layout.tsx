import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mis Proyectos',
  description: 'Visualizá, editá y gestioná todos tus proyectos Laravel generados con inteligencia artificial.',
}

export default function ProjectsPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
