'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, AlertCircle, Download, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'

export default function GenerateProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleBackToUpload = () => {
    setIsNavigating(true)
    router.push(`/projects/${projectId}/upload`)
  }

  const handleBackToProjects = () => {
    setIsNavigating(true)
    router.push('/projects')
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await api.post(`/projects/${projectId}/generations`)
      setGenerationId(res.data.generation.id)
      pollGenerationStatus(res.data.generation.id)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar el proyecto')
      toast({ title: 'Error', description: 'No se pudo iniciar la generación', variant: 'destructive' })
      setIsGenerating(false)
    }
  }

  const pollGenerationStatus = async (id: number) => {
    try {
      const res = await api.get(`/projects/${projectId}/generations/${id}`)
      const status = res.data.generation.status

      if (status === 'completed') {
        setSuccess(true)
        setIsGenerating(false)
        toast({ title: '¡Éxito!', description: 'Proyecto generado correctamente.' })
      } else if (status === 'failed') {
        setError(res.data.generation.error_message || 'Error en la generación')
        setIsGenerating(false)
        toast({ title: 'Error', description: 'No se pudo generar el código', variant: 'destructive' })
      } else {
        // still processing
        setTimeout(() => pollGenerationStatus(id), 3000)
      }
    } catch (err) {
      setError('Error al consultar estado')
      setIsGenerating(false)
    }
  }

  const steps = ['Información Básica', 'Configuración', 'Carga de Origen', 'Generación']
  const step = 3

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <button onClick={handleBackToUpload} disabled={isNavigating} className="inline-flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium transition-colors disabled:opacity-50">
          {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
          Volver a Carga SQL
        </button>
      </div>

      {/* Stepper */}
      <div className="w-full max-w-4xl mx-auto self-center mb-10 flex-shrink-0">
        <div className="flex items-center relative w-full">
          <div 
            className="absolute top-4 h-0.5 bg-zinc-800 -z-10" 
            style={{ left: `${100 / (2 * steps.length)}%`, width: `${100 - 100 / steps.length}%` }} 
          />
          <div 
            className="absolute top-4 h-0.5 bg-laravel-red -z-10 transition-all duration-500" 
            style={{ 
              left: `${100 / (2 * steps.length)}%`, 
              width: `${100 - 100 / steps.length}%` 
            }} 
          />
          {steps.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 transition-all duration-300',
                i < step
                  ? 'bg-laravel-red border-laravel-red text-white'
                  : 'bg-zinc-950 border-laravel-red text-laravel-red shadow-[0_0_0_4px_rgba(255,45,32,0.15)]'
              )}>
                {i < step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-semibold text-center leading-tight',
                i === step ? 'text-laravel-red' : 'text-on-surface'
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            Paso Final: Generación
          </span>
          {success && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-laravel-red/10 border border-laravel-red/20 text-laravel-red text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completado
            </span>
          )}
        </div>
        <h2 className="font-headline text-3xl font-bold text-on-surface">Generación de Código</h2>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
          El Modelo de Dominio ya está listo. Ahora iniciaremos el proceso para generar los archivos de tu proyecto Laravel (Modelos, Migraciones, Factories, etc.).
        </p>
      </div>

      {/* Content */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-laravel-red/10 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-laravel-red" />
        </div>
        
        <h3 className="font-headline text-xl font-semibold text-on-surface mb-2">
          {success ? '¡Proyecto Generado!' : 'Todo listo para generar'}
        </h3>
        <p className="text-zinc-400 mb-8 max-w-md">
          {success 
            ? 'Tu código fuente ya está empaquetado en un archivo ZIP listo para descargar y usar.'
            : 'Al confirmar, nuestro motor (asistido por IA) escribirá el código fuente y la documentación. Este proceso puede tardar unos minutos.'}
        </p>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error-red/10 border border-error-red/20 mb-6 w-full text-left">
            <AlertCircle className="w-5 h-5 text-error-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-red">{error}</p>
          </div>
        )}

        {!success ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 bg-laravel-red text-white text-base font-bold px-8 py-3.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Procesando con IA...</>
            ) : (
              <>Generar Proyecto</>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-4 w-full sm:w-auto flex-col sm:flex-row">
            <button
              disabled={isDownloading || isNavigating}
              onClick={async () => {
                if (isDownloading) return
                setIsDownloading(true)
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
                } catch (err) {
                  toast({ title: 'Error', description: 'No se pudo descargar el archivo', variant: 'destructive' })
                } finally {
                  setIsDownloading(false)
                }
              }}
              className="flex items-center justify-center gap-2 bg-laravel-red text-white text-base font-bold px-8 py-3.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow w-full sm:w-auto disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {isDownloading ? 'Descargando...' : 'Descargar ZIP'}
            </button>
            <button 
              onClick={handleBackToProjects}
              disabled={isNavigating}
              className="flex items-center justify-center gap-2 bg-zinc-800 text-on-surface text-base font-bold px-8 py-3.5 rounded hover:bg-zinc-700 transition-colors w-full sm:w-auto border border-zinc-700 disabled:opacity-50"
            >
              {isNavigating && <Loader2 className="w-4 h-4 animate-spin" />}
              Volver al Panel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
