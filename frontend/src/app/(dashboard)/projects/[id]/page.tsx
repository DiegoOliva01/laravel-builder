'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Download, Terminal, Database, Calendar, Package, Layers, Zap,
  Loader2, History, X, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SqlParseResult } from '@/lib/types'
import SchemaDiagram from '@/components/diagram/SchemaDiagram'

interface GenerationSnapshot {
  id: number
  project_id: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  project_name: string | null
  laravel_version: string | null
  installation_type: string | null
  schema_snapshot: SqlParseResult | null
  created_at: string
}

export default function ProjectHistoryPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [generations, setGenerations] = useState<GenerationSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  
  // For the schema modal
  const [viewingSchema, setViewingSchema] = useState<SqlParseResult | null>(null)

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/generations`)
      setGenerations(res.data.generations || [])
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar el historial.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDownload = async (gen: GenerationSnapshot) => {
    setDownloadingId(gen.id)
    try {
      const response = await api.get(`/projects/${projectId}/generations/${gen.id}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const safeProjectName = (gen.project_name || 'proyecto').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      const safeVersion = (gen.laravel_version || '10').replace(/[^a-zA-Z0-9.-]/g, '_')
      
      link.setAttribute('download', `${safeProjectName}_laravel${safeVersion}_v${gen.id}.zip`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast({ title: 'Descarga iniciada' })
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo descargar la versión.', variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      {/* Back Link */}
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver a proyectos
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <History className="w-6 h-6 text-zinc-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Historial de Versiones</h1>
          <p className="text-zinc-400 text-sm mt-1">Explora las generaciones pasadas de tu proyecto y su estructura SQL original.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
      ) : generations.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-10 text-center">
          <Database className="w-10 h-10 text-zinc-600 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">Sin Historial</h3>
          <p className="text-zinc-500 max-w-sm mx-auto mb-6">Este proyecto aún no tiene ninguna versión generada. Carga un archivo SQL para empezar.</p>
          <Link href={`/projects/${projectId}/upload`}>
            <button className="bg-laravel-red text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow">
              Cargar SQL
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
          {generations.map((gen, idx) => {
            const date = new Date(gen.created_at).toLocaleDateString('es-AR', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })
            
            const isLatest = idx === 0
            
            return (
              <div key={gen.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Timeline dot */}
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#09090b] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
                  isLatest ? "bg-laravel-red text-white" : "bg-zinc-800 text-zinc-400"
                )}>
                  {isLatest ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <Terminal className="w-4 h-4" aria-hidden="true" />}
                </div>

                {/* Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-headline font-bold text-on-surface text-lg">
                        {gen.project_name || 'Proyecto sin nombre'}
                      </h4>
                      <p className="text-xs text-zinc-500 font-mono mt-1">{date}</p>
                    </div>
                    {isLatest && (
                      <span className="px-2 py-0.5 rounded bg-laravel-red/10 border border-laravel-red/20 text-laravel-red text-[10px] font-bold uppercase tracking-wider h-fit">
                        Actual
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium">
                      <Terminal className="w-3 h-3 text-zinc-500" aria-hidden="true" />
                      Laravel {gen.laravel_version || '10'}.x
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium">
                      <Package className="w-3 h-3 text-zinc-500" aria-hidden="true" />
                      {gen.installation_type || 'default'}
                    </span>
                  </div>

                  {gen.status === 'completed' ? (
                    <div className="flex items-center gap-3 pt-4 border-t border-zinc-800/50">
                      <button
                        onClick={() => handleDownload(gen)}
                        disabled={downloadingId === gen.id}
                        className="flex-1 flex items-center justify-center gap-2 bg-laravel-red text-white text-xs font-bold px-3 py-2 rounded hover:bg-laravel-red-dark transition-colors disabled:opacity-50"
                      >
                        {downloadingId === gen.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Download className="w-3.5 h-3.5" aria-hidden="true" />}
                        {downloadingId === gen.id ? 'Descargando' : 'ZIP'}
                      </button>
                      
                      {gen.schema_snapshot ? (
                        <button
                          onClick={() => setViewingSchema(gen.schema_snapshot)}
                          className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 text-xs font-bold px-3 py-2 rounded hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                          <Database className="w-3.5 h-3.5" aria-hidden="true" />
                          Ver Esquema
                        </button>
                      ) : (
                        <div className="flex-1 text-center text-xs text-zinc-600 font-medium">
                          Sin esquema guardado
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4 border-t border-zinc-800/50">
                       <span className="flex items-center gap-1.5 text-xs text-error-red font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Generación fallida o pendiente
                       </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Schema Modal */}
      {viewingSchema && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-6xl h-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-[#18181b]">
              <h3 className="font-headline font-bold text-on-surface flex items-center gap-2">
                <Database className="w-4 h-4 text-zinc-400" aria-hidden="true" />
                Estructura SQL de la Versión
              </h3>
              <button
                onClick={() => setViewingSchema(null)}
                aria-label="Cerrar modal"
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 relative bg-[#09090b]">
              <SchemaDiagram result={viewingSchema} />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
