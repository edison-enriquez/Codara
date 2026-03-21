import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface AgentConfig {
  apiKey: string
  model: string
}

interface AgentContextValue {
  config: AgentConfig
  setConfig: (cfg: AgentConfig) => void
  isConfigured: boolean
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

const STORAGE_KEY = 'codara_agent_config'
const DEFAULTS: AgentConfig = { apiKey: '', model: 'llama-3.3-70b-versatile' }

function loadConfig(): AgentConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) }
  } catch {}
  return DEFAULTS
}

const AgentContext = createContext<AgentContextValue | null>(null)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AgentConfig>(loadConfig)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const setConfig = useCallback((cfg: AgentConfig) => {
    setConfigState(cfg)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  }, [])

  return (
    <AgentContext.Provider value={{
      config,
      setConfig,
      isConfigured: !!config.apiKey,
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
