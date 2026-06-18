'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Upload, File, X, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Check,
  Terminal, Key, Link as LinkIcon, AlertCircle, ChevronDown, ChevronRight, Database, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SqlParseResult, ParsedTable, ParsedColumn } from '@/lib/types'
import SchemaDiagram from '@/components/diagram/SchemaDiagram'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

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
      <span className="font-mono text-xs text-zinc-500 truncate max-w-[120px]">
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
          {open ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
          {table.name}
        </div>
        <span className="text-xs text-zinc-500">{table.columns.length} cols</span>
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

export default function UploadSqlPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const { toast } = useToast()

  const [state, setState] = useState<UploadState>('idle')
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<SqlParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useAi, setUseAi] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleContinue = () => {
    setIsNavigating(true)
    router.push(`/projects/${projectId}/generate`)
  }

  const handleBackToProjects = () => {
    setIsNavigating(true)
    router.push('/projects')
  }

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
    setResult(null)
    setError(null)
    setState('idle')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setState('uploading')
    setError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('use_ai', useAi ? '1' : '0')

    try {
      // 1. Iniciar la subida (devuelve 202 Accepted y pasa a background job)
      const uploadRes = await api.post(`/projects/${projectId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      const fileId = uploadRes.data.file_id

      // 2. Polling loop: verificar estado cada 3 segundos
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        
        const statusRes = await api.get(`/projects/${projectId}/uploads/${fileId}/status`)
        const data = statusRes.data

        if (data.status === 'processed') {
          setResult(data.parse_result)
          setState('done')
          break
        } else if (data.status === 'failed') {
          setError(data.parse_result?.error || 'Error al procesar el esquema.')
          setState('error')
          break
        }
        // Si es 'pending' o 'processing', continua el loop
      }

    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const msg = e?.response?.data?.errors
        ? Object.values(e.response.data.errors)[0]?.[0]
        : e?.response?.data?.message ?? 'Error de conexión o timeout.'
      setError(msg ?? null)
      setState('error')
    }
  }

  const steps = ['Información Básica', 'Configuración', 'Carga de Origen', 'Generación']
  const step = 2

  return (
    <>
      <div className="max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Carga de Origen SQL</h1>
          <p className="text-zinc-400 text-sm">
            Sube tu esquema de base de datos (.sql) para comenzar con la generación de tu proyecto.
          </p>
        </div>
      
      {/* Stepper */}
      <div className="w-full self-center mb-10 flex-shrink-0">
        <div className="flex items-center relative w-full">
          <div 
            className="absolute top-4 h-0.5 bg-zinc-800 -z-10" 
            style={{ left: `${100 / (2 * steps.length)}%`, width: `${100 - 100 / steps.length}%` }} 
          />
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
                  ? 'bg-laravel-red border-laravel-red text-white'
                  : i === step
                    ? 'bg-zinc-950 border-laravel-red text-laravel-red shadow-[0_0_0_4px_rgba(255,45,32,0.15)]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
              )}>
                {i < step ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              <span className={cn(
                'text-xs font-semibold text-center leading-tight',
                i === step ? 'text-laravel-red' : i < step ? 'text-on-surface' : 'text-zinc-500'
              )}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>

      <div className={cn(state === 'done' ? "flex flex-col max-w-[1600px] mx-auto w-full h-[75vh] min-h-[600px]" : "max-w-4xl mx-auto w-full")}>
      {state === 'done' && result ? (
        <>
          {/* Dashboard Schema View (Matching Mockup) */}
          <div className="flex items-end justify-between mb-6 flex-shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  Paso 1: Análisis Completado
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-laravel-red/10 border border-laravel-red/20 text-laravel-red text-xs font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Procesamiento Completado
                </span>
              </div>
              <h2 className="font-headline text-3xl font-bold text-on-surface">Vista Previa del Esquema de Entidades</h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
                Revise las tablas y relaciones detectadas. El analizador ha mapeado automáticamente las entidades y sus llaves foráneas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setFile(null); setResult(null); setState('idle'); }}
                className="flex items-center gap-2 text-zinc-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded border border-zinc-700 hover:bg-zinc-800 transition-colors"
              >
                Cambiar Archivo
              </button>
              <button 
                onClick={handleContinue}
                disabled={isNavigating}
                className="flex items-center gap-2 bg-laravel-red text-white text-sm font-bold px-5 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
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
            {/* Left: Entities List & Recommendations */}
            <div className="w-[320px] bg-[#18181B] border border-zinc-800 rounded-xl flex flex-col overflow-hidden flex-shrink-0">
              
              {result.architecture_recommendations && result.architecture_recommendations.length > 0 && (
                <div className="p-4 border-b border-zinc-800 bg-laravel-red/5">
                  <h3 className="font-headline font-semibold text-laravel-red flex items-center gap-2 text-sm mb-3">
                    <Sparkles className="w-4 h-4" />
                    Recomendaciones IA
                  </h3>
                  <ul className="space-y-2">
                    {result.architecture_recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                        <span className="text-laravel-red mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
                <h3 className="font-headline font-semibold text-on-surface flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4 text-zinc-400" />
                  Entidades Detectadas
                </h3>
                <div className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-300">
                  {result.raw_table_count} Tablas
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {result.tables.map((table) => (
                  <TableCard key={table.name} table={table} />
                ))}
              </div>
            </div>

            {/* Right: React Flow Diagram */}
            <div className="flex-1 bg-[#09090B] border border-zinc-800 rounded-xl flex flex-col overflow-hidden relative">
              <div className="absolute top-4 left-4 z-10 flex bg-[#18181B] rounded-lg p-1 border border-zinc-800">
                <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-zinc-800 text-on-surface">
                  Gráfico Visual
                </button>
                <button className="px-4 py-1.5 text-sm font-medium rounded-md text-zinc-400 hover:text-on-surface">
                  Esquema JSON
                </button>
              </div>
              <SchemaDiagram result={result} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Back Link */}
          <div className="mb-6">
            <button 
              onClick={handleBackToProjects} 
              disabled={isNavigating} 
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isNavigating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              Volver a proyectos
            </button>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
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
                      ? 'border-zinc-700 bg-[#18181B]'
                      : 'border-zinc-700 bg-[#18181B] hover:border-laravel-red hover:bg-zinc-900/50'
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
                      dragging ? 'border-laravel-red/50 scale-110' : 'group-hover:border-laravel-red/50'
                    )}>
                      <Upload className={cn('w-8 h-8', dragging ? 'text-laravel-red' : 'text-zinc-500')} />
                    </div>
                    <h4 className="font-headline font-semibold text-on-surface mb-2">Arrastrá tu archivo SQL aquí</h4>
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
                      <p className="text-xs text-zinc-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); setState('idle') }}
                      className="text-zinc-500 hover:text-error-red transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Error */}
              {state === 'error' && error && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-error-red/10 border border-error-red/20">
                  <AlertCircle className="w-4 h-4 text-error-red flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-error-red">{error}</p>
                </div>
              )}

              {/* AI Toggle */}
              {file && state !== 'done' && (
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
                    disabled={state === 'uploading'}
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
              {file && state !== 'done' && (
                <button
                  onClick={handleUpload}
                  disabled={state === 'uploading'}
                  className="flex items-center justify-center gap-2 w-full bg-laravel-red text-white text-sm font-bold py-3 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
                >
                  {state === 'uploading' ? (
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
        </>
      )}
      </div>
    </>
  )
}
