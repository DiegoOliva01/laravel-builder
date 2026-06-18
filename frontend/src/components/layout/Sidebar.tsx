'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  History,
  LogOut,
  Terminal,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

const navigation = [
  { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mis Proyectos', href: '/projects', icon: FolderOpen },
  { name: 'Historial', href: '/history', icon: History },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-zinc-900 border-r border-zinc-800 flex flex-col py-6 px-4 z-50" aria-label="Navegación principal">
      {/* Logo */}
      <div className="mb-8 px-2 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
          <Terminal className="w-4 h-4 text-laravel-red" />
        </div>
        <div>
          <span className="font-headline text-base font-bold text-laravel-red leading-tight">LaravelGen</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5" aria-label="Menú principal">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative',
                active
                  ? 'bg-zinc-800/50 text-white font-bold border-r-2 border-laravel-red'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-on-surface'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>



      {/* User */}
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{user?.name}</p>
            <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-on-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline">¿Cerrar sesión?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                ¿Estás seguro de que deseas cerrar tu sesión actual?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={logout}
                className="bg-laravel-red hover:bg-laravel-red-dark text-white"
              >
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  )
}
