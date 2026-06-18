'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Loader2, Check, Terminal } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(255),
  laravel_version: z.enum(['10', '11', '12'], { required_error: 'Seleccioná una versión' }),
  installation_type: z.enum(['default', 'breeze', 'jetstream'], { required_error: 'Seleccioná un tipo' }),
})

type FormData = z.infer<typeof schema>

const laravelVersions = [
  { value: '12', label: 'Laravel 12.x', note: 'Versión más reciente' },
  { value: '11', label: 'Laravel 11.x', note: 'Soporte a largo plazo' },
  { value: '10', label: 'Laravel 10.x', note: 'Versión estable' },
]

const installationTypes = [
  { value: 'default', label: 'Instalación Base', description: 'Laravel sin starter kits. Ideal para APIs puras.' },
  { value: 'breeze', label: 'Laravel Breeze', description: 'Auth básico con Blade o Inertia. Liviano y simple.' },
  { value: 'jetstream', label: 'Laravel Jetstream', description: 'Auth completo con equipos, 2FA y más.' },
]

const steps = ['Información Básica', 'Configuración del Framework', 'Carga de Origen']

export default function EditProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      laravel_version: '12',
      installation_type: 'default',
    },
  })

  const selectedVersion = watch('laravel_version')
  const selectedType = watch('installation_type')
  const projectName = watch('name')

  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then((res) => {
        const p = res.data?.data ?? res.data
        reset({
          name: p.name,
          laravel_version: p.laravel_version,
          installation_type: p.installation_type,
        })
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'No se pudo cargar el proyecto.',
          variant: 'destructive',
        })
      })
      .finally(() => setIsFetching(false))
  }, [projectId])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await api.put(`/projects/${projectId}`, data)
      toast({ title: 'Proyecto actualizado', description: `"${data.name}" fue actualizado correctamente.` })
      router.push('/projects')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const firstError = err?.response?.data?.errors
        ? Object.values(err.response.data.errors)[0]?.[0]
        : err?.response?.data?.message
      toast({
        title: 'Error al actualizar',
        description: firstError ?? 'Ocurrió un error inesperado.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="h-8 bg-zinc-800 rounded w-64 mb-2 animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-96 animate-pulse" />
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
          <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-800/30 h-16" />
          <div className="p-8 space-y-6">
            <div className="h-12 bg-zinc-800 rounded" />
            <div className="h-12 bg-zinc-800 rounded" />
            <div className="h-24 bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">Editar Proyecto</h1>
        <p className="text-zinc-400 text-sm">
          Modificá la configuración de tu proyecto Laravel.
        </p>
      </div>

      {/* Stepper (paso 1 completado, paso 2 activo) */}
      <div className="flex items-center mb-10 relative">
        <div className="absolute left-0 top-4 w-full h-0.5 bg-zinc-800 -z-10" />
        <div className="absolute left-0 top-4 h-0.5 bg-laravel-red -z-10 transition-all duration-500" style={{ width: '50%' }} />
        {steps.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 transition-all duration-300',
              i === 0
                ? 'bg-laravel-red border-laravel-red text-white'
                : i === 1
                  ? 'bg-zinc-950 border-laravel-red text-laravel-red shadow-[0_0_0_4px_rgba(255,45,32,0.15)]'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500'
            )}>
              {i === 0 ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>
            <span className={cn(
              'text-xs font-semibold text-center leading-tight',
              i === 1 ? 'text-laravel-red' : i === 0 ? 'text-on-surface' : 'text-zinc-500'
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

          {/* Card Header */}
          <div className="px-8 py-5 border-b border-zinc-800 bg-zinc-800/30 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-400" />
            <h3 className="font-headline font-semibold text-on-surface">Configuración del Framework</h3>
          </div>

          {/* Card Body */}
          <div className="p-8 space-y-8">
            {/* Nombre (editable) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Nombre del Proyecto
              </label>
              <input
                placeholder="ecommerce_core_api"
                maxLength={255}
                className={cn(
                  'w-full bg-zinc-950 border rounded px-4 py-3 font-mono text-sm text-on-surface placeholder:text-zinc-600',
                  'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors',
                  errors.name ? 'border-error-red' : 'border-zinc-800'
                )}
                {...register('name')}
              />
              {errors.name && <p className="text-error-red text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div className="h-px bg-zinc-800/50" />

            {/* Versión de Laravel */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Versión de Laravel
              </label>
              <div className="relative">
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-3 font-mono text-sm text-on-surface appearance-none focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors"
                  value={selectedVersion}
                  onChange={(e) => setValue('laravel_version', e.target.value as '10' | '11' | '12', { shouldValidate: true })}
                >
                  {laravelVersions.map((v) => (
                    <option key={v.value} value={v.value}>{v.label} — {v.note}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">▼</div>
              </div>
              {errors.laravel_version && <p className="text-error-red text-xs">{errors.laravel_version.message}</p>}
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
                      'relative flex items-start p-4 cursor-pointer rounded border bg-zinc-950 hover:border-zinc-600 transition-colors',
                      selectedType === t.value ? 'border-laravel-red bg-laravel-red/5' : 'border-zinc-700'
                    )}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="radio"
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
              {errors.installation_type && <p className="text-error-red text-xs">{errors.installation_type.message}</p>}
            </div>
          </div>

          {/* Card Footer */}
          <div className="px-8 py-5 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
            <Link href="/projects">
              <button
                type="button"
                className="flex items-center gap-2 text-zinc-400 hover:text-on-surface text-sm font-medium px-4 py-2 rounded hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancelar
              </button>
            </Link>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-laravel-red text-white text-sm font-bold px-6 py-2.5 rounded hover:bg-laravel-red-dark transition-colors btn-primary-glow disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
              ) : (
                <>Guardar Cambios<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
