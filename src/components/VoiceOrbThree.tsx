import { useEffect, useRef } from 'react'
import type * as THREE from 'three'

type OrbMode = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Props {
  mode: OrbMode
  level?: number
  size?: number
}

interface RGB { r: number; g: number; b: number }

function parseCSS(key: string): RGB {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(key).trim()
  const parts = raw.split(/\s+/).map(Number)
  return parts.length === 3 ? { r: parts[0], g: parts[1], b: parts[2] } : { r: 255, g: 255, b: 255 }
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

export default function VoiceOrbThree({ mode, level = 0, size = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeRef = useRef(mode)
  const levelRef = useRef(level)
  const audioLevelRef = useRef(0)

  modeRef.current = mode
  levelRef.current = level

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let disposed = false
    let animId = 0
    let rendererDispose: (() => void) | null = null

    const init = async () => {
      const THREE = await import('three')

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.z = 4

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(size, size)

      const ambient = new THREE.AmbientLight(0xffffff, 0.4)
      scene.add(ambient)

      const key = new THREE.DirectionalLight(0xffffff, 1.2)
      key.position.set(2, 3, 4)
      scene.add(key)

      const fill = new THREE.DirectionalLight(0x8888ff, 0.5)
      fill.position.set(-3, -1, -2)
      scene.add(fill)

      // ── Orb ─────────────────────────────────────────────────
      const geo = new THREE.IcosahedronGeometry(1.2, 3)
      const pos = geo.attributes.position
      const origPos = new Float32Array(pos.array)
      const phases = new Float32Array(pos.count)
      for (let i = 0; i < pos.count; i++) phases[i] = Math.random() * Math.PI * 2

      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0.5, 0.8, 0.6),
        emissive: new THREE.Color(0.1, 0.3, 0.2),
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.3,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        transparent: true,
        opacity: 0.95,
      })
      const orb = new THREE.Mesh(geo, mat)
      scene.add(orb)

      // ── Glow ring ────────────────────────────────────────────
      const ringGeo = new THREE.TorusGeometry(1.45, 0.03, 16, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4488ff, transparent: true, opacity: 0.4,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 3
      scene.add(ring)

      // ── Particles ─────────────────────────────────────────────
      const PC = 300
      const pGeo = new THREE.BufferGeometry()
      const pPos = new Float32Array(PC * 3)
      const pSpeeds = new Float32Array(PC)
      const pPhases = new Float32Array(PC)
      for (let i = 0; i < PC; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = 1.6 + Math.random() * 1.2
        pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        pPos[i * 3 + 1] = r * Math.cos(phi)
        pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
        pSpeeds[i] = 0.3 + Math.random() * 0.7
        pPhases[i] = Math.random() * Math.PI * 2
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))

      const pC = document.createElement('canvas')
      pC.width = 32; pC.height = 32
      const pCtx = pC.getContext('2d')!
      const g = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.3, 'rgba(255,255,255,0.8)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      pCtx.fillStyle = g
      pCtx.fillRect(0, 0, 32, 32)
      const pTex = new THREE.CanvasTexture(pC)

      const pMat = new THREE.PointsMaterial({
        size: 0.04,
        map: pTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0x8888ff,
        opacity: 0.6,
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      // ── Theme colors ──────────────────────────────────────────
      let colors = getThemeColors()

      const observer = new MutationObserver(() => {
        colors = getThemeColors()
      })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

      // ── Resize ─────────────────────────────────────────────────
      const handleResize = () => {
        const dpr = Math.min(window.devicePixelRatio, 2)
        renderer.setPixelRatio(dpr)
        renderer.setSize(size, size)
      }
      window.addEventListener('resize', handleResize)

      // ── Animation ──────────────────────────────────────────────
      const clock = new THREE.Clock()

      const animate = () => {
        if (disposed) return
        animId = requestAnimationFrame(animate)

        const t = clock.getElapsedTime()
        const cm = modeRef.current
        const cl = levelRef.current
        const audioLvl = audioLevelRef.current

        // Intensity per mode
        let intensity: number
        switch (cm) {
          case 'idle':      intensity = 0.15 + 0.1 * Math.sin(t * 0.5); break
          case 'listening': intensity = 0.3 + audioLvl * 0.6; break
          case 'thinking':  intensity = 0.4 + 0.3 * Math.sin(t * 3); break
          case 'speaking':  intensity = 0.3 + cl * 0.5; break
        }

        // Vertex displacement
        const p = geo.attributes.position.array as Float32Array
        const disp = 0.04 + intensity * 0.08
        for (let i = 0; i < p.length; i++) {
          const wave = Math.sin(t * 1.5 + phases[i]) * 0.5 + 0.5
          p[i] = origPos[i] + (origPos[i] > 0 ? 1 : -1) * wave * disp
        }
        geo.attributes.position.needsUpdate = true
        geo.computeVertexNormals()

        // Rotation
        if (cm === 'thinking') {
          orb.rotation.x += 0.015
          orb.rotation.y += 0.025
        } else {
          orb.rotation.y = t * 0.2
          orb.rotation.x = Math.sin(t * 0.1) * 0.1
        }

        // Ring
        ring.rotation.z = t * 0.3
        ring.rotation.x = Math.PI / 3 + Math.sin(t * 0.2) * 0.1

        // Particles orbit
        const pp = particles.geometry.attributes.position.array as Float32Array
        for (let i = 0; i < PC; i++) {
          const speed = pSpeeds[i]
          const phase = pPhases[i]
          const theta = t * 0.15 * speed + phase
          const phi = Math.acos(2 * ((i / PC + Math.sin(t * 0.1 + phase) * 0.1) % 1 - 1))
          const r = 1.6 + Math.random() * 1.2
          pp[i * 3] = r * Math.sin(phi) * Math.cos(theta)
          pp[i * 3 + 1] = r * Math.cos(phi)
          pp[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
        }
        particles.geometry.attributes.position.needsUpdate = true

        // Color transition
        const target = (() => {
          switch (cm) {
            case 'speaking':  return colors.speaking
            case 'listening': return colors.listening
            case 'thinking':  return colors.thinking
            case 'idle':      return colors.idle
          }
        })()
        const s = 0.05
        const orbC = mat.color as THREE.Color
        orbC.r += (target.r / 255 - orbC.r) * s
        orbC.g += (target.g / 255 - orbC.g) * s
        orbC.b += (target.b / 255 - orbC.b) * s
        mat.emissiveIntensity = 0.2 + intensity * 0.4
        mat.emissive.copy(mat.color).multiplyScalar(0.3)

        const ringC = ringMat.color as THREE.Color
        ringC.r += (target.r / 255 - ringC.r) * s
        ringC.g += (target.g / 255 - ringC.g) * s
        ringC.b += (target.b / 255 - ringC.b) * s
        ringMat.opacity = 0.2 + intensity * 0.4

        const pC = pMat.color as THREE.Color
        pC.r += (target.r / 255 - pC.r) * s
        pC.g += (target.g / 255 - pC.g) * s
        pC.b += (target.b / 255 - pC.b) * s
        pMat.opacity = 0.3 + intensity * 0.4

        // Scale pulse
        orb.scale.setScalar(1 + intensity * 0.05)

        renderer.render(scene, camera)
      }
      animate()

      rendererDispose = () => {
        disposed = true
        cancelAnimationFrame(animId)
        observer.disconnect()
        window.removeEventListener('resize', handleResize)
        geo.dispose()
        mat.dispose()
        ringGeo.dispose()
        ringMat.dispose()
        pGeo.dispose()
        pMat.dispose()
        pTex.dispose()
        renderer.dispose()
      }
    }

    init().catch(console.error)

    return () => rendererDispose?.()
  }, [size])

  // ── Audio lifecycle (mic for listening mode) ────────────────────────
  useEffect(() => {
    let alive = true
    let mediaStream: MediaStream | null = null
    let audioCtx: AudioContext | null = null
    let audioAnimId = 0

    if (mode !== 'listening') {
      audioLevelRef.current = 0
      return
    }

    ;(async () => {
      try {
        const ctx = new AudioContext()
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (!alive) { stream.getTracks().forEach(t => t.stop()); ctx.close(); return }

        const src = ctx.createMediaStreamSource(stream)
        const an = ctx.createAnalyser()
        an.fftSize = 64
        src.connect(an)
        const data = new Uint8Array(an.frequencyBinCount)

        const read = () => {
          if (!alive) return
          an.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          audioLevelRef.current = sum / (data.length * 255)
          audioAnimId = requestAnimationFrame(read)
        }
        read()

        mediaStream = stream
        audioCtx = ctx
      } catch {
        audioLevelRef.current = 0
      }
    })()

    return () => {
      alive = false
      cancelAnimationFrame(audioAnimId)
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
      if (audioCtx) audioCtx.close()
      audioLevelRef.current = 0
    }
  }, [mode])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, display: 'block', borderRadius: '50%' }}
    />
  )
}
