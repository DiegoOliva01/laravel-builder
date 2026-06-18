'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      // Guardamos el token en localStorage, que es lo que espera AuthContext
      localStorage.setItem('auth_token', token)
      // Usamos replace en lugar de href para no ensuciar el historial de navegación
      // y obligamos a recargar la página para que AuthContext inicialice bien
      window.location.replace('/dashboard')
    } else {
      router.push('/login?error=no_token')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-400">
      <Loader2 className="w-8 h-8 animate-spin text-laravel-red" />
      <p>Completando inicio de sesión...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-laravel-red" /></div>}>
      <CallbackContent />
    </Suspense>
  )
}
