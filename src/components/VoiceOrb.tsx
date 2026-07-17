import { useRef, useEffect, useState } from 'react'

type OrbState = 'idle' | 'speaking' | 'listening'

interface Props {
  state: OrbState
  /** 0..1 — nivel de audio (micrófono o amplitud sintética del TTS). */
  level: number
  size?: number
}

interface OrbColor { core: string; mid: string; glow: string }

function readThemeColors(): Record<OrbState, OrbColor> {
  const cs = getComputedStyle(document.documentElement)
  const purple = cs.getPropertyValue('--c-purple').trim() || '204 153 255'
  const red    = cs.getPropertyValue('--c-red').trim()    || '255 92 92'
  const green  = cs.getPropertyValue('--c-green').trim()  || '125 247 186'
  const orange = cs.getPropertyValue('--c-orange').trim() || '255 170 77'

  const build = (rgb: string): OrbColor => ({
    core: `rgb(${rgb})`,
    mid:  `rgba(${rgb}, 0.55)`,
    glow: `rgba(${rgb}, 0)`,
  })

  return {
    idle:      build(purple),
    // Habla: tono cálido tipo lava — naranja/verde mezclado
    speaking:  { core: `rgb(${orange})`, mid: `rgba(${orange}, 0.6)`, glow: `rgba(${orange}, 0)` },
    // Escucha: rojo intenso, también cálido
    listening: { core: `rgb(${red})`,    mid: `rgba(${red}, 0.6)`,    glow: `rgba(${red}, 0)` },
  }
}

function clamp(n: number) { return Math.max(0, Math.min(255, Math.round(n))) }
function rgbShift(rgb: string, amt: number) {
  const m = rgb.match(/\d+/g)
  if (!m) return rgb
  return `rgb(${clamp(+m[0] + amt)}, ${clamp(+m[1] + amt)}, ${clamp(+m[2] + amt)})`
}

interface Spark {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number
}

/**
 * Gota de lava: un blob orgánico que se deforma con las vibraciones de la
 * voz, con canal de luz (blooms) y chispas que saltan al hablar/escuchar.
 */
export default function VoiceOrb({ state, level, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const tRef = useRef(0)
  const lvlRef = useRef(level)
  lvlRef.current = level
  const stateRef = useRef(state)
  stateRef.current = state
  const colorsRef = useRef(readThemeColors())
  const [themeTick, setThemeTick] = useState(0)
  const sparksRef = useRef<Spark[]>([])

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
    const baseR = size * 0.26

    const draw = () => {
      tRef.current += 0.025
      const t = tRef.current
      const lvl = lvlRef.current
      const s = stateRef.current
      const colors = colorsRef.current
      const c = colors[s] ?? colors.idle

      ctx.clearRect(0, 0, size, size)

      // ── Bloom exterior (halo de lava) ──────────────────────────────────
      const bloomR = baseR * 2.4 + lvl * 30
      const bloom = ctx.createRadialGradient(cx, cy, baseR * 0.7, cx, cy, bloomR)
      bloom.addColorStop(0, c.mid)
      bloom.addColorStop(0.5, c.mid.replace(/0\.55\)/, '0.2)').replace(/0\.6\)/, '0.2)'))
      bloom.addColorStop(1, c.glow)
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.arc(cx, cy, bloomR, 0, Math.PI * 2)
      ctx.fill()

      // ── Cuerpo: gota de lava orgánica con metaballs suaves ─────────────
      // Ondas múltiples para forma viscosa no-uniforme
      const segments = 128
      const pts: { x: number; y: number }[] = []
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2
        // Vibración base
        const w1 = Math.sin(ang * 3 + t * 1.8) * (s === 'idle' ? 2.5 : 5)
        const w2 = Math.sin(ang * 5 - t * 2.4) * (s === 'idle' ? 1 : 3)
        const w3 = Math.sin(ang * 7 + t * 3.1) * 2
        // Modulación por voz
        const vocal = lvl * (s === 'listening' ? 22 : 16)
        const vocalShape = 0.5 + 0.5 * Math.sin(ang * 2 + t * 4)
        // Movimiento "lento" de la gota (fluir)
        const drift = Math.sin(t * 0.7) * 3
        const r = baseR + w1 + w2 + w3 + vocal * vocalShape + drift
        pts.push({
          x: cx + Math.cos(ang) * r,
          y: cy + Math.sin(ang) * r + Math.sin(t * 0.5) * 2,
        })
      }

      // Dibujo con curva suave (catmull-rom aproximado)
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2
        const yc = (pts[i].y + pts[i + 1].y) / 2
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
      }
      ctx.closePath()

      // Relleno con gradiente radial (centro brillante, borde oscuro)
      const fill = ctx.createRadialGradient(
        cx - baseR * 0.2, cy - baseR * 0.3, baseR * 0.05,
        cx, cy + baseR * 0.2, baseR * 1.4
      )
      // Núcleo blanco-amarillento (lava incandescente)
      fill.addColorStop(0, 'rgba(255, 250, 230, 0.95)')
      fill.addColorStop(0.15, rgbShift(c.core, 60))
      fill.addColorStop(0.5, c.core)
      fill.addColorStop(0.85, rgbShift(c.core, -40))
      fill.addColorStop(1, rgbShift(c.core, -70))
      ctx.fillStyle = fill
      ctx.fill()

      // ── Brillo interior (reflejo de la gota) ──────────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx - baseR * 0.3, cy - baseR * 0.4, baseR * 0.35, baseR * 0.2, -0.5, 0, Math.PI * 2)
      const shine = ctx.createRadialGradient(cx - baseR * 0.3, cy - baseR * 0.4, 0, cx - baseR * 0.3, cy - baseR * 0.4, baseR * 0.35)
      shine.addColorStop(0, 'rgba(255, 255, 255, 0.4)')
      shine.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = shine
      ctx.fill()
      ctx.restore()

      // ── Chispas que saltan cuando hay actividad ────────────────────────
      if (lvl > 0.35 && s !== 'idle' && Math.random() < 0.3) {
        const ang = Math.random() * Math.PI * 2
        const r = baseR + 5
        sparksRef.current.push({
          x: cx + Math.cos(ang) * r,
          y: cy + Math.sin(ang) * r,
          vx: Math.cos(ang) * (1 + Math.random() * 2),
          vy: Math.sin(ang) * (1 + Math.random() * 2) - 0.5,
          life: 0,
          maxLife: 30 + Math.random() * 30,
          size: 1 + Math.random() * 2.5,
        })
      }
      const sparks = sparksRef.current
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i]
        sp.life++
        sp.x += sp.vx
        sp.y += sp.vy
        sp.vy += 0.04
        if (sp.life >= sp.maxLife) { sparks.splice(i, 1); continue }
        const alpha = (1 - sp.life / sp.maxLife) * 0.8
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 220, 150, ${alpha})`
        ctx.fill()
      }
      if (sparks.length > 80) sparks.splice(0, sparks.length - 80)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      sparksRef.current = []
    }
  }, [size, themeTick])

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />
}