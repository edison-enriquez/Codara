import { useState } from 'react'
import { X, Key, Bot, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useAgent } from '../context/AgentContext'

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B · Versatile (recomendado)' },
  { id: 'llama3-8b-8192',          label: 'Llama 3 8B · Rápido' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B · Contexto largo' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B · Ligero' },
]

export default function AgentSettings() {
  const { config, setConfig, closeSettings } = useAgent()
  const [apiKey, setApiKey] = useState(config.apiKey)
  const [model, setModel] = useState(config.model)
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    setConfig({ apiKey: apiKey.trim(), model })
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
            <h2 className="text-base font-semibold text-text">Agente IA · Groq</h2>
          </div>
          <button onClick={closeSettings} className="text-muted hover:text-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Model */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-muted uppercase tracking-wider">
            Modelo
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-purple/50 focus:outline-none"
          >
            {GROQ_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
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
