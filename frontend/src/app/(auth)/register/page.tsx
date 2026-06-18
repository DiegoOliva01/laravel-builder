'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Ingresá un email válido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/\d/, 'Debe contener al menos un número'),
  password_confirmation: z.string(),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Las contraseñas no coinciden',
  path: ['password_confirmation'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const response = await api.post('/register', data)
      login(response.data.token, response.data.user.data ?? response.data.user)
      router.push('/dashboard')
    } catch (error) {
      const err = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string }; status?: number }; message?: string; code?: string }
      let description: string
      if (!err.response) {
        description = 'No se pudo conectar con el servidor (Problema de red o servidor caído). Verifica tus logs de Render.'
      } else if (err.response.data && err.response.data.message) {
        description = err.response.data.message
      } else if (err.response.status === 500) {
        description = 'Error interno del servidor. Verifica los logs de Render para más detalles.'
      } else {
        const msg = err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err?.response?.data?.message ?? 'Ocurrió un error inesperado.'
        description = msg
      }
      toast({ title: 'Error en el registro', description, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const fieldClass = (hasError: boolean) => cn(
    'w-full bg-zinc-950 border rounded px-4 py-3 text-sm text-on-surface placeholder:text-zinc-600',
    'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors',
    hasError ? 'border-error-red' : 'border-zinc-800'
  )

  return (
    <main className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="hero-glow" />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-laravel-red" />
          </div>
          <span className="font-headline text-xl font-bold text-laravel-red">LaravelGen</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Crear cuenta</h1>
          <p className="text-zinc-400 text-sm mb-7">Empezá a generar proyectos Laravel con IA</p>

          {/* FORMULARIO DE REGISTRO COMENTADO POR SEGURIDAD
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nombre</label>
              <input id="name" maxLength={255} placeholder="Tu nombre" className={fieldClass(!!errors.name)} {...register('name')} />
              {errors.name && <p className="text-error-red text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
              <input id="reg-email" type="email" maxLength={255} placeholder="tu@email.com" className={fieldClass(!!errors.email)} {...register('email')} />
              {errors.email && <p className="text-error-red text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Contraseña</label>
              <input id="reg-password" type="password" maxLength={255} placeholder="Mín. 8 caracteres" className={fieldClass(!!errors.password)} {...register('password')} />
              {errors.password && <p className="text-error-red text-xs">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password_confirmation" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Confirmar contraseña</label>
              <input id="password_confirmation" type="password" maxLength={255} placeholder="Repetí tu contraseña" className={fieldClass(!!errors.password_confirmation)} {...register('password_confirmation')} />
              {errors.password_confirmation && <p className="text-error-red text-xs">{errors.password_confirmation.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-laravel-red hover:bg-laravel-red-dark text-white font-bold py-3 rounded text-sm transition-colors btn-primary-glow disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando cuenta...
                </span>
              ) : 'Crear cuenta'}
            </button>
          </form>
          */}

          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-lg text-center mb-6">
            <h2 className="text-on-surface font-semibold mb-2">Registro Deshabilitado</h2>
            <p className="text-zinc-400 text-sm">
              El registro con email y contraseña está temporalmente deshabilitado por motivos de seguridad. Por favor, inicia sesión con Google.
            </p>
          </div>

          <div className="mt-4">
            <Link
              href="/login"
              className="w-full flex justify-center bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded text-sm transition-colors"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-laravel-red hover:text-laravel-red-dark font-semibold transition-colors">
              Iniciá sesión
            </Link>
          </p>

          <div className="mt-6 border-t border-zinc-800 pt-4 text-center">
            <Link href="/" className="text-xs text-zinc-400 hover:text-white transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
