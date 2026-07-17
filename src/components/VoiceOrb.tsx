import { useRef, useEffect, useState } from 'react'

type OrbState = 'idle' | 'speaking' | 'listening'

interface Props {
  state: OrbState
  /** 0..1 — nivel de actividad (voz o TTS). */
  level: number
  size?: number
}

function readTheme(): { active: string; accent: string; isLight: boolean } {
  const cs = getComputedStyle(document.documentElement)
  const isLight = cs.getPropertyValue('color-scheme').trim() === 'light'
    || document.documentElement.getAttribute('data-theme') === 'light'
  const orange = cs.getPropertyValue('--c-orange').trim() || '255 170 77'
  const green  = cs.getPropertyValue('--c-green').trim()  || '125 247 186'
  const red    = cs.getPropertyValue('--c-red').trim()    || '255 92 92'
  const purple = cs.getPropertyValue('--c-purple').trim() || '204 153 255'

  // Modo claro: naranja al hablar, rojo al escuchar. Modo oscuro: verde/rojo.
  if (isLight) {
    return {
      speaking:  { active: `rgb(${orange})`, accent: `rgba(${orange}, 0.9)` },
      listening: { active: `rgb(${red})`,    accent: `rgba(${red}, 0.9)`   },
      idle:      { active: `rgb(${orange})`, accent: `rgba(${orange}, 0.7)` },
    } as any
  }
  return {
    speaking:  { active: `rgb(${green})`,  accent: `rgba(${green}, 0.9)`  },
    listening: { active: `rgb(${red})`,    accent: `rgba(${red}, 0.9)`    },
    idle:      { active: `rgb(${purple})`, accent: `rgba(${purple}, 0.7)` },
  } as any
}

interface Bubble {
  x: number
  size: number
  duration: number
  delay: number
}

/**
 * Lámpara de lava: forma orgánica con burbujas que ascienden desde el centro
 * y se deforman, reaccionando al nivel de actividad. Todo en CSS+canvas.
 */
export default function VoiceOrb({ state, level, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const tRef = useRef(0)
  const lvlRef = useRef(level)
  lvlRef.current = level
  const stateRef = useRef(state)
  stateRef.current = state
  const colorsRef = useRef(readTheme())
  const [themeTick, setThemeTick] = useState(0)

  // Burbujas generadas
  const bubblesRef = useRef<Bubble[]>([])
  if (bubblesRef.current.length === 0) {
    for (let i = 0; i < 7; i++) {
      bubblesRef.current.push({
        x: Math.random(),
        size: 0.12 + Math.random() * 0.18,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 4,
      })
    }
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      colorsRef.current = readTheme()
      setThemeTick((n) => n + 1)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    colorsRef.current = readTheme()
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
      tRef.current += 0.03
      const t = tRef.current
      const lvl = lvlRef.current
      const s = stateRef.current
      const colors = colorsRef.current
      const c = (colors as any)[s] ?? (colors as any).idle

      ctx.clearRect(0, 0, size, size)

      // ── Halo / glow exterior ────────────────────────────────────────────
      const haloR = baseR * (1.8 + lvl * 0.5)
      const halo = ctx.createRadialGradient(cx, cy, baseR * 0.8, cx, cy, haloR)
      const accent = (c.accent || '').replace(/0\.\d+\)/, `${0.35 + lvl * 0.3})`)
      halo.addColorStop(0, accent)
      halo.addColorStop(0.5, accent.replace(/0\.\d+\)/, '0.15)'))
      halo.addColorStop(1, accent.replace(/0\.\d+\)/, '0)'))
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2)
      ctx.fill()

      // ── Cuerpo principal: blob orgánico (lámpara de lava) ──────────────
      const segments = 80
      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2
        // Onda lenta y grande (fluir de lava)
        const slow = Math.sin(ang * 2 + t * 0.8) * 6
        // Onda media (deformación orgánica)
        const med = Math.sin(ang * 4 - t * 1.5) * 4
        // Onda rápida (vibración de voz)
        const fast = Math.sin(ang * 7 + t * 3) * (s === 'idle' ? 1.5 : 3 + lvl * 4)
        // Movimiento ascendente sugerido
        const yShift = Math.sin(t * 0.5) * 3
        const r = baseR + slow + med + fast + (s !== 'idle' ? lvl * 10 : 0)
        const x = cx + Math.cos(ang) * r
        const y = cy + Math.sin(ang) * r + yShift
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Relleno: gradiente radial (centro brillante -> borde oscuro)
      const fill = ctx.createRadialGradient(
        cx, cy - baseR * 0.3, 0,
        cx, cy, baseR * 1.3
      )
      fill.addColorStop(0, 'rgba(255, 250, 230, 0.85)')
      fill.addColorStop(0.2, c.active)
      fill.addColorStop(0.7, c.active)
      fill.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
      ctx.fillStyle = fill
      ctx.fill()

      // ── Burbujas internas que ascienden (efecto lámpara de lava) ───────—
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, baseR - 2, 0, Math.PI * 2)
      ctx.clip()

      for (let i = 0; i < bubblesRef.current.length; i++) {
        const b = bubblesRef.current[i]
        // Posición vertical: las burbujas suben y reinician
        const phase = ((t * (1 / b.duration) + b.delay) % 1)
        const by = cy + baseR - phase * baseR * 2.2
        const bx = cx + (b.x - 0.5) * baseR * 1.4 + Math.sin(t * 1.2 + i) * 6
        const br = baseR * b.size * (0.7 + 0.3 * lvl) * (phase < 0.1 ? phase / 0.1 : phase > 0.9 ? (1 - phase) / 0.1 : 1)
        if (br < 1) continue
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        bg.addColorStop(0, 'rgba(255, 245, 220, 0.45)')
        bg.addColorStop(0.6, accent.replace(/0\.\d+\)/, '0.2)'))
        bg.addColorStop(1, accent.replace(/0\.\d+\)/, '0)'))
        ctx.fillStyle = bg
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      // ── Brillo superior (reflejo de luz) ───────────────────────────────
      ctx.beginPath()
      ctx.ellipse(cx - baseR * 0.25, cy - baseR * 0.4, baseR * 0.3, baseR * 0.15, -0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
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