import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Component, type ReactNode, type ErrorInfo } from 'react'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import CoursePage from './pages/CoursePage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import AgentSettings from './components/AgentSettings'
import { useTheme, ThemeContext } from './hooks/useTheme'
import { AuthProvider } from './context/AuthContext'
import { AgentProvider, useAgent } from './context/AgentContext'

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error).message
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', color: '#f87171' }}>
          <h2>Error al cargar la aplicación</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>{msg}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', cursor: 'pointer' }}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function AppShell({ theme, toggle }: { theme: string; toggle: () => void }) {
  const { settingsOpen } = useAgent()
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <Header theme={theme as any} onToggleTheme={toggle} />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/course/:courseId" element={<CoursePage />} />
          <Route path="/course/:courseId/:lessonId" element={<CoursePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
        </Routes>
      </main>
      {settingsOpen && <AgentSettings />}
    </div>
  )
}

export default function App() {
  const { theme, toggle } = useTheme()

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={theme}>
        <AuthProvider>
          <AgentProvider>
            <BrowserRouter basename="/Codara">
              <AppShell theme={theme} toggle={toggle} />
            </BrowserRouter>
          </AgentProvider>
        </AuthProvider>
      </ThemeContext.Provider>
    </ErrorBoundary>
  )
}

