import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type AgentProvider = 'webllm' | 'groq' | 'opencodefree'

export interface AgentConfig {
  provider: AgentProvider
  /** Groq (nube) */
  apiKey: string
  groqModel: string
  /** WebLLM (local, en el navegador) */
  webllmModel: string
  /** OpenCode Free */
  opencodefreeApiKey: string
  opencodefreeModel: string
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
  opencodefreeApiKey: '',
  opencodefreeModel: 'mimo-v2.5-free',
}

/** WebGPU disponible (Chrome/Edge recientes, etc.). */
export function detectWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

/** Modelos retirados por Groq → reemplazo vigente (Groq cambia de modelos a menudo). */
const GROQ_MODEL_MIGRATION: Record<string, string> = {
  'llama3-8b-8192': 'llama-3.1-8b-instant',
  'llama3-70b-8192': 'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile': 'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768': 'llama-3.3-70b-versatile',
  'gemma2-9b-it': 'llama-3.1-8b-instant',
  'gemma-7b-it': 'llama-3.1-8b-instant',
}

function loadConfig(): AgentConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    // Migración del formato antiguo { apiKey, model } → groqModel / opencodefreeModel
    if (saved.model && !saved.groqModel) saved.groqModel = saved.model
    // Migración de modelos de Groq retirados (decommissioned)
    if (saved.groqModel && saved.groqModel in GROQ_MODEL_MIGRATION) {
      saved.groqModel = GROQ_MODEL_MIGRATION[saved.groqModel]
    }
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
    config.provider === 'groq' ? !!config.apiKey :
    config.provider === 'opencodefree' ? !!config.opencodefreeApiKey :
    webgpuAvailable

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
