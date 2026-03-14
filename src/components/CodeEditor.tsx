import Editor from '@monaco-editor/react'

interface Props {
  value: string
  onChange: (val: string) => void
  language?: string
  height?: string
  readOnly?: boolean
}

const LANG_MAP: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python',
}

export default function CodeEditor({ value, onChange, language = 'javascript', height = '340px', readOnly = false }: Props) {
  const monacoLang = LANG_MAP[language] ?? language

  return (
    <Editor
      height={height}
      language={monacoLang}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? '')}
      options={{
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        readOnly,
        renderLineHighlight: 'line',
        bracketPairColorization: { enabled: true },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
      }}
      loading={
        <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-muted">
          Cargando editor…
        </div>
      }
    />
  )
}
