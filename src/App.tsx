import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import CoursePage from './pages/CoursePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-base">
        <Header />
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/course/:courseId" element={<CoursePage />} />
            <Route path="/course/:courseId/:lessonId" element={<CoursePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
