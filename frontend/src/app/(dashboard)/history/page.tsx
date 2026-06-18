'use client'

import { useState, useEffect } from 'react'
import { History, Clock, Download, Trash2, Loader2, CheckCircle2, AlertCircle, XCircle, Package, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
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

interface Generation {
  id: number
  project_id: number
  status: 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  project_name?: string
  laravel_version?: string
  installation_type?: string
  project: {
    id: number
    name: string
    laravel_version: string
    installation_type?: string
  } | null
}

const statusConfig = {
  processing: {
    label: 'Procesando',
    icon: Loader2,
    className: 'text-warning-amber bg-warning-amber/10 border-warning-amber/20',
    iconClassName: 'animate-spin',
  },
  completed: {
    label: 'Completado',
    icon: CheckCircle2,
    className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    iconClassName: '',
  },
  failed: {
    label: 'Error',
    icon: XCircle,
    className: 'text-error-red bg-error-red/10 border-error-red/20',
    iconClassName: '',
  },
}

export default function HistoryPage() {
  const { toast } = useToast()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [versionFilter, setVersionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchGenerations()
  }, [])

  const fetchGenerations = async () => {
    try {
      const res = await api.get('/generations')
      setGenerations(res.data.generations)
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el historial.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (gen: Generation) => {
    if (!gen.project) return
    setDownloadingId(gen.id)
    try {
      const response = await api.get(
        `/projects/${gen.project_id}/generations/${gen.id}/download`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${gen.project.name}_${gen.id}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({ title: 'Error', description: 'No se pudo descargar el archivo.', variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/generations/${id}`)
      setGenerations((prev) => prev.filter((g) => g.id !== id))
      toast({ title: 'Eliminado', description: 'La generación fue eliminada del historial.' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la generación.', variant: 'destructive' })
      throw error
    }
  }

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, versionFilter, typeFilter])

  const filteredGenerations = generations.filter((gen) => {
    const name = gen.project?.name ?? gen.project_name ?? 'Proyecto eliminado'
    const version = gen.project?.laravel_version ?? gen.laravel_version ?? ''
    const type = gen.project?.installation_type ?? gen.installation_type ?? ''

    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVersion = versionFilter === 'all' || version === versionFilter
    const matchesType = typeFilter === 'all' || type === typeFilter

    return matchesSearch && matchesVersion && matchesType
  })

  const totalPages = Math.ceil(filteredGenerations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedGenerations = filteredGenerations.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold text-on-surface">Historial</h1>
        <p className="text-zinc-400 text-sm mt-1">Registro cronológico de todas tus generaciones.</p>
      </div>

      {/* Filters Bar */}
      {!loading && generations.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre del proyecto..."
              aria-label="Buscar proyectos en el historial"
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : generations.length === 0 ? (
        /* Empty state */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <History className="w-7 h-7 text-zinc-500" />
          </div>
          <h3 className="font-headline font-semibold text-lg text-on-surface mb-2">Sin actividad todavía</h3>
          <p className="text-zinc-400 text-sm max-w-sm">
            El historial de tus generaciones aparecerá aquí. Creá un proyecto y cargá tu esquema SQL para comenzar.
          </p>
          <div className="flex items-center gap-2 mt-6 text-xs text-zinc-600">
            <Clock className="w-3.5 h-3.5" />
            <span>Los registros se guardan automáticamente</span>
          </div>
        </div>
      ) : filteredGenerations.length === 0 ? (
        /* Empty search results */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-zinc-500" />
          </div>
          <h3 className="font-headline font-semibold text-lg text-on-surface mb-2">No se encontraron resultados</h3>
          <p className="text-zinc-400 text-sm max-w-sm">
            Ningún registro del historial coincide con los filtros aplicados. Intentá cambiar los criterios de búsqueda.
          </p>
        </div>
      ) : (
        /* Generations list with pagination */
        <div className="space-y-6">
          <div className="space-y-3">
            {paginatedGenerations.map((gen) => (
              <GenerationRow
                key={gen.id}
                gen={gen}
                onDownload={handleDownload}
                onDelete={handleDelete}
                downloadingId={downloadingId}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800 pt-6 gap-4">
              <span className="text-zinc-500 text-sm">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredGenerations.length)} de {filteredGenerations.length} registros
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

function GenerationRow({
  gen,
  onDownload,
  onDelete,
  downloadingId,
}: {
  gen: Generation
  onDownload: (gen: Generation) => Promise<void>
  onDelete: (id: number) => Promise<void>
  downloadingId: number | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const status = statusConfig[gen.status]
  const StatusIcon = status.icon

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDeleting(true)
    try {
      await onDelete(gen.id)
      setIsOpen(false)
    } catch {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-5 hover:border-zinc-700 transition-colors group">
      {/* Icon */}
      <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
        <Package className="w-5 h-5 text-zinc-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-headline font-semibold text-on-surface truncate">
            {gen.project?.name ?? 'Proyecto eliminado'}
          </h4>
          {gen.project && (
            <span className="text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded flex-shrink-0">
              Laravel {gen.project.laravel_version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{formatDate(gen.created_at)}</span>
          {gen.error_message && (
            <span className="text-error-red truncate max-w-xs" title={gen.error_message}>
              {gen.error_message}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold flex-shrink-0 ${status.className}`}>
        <StatusIcon className={`w-3.5 h-3.5 ${status.iconClassName}`} />
        {status.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {gen.status === 'completed' && gen.project && (
          <button
            onClick={() => onDownload(gen)}
            disabled={downloadingId === gen.id}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-on-surface bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            title="Descargar ZIP"
          >
            {downloadingId === gen.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {downloadingId === gen.id ? 'Descargando...' : 'Descargar'}
          </button>
        )}

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <button
              className="flex items-center justify-center text-zinc-500 hover:text-error-red bg-zinc-800 hover:bg-error-red/10 border border-zinc-700 hover:border-error-red/30 w-8 h-8 rounded-md transition-colors disabled:opacity-50"
              title="Eliminar del historial"
              aria-label="Eliminar del historial"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-on-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline">¿Eliminar del historial?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Vas a eliminar esta generación del proyecto{' '}
                <span className="text-on-surface font-medium font-mono">&quot;{gen.project?.name ?? 'Proyecto eliminado'}&quot;</span> del historial.
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
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="bg-laravel-red hover:bg-laravel-red-dark text-white disabled:opacity-50 gap-2"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
