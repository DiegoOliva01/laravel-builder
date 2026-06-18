import Link from 'next/link'
import {
  Zap,
  Database,
  Brain,
  Download,
  Sparkles,
  GitBranch,
  Layers,
  Terminal as TerminalIcon,
  ShieldCheck
} from 'lucide-react'

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen relative z-10 selection:bg-laravel-red selection:text-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
        <nav className="max-w-[1280px] mx-auto h-16 px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-laravel-red font-headline text-xl font-bold tracking-tighter">LaravelGen</span>
          </div>
          <div className="flex items-center gap-8">
            <Link 
              className="hidden md:block font-label text-xs tracking-wider text-zinc-400 hover:text-laravel-red transition-colors" 
              href="https://github.com"
              target="_blank"
            >
              Documentación
            </Link>
            <Link 
              className="px-6 py-2 border border-zinc-800 bg-zinc-900 rounded-lg font-label text-xs tracking-wider text-zinc-100 hover:border-laravel-red hover:text-white transition-all active:scale-95" 
              href="/login"
            >
              Ingresar
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-16 overflow-hidden px-6 md:px-12 flex justify-center">
        <div className="hero-glow" aria-hidden="true" />
        
        <div className="relative z-10 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-laravel-red/10 border border-laravel-red/20 mb-8">
            <Zap className="w-4 h-4 text-laravel-red" aria-hidden="true" />
            <span className="font-label text-[10px] uppercase tracking-widest text-laravel-red font-semibold">
              Potenciado por Modelos de Lenguaje Avanzados
            </span>
          </div>
          
          <h1 className="font-headline text-4xl md:text-6xl leading-[1.1] mb-6 tracking-tight text-on-surface">
            Generá proyectos Laravel completos en <span className="text-laravel-red">segundos</span> con <span className="gradient-text">Inteligencia Artificial</span>
          </h1>
          
          <p className="font-body text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed text-sm md:text-base">
            Transformá esquemas SQL o dumps MySQL en una estructura profesional de Laravel: modelos, migraciones, controladores y APIs listas para producción.
          </p>
        </div>
      </section>

      {/* Cómo Funciona */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 max-w-[1280px] mx-auto relative z-10 scroll-mt-16">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl font-bold mb-4 text-on-surface">El flujo de trabajo definitivo</h2>
          <p className="font-body text-zinc-400 text-sm md:text-base">De la idea al código en tres simples pasos.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card-base p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 text-laravel-red">
              <Database className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="font-headline text-lg font-semibold mb-3 text-on-surface">1. Carga tu origen</h3>
            <p className="font-body text-sm text-zinc-400 leading-relaxed">
              Sube tu archivo SQL o dump de base de datos MySQL para analizar la estructura de forma directa.
            </p>
          </div>
          <div className="card-base p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 text-laravel-red">
              <Brain className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="font-headline text-lg font-semibold mb-3 text-on-surface">2. Procesamiento IA</h3>
            <p className="font-body text-sm text-zinc-400 leading-relaxed">
              Nuestra IA analiza las relaciones, detecta tipos de datos óptimos y diseña la arquitectura siguiendo las mejores prácticas de Laravel.
            </p>
          </div>
          <div className="card-base p-8 rounded-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 text-laravel-red">
              <Download className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="font-headline text-lg font-semibold mb-3 text-on-surface">3. Descarga el código</h3>
            <p className="font-body text-sm text-zinc-400 leading-relaxed">
              Obtén un repositorio ZIP listo con todo el boilerplate funcional, limpio y configurado para tu base de datos.
            </p>
          </div>
        </div>
      </section>

      {/* Características (Bento Grid) */}
      <section className="py-24 bg-zinc-950/50 border-y border-zinc-900 px-6 md:px-12 relative z-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="font-headline text-3xl font-bold mb-2 text-on-surface">Diseñado para desarrolladores senior</h2>
              <p className="font-body text-zinc-400 text-sm md:text-base">No es solo código, es código de calidad profesional.</p>
            </div>
            <div className="flex gap-4">
              <span className="px-4 py-1.5 rounded bg-zinc-900 border border-zinc-850 text-xs font-semibold text-zinc-400">
                Laravel 10, 11 & 12
              </span>
              <span className="px-4 py-1.5 rounded bg-zinc-900 border border-zinc-850 text-xs font-semibold text-zinc-400">
                REST APIs
              </span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 md:grid-rows-2 gap-4">
            <div className="md:col-span-2 md:row-span-2 card-base rounded-2xl p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <Sparkles className="w-10 h-10 text-laravel-red" aria-hidden="true" />
                <h3 className="font-headline text-2xl font-bold text-on-surface">Relaciones inteligentes</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Detectamos automáticamente relaciones One-to-Many, Many-to-Many y Polimórficas basándonos en los nombres de las tablas y campos. El motor de LaravelGen escribe los métodos hasMany() y belongsTo() por vos.
                </p>
              </div>
              <div className="mt-8 border-t border-zinc-900 pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-850 flex items-center justify-center text-laravel-red">
                    <GitBranch className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Mapeo de Atributos</p>
                    <p className="text-[10px] text-zinc-400 font-mono">100% Precisión en Foreign Keys</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 card-base rounded-2xl p-8 flex items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="font-headline text-lg font-semibold mb-2 text-on-surface">Clean Architecture</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Estructura basada en Services, Repositories y FormRequests para mantener tu código modular, escalable y mantenible.
                </p>
              </div>
              <div className="hidden sm:block text-zinc-800">
                <Layers className="w-16 h-16" aria-hidden="true" />
              </div>
            </div>
            
            <div className="card-base rounded-2xl p-8 flex flex-col justify-center items-center text-center group">
              <TerminalIcon className="w-8 h-8 text-laravel-red mb-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <h4 className="font-label text-xs uppercase tracking-widest font-bold text-zinc-200">APIs Listas</h4>
            </div>
            
            <div className="card-base rounded-2xl p-8 flex flex-col justify-center items-center text-center group">
              <ShieldCheck className="w-8 h-8 text-laravel-red mb-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
              <h4 className="font-label text-xs uppercase tracking-widest font-bold text-zinc-200">Auth Incluida</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 border-t border-zinc-900 relative z-10 bg-zinc-950">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="text-laravel-red font-headline text-lg font-bold">LaravelGen</div>
            <p className="font-body text-xs text-zinc-400 text-center md:text-left">
              © {new Date().getFullYear()} LaravelGen Engine. Potenciando la productividad de desarrolladores PHP.
            </p>
          </div>

        </div>
      </footer>
    </main>
  )
}
