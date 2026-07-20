import { Link } from 'react-router-dom'
import { Github, Sun, Moon, LogIn, LogOut, Bot, Square } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { useAuth } from '../context/AuthContext'
import { useAgent } from '../context/AgentContext'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

export default function Header({ theme, onToggleTheme }: Props) {
  const { user, login, logout } = useAuth()
  const { openSettings, isConfigured } = useAgent()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-base">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-3 sm:px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold tracking-widest uppercase sm:text-base">
            <Square className="text-green" size={10} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            <span className="text-text">Codara</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex min-w-0 items-center gap-2 text-xs text-muted uppercase tracking-wider sm:gap-5">
          <Link to="/" className="hover:text-green transition-colors">
            Cursos
          </Link>
          <a
            href="https://github.com/edison-enriquez/Codara"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 hover:text-green transition-colors sm:flex"
          >
            <Github size={13} />
            GitHub
          </a>
          <span className="hidden rounded border border-green/30 bg-green/10 px-2 py-0.5 text-green text-xs sm:inline">
            BETA
          </span>

          {/* Agent settings */}
          <button
            onClick={openSettings}
            aria-label="Configurar agente IA"
            title={isConfigured ? 'Agente IA configurado' : 'Configurar agente IA'}
            className={`flex items-center justify-center border w-7 h-7 transition-colors ${
              isConfigured
                ? 'border-purple/40 text-purple hover:border-purple hover:bg-purple/10'
                : 'border-border text-muted hover:border-purple/50 hover:text-purple'
            }`}
          >
            <Bot size={13} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="flex items-center justify-center border border-border w-7 h-7 text-muted hover:border-green/50 hover:text-green transition-colors"
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <img
                src={user.avatar}
                alt={user.login}
                className="w-6 h-6 rounded-full border border-border"
                referrerPolicy="no-referrer"
              />
              <span className="hidden normal-case text-muted md:inline">{user.login}</span>
              <button
                onClick={logout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex items-center justify-center border border-border w-7 h-7 text-muted hover:border-red/50 hover:text-red transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              title="Iniciar sesión con GitHub"
              aria-label="Iniciar sesión con GitHub"
              className="flex items-center gap-1.5 border border-border px-2 py-1 text-muted hover:border-green/50 hover:text-green transition-colors normal-case sm:px-2"
            >
              <LogIn size={13} />
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

