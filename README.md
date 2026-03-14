# Codara

Plataforma interactiva de cursos de programación — estilo HackerRank + smartcontract.engineer.

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Editor:** Monaco Editor (el mismo de VS Code)
- **Estilos:** Tailwind CSS (tema oscuro estilo GitHub)
- **Ejecución JS:** iframe sandboxed (seguro, sin backend)
- **Ejecución Python:** Pyodide (WebAssembly, en el navegador)
- **Cursos:** archivos `.md` con frontmatter YAML

## Características

- Lecciones con bloques de código **ejecutables** (`js exec`, `python exec`)
- **Labs interactivos** con editor Monaco integrado
- **Runner de pruebas** con resultados por test
- **Sistema de pistas progresivo** (se van revelando de a una)
- Seguimiento de progreso via localStorage
- 3 cursos incluidos: C (fundamentos), JavaScript y Python

## Empezar

```bash
npm install
npm run dev
```

La app estará disponible en `http://localhost:5173`.

## Estructura de cursos

Los cursos viven en `public/courses/`:

```
public/courses/
  index.json            ← catálogo de cursos
  <curso-id>/
    meta.json           ← lecciones del curso
    leccion.md          ← lección normal
    lab-01.md           ← laboratorio interactivo
```

### Frontmatter de una lección

```yaml
---
id: "mi-leccion"
title: "Título de la lección"
type: lesson         # o: lab
language: javascript # javascript | python | c
difficulty: beginner
---
```

### Bloques especiales en `.md`

| Bloque | Descripción |
|--------|-------------|
| ` ```js exec ` | Código JS ejecutable con botón "Ejecutar" |
| ` ```python exec ` | Código Python ejecutable via Pyodide |
| ` ```js lab ` | Código inicial del lab (editable en Monaco) |
| ` ```js tests ` | Tests del lab (se ejecutan contra el código del editor) |
| ` ```hints ` | Lista de pistas (se revelan progresivamente) |

## Licencia

MIT