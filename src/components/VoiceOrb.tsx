import { useEffect, useState, useMemo, useRef } from 'react'

type OrbState = 'idle' | 'speaking' | 'listening'

interface Props {
  state: OrbState
  level: number
  size?: number
}

interface ThemeColors { speaking: string; listening: string; idle: string }

function readTheme(): ThemeColors {
  const cs = getComputedStyle(document.documentElement)
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const orange = `rgb(${cs.getPropertyValue('--c-orange').trim() || '255 170 77'})`
  const green  = `rgb(${cs.getPropertyValue('--c-green').trim()  || '125 247 186'})`
  const red    = `rgb(${cs.getPropertyValue('--c-red').trim()    || '255 92 92'})`
  const purple = `rgb(${cs.getPropertyValue('--c-purple').trim() || '204 153 255'})`
  if (isLight) return { speaking: orange, listening: red, idle: orange }
  return { speaking: green, listening: red, idle: purple }
}

function rgbToRgba(color: string, alpha: number): string {
  if (color.startsWith('rgb(')) {
    const inner = color.slice(4, -1)
    return `rgba(${inner}, ${alpha})`
  }
  return color
}

/** Un único radial que se msytriza para definir el blob orgánico (lava). */
function useBlobs(seed = 456, count = 6, r = 42, cx = 50, cy = 50) {
  return useMemo(() => {
    const pts: { cx: number; cy: number; rx: number; ry: number }[] = []
    let s = seed
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2
      const dist = r * (0.3 + rand() * 0.4)
      pts.push({
        cx: cx + Math.cos(ang) * dist,
        cy: cy + Math.sin(ang) * dist,
        rx: r * (0.6 + rand() * 0.25),
        ry: r * (0.7 + rand() * 0.25),
      })
    }
    return pts
  }, [seed, count, r, cx, cy])
}

/**
 * Lámpara de lava en SVG: blob orgánico con morf vía `feTurbulence`, halo con
 * `feGaussianBlur`, burbujas que ascienden (animateTransform), y ondas de
 * impacto. Colores del tema (claro=naranja/rojo, oscuro=verde/rojo).
 */
export default function VoiceOrb({ state, level, size = 220 }: Props) {
  const [theme, setTheme] = useState(readTheme)
  const blobs = useBlobs()
  const color = theme[state] ?? theme.idle
  const intensity = state === 'idle' ? 0.3 : Math.max(0.45, Math.min(1, level + 0.4))
  const uid = useMemo(() => `orb-${Math.random().toString(36).slice(2, 8)}`, [])

  // Burbujas ascendentes — claves estables
  const bubbles = useMemo(() => Array.from({ length: 7 }, (_, i) => ({
    x: 18 + (i * 64 / 7) + (i % 2) * 6,
    r: 6 + (i % 3) * 3,
    dur: 3.5 + (i % 3) * 1.3,
    delay: i * 0.6,
  })), [])

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        {/* Glow para el halo */}
        <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        {/* Disco + turbulencia para morph orgánico */}
        <filter id={`${uid}-morph`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed={3} result="noise">
            <animate attributeName="seed" values="3;8;3" dur="8s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={state === 'idle' ? 3 : 6 + intensity * 4} result="displaced" />
        </filter>
        {/* Gradiente radial del centro incandescente */}
        <radialGradient id={`${uid}-fill`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255, 250, 230, 0.95)" />
          <stop offset="30%" stopColor={color} />
          <stop offset="75%" stopColor={color} />
          <stop offset="100%" stopColor="rgba(0, 0, 0, 0.35)" />
        </radialGradient>
        {/* Gradiente del halo */}
        <radialGradient id={`${uid}-halo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={rgbToRgba(color, 0.5 + intensity * 0.3)} />
          <stop offset="55%" stopColor={rgbToRgba(color, 0.12)} />
          <stop offset="100%" stopColor={rgbToRgba(color, 0)} />
        </radialGradient>
        {/* Clipping para que las burbujas se queden dentro del blob */}
        <clipPath id={`${uid}-clip`}>
          <circle cx="50" cy="50" r="32" />
        </clipPath>
      </defs>

      {/* Halo pulsante */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill={`url(#${uid}-halo)`}
        filter={`url(#${uid}-glow)`}
        style={{
          transformOrigin: '50% 50%',
          transformBox: 'fill-box',
          animation: state === 'idle' ? 'orbHalo 5s ease-in-out infinite' : 'orbHalo 2.2s ease-in-out infinite',
        }}
      />

      {/* Onda de impacto (soloactivo) */}
      {state !== 'idle' && (
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke={rgbToRgba(color, 0.5)}
          strokeWidth="1.2"
          style={{
            transformOrigin: '50% 50%',
            transformBox: 'fill-box',
            animation: 'orbRipple 1.6s ease-out infinite',
          }}
        />
      )}

      {/* Cuerpo del orbe con morph por turbulencia */}
      <g
        style={{
          transformOrigin: '50% 50%',
          transformBox: 'fill-box',
          animation: state === 'idle' ? 'orbBlob 7s ease-in-out infinite' : 'orbBlobActive 2.5s ease-in-out infinite',
        }}
      >
        <circle
          cx="50"
          cy="50"
          r="32"
          fill={`url(#${uid}-fill)`}
          filter={`url(#${uid}-morph)`}
        />
      </g>

      {/* Burbujas internas ascendentes */}
      <g clipPath={`url(#${uid}-clip)`}>
        {bubbles.map((b, i) => (
          <circle
            key={i}
            cx={b.x}
            cy={75}
            r={b.r}
            fill="rgba(255, 245, 220, 0.4)"
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animation: `bubbleRiseY ${b.dur}s ease-in ${b.delay}s infinite`,
            }}
          />
        ))}
      </g>

      {/* Brillo superior (reflejo de luz) */}
      <ellipse
        cx="42"
        cy="38"
        rx="11"
        ry="6"
        fill="rgba(255, 255, 255, 0.45)"
        transform="rotate(-20 42 38)"
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  )
}