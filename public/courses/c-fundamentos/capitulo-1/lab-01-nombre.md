---
id: "lab-01-nombre"
title: "Lab 1.1.2 — ¿Cuál es tu nombre?"
type: lab
language: c
difficulty: beginner
order: 4
hints:
  - "Usa puts() para imprimir texto en pantalla."
  - "Llama a puts() tres veces, una por línea."
  - "No olvides #include <stdio.h> al inicio."
  - "La función main debe retornar 0 al final."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-main"
    description: "Definiste la función main"
    pattern: "int\\s+main\\s*\\("
    hint: "Declara la función principal: int main(void) {"
    type: "regex"
    required: true
  - id: "has-puts-or-printf"
    description: "Usaste puts o printf para imprimir"
    pattern: "(puts|printf)\\s*\\("
    hint: "Usa puts(\"tu nombre\"); para imprimir texto"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final de main"
    pattern: "return\\s+0"
    hint: "Agrega al final de main: return 0;"
    type: "regex"
    required: true
  - id: "three-calls"
    description: "Llamaste a puts o printf al menos 3 veces"
    pattern: "(puts|printf)\\s*\\(.*\\)\\s*;"
    hint: "Necesitas imprimir tu nombre 3 veces, usa puts() tres veces"
    type: "regex"
    required: true
---

# Lab 1.1.2 — ¿Cuál es tu nombre?

**Nivel de dificultad:** Muy fácil

## Objetivos

- Escribir tu primer programa completo en C
- Usar la función `puts()` para imprimir texto
- Entender la estructura básica de la función `main`

## Escenario

Escribe un programa en C que **imprima tu nombre 3 veces** en la pantalla. Recuerda incluir la sentencia `return` y hacer uso apropiado de la función `main`.

La salida esperada (con tu nombre) debería verse así:

```
Juan
Juan
Juan
```

### Requisitos

1. Incluir `#include <stdio.h>`
2. Definir la función `int main(void)`
3. Llamar a `puts("tu nombre")` **tres veces**
4. Retornar `0` al final

> 💡 `puts()` imprime el texto y añade automáticamente un salto de línea al final.

```c lab
#include <stdio.h>

int main(void)
{
    // Imprime tu nombre 3 veces usando puts()

    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("tiene-main", 1, "La función main está definida");
}
```
