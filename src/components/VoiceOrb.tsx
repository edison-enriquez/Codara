import { useEffect, useState } from 'react'

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

function hexOrRgbToRgba(color: string, alpha: number): string {
  if (color.startsWith('rgb(')) {
    const inner = color.slice(4, -1)
    return `rgba(${inner}, ${alpha})`
  }
  return color
}

/**
 * Lámpara de lava en CSS puro: un blob con animación orgánica + burbujas
 * ascendentes + halo. Reacciona al estado (idle/speaking/listening) y nivel.
 * Sin canvas — fiable en cualquier navegador.
 */
export default function VoiceOrb({ state, level, size = 220 }: Props) {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const color = theme[state] ?? theme.idle
  const intensity = state === 'idle' ? 0.3 : Math.max(0.4, level)

  // Genera burbujas estáticas (claves estables)
  const bubbles = Array.from({ length: 6 }, (_, i) => ({
    left: 15 + (i * 70 / 6) + (i % 2) * 5,
    size: 18 + (i % 3) * 8,
    duration: 3 + (i % 3),
    delay: i * 0.7,
  }))

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Halo exterior pulsante */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${hexOrRgbToRgba(color, 0.35 + intensity * 0.3)} 0%, ${hexOrRgbToRgba(color, 0.1)} 50%, transparent 70%)`,
          transform: `scale(${1 + intensity * 0.25})`,
          transition: 'transform 0.3s ease, background 0.5s ease',
          animation: state === 'idle' ? 'orbPulse 4s ease-in-out infinite' : 'orbPulse 1.8s ease-in-out infinite',
        }}
      />

      {/* Cuerpo: gota de lava con morph y gradiente */}
      <div
        style={{
          position: 'relative',
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, rgba(255, 250, 230, 0.95) 0%, ${color} 25%, ${color} 60%, rgba(0,0,0,0.35) 100%)`,
          boxShadow: `0 0 ${20 + intensity * 40}px ${hexOrRgbToRgba(color, 0.6 + intensity * 0.3)}, 0 0 ${40 + intensity * 60}px ${hexOrRgbToRgba(color, 0.3)}`,
          animation: state === 'idle' ? 'lavaMorph 6s ease-in-out infinite' : 'lavaMorph 3s ease-in-out infinite',
          overflow: 'hidden',
          transition: 'background 0.5s ease, box-shadow 0.3s ease',
        }}
      >
        {/* Burbujas internas que ascienden */}
        {bubbles.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${b.left}%`,
              bottom: '-20%',
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, rgba(255, 245, 220, ${0.4 + intensity * 0.3}) 0%, ${hexOrRgbToRgba(color, 0.25)} 60%, transparent 100%)`,
              animation: `bubbleRise ${b.duration}s ease-in ${b.delay}s infinite`,
              opacity: state === 'idle' ? 0.5 : 0.8,
            }}
          />
        ))}

        {/* Brillo superior (reflejo de luz) */}
        <div
          style={{
            position: 'absolute',
            top: '15%',
            left: '25%',
            width: '35%',
            height: '20%',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, transparent 70%)',
            transform: 'rotate(-20deg)',
          }}
        />
      </div>

      {/* Onda de impacto al hablar/escuchar */}
      {state !== 'idle' && (
        <div
          style={{
            position: 'absolute',
            inset: '15%',
            borderRadius: '50%',
            border: `2px solid ${hexOrRgbToRgba(color, 0.5)}`,
            animation: 'orbRipple 1.5s ease-out infinite',
          }}
        />
      )}
    </div>
  )
}