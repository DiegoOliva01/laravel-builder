'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 })
  const [isHovering, setIsHovering] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isDashboard = pathname?.startsWith('/projects') || pathname?.startsWith('/history')
    const particleCount = isDashboard ? 35 : 100

    let width = 0
    let height = 0
    let particles: Particle[] = []

    let mouse = {
      x: -1000,
      y: -1000
    }

    const colors = [
      'rgba(255, 45, 32, 0.6)',  // Laravel Red
      'rgba(255, 110, 40, 0.5)', // Orange
      'rgba(255, 255, 255, 0.4)', // White spark
      'rgba(255, 85, 66, 0.5)'   // Coral
    ]

    function resize() {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    const handleResize = () => resize()
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      setMousePos({ x: e.clientX, y: e.clientY })
      setIsHovering(true)
    }
    
    const handleMouseLeave = () => {
      setIsHovering(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if(e.touches.length > 0) {
        mouse.x = e.touches[0].clientX
        mouse.y = e.touches[0].clientY
        setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
        setIsHovering(true)
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('touchmove', handleTouchMove)

    class Particle {
      x: number = 0
      y: number = 0
      size: number = 0
      baseSize: number = 0
      speedX: number = 0
      speedY: number = 0
      color: string = ''
      opacity: number = 0
      currentOpacity: number = 0

      constructor() {
        this.init()
      }

      init() {
        this.x = Math.random() * width
        this.y = Math.random() * height
        this.size = Math.random() * 2 + 1
        this.baseSize = this.size
        this.speedX = (Math.random() - 0.5) * 0.5
        this.speedY = (Math.random() - 0.5) * 0.5
        this.color = colors[Math.floor(Math.random() * colors.length)]
        this.opacity = Math.random() * 0.5 + 0.2
        this.currentOpacity = this.opacity
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        // Wrap around screen
        if (this.x < 0) this.x = width
        if (this.x > width) this.x = 0
        if (this.y < 0) this.y = height
        if (this.y > height) this.y = 0

        // Mouse interactivity (optimized using squared distance check first)
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distSq = dx * dx + dy * dy
        const maxDistance = 150
        const maxDistSq = maxDistance * maxDistance

        if (distSq < maxDistSq) {
          const distance = Math.sqrt(distSq)
          const force = (maxDistance - distance) / maxDistance
          
          // Subtle attraction
          this.x += dx * force * 0.02
          this.y += dy * force * 0.02
          
          // Increase size and opacity
          this.size = this.baseSize + (force * 2)
          this.currentOpacity = Math.min(isDashboard ? 0.6 : 0.8, this.opacity + force)
        } else {
          this.size = this.baseSize
          this.currentOpacity = this.opacity
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        const colorWithAlpha = this.color.replace(/[^,]+(?=\))/, this.currentOpacity.toString())
        ctx.fillStyle = colorWithAlpha
        ctx.fill()
        
        // Simular brillo de forma eficiente usando un círculo concéntrico en vez de shadowBlur
        if (this.size > this.baseSize) {
          ctx.beginPath()
          ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2)
          const glowColor = this.color.replace(/[^,]+(?=\))/, (this.currentOpacity * 0.15).toString())
          ctx.fillStyle = glowColor
          ctx.fill()
        }
      }
    }

    function createParticles() {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    let animationFrameId: number

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      
      particles.forEach(p => {
        p.update()
        p.draw()
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    resize()
    createParticles()
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('touchmove', handleTouchMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [pathname])

  return (
    <>
      {/* Mouse Glow Effect */}
      <div 
        aria-hidden="true"
        className="fixed pointer-events-none z-[1] rounded-full transition-opacity duration-500"
        style={{
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255, 45, 32, 0.08) 0%, rgba(255, 45, 32, 0) 70%)',
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: 'translate(-50%, -50%)',
          opacity: isHovering ? 1 : 0
        }}
      />
      {/* Particle Background */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none"
        aria-hidden="true"
      />
    </>
  )
}
