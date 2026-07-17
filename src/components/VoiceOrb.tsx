import { useRef, useEffect, useState } from 'react'

type OrbState = 'idle' | 'speaking' | 'listening'

interface Props {
  state: OrbState
  /** 0..1 — nivel de audio del micrófono o amplitud sintética del TTS. */
  level: number
  size?: number
}

/** Lee los colores del tema actual desde las variables CSS de la app. */
interface OrbColors { idle: { core: string; glow: string }; speaking: { core: string; glow: string }; listening: { core: string; glow: string } }

function readThemeColors(): OrbColors {
  const root = document.documentElement
  const cs = getComputedStyle(root)
  // Variables CSS guardan "R G B" separados por espacios
  const purple = cs.getPropertyValue('--c-purple').trim() || '204 153 255'
  const red    = cs.getPropertyValue('--c-red').trim()    || '255 92 92'
  const green  = cs.getPropertyValue('--c-green').trim()  || '125 247 186'
  return {
    idle:      { core: `rgb(${purple})`, glow: `rgb(${purple})` },
    speaking:  { core: `rgb(${green})`,  glow: `rgb(${green})`  },
    listening: { core: `rgb(${red})`,    glow: `rgb(${red})`    },
  }
}

const rgbLighten = (rgb: string, amt: number) => {
  const [r, g, b] = rgb.replace('rgb(', '').replace(')', '').split(',').map((n) => parseInt(n.trim(), 10))
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `rgb(${clamp(r + amt)}, ${clamp(g + amt)}, ${clamp(b + amt)})`
}
const rgbDarken = (rgb: string, amt: number) => rgbLighten(rgb, -amt)

/**
 * Orbe tipo Sesame: un círculo que se deforma/vibra cuando habla el tutor y
 * se tiñe de rojo y pulsa cuando escucha al usuario. Usa los colores del tema.
 */
export default function VoiceOrb({ state, level, size = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const tRef = useRef(0)
  const lvlRef = useRef(level)
  lvlRef.current = level
  const stateRef = useRef(state)
  stateRef.current = state
  const colorsRef = useRef(readThemeColors())
  const [themeTick, setThemeTick] = useState(0)

  // Observar cambios de tema para releer los colores.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      colorsRef.current = readThemeColors()
      setThemeTick((n) => n + 1)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    colorsRef.current = readThemeColors()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = size / 2
    const cy = size / 2
    const baseR = size * 0.32

    const draw = () => {
      tRef.current += 0.04
      const t = tRef.current
      const lvl = lvlRef.current
      const s = stateRef.current

      // Releer colores si cambió el tema (barato)
      const colors = colorsRef.current
      const colorSet = colors[s] ?? colors.idle
      const core = colorSet.core
      const glow = colorSet.glow

      ctx.clearRect(0, 0, size, size)

      // Aura exterior (glow)
      const auraR = baseR + 18 + (s === 'listening' ? lvl * 24 : 0) + (s === 'speaking' ? lvl * 14 : 0)
      const auraColor = glow.replace('rgb(', 'rgba(').replace(')', ', 0.35)')
      const auraFade = glow.replace('rgb(', 'rgba(').replace(')', ', 0)')
      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.6, cx, cy, auraR)
      grad.addColorStop(0, glow.replace('rgb(', 'rgba(').replace(')', ', 0.7)'))
      grad.addColorStop(0.6, auraColor)
      grad.addColorStop(1, auraFade)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, auraR, 0, Math.PI * 2)
      ctx.fill()

      // Cuerpo del orbe: círculo deformado por ondas (vibración del habla)
      const segments = 96
      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2
        const baseAmp = s === 'idle' ? 1.5 : 4
        const freq = s === 'speaking' ? 5 : s === 'listening' ? 3 : 2
        const wave = Math.sin(ang * freq + t * 2) * baseAmp
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
      fillGrad.addColorStop(0, rgbLighten(core, 40))
      fillGrad.addColorStop(0.5, core)
      fillGrad.addColorStop(1, rgbDarken(core, 30))
      ctx.fillStyle = fillGrad
      ctx.fill()

      // Brillo superior
      ctx.beginPath()
      ctx.ellipse(cx - baseR * 0.25, cy - baseR * 0.35, baseR * 0.3, baseR * 0.18, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fill()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [size, themeTick])

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />
}