'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, ArrowRight, Loader2, Package, Zap, Layers, Check, Terminal,
  Upload, File, X, CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
  Database, Key, Link as LinkIcon, SkipForward, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SqlParseResult, ParsedTable, ParsedColumn } from '@/lib/types'
import SchemaDiagram from '@/components/diagram/SchemaDiagram'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  laravel_version: z.enum(['10', '11', '12'], { required_error: 'Seleccioná una versión' }),
  installation_type: z.enum(['default', 'breeze', 'jetstream'], { required_error: 'Seleccioná un tipo' }),
})

type FormData = z.infer<typeof schema>

const laravelVersions = [
  { value: '12', label: 'Laravel 12.x', badge: 'Última', note: 'Versión más reciente' },
  { value: '11', label: 'Laravel 11.x', badge: 'LTS', note: 'Soporte a largo plazo' },
  { value: '10', label: 'Laravel 10.x', badge: 'Estable', note: 'Versión estable' },
]

const installationTypes = [
  {
    value: 'default',
    label: 'Instalación Base',
    description: 'Laravel sin starter kits. Ideal para APIs puras.',
    icon: Package,
  },
  {
    value: 'breeze',
    label: 'Laravel Breeze',
    description: 'Auth básico con Blade o Inertia. Liviano y simple.',
    icon: Zap,
  },
  {
    value: 'jetstream',
    label: 'Laravel Jetstream',
    description: 'Auth completo con equipos, 2FA y más.',
    icon: Layers,
  },
]

// Stepper steps
const steps = ['Información Básica', 'Configuración', 'Carga de Origen', 'Generación']

// ─── SQL Upload sub-components ───────────────────────────────────────────────

function ColumnRow({ col }: { col: ParsedColumn }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-2 py-1.5 rounded group',
      col.is_foreign ? 'bg-laravel-red/5 border border-laravel-red/20' : 'hover:bg-zinc-900'
    )}>
      {col.is_primary ? (
        <Key className="w-3.5 h-3.5 text-warning-amber flex-shrink-0" />
      ) : col.is_foreign ? (
        <LinkIcon className="w-3.5 h-3.5 text-laravel-red flex-shrink-0" />
      ) : (
        <span className="w-3.5" />
      )}
      <span className={cn(
        'font-mono text-sm flex-1 truncate',
        col.is_primary ? 'text-on-surface font-semibold' : col.is_foreign ? 'text-laravel-red font-semibold' : 'text-zinc-300'
      )}>
        {col.name}
      </span>
      <span className="font-mono text-xs text-zinc-400 truncate max-w-[120px]">
        {col.type}{col.is_unique && !col.is_primary ? ', unique' : ''}
      </span>
    </div>
  )
}

function TableCard({ table }: { table: ParsedTable }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center gap-2 font-mono text-sm text-on-surface font-semibold">
          {open ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          {table.name}
        </div>
        <span className="text-xs text-zinc-400">{table.columns.length} cols</span>
      </button>
      {open && (
        <div className="p-2 space-y-0.5">
          {table.columns.map((col) => (
            <ColumnRow key={col.name} col={col} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function NewProjectPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(0) // 0=info, 1=config, 2=upload SQL
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // ── Form (steps 0-1) ──
  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      laravel_version: '12',
      installation_type: 'default',
    },
  })

  const selectedVersion = watch('laravel_version')
  const selectedType = watch('installation_type')
  const projectName = watch('name')

  // ── Upload state (step 2) ──
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<SqlParseResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [schemaViewMode, setSchemaViewMode] = useState<'visual' | 'json'>('visual')
  const [useAi, setUseAi] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)

  // Helper to update step and sync with URL query parameters
  const updateStep = (nextStep: number, projectId: number | null = createdProjectId) => {
    setStep(nextStep)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('step', nextStep.toString())
      if (projectId) {
        url.searchParams.set('project_id', projectId.toString())
      } else {
        url.searchParams.delete('project_id')
      }
      window.history.pushState({}, '', url.pathname + url.search)
    }
  }

  // Restore step and project state on reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const stepParam = params.get('step')
      const projectIdParam = params.get('project_id')
      
      let initialStep = 0
      let initialProjectId: number | null = null

      if (stepParam) {
        const parsedStep = parseInt(stepParam, 10)
        if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep <= 3) {
          initialStep = parsedStep
        }
      }
      if (projectIdParam) {
        const parsedId = parseInt(projectIdParam, 10)
        if (!isNaN(parsedId)) {
          initialProjectId = parsedId
        }
      }

      if (initialProjectId) {
        setCreatedProjectId(initialProjectId)
        setStep(initialStep)
        api.get(`/projects/${initialProjectId}`)
          .then((res) => {
            const p = res.data?.data ?? res.data
            setValue('name', p.name)
            setValue('laravel_version', p.laravel_version)
            setValue('installation_type', p.installation_type)
          })
          .catch(() => {
            toast({
              title: 'Error',
              description: 'No se pudo cargar la información del proyecto.',
              variant: 'destructive',
            })
          })
      } else {
        setStep(initialStep)
      }
    }
  }, [setValue, toast])

  // ── Step navigation ──
  const handleNextStep = async () => {
    if (step === 0) {
      const valid = await trigger('name')
      if (valid) updateStep(1)
    }
  }

  // ── Create project (transition from step 1 → step 2) ──
  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const res = await api.post('/projects', data)
      const project = res.data?.data ?? res.data
      setCreatedProjectId(project.id)
      toast({ title: '¡Proyecto creado!', description: `"${data.name}" fue creado. Ahora podés cargar tu SQL.` })
      updateStep(2, project.id)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const firstError = err?.response?.data?.errors
        ? Object.values(err.response.data.errors)[0]?.[0]
        : err?.response?.data?.message
      toast({
        title: 'Error al crear el proyecto',
        description: firstError ?? 'Ocurrió un error inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ── SQL file handling ──
  const validateFile = (f: File): boolean => {
    const isSql = f.name.toLowerCase().endsWith('.sql')
    if (!isSql) {
      toast({ title: 'Archivo inválido', description: 'Solo se aceptan archivos .sql', variant: 'destructive' })
      return false
    }
    if (f.size > 10 * 1024 * 1024) {
      toast({ title: 'Archivo muy grande', description: 'El archivo no puede superar los 10 MB.', variant: 'destructive' })
      return false
    }
    return true
  }

  const handleFileSelect = (f: File) => {
    if (!validateFile(f)) return
    setFile(f)
    setParseResult(null)
    setUploadError(null)
    setUploadState('idle')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async () => {
    if (!file || !createdProjectId) return
    setUploadState('uploading')
    setUploadError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('use_ai', useAi ? '1' : '0')

    try {
      const res = await api.post(`/projects/${createdProjectId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      const fileId = res.data.file_id

      // Polling loop: verificar estado cada 3 segundos
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        
        const statusRes = await api.get(`/projects/${createdProjectId}/uploads/${fileId}/status`)
        const data = statusRes.data

        if (data.status === 'processed') {
          setParseResult(data.parse_result)
          setUploadState('done')
          break
        } else if (data.status === 'failed') {
          setUploadError(data.parse_result?.error || 'Error al procesar el esquema.')
          setUploadState('error')
          break
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const msg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors)[0]?.[0]
        : e?.response?.data?.message ?? 'Error al procesar el archivo.'
      setUploadError(msg ?? null)
      setUploadState('error')
    }
  }

  const handleFinish = () => {
    setIsNavigating(true)
    if (uploadState === 'done' && createdProjectId) {
      router.push(`/projects/${createdProjectId}/generate?from=new`)
    } else {
      router.push('/projects')
    }
  }

  const handleBackToProjects = () => {
    setIsNavigating(true)
    router.push('/projects')
  }

  return (
    <>
      {/* Header & Stepper Wrapper (Always strictly 896px) */}
      <div className="max-w-4xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Configurar Nuevo Proyecto</h1>
          <p className="text-zinc-400 text-sm">
            Inicializá una nueva arquitectura de aplicación Laravel subiendo tus definiciones de esquema.
          </p>
        </div>

      {/* Stepper */}
      <div className="w-full self-center mb-10 flex-shrink-0">
        <div className="flex items-center relative w-full">
          {/* Background line */}
          <div 
            className="absolute top-4 h-0.5 bg-zinc-800 -z-10" 
            style={{ left: `${100 / (2 * steps.length)}%`, width: `${100 - 100 / steps.length}%` }} 
          />
          {/* Progress line */}
          <div
            className="absolute top-4 h-0.5 bg-laravel-red -z-10 transition-all duration-500"
            style={{ 
              left: `${100 / (2 * steps.length)}%`, 
              width: `${(step / (steps.length - 1)) * (100 - 100 / steps.length)}%` 
            }}
          />
          {steps.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 transition-all duration-300',
                i < step
                  ? 'bg-[#E31C12] border-[#E31C12] text-white'
                  : i === step
                    ? 'bg-zinc-950 border-[#FF5C50] text-[#FF5C50] shadow-[0_0_0_4px_rgba(255,92,80,0.15)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              )}>
                {i < step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-semibold text-center leading-tight',
                i === step ? 'text-[#FF5C50]' : i < step ? 'text-on-surface' : 'text-zinc-400'
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Content Container (Changes width depending on state) */}
      <div className={cn(step === 2 && uploadState === 'done' ? "flex flex-col max-w-[1600px] mx-auto w-full h-[75vh] min-h-[600px]" : "max-w-4xl mx-auto w-full")}>
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Steps 0 & 1 — Info + Config (card layout) */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step < 2 && (
        <div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

            {/* Card Header */}
            <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-800/30 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-zinc-400" />
              <h2 className="font-headline font-semibold text-on-surface text-base">
                {step === 0 ? 'Información Básica' : 'Configuración del Framework'}
              </h2>
            </div>

            {/* Card Body */}
            <div className="p-8 space-y-8">

              {/* Step 0 — Nombre */}
              {step === 0 && (
                <div className="space-y-2">
                  <label htmlFor="project-name" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Nombre del Proyecto
                  </label>
                  <input
                    id="project-name"
                    placeholder="ecommerce_core_api"
                    maxLength={255}
                    className={cn(
                      'w-full bg-zinc-950 border rounded px-4 py-3 font-mono text-sm text-on-surface placeholder:text-zinc-600',
                      'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors',
                      errors.name ? 'border-error-red' : 'border-zinc-800'
                    )}
                    {...register('name')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleNextStep()
                      }
                    }}
                  />
                  {errors.name && (
                    <p className="text-error-red text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>
              )}

              {/* Step 1 — Configuración */}
              {step === 1 && (
                <>
                  {/* Nombre (readonly resumen) */}
                  <div className="p-4 rounded border border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nombre del Proyecto</p>
                      <p className="font-mono text-sm text-on-surface">{projectName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateStep(0)}
                      className="text-xs text-zinc-400 hover:text-laravel-red transition-colors"
                    >
                      Editar
                    </button>
                  </div>

                  <div className="h-px bg-zinc-800/50" />

                  {/* Versión de Laravel */}
                  <div className="space-y-3">
                    <label htmlFor="laravel-version" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Versión de Laravel
                    </label>
                    <div className="relative">
                      <select
                        id="laravel-version"
                        className={cn(
                          'w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-3',
                          'font-mono text-sm text-on-surface appearance-none',
                          'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors'
                        )}
                        value={selectedVersion}
                        onChange={(e) => setValue('laravel_version', e.target.value as '10' | '11' | '12', { shouldValidate: true })}
                      >
                        {laravelVersions.map((v) => (
                          <option key={v.value} value={v.value}>{v.label} — {v.note}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">▼</div>
                    </div>
                    {errors.laravel_version && (
                      <p className="text-error-red text-xs">{errors.laravel_version.message}</p>
                    )}
                  </div>

                  {/* Tipo de instalación */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Scaffolding y Paquetes
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {installationTypes.map((t) => (
                        <label
                          key={t.value}
                          className={cn(
                            'relative flex items-start p-4 cursor-pointer rounded border bg-zinc-950',
                            'hover:border-zinc-600 transition-colors',
                            selectedType === t.value
                              ? 'border-laravel-red bg-laravel-red/5'
                              : 'border-zinc-700'
                          )}
                        >
                          <div className="flex items-center h-5">
                            <input
                              type="radio"
                              id={`installation-type-${t.value}`}
                              aria-label={t.label}
                              className="w-4 h-4 text-laravel-red bg-zinc-900 border-zinc-600 focus:ring-laravel-red focus:ring-offset-zinc-950"
                              checked={selectedType === t.value}
                              onChange={() => setValue('installation_type', t.value as 'default' | 'breeze' | 'jetstream', { shouldValidate: true })}
                            />
                          </div>
                          <div className="ms-3">
                            <span className="block font-mono text-sm text-on-surface mb-1">{t.label}</span>
                            <span className="block text-xs text-zinc-400">{t.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.installation_type && (
                      <p className="text-error-red text-xs">{errors.installation_type.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Card Footer */}
            <div className="px-8 py-5 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
              {step === 0 ? (
                <button
                  type="button"
                  onClick={handleBackToProjects}
                  disabled={isNavigating}
                  className="flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium px-4 py-2 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                  Volver
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateStep(0)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium px-4 py-2 rounded hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>
              )}

              {step === 0 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center gap-2 bg-[#E31C12] text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSubmit(onSubmit)()}
                  className="flex items-center gap-2 bg-[#E31C12] text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Creando...</>
                  ) : (
                    <>Siguiente<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Step 2 — Carga de Origen SQL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        uploadState === 'done' && parseResult ? (
          <>
            {/* Dashboard Schema View (Matching Mockup) */}
            <div className="flex items-end justify-between mb-6 flex-shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    Paso 3: Carga SQL
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-laravel-red/10 border border-laravel-red/20 text-laravel-red text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Procesamiento IA Completado
                  </span>
                </div>
                <h2 className="font-headline text-3xl font-bold text-on-surface">Vista Previa del Esquema de Entidades</h2>
                <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
                  Revise las tablas y relaciones detectadas a partir de su prompt. La IA ha sugerido asignaciones óptimas de claves foráneas resaltadas a continuación.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setFile(null); setParseResult(null); setUploadState('idle'); }}
                  className="flex items-center gap-2 text-zinc-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  Cambiar Archivo
                </button>
                <button 
                  onClick={handleFinish}
                  disabled={isNavigating}
                  className="flex items-center gap-2 bg-[#E31C12] text-white text-sm font-bold px-5 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
                >
                  {isNavigating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Cargando...</>
                  ) : (
                    <>Continuar a la Generación<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>

            {/* 2-Column Layout */}
            <div className="flex-1 min-h-0 flex gap-6">
              {/* Left: Entities List */}
              <div className="w-[320px] bg-[#18181B] border border-zinc-800 rounded-xl flex flex-col overflow-hidden flex-shrink-0">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                  <h3 className="font-headline font-semibold text-on-surface flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-zinc-400" />
                    Entidades Detectadas
                  </h3>
                  <div className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-300">
                    {parseResult.raw_table_count} Tablas
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {parseResult.tables.map((table) => (
                    <TableCard key={table.name} table={table} />
                  ))}
                </div>
              </div>

              {/* Right: React Flow Diagram or JSON */}
              <div className="flex-1 bg-[#09090B] border border-zinc-800 rounded-xl flex flex-col overflow-hidden relative">
                <div className="absolute top-4 left-4 z-10 flex bg-[#18181B] rounded-lg p-1 border border-zinc-800">
                  <button 
                    onClick={() => setSchemaViewMode('visual')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                      schemaViewMode === 'visual' ? "bg-zinc-800 text-on-surface" : "text-zinc-400 hover:text-on-surface"
                    )}
                  >
                    Gráfico Visual
                  </button>
                  <button 
                    onClick={() => setSchemaViewMode('json')}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                      schemaViewMode === 'json' ? "bg-zinc-800 text-on-surface" : "text-zinc-400 hover:text-on-surface"
                    )}
                  >
                    Esquema JSON
                  </button>
                </div>
                
                {schemaViewMode === 'visual' ? (
                  <SchemaDiagram result={parseResult} />
                ) : (
                  <div className="w-full h-full bg-[#09090B] rounded-lg overflow-hidden">
                    <div className="p-4 pt-16 h-full overflow-y-auto custom-scrollbar">
                      <pre className="text-xs font-mono text-zinc-300">
                        {JSON.stringify(parseResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Card Header */}
              <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <h2 className="font-headline font-semibold text-on-surface text-base">Carga de Origen SQL</h2>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-8">
                {/* Project summary */}
                <div className="p-4 rounded border border-zinc-800 bg-zinc-950/50 flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Proyecto</p>
                    <p className="font-mono text-sm text-on-surface">{projectName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-400 bg-zinc-950 border border-zinc-700 px-2 py-0.5 rounded">
                      Laravel {selectedVersion}.x
                    </span>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm mb-6">
                  Subí tu dump SQL o exportación de MySQL. Nuestro parser extraerá tablas, columnas y relaciones automáticamente.
                </p>

                <div className="grid gap-6 grid-cols-1">
                  {/* Drop Zone */}
                  <div
                    onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && inputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-all duration-200',
                      file ? 'cursor-default' : 'cursor-pointer',
                      dragging
                        ? 'border-laravel-red bg-laravel-red/5'
                        : file
                          ? 'border-zinc-700 bg-zinc-950'
                          : 'border-zinc-700 bg-zinc-950 hover:border-laravel-red hover:bg-zinc-900/50'
                    )}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".sql"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(f)
                      }}
                    />

                    {!file ? (
                      <>
                        <div className={cn(
                          'w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 transition-all duration-200',
                          dragging ? 'border-laravel-red/50 scale-110' : ''
                        )}>
                          <Upload className={cn('w-8 h-8', dragging ? 'text-laravel-red' : 'text-zinc-500')} />
                        </div>
                        <h3 className="font-headline font-semibold text-on-surface mb-2 text-base">Arrastrá tu archivo SQL aquí</h3>
                        <p className="text-zinc-400 text-sm mb-5 max-w-xs">
                          Soportado: dumps MySQL, MariaDB (.sql). Máximo 10 MB.
                        </p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                          className="bg-zinc-800 text-on-surface text-sm font-medium px-5 py-2 rounded border border-zinc-700 hover:bg-zinc-700 transition-colors"
                        >
                          Buscar Archivos
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <File className="w-8 h-8 text-laravel-red flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-mono text-sm text-on-surface truncate">{file.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); setUploadState('idle') }}
                          className="text-zinc-400 hover:text-error-red transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {uploadState === 'error' && uploadError && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-error-red/10 border border-error-red/20">
                      <AlertCircle className="w-4 h-4 text-error-red flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-error-red">{uploadError}</p>
                    </div>
                  )}

                  {/* AI Toggle */}
                  {file && uploadState !== 'done' && (
                    <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-800 bg-zinc-950">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-laravel-red" />
                          Análisis con Inteligencia Artificial
                        </span>
                        <span className="text-xs text-zinc-400 mt-0.5">
                          Normaliza nombres y detecta relaciones ocultas automáticamente.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUseAi(!useAi)
                        }}
                        disabled={uploadState === 'uploading'}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-laravel-red focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50",
                          useAi ? "bg-laravel-red" : "bg-zinc-700"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            useAi ? "translate-x-6" : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  )}

                  {/* Upload Button */}
                  {file && uploadState !== 'done' && (
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploadState === 'uploading'}
                      className="flex items-center justify-center gap-2 w-full bg-[#E31C12] text-white text-sm font-bold py-3 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
                    >
                      {uploadState === 'uploading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{useAi ? 'Analizando esquema con Inteligencia Artificial...' : 'Procesando esquema...'}</>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Procesar Esquema
                        </>
                      )}
                    </button>
                  )}

                  <p className="text-xs text-zinc-600 text-center">
                    Soportado: .sql · Máx. 10 MB
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-8 py-5 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
                {/* Skip / later */}
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isNavigating}
                  className="flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium px-4 py-2 rounded hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
                  {isNavigating ? 'Cargando...' : 'Omitir por ahora'}
                </button>
              </div>
            </div>
          </div>
        )
      )}
      </div>
    </>
  )
}
