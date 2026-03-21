import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GitHubUser {
  id:     string
  login:  string
  name:   string
  avatar: string
}

interface AuthState {
  user:    GitHubUser | null
  loading: boolean
  login:   () => void
  logout:  () => void
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  user:    null,
  loading: true,
  login:   () => {},
  logout:  () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

// ─── Clave en localStorage ────────────────────────────────────────────────────

export const AUTH_TOKEN_KEY = 'codara_auth_token'

// ─── Decodificar JWT en el cliente (sin verificar firma — solo lectura de claims) ──

function decodeJWT(token: string): GitHubUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // base64url → base64 → string
    const json    = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json)
    // Verificar expiración client-side
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return {
      id:     payload.sub   ?? '',
      login:  payload.login ?? '',
      name:   payload.name  ?? payload.login ?? '',
      avatar: payload.avatar ?? '',
    }
  } catch {
    return null
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<GitHubUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restaurar sesión desde localStorage al cargar
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      const decoded = decodeJWT(token)
      if (decoded) {
        setUser(decoded)
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
    setLoading(false)
  }, [])

  function login() {
    const raw = import.meta.env.VITE_SERVER_URL as string | undefined
    const serverUrl = raw?.replace(/\/+$/, '')  // quitar trailing slash
    if (!serverUrl) {
      console.error('[Auth] VITE_SERVER_URL no está configurado. Añade SERVER_URL como secret en GitHub Actions.')
      window.alert('Login no disponible: el servidor no está configurado.\nContacta al administrador.')
      return
    }
    console.log('[Auth] Redirigiendo a', serverUrl + '/auth/github')
    window.location.href = `${serverUrl}/auth/github`
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
