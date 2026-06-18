'use client'

import { useEffect, useState } from 'react'
import {
  FolderOpen, Plus, Trash2, Calendar, Terminal,
  Loader2, Pencil, AlertCircle, CheckCircle2, Clock, Download, History,
  ChevronDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Project {
  id: number
  name: string
  laravel_version: string
  installation_type: string
  created_at: string
  updated_at: string
  downloads_count?: number
  generations_count?: number
  latest_generation_id?: number | null
}

const installationLabels: Record<string, string> = {
  default: 'Base',
  breeze: 'Breeze',
  jetstream: 'Jetstream',
}

function ProjectCard({ 
  project, 
  onDeleteClick, 
  onDownload, 
  downloadingId 
}: { 
  project: Project; 
  onDeleteClick: (project: Project) => void; 
  onDownload: (pid: number, gid: number) => void; 
  downloadingId: number | null 
}) {
  const date = new Date(project.created_at).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const installLabel = installationLabels[project.installation_type] ?? project.installation_type

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col relative card-base-hover group">
      {/* Card Header */}
      <div className="p-5 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-start">
        <Link href={`/projects/${project.id}`} className="block flex-1 min-w-0 mr-3 group">
          <h2 className="font-headline font-semibold text-lg text-on-surface group-hover:text-laravel-red transition-colors truncate mb-1">
            {project.name}
          </h2>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-mono text-xs">Laravel {project.laravel_version}.x</span>
          </div>
        </Link>
        {/* Status badge */}
        <div className="pill-pending flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          {installLabel}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Generaciones</span>
          <span className="font-mono text-xs text-on-surface">{project.generations_count ?? 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Descargas</span>
          <span className="font-mono text-xs text-on-surface">{project.downloads_count ?? 0}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Creado</span>
          <span className="text-zinc-400 text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {date}
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Subir SQL */}
          <Link
            href={`/projects/${project.id}/upload`}
            className="text-xs font-medium text-laravel-red hover:text-laravel-red-dark flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Cargar SQL
          </Link>

          {/* Descargar ZIP */}
          {project.latest_generation_id && (
            <>
              <div className="w-px h-3 bg-zinc-700" />
              <button
                onClick={() => onDownload(project.id, project.latest_generation_id!)}
                disabled={downloadingId === project.id}
                className="text-xs font-medium text-on-surface hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {downloadingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                ZIP
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Ver Historial */}
          <Link
            href={`/projects/${project.id}`}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            title="Ver Historial de Versiones"
          >
            <History className="w-4 h-4" />
          </Link>

          {/* Edit */}
          <Link href={`/projects/${project.id}/edit`}>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-zinc-500 hover:text-on-surface hover:bg-zinc-800"
              aria-label="Editar proyecto"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </Link>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteClick(project)}
            className="w-8 h-8 text-zinc-500 hover:text-error-red hover:bg-red-500/10"
            aria-label="Eliminar proyecto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="p-5 border-b border-zinc-800 bg-zinc-800/30">
        <div className="h-5 bg-zinc-800 rounded w-2/3 mb-2" />
        <div className="h-3 bg-zinc-800 rounded w-1/3" />
      </div>
      <div className="p-5 space-y-3">
        <div className="h-3 bg-zinc-800 rounded w-full" />
        <div className="h-3 bg-zinc-800 rounded w-3/4" />
      </div>
      <div className="px-5 py-3 border-t border-zinc-800">
        <div className="h-3 bg-zinc-800 rounded w-1/4" />
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  
  // Single page-level deletion state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [versionFilter, setVersionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const router = useRouter()
  const { toast } = useToast()

  const handleNavigateNewProject = () => {
    setIsNavigating(true)
    router.push('/projects/new')
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      const data = response.data?.data ?? response.data
      setProjects(Array.isArray(data) ? data : [])
    } catch {
      toast({
        title: 'Error al cargar proyectos',
        description: 'No se pudieron obtener tus proyectos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, versionFilter, typeFilter])

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVersion = versionFilter === 'all' || project.laravel_version === versionFilter
    const matchesType = typeFilter === 'all' || project.installation_type === typeFilter
    return matchesSearch && matchesVersion && matchesType
  })

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage)

  const handleDownload = async (projectId: number, generationId: number) => {
    setDownloadingId(projectId)
    try {
      const response = await api.get(`/projects/${projectId}/generations/${generationId}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `laravel_project_${projectId}_${generationId}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast({ title: 'Descarga iniciada' })
      
      // Update UI explicitly by refetching projects
      fetchProjects()
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo descargar el proyecto.', variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`/projects/${projectToDelete.id}`)
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id))
      toast({ title: 'Proyecto eliminado', description: 'El proyecto fue eliminado correctamente.' })
      setProjectToDelete(null)
    } catch (error) {
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el proyecto.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Panel de Control</h1>
          <p className="text-zinc-400 text-sm mt-1">
            {isLoading
              ? 'Cargando...'
              : `${projects.length} proyecto${projects.length !== 1 ? 's' : ''} — gestioná y monitoreá tus generaciones.`}
          </p>
        </div>
        <Button 
          disabled={isNavigating}
          onClick={handleNavigateNewProject}
          className="bg-[#E31C12] hover:bg-laravel-red-dark text-white gap-2 font-semibold btn-primary-glow disabled:opacity-50"
        >
          {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isNavigating ? 'Cargando...' : 'Crear Nuevo Proyecto'}
        </Button>
      </div>

      {/* Filters Bar */}
      {!isLoading && projects.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <input
              type="text"
              placeholder="Buscar proyecto por nombre..."
              aria-label="Buscar proyectos por nombre"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-on-surface placeholder-zinc-500 focus:outline-none focus:border-laravel-red transition-colors"
            />
            <div className="absolute left-3 top-2.5 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-laravel-red transition-colors w-full md:w-44 flex items-center justify-between cursor-pointer">
                  <span>
                    {versionFilter === 'all' && 'Todas las versiones'}
                    {versionFilter === '10' && 'Laravel 10.x'}
                    {versionFilter === '11' && 'Laravel 11.x'}
                    {versionFilter === '12' && 'Laravel 12.x'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-on-surface min-w-[176px]">
                <DropdownMenuItem 
                  onClick={() => setVersionFilter('all')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Todas las versiones
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setVersionFilter('10')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Laravel 10.x
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setVersionFilter('11')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Laravel 11.x
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setVersionFilter('12')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Laravel 12.x
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-on-surface focus:outline-none focus:border-laravel-red transition-colors w-full md:w-44 flex items-center justify-between cursor-pointer">
                  <span>
                    {typeFilter === 'all' && 'Todos los paquetes'}
                    {typeFilter === 'default' && 'Base'}
                    {typeFilter === 'breeze' && 'Breeze'}
                    {typeFilter === 'jetstream' && 'Jetstream'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-on-surface min-w-[176px]">
                <DropdownMenuItem 
                  onClick={() => setTypeFilter('all')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Todos los paquetes
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTypeFilter('default')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Base
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTypeFilter('breeze')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Breeze
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setTypeFilter('jetstream')}
                  className="text-xs hover:bg-laravel-red focus:bg-laravel-red hover:text-white focus:text-white cursor-pointer"
                >
                  Jetstream
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-zinc-500" />
          </div>
          <h3 className="font-headline font-semibold text-lg text-on-surface mb-2">Sin proyectos todavía</h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-sm">
            Creá tu primer proyecto Laravel. Configurá la versión, el tipo de instalación y subí tu esquema SQL.
          </p>
          <Button 
            disabled={isNavigating}
            onClick={handleNavigateNewProject}
            className="bg-[#E31C12] hover:bg-laravel-red-dark text-white gap-2 btn-primary-glow disabled:opacity-50"
          >
            {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isNavigating ? 'Cargando...' : 'Crear primer proyecto'}
          </Button>
        </div>
      )}

      {/* Empty state for filters */}
      {!isLoading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-zinc-500" />
          </div>
          <h3 className="font-headline font-semibold text-lg text-on-surface mb-2">No se encontraron resultados</h3>
          <p className="text-zinc-400 text-sm max-w-sm">
            Ningún proyecto coincide con los filtros aplicados. Intentá cambiar los criterios de búsqueda.
          </p>
        </div>
      )}

      {/* Project Grid */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {paginatedProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDeleteClick={setProjectToDelete} 
                onDownload={handleDownload} 
                downloadingId={downloadingId} 
              />
            ))}
          </div>

          {/* Single page-level deletion dialog */}
          <AlertDialog open={projectToDelete !== null} onOpenChange={(open) => !open && setProjectToDelete(null)}>
            <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-on-surface">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline">¿Eliminar proyecto?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">
                  Vas a eliminar{' '}
                  <span className="text-on-surface font-medium font-mono">&quot;{projectToDelete?.name}&quot;</span>.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleting}
                  className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-laravel-red hover:bg-laravel-red-dark text-white disabled:opacity-50 gap-2"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800 pt-6 gap-4">
              <span className="text-zinc-400 text-sm">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredProjects.length)} de {filteredProjects.length} proyectos
              </span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Anterior
                </Button>
                <span className="text-sm font-medium text-on-surface font-mono">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
