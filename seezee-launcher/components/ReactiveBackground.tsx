"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "@/lib/themeContext"

export default function ReactiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const { currentRgb, accentRgb } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const hexRadius = 34
    const hexHeight = Math.sqrt(3) * hexRadius
    const hexWidth = hexRadius * 2
    const horizSpacing = hexRadius * 1.5
    const vertSpacing = hexHeight

    const drawHex = (cx: number, cy: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i
        const x = cx + hexRadius * Math.cos(angle)
        const y = cy + hexRadius * Math.sin(angle)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
    }

    let animationId: number
    const animate = () => {
      ctx.fillStyle = "rgba(8, 10, 14, 0.85)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const time = performance.now() * 0.0003
      const pulse = (Math.sin(time) + 1) / 2
      const lightX = mouseRef.current.active ? mouseRef.current.x : canvas.width * 0.55
      const lightY = mouseRef.current.active ? mouseRef.current.y : canvas.height * 0.45
      const maxDist = Math.min(canvas.width, canvas.height) * 0.6

      // Get theme colors
      const primaryR = currentRgb.r
      const primaryG = currentRgb.g
      const primaryB = currentRgb.b
      const accentR = accentRgb.r
      const accentG = accentRgb.g
      const accentB = accentRgb.b

      for (let x = -hexWidth; x < canvas.width + hexWidth; x += horizSpacing) {
        const colIndex = Math.round(x / horizSpacing)
        for (let y = -hexHeight; y < canvas.height + hexHeight; y += vertSpacing) {
          const cy = y + (colIndex % 2 === 0 ? 0 : vertSpacing / 2)
          const cx = x
          const dist = Math.hypot(cx - lightX, cy - lightY)
          const light = Math.max(0, 1 - dist / maxDist)
          const baseAlpha = 0.04 + pulse * 0.01
          const glowAlpha = baseAlpha + light * 0.08

          // Base hexagon with subtle theme color tint
          ctx.lineWidth = 1
          ctx.shadowBlur = 6
          ctx.shadowColor = "rgba(0,0,0,0)"
          const baseTint = 0.15
          const baseR = 255 * (1 - baseTint) + primaryR * baseTint
          const baseG = 255 * (1 - baseTint) + primaryG * baseTint
          const baseB = 255 * (1 - baseTint) + primaryB * baseTint
          ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${glowAlpha})`
          drawHex(cx, cy)
          ctx.stroke()

          // Glow effect with primary theme color
          if (light > 0.25) {
            ctx.lineWidth = 1.5
            ctx.shadowBlur = 12
            ctx.shadowColor = `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.3)`
            ctx.strokeStyle = `rgba(${primaryR}, ${primaryG}, ${primaryB}, ${(light - 0.25) * 0.15})`
            drawHex(cx, cy)
            ctx.stroke()
          }

          // Accent color for brightest areas
          if (light > 0.6) {
            ctx.lineWidth = 2
            ctx.shadowBlur = 16
            ctx.shadowColor = `rgba(${accentR}, ${accentG}, ${accentB}, 0.4)`
            ctx.strokeStyle = `rgba(${accentR}, ${accentG}, ${accentB}, ${(light - 0.6) * 0.2})`
            drawHex(cx, cy)
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [currentRgb, accentRgb])

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY, active: true }
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-20"
      onMouseMove={handleMouseMove}
      style={{ zIndex: 0 }}
    />
  )
}
