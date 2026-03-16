import { Link } from 'react-router-dom'
import { Github, Sun, Moon, LogIn, LogOut } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { useAuth } from '../context/AuthContext'

interface Props {
  theme: Theme
  onToggleTheme: () => void
}

export default function Header({ theme, onToggleTheme }: Props) {
  const { user, login, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-base">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-base font-bold tracking-widest text-green uppercase">
            &#9632; CODARA
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-5 text-xs text-muted uppercase tracking-wider">
          <Link to="/" className="hover:text-green transition-colors">
            Cursos
          </Link>
          <a
            href="https://github.com/edison-enriquez/Codara"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-green transition-colors"
          >
            <Github size={13} />
            GitHub
          </a>
          <span className="rounded border border-green/30 bg-green/10 px-2 py-0.5 text-green text-xs">
            BETA
          </span>

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
              <span className="hidden sm:inline normal-case text-muted">{user.login}</span>
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
              className="flex items-center gap-1.5 border border-border px-2 py-1 text-muted hover:border-green/50 hover:text-green transition-colors normal-case"
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

