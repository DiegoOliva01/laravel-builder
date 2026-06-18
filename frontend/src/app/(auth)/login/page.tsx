'use client'

import { useState, useEffect } from 'react'
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
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { login, user, isLoading: authLoading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const response = await api.post('/login', data)
      login(response.data.token, response.data.user.data ?? response.data.user)
      router.push('/dashboard')
    } catch (error) {
      const err = error as { response?: { data?: { message?: string }; status?: number }; code?: string }
      let description: string
      if (!err.response) {
        description = 'No se pudo conectar con el servidor (Problema de red o servidor caído). Verifica tus logs de Render.'
      } else if (err.response.data && err.response.data.message) {
        description = err.response.data.message
      } else if (err.response.status === 500) {
        description = 'Error interno del servidor. Verifica los logs de Render para más detalles.'
      } else {
        description = err?.response?.data?.message ?? 'Credenciales inválidas.'
      }
      toast({
        title: 'Error al iniciar sesión',
        description,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (token) {
        setShowLogoutModal(true)
      } else {
        setShowLogoutModal(false)
      }
    }

    checkAuth()

    window.addEventListener('pageshow', checkAuth)
    return () => window.removeEventListener('pageshow', checkAuth)
  }, [])

  if (showLogoutModal) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Usamos un fondo oscuro sólido para simular que no estamos en el login */}
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full shadow-2xl mx-4">
            <h3 className="font-headline text-xl font-bold text-on-surface mb-2">¿Cerrar sesión?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Estás intentando volver a la pantalla de inicio de sesión. ¿Deseas cerrar tu sesión actual?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  // Si el usuario cancela, lo obligamos a avanzar al dashboard nuevamente
                  window.history.forward()
                  
                  // Respaldo manual en caso de que forward falle (ej: entraron por URL directa)
                  setTimeout(() => {
                    if (window.location.pathname === '/login') {
                      router.replace('/dashboard')
                    }
                  }, 150)
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false)
                  logout()
                }}
                className="flex-1 bg-laravel-red hover:bg-laravel-red-dark text-white font-bold py-3 rounded text-sm transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="hero-glow" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-laravel-red" />
          </div>
          <span className="font-headline text-xl font-bold text-laravel-red">LaravelGen</span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Bienvenido de vuelta</h1>
          <p className="text-zinc-400 text-sm mb-7">Iniciá sesión para continuar generando proyectos Laravel.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                maxLength={255}
                placeholder="tu@email.com"
                className={cn(
                  'w-full bg-zinc-950 border rounded px-4 py-3 text-sm text-on-surface placeholder:text-zinc-600',
                  'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors',
                  errors.email ? 'border-error-red' : 'border-zinc-800'
                )}
                {...register('email')}
              />
              {errors.email && <p className="text-error-red text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                maxLength={255}
                placeholder="••••••••"
                className={cn(
                  'w-full bg-zinc-950 border rounded px-4 py-3 text-sm text-on-surface placeholder:text-zinc-600',
                  'focus:outline-none focus:border-laravel-red focus:ring-1 focus:ring-laravel-red transition-colors',
                  errors.password ? 'border-error-red' : 'border-zinc-800'
                )}
                {...register('password')}
              />
              {errors.password && <p className="text-error-red text-xs">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-laravel-red hover:bg-laravel-red-dark text-white font-bold py-3 rounded text-sm transition-colors btn-primary-glow disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-laravel-red hover:text-laravel-red-dark font-semibold transition-colors">
              Registrate
            </Link>
          </p>

          <p className="text-center text-[11px] text-zinc-500 mt-2">
            Al continuar, aceptas nuestros términos y condiciones.
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
