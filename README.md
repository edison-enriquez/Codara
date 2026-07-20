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

## Publicar en GitHub Pages

Cada push a `main` ejecuta `.github/workflows/deploy.yml`, genera el contenido y
las diapositivas, compila la aplicación y la publica en:

`https://edison-enriquez.github.io/Codara/`

En la configuración del repositorio, **Settings → Pages** debe usar **GitHub
Actions** como origen de despliegue. También se puede iniciar el workflow
manualmente desde **Actions → Deploy to GitHub Pages → Run workflow**.

## Presentaciones Slidev

El curso de prueba **Introducción a Slidev** incrusta una presentación generada con [Slidev](https://sli.dev/guide/). Su fuente está en [`slides/curso-slidev-prueba/slides.md`](slides/curso-slidev-prueba/slides.md).

```bash
# Editar y previsualizar la presentación con Slidev
npm run dev:slides

# Exportar la presentación estática que muestra el curso
npm run build:slides
```

Los comandos `npm run dev` y `npm run build` exportan las diapositivas automáticamente.

## Arquitectura de contenido

El contenido sigue tres capas: **fuente cruda → contenido canónico → manifiesto generado**. La app solo consume el manifiesto.

```
content-sources/        ← CAPA 0 · fuentes crudas (HTML edube, etc.) — NO se despliega
content/                ← CAPA 1 · contenido canónico (la ÚNICA fuente de verdad)
  <curso-id>/
    course.json         ← metadata del curso + estructura ordenada (capítulos/lecciones)
    capitulo-1/
      leccion.md        ← lección (frontmatter manda: id, title, type)
      lab-01.md         ← laboratorio interactivo
        │
        ▼  npm run build:content   (scripts/build-content.mjs)
public/courses/         ← CAPA 2 · GENERADO (gitignored) — no editar a mano
  index.json            ← catálogo con conteos DERIVADOS
  <curso-id>/meta.json  ← estructura derivada de course.json + frontmatter
  <curso-id>/**.md      ← copiados verbatim
```

**Reglas:**

- `id`, `title` y `type` salen del **frontmatter** del `.md` — no se duplican en otro sitio.
- El **orden** de las lecciones es su posición en `course.json` (no hay campo `order` que mantener).
- `lessonsCount` / `labsCount` se **calculan**; nunca se escriben a mano.
- `build:content` corre solo antes de `dev` y `build` (hooks `predev` / `prebuild`). Si una lección referenciada falta o su frontmatter es inválido, **el build falla**.

### `course.json`

```jsonc
{
  "id": "mi-curso", "title": "…", "description": "…",
  "difficulty": "beginner", "language": "c", "category": "…",
  "icon": "⚙️", "estimatedTime": "8 horas", "tags": ["…"],
  // Con capítulos:
  "chapters": [
    { "id": "capitulo-1", "title": "Capítulo 1 — …",
      "lessons": ["capitulo-1/1.0-intro.md", "capitulo-1/lab-01.md"] }
  ]
  // …o plano: "lessons": ["01-intro.md", "lab-01.md"]
}
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