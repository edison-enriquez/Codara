import { useEffect, useRef } from 'react'

type OrbMode = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Props {
  mode: OrbMode
  level?: number
  size?: number
  particleCount?: number
}

function parseCSS(key: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
  const parts = raw.split(/\s+/).map(Number)
  return parts.length === 3 ? parts : [255, 255, 255]
}

function getThemeColors() {
  const light = document.documentElement.getAttribute('data-theme') === 'light'
  return {
    speaking: parseCSS('--c-green'),
    listening: parseCSS('--c-red'),
    idle: parseCSS(light ? '--c-orange' : '--c-purple'),
    thinking: parseCSS('--c-cyan'),
  }
}

export default function VoiceOrbThree({ mode, level = 0, size = 220, particleCount = 6000 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(mode)
  const levelRef = useRef(level)
  const audioEnergyRef = useRef(0)
  const audioBassRef = useRef(0)

  modeRef.current = mode
  levelRef.current = level

  // ── Three.js scene (GPU particle shader) ────────────────────────────
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let disposed = false
    let rafId = 0
    let rendererDispose: (() => void) | null = null

    const init = async () => {
      const THREE = await import('three')
      const R = size * 0.32
      const n = particleCount

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
      camera.position.set(0, 0, R * 3.6)

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      container.innerHTML = ''
      container.appendChild(renderer.domElement)

      // ── Fibonacci sphere distribution ──────────────────────────────
      const dirs = new Float32Array(n * 3)
      const baseRadius = new Float32Array(n)
      const flare = new Float32Array(n)
      const phase = new Float32Array(n)
      const colorAttr = new Float32Array(n * 3)
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))

      const colorAt = (tn: number, top: number[], bot: number[]) => {
        const t = Math.max(0, Math.min(1, tn))
        return [
          top[0] + (bot[0] - top[0]) * t,
          top[1] + (bot[1] - top[1]) * t,
          top[2] + (bot[2] - top[2]) * t,
        ]
      }

      const interiorStarChance = 0.03
      const flareChance = 0.07

      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y))
        const theta = goldenAngle * i
        dirs[i * 3] = Math.cos(theta) * radiusAtY
        dirs[i * 3 + 1] = y
        dirs[i * 3 + 2] = Math.sin(theta) * radiusAtY

        const isInterior = Math.random() < interiorStarChance
        baseRadius[i] = isInterior ? R * (0.15 + Math.random() * 0.6) : R
        flare[i] = isInterior ? 0 : Math.random() < flareChance ? 0.4 + Math.random() * 0.6 : Math.random() * 0.06
        phase[i] = Math.random() * Math.PI * 2

        if (isInterior) {
          colorAttr[i * 3] = 0.9; colorAttr[i * 3 + 1] = 0.97; colorAttr[i * 3 + 2] = 1.0
        } else {
          const tNorm = (y + 1) / 2
          const c = colorAt(tNorm, [0.66, 0.93, 1.0], [1.0, 0.68, 0.15])
          colorAttr[i * 3] = c[0]; colorAttr[i * 3 + 1] = c[1]; colorAttr[i * 3 + 2] = c[2]
        }
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
      geometry.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
      geometry.setAttribute('aBaseRadius', new THREE.BufferAttribute(baseRadius, 1))
      geometry.setAttribute('aFlare', new THREE.BufferAttribute(flare, 1))
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1))
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colorAttr, 3))

      // ── Theme colors as uniforms ───────────────────────────────────
      let colors = getThemeColors()

      const uniforms = {
        uTime: { value: 0 },
        uEnergy: { value: 0.15 },
        uBass: { value: 0.12 },
        uMode: { value: 0 },
        uColorTop: { value: new THREE.Color(0.66, 0.93, 1.0) },
        uColorBot: { value: new THREE.Color(1.0, 0.68, 0.15) },
      }

      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms,
        vertexShader: `
          attribute vec3 aDir;
          attribute float aBaseRadius;
          attribute float aFlare;
          attribute float aPhase;
          attribute vec3 aColor;
          uniform float uTime;
          uniform float uEnergy;
          uniform float uBass;
          uniform float uMode;
          uniform vec3 uColorTop;
          uniform vec3 uColorBot;
          varying vec3 vColor;
          varying float vAlpha;

          float noise3(vec3 p, float t) {
            return (sin(p.x * 3.0 + t * 0.9) + sin(p.y * 3.3 - t * 0.7) +
                    sin(p.z * 3.6 + t * 1.1) + sin((p.x + p.y + p.z) * 2.1 - t * 1.4)) / 4.0;
          }

          void main() {
            float n = noise3(aDir, uTime);
            float bulge = aBaseRadius * (0.045 + uBass * 0.2) * n;
            float flareWave = max(0.0, sin(uTime * 2.2 + aPhase * 3.0));
            float flareBoost = aFlare * (0.6 + uEnergy * 2.0) * flareWave;
            float r = aBaseRadius + bulge + aFlare * aBaseRadius * 1.2 * flareBoost;
            vec3 pos = aDir * r;

            // Mode-specific displacement
            float modeDisp = 0.0;
            if (uMode > 2.5) {
              // speaking: pulse with energy
              modeDisp = sin(uTime * 4.0 + aPhase) * uEnergy * 0.2;
            } else if (uMode > 1.5) {
              // thinking: quick shimmer
              modeDisp = sin(uTime * 6.0 + aPhase * 5.0) * 0.12;
            } else if (uMode > 0.5) {
              // listening: audio-driven warp
              modeDisp = sin(uTime * 2.0 + aPhase * 2.0 + n * 3.0) * uEnergy * 0.25;
            } else {
              // idle: gentle breathe
              modeDisp = sin(uTime * 0.8 + aPhase) * 0.05;
            }
            pos += aDir * modeDisp * aBaseRadius;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

            vec3 viewDir = normalize(mat3(modelViewMatrix) * aDir);
            float rim = 1.0 - abs(viewDir.z);

            // Twinkle faster in thinking mode
            float twinkleSpeed = uMode > 1.5 ? 3.5 : 1.4;
            float twinkle = 0.6 + 0.4 * sin(uTime * (twinkleSpeed + aPhase * 0.3) + aPhase * 3.0);

            vAlpha = clamp(0.25 + rim * 0.9, 0.0, 1.0) * twinkle;

            // Color: blend base gradient with mode theme color
            float heightT = (aDir.y + 1.0) * 0.5;
            vec3 gradColor = mix(uColorBot, uColorTop, heightT);
            float modeInfluence = uMode > 0.5 ? 0.4 : 0.15;
            vColor = mix(aColor * (0.55 + rim * 0.75), gradColor, modeInfluence);
            vColor *= (0.55 + rim * 0.75 + uEnergy * 0.5);

            float baseSize = 1.4 + aFlare * 2.2 + uEnergy * 2.0;
            float modeSize = uMode > 2.5 ? uEnergy * 3.0 : uMode > 1.5 ? 1.2 : 0.0;
            gl_PointSize = (baseSize + modeSize) * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float edge = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor, edge * vAlpha);
          }
        `,
      })

      const points = new THREE.Points(geometry, material)
      const group = new THREE.Group()
      group.add(points)
      scene.add(group)

      // ── Theme observer ─────────────────────────────────────────────
      const observer = new MutationObserver(() => {
        colors = getThemeColors()
      })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

      // ── Resize ─────────────────────────────────────────────────────
      const handleResize = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.setSize(size, size)
      }
      window.addEventListener('resize', handleResize)

      // ── Animation ──────────────────────────────────────────────────
      const clock = new THREE.Clock()

      const attackRelease = (current: number, target: number, attack: number, release: number) => {
        const rate = target > current ? attack : release
        return current + (target - current) * rate
      }

      let smoothEnergy = 0.15
      let smoothBass = 0.12

      const animate = () => {
        if (disposed) return
        rafId = requestAnimationFrame(animate)

        const delta = clock.getDelta()
        const t = clock.getElapsedTime()
        const cm = modeRef.current
        const cl = levelRef.current

        // ── Compute energy / bass from mode ──────────────────────────
        let rawEnergy: number
        let rawBass: number

        switch (cm) {
          case 'listening': {
            const ae = audioEnergyRef.current
            const ab = audioBassRef.current
            rawEnergy = ae
            rawBass = ab
            break
          }
          case 'speaking': {
            rawEnergy = 0.2 + cl * 0.7
            rawBass = 0.15 + cl * 0.4
            break
          }
          case 'thinking': {
            rawEnergy = 0.25 + 0.2 * Math.sin(t * 2.5)
            rawBass = 0.2 + 0.15 * Math.sin(t * 3.7)
            break
          }
          default: {
            rawEnergy = 0.12 + 0.06 * Math.sin(t * 0.5)
            rawBass = 0.1 + 0.04 * Math.sin(t * 0.7)
            break
          }
        }

        smoothEnergy = attackRelease(smoothEnergy, rawEnergy, 0.3, 0.08)
        smoothBass = attackRelease(smoothBass, rawBass, 0.28, 0.1)

        // ── Map mode to float uniform ────────────────────────────────
        const modeMap: Record<OrbMode, number> = { idle: 0, listening: 1, thinking: 2, speaking: 3 }

        // ── Update uniforms ──────────────────────────────────────────
        uniforms.uTime.value = t
        uniforms.uEnergy.value = smoothEnergy
        uniforms.uBass.value = smoothBass
        uniforms.uMode.value = modeMap[cm]

        // ── Theme → color uniforms ───────────────────────────────────
        const theme = colors
        const modeKey = cm as keyof typeof theme
        const modeRgb = theme[modeKey] ?? theme.idle
        const bright = [
          Math.min(1, modeRgb[0] / 255 * 1.3),
          Math.min(1, modeRgb[1] / 255 * 1.3),
          Math.min(1, modeRgb[2] / 255 * 1.3),
        ]
        const dim = [
          modeRgb[0] / 255 * 0.4,
          modeRgb[1] / 255 * 0.35,
          modeRgb[2] / 255 * 0.5,
        ]
        uniforms.uColorTop.value.setRGB(bright[0], bright[1], bright[2])
        uniforms.uColorBot.value.setRGB(dim[0], dim[1], dim[2])

        // ── Rotation ─────────────────────────────────────────────────
        const rotSpeed = cm === 'thinking' ? 1.0 : 0.15 + smoothEnergy * 0.6
        group.rotation.y += delta * rotSpeed
        group.rotation.x = 0.12 + Math.sin(t * 0.15) * 0.03

        renderer.render(scene, camera)
      }
      animate()

      rendererDispose = () => {
        disposed = true
        cancelAnimationFrame(rafId)
        observer.disconnect()
        window.removeEventListener('resize', handleResize)
        geometry.dispose()
        material.dispose()
        renderer.dispose()
        container.innerHTML = ''
      }
    }

    init().catch(console.error)

    return () => rendererDispose?.()
  }, [size, particleCount])

  // ── Audio lifecycle (mic for listening mode) ────────────────────────
  useEffect(() => {
    let alive = true
    let mediaStream: MediaStream | null = null
    let audioCtx: AudioContext | null = null
    let audioRaf = 0

    if (mode !== 'listening') {
      audioEnergyRef.current = 0
      audioBassRef.current = 0
      return
    }

    ;(async () => {
      try {
        const ctx = new AudioContext()
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!alive) { stream.getTracks().forEach(t => t.stop()); ctx.close(); return }

        const src = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser()
        an.fftSize = 256
        an.smoothingTimeConstant = 0.7
        src.connect(an)
        const data = new Uint8Array(an.frequencyBinCount)

        const read = () => {
          if (!alive) return
          an.getByteFrequencyData(data)
          let sum = 0
          let bassSum = 0
          const bassBins = Math.max(4, Math.floor(data.length * 0.1))
          for (let i = 0; i < data.length; i++) {
            sum += data[i]
            if (i < bassBins) bassSum += data[i]
          }
          audioEnergyRef.current = sum / data.length / 255
          audioBassRef.current = bassSum / bassBins / 255
          audioRaf = requestAnimationFrame(read)
        }
        read()

        mediaStream = stream
        audioCtx = ctx
      } catch {
        audioEnergyRef.current = 0
        audioBassRef.current = 0
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(audioRaf)
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
      if (audioCtx) audioCtx.close()
      audioEnergyRef.current = 0
      audioBassRef.current = 0
    }
  }, [mode])

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}
    />
  )
}
