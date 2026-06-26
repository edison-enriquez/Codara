import { useState } from 'react'
import { X, Key, Bot, ExternalLink, Eye, EyeOff, Cpu, Cloud, AlertTriangle } from 'lucide-react'
import { useAgent, type AgentProvider } from '../context/AgentContext'
import { WEBLLM_MODELS } from '../utils/webllmClient'

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · Versatile (recomendado)' },
  { id: 'llama3-8b-8192',          label: 'Llama 3 8B · Rápido' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B · Contexto largo' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B · Ligero' },
]

export default function AgentSettings() {
  const { config, setConfig, closeSettings, webgpuAvailable } = useAgent()
  const [provider, setProvider] = useState<AgentProvider>(config.provider)
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [groqModel, setGroqModel] = useState(config.groqModel)
  const [webllmModel, setWebllmModel] = useState(config.webllmModel)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    setConfig({ provider, apiKey: apiKey.trim(), groqModel, webllmModel })
    closeSettings()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeSettings}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-base shadow-2xl p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-purple" />
            <h2 className="text-base font-semibold text-text">Agente IA</h2>
          </div>
          <button onClick={closeSettings} className="text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Selector de proveedor */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <ProviderCard
            active={provider === 'webllm'}
            onClick={() => setProvider('webllm')}
            icon={<Cpu size={14} />}
            title="Local"
            subtitle="En tu navegador · gratis · privado"
          />
          <ProviderCard
            active={provider === 'groq'}
            onClick={() => setProvider('groq')}
            icon={<Cloud size={14} />}
            title="Nube (Groq)"
            subtitle="Rápido · requiere API key"
          />
        </div>

        {/* ── Config WebLLM ─────────────────────────────────────────────── */}
        {provider === 'webllm' && (
          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-wider">
              Modelo local
            </label>
            <select
              value={webllmModel}
              onChange={(e) => setWebllmModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-purple/50 focus:outline-none"
            >
              {WEBLLM_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {!webgpuAvailable ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-md border border-yellow/20 bg-yellow/5 px-2.5 py-2 text-xs text-yellow">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>Tu navegador no soporta <strong>WebGPU</strong>. Usa Chrome/Edge recientes, o cambia a Groq.</span>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted">
                Se descarga la primera vez y queda en caché (funciona offline). Requiere un equipo con GPU.
              </p>
            )}
          </div>
        )}

        {/* ── Config Groq ───────────────────────────────────────────────── */}
        {provider === 'groq' && (
          <>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-wider">
                Modelo
              </label>
              <select
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-purple/50 focus:outline-none"
              >
                {GROQ_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-wider">
                API Key de Groq
              </label>
              <div className="relative">
                <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-10 text-sm text-text placeholder-muted/50 focus:border-purple/50 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                >
                  {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 flex items-center gap-1 text-xs text-purple hover:underline"
              >
                Obtener API Key gratuita <ExternalLink size={10} />
              </a>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={closeSettings}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-muted hover:text-text transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-purple/20 border border-purple/30 py-2 text-sm font-medium text-purple hover:bg-purple/30 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function ProviderCard({
  active, onClick, icon, title, subtitle,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
        active
          ? 'border-purple/50 bg-purple/10'
          : 'border-border bg-surface hover:border-purple/30'
      }`}
    >
      <span className={`flex items-center gap-1.5 text-sm font-medium ${active ? 'text-purple' : 'text-text'}`}>
        {icon}
        {title}
      </span>
      <span className="text-[10px] leading-snug text-muted">{subtitle}</span>
    </button>
  )
}
