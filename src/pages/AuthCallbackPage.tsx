import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_TOKEN_KEY } from '../context/AuthContext'

/**
 * Página transitoria: el servidor redirige aquí con ?token=JWT tras el
 * login exitoso de GitHub. Guarda el token y vuelve al inicio.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get('token')

    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    }

    // Reemplazar la entrada del historial para que "atrás" no regrese aquí
    navigate('/', { replace: true })
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <p className="text-sm text-muted animate-pulse">Iniciando sesión…</p>
    </div>
  )
}
