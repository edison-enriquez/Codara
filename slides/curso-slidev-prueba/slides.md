---
theme: default
title: Introducción a Slidev
info: |
  Una presentación de prueba para Codara.
class: text-center
drawings:
  persist: false
transition: slide-left
mdc: true
---

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useNav } from '@slidev/client'

const nav = useNav()

function handleParentMessage(event: MessageEvent) {
  const data = event.data
  if (import.meta.env.DEV || !data || data.target !== 'slidev' || data.type !== 'navigate') return

  if (data.no || data.clicks) {
    nav.go(Number(data.no), Number(data.clicks) || 0)
  } else if (typeof data.operation === 'string') {
    const operation = nav[data.operation as keyof typeof nav]
    if (typeof operation === 'function') operation(...(data.args ?? []))
  }
}

onMounted(() => window.addEventListener('message', handleParentMessage))
onUnmounted(() => window.removeEventListener('message', handleParentMessage))
</script>

# Introducción a Slidev

Diapositivas para cursos, creadas con Markdown.

<div class="pt-12">
  <span class="px-2 py-1 rounded cursor-pointer" @click="$slidev.nav.next">
    Pulsa espacio para comenzar
  </span>
</div>

---
layout: two-cols
---

# ¿Qué es Slidev?

Slidev convierte un archivo Markdown en una presentación web.

- Es ideal para contenido técnico.
- Admite código, componentes Vue y diagramas.
- Incluye modo presentador y exportación.

::right::

```md
---
theme: default
---

# Una diapositiva

Contenido en Markdown
```

---
layout: center
class: text-center
---

# Código ejecutable visualmente

```ts {all|2-3|5}
function saludar(nombre: string) {
  return `Hola, ${nombre}`
}

console.log(saludar('Codara'))
```

---
layout: center
class: text-center
---

# Siguiente paso

Edita este archivo y ejecuta:

```bash
npm run dev:slides
```

El curso incrusta la versión exportada con `npm run build:slides`.

---
layout: end
---

# Fin

Ya tienes una presentación Slidev dentro de Codara.