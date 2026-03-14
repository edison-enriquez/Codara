import { Link } from 'react-router-dom'
import { Code2, BookOpen, Github } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-base/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-text font-semibold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue/20 text-blue">
            <Code2 size={18} />
          </div>
          <span>Codara</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <Link to="/" className="flex items-center gap-1 hover:text-text transition-colors">
            <BookOpen size={14} />
            Cursos
          </Link>
          <a
            href="https://github.com/edison-enriquez/Codara"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-text transition-colors"
          >
            <Github size={14} />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}
