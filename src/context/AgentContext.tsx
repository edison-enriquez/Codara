import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type AgentProvider = 'webllm' | 'groq'

export interface AgentConfig {
  provider: AgentProvider
  /** Groq (nube) */
  apiKey: string
  groqModel: string
  /** WebLLM (local, en el navegador) */
  webllmModel: string
}

interface AgentContextValue {
  config: AgentConfig
  setConfig: (cfg: AgentConfig) => void
  /** El agente IA está disponible (Groq con key, o WebLLM con WebGPU). */
  isConfigured: boolean
  /** El navegador soporta WebGPU (requisito para el modelo local). */
  webgpuAvailable: boolean
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const STORAGE_KEY = 'codara_agent_config'

export const DEFAULTS: AgentConfig = {
  provider: 'webllm',
  apiKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  webllmModel: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
}

/** WebGPU disponible (Chrome/Edge recientes, etc.). */
export function detectWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

function loadConfig(): AgentConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    // Migración del formato antiguo { apiKey, model } → groqModel
    if (saved.model && !saved.groqModel) saved.groqModel = saved.model
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AgentConfig>(loadConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const webgpuAvailable = detectWebGPU()

  const setConfig = useCallback((cfg: AgentConfig) => {
    setConfigState(cfg)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }, [])

  const isConfigured =
    config.provider === 'groq' ? !!config.apiKey : webgpuAvailable

  return (
    <AgentContext.Provider value={{
      config,
      setConfig,
      isConfigured,
      webgpuAvailable,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }}>
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be inside AgentProvider')
  return ctx
}
