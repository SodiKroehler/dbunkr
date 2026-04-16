"use client"

import { useEffect, useRef } from "react"
import { mountWendellVines } from "@/lib/wendell_v2/wendell/vineRuntime"

export function WendellVines() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const getSize = () => ({
      width: Math.max(1, Math.floor(container.clientWidth)),
      height: Math.max(1, Math.floor(container.clientHeight)),
    })

    return mountWendellVines(canvas, getSize)
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0 min-h-0 min-w-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-hidden
      />
    </div>
  )
}
