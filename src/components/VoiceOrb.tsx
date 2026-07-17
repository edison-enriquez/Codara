import { useRef, useEffect } from 'react'

type OrbState = 'idle' | 'speaking' | 'listening'

interface Props {
  state: OrbState
  /** 0..1 — nivel de audio del micrófono (modo escucha) o amplitud TTS (modo habla). */
  level: number
  size?: number
}

/**
 * Orbe tipo Sesame: un círculo que se deforma/vibra cuando habla el tutor y
 * se tiñe de rojo y pulsa cuando escucha al usuario.
 */
export default function VoiceOrb({ state, level, size = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const tRef = useRef(0)
  const lvlRef = useRef(level)
  lvlRef.current = level
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const baseR = size * 0.32

    const draw = () => {
      tRef.current += 0.04
      const t = tRef.current
      const lvl = lvlRef.current
      const s = stateRef.current

      ctx.clearRect(0, 0, size, size)

      // Colores por estado
      let core = '#a855f7'   // purple
      let glow = '#7c3aed'
      if (s === 'listening') { core = '#ef4444'; glow = '#dc2626' }
      if (s === 'speaking')  { core = '#22c55e'; glow = '#16a34a' }

      // Aura exterior (glow)
      const auraR = baseR + 18 + (s === 'listening' ? lvl * 24 : 0) + (s === 'speaking' ? lvl * 14 : 0)
      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, auraR)
      grad.addColorStop(0, glow + 'aa')
      grad.addColorStop(0.6, glow + '33')
      grad.addColorStop(1, glow + '00')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
      ctx.fill()

      // Cuerpo del orbe: círculo deformado por ondas (vibración del habla)
      const segments = 64
      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2
        // Vibración base (idle casi plano)
        const baseAmp = s === 'idle' ? 1.5 : 4
        const freq = s === 'speaking' ? 5 : s === 'listening' ? 3 : 2
        const wave = Math.sin(ang * freq + t * 2) * baseAmp
        // Modulación por nivel (silaba a silaba)
        const vocalAmp = lvl * (s === 'listening' ? 18 : 12)
        const r = baseR + wave + vocalAmp * (0.6 + 0.4 * Math.sin(ang * 3 + t))
        const x = cx + Math.cos(ang) * r
        const y = cy + Math.sin(ang) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Relleno con gradiente radial
      const fillGrad = ctx.createRadialGradient(
        cx - baseR * 0.3, cy - baseR * 0.3, baseR * 0.1,
        cx, cy, baseR * 1.2
      )
      fillGrad.addColorStop(0, lighten(core, 40))
      fillGrad.addColorStop(0.5, core)
      fillGrad.addColorStop(1, darken(core, 30))
      ctx.fillStyle = fillGrad
      ctx.fill()

      // Brillo superior
      ctx.beginPath()
      ctx.ellipse(cx - baseR * 0.25, cy - baseR * 0.35, baseR * 0.3, baseR * 0.18, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fill()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [size])

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />
}

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))) }
function lighten(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${clamp(r + amt)}, ${clamp(g + amt)}, ${clamp(b + amt)})`
}
function darken(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex)
  return `rgb(${clamp(r - amt)}, ${clamp(g - amt)}, ${clamp(b - amt)})`
}
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]
}