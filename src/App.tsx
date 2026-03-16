import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import CoursePage from './pages/CoursePage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { useTheme, ThemeContext } from './hooks/useTheme'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  const { theme, toggle } = useTheme()

  return (
    <ThemeContext.Provider value={theme}>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-base">
            <Header theme={theme} onToggleTheme={toggle} />
            <main className="flex flex-1 flex-col">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/course/:courseId" element={<CoursePage />} />
                <Route path="/course/:courseId/:lessonId" element={<CoursePage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeContext.Provider>
  )
}

