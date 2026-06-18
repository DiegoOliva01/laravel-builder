'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FolderOpen, Zap, Clock, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'

export default function DashboardPage() {
  const { user } = useAuth()
  const [projectCount, setProjectCount] = useState<number | null>(null)
  const [generationCount, setGenerationCount] = useState<number | null>(null)
  const [lastProject, setLastProject] = useState<string | null>(null)

  useEffect(() => {
    api.get('/projects').then((res) => {
      const data = res.data?.data ?? res.data
      const items = Array.isArray(data) ? data : []
      setProjectCount(items.length)
      if (items.length > 0) {
        const last = items[0]
        const date = new Date(last.created_at).toLocaleDateString('es-AR', {
          day: '2-digit', month: 'short',
        })
        setLastProject(date)
      }
    }).catch(() => {
      setProjectCount(0)
    })

    api.get('/generations').then((res) => {
      const gens = res.data?.generations ?? []
      setGenerationCount(gens.length)
    }).catch(() => {
      setGenerationCount(0)
    })
  }, [])

  const stats = [
    {
      label: 'Proyectos creados',
      value: projectCount === null ? '—' : String(projectCount),
      icon: FolderOpen,
      color: 'text-laravel-red',
      bg: 'bg-laravel-red/10',
      border: 'border-laravel-red/20',
    },
    {
      label: 'Generaciones realizadas',
      value: generationCount === null ? '—' : String(generationCount),
      icon: Zap,
      color: generationCount && generationCount > 0 ? 'text-laravel-red' : 'text-zinc-400',
      bg: generationCount && generationCount > 0 ? 'bg-laravel-red/10' : 'bg-zinc-800/50',
      border: generationCount && generationCount > 0 ? 'border-laravel-red/20' : 'border-zinc-700',
    },
    {
      label: 'Última actividad',
      value: lastProject ?? 'Nunca',
      icon: Clock,
      color: 'text-zinc-400',
      bg: 'bg-zinc-800/50',
      border: 'border-zinc-700',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-1">
          Hola, <span className="text-laravel-red">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-zinc-400 text-sm">
          Generá proyectos Laravel completos desde tu esquema SQL o diagrama DER.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-zinc-900 border ${stat.border} rounded-xl p-5 card-base-hover`}>
            <div className={`w-9 h-9 rounded-lg ${stat.bg} border ${stat.border} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="font-headline text-2xl font-bold text-on-surface">{stat.value}</p>
            <p className="text-sm text-zinc-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/projects/new"
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-4 group cursor-pointer card-base-hover"
          >
            <div className="w-12 h-12 rounded-xl bg-laravel-red/10 border border-laravel-red/20 flex items-center justify-center flex-shrink-0 group-hover:bg-laravel-red/15 transition-colors">
              <Plus className="w-5 h-5 text-laravel-red" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-surface">Nuevo proyecto</p>
              <p className="text-sm text-zinc-400 mt-0.5">Configurá y generá tu proyecto Laravel</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-laravel-red transition-colors flex-shrink-0" />
          </Link>

          <Link
            href="/projects"
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex items-center gap-4 group cursor-pointer card-base-hover"
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-800 transition-colors">
              <FolderOpen className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-on-surface">Mis proyectos</p>
              <p className="text-sm text-zinc-400 mt-0.5">Gestioná tus generaciones anteriores</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
