---
id: "lab-08-variables-2"
title: "Lab 1.2.14 — Variables: Parte 2"
type: lab
language: c
difficulty: easy
order: 11
hints:
  - "Los nombres de variables no pueden comenzar con un número: '60seconds' es inválido."
  - "Renombra '60seconds' a algo válido como 'seconds' o 'segundos_en_minuto'."
  - "Renombra '60minutes' a algo válido como 'minutes' o 'minutos_en_hora'."
  - "Además, el valor de '60minutes' (minutos por hora) está mal: es 50 en lugar de 60."
  - "Una hora = 60 minutos × 60 segundos = 3600 segundos."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "no-60seconds"
    description: "El nombre inválido '60seconds' fue corregido"
    pattern: "60seconds"
    hint: "Renombra '60seconds' a un nombre válido que comience con letra."
    type: "regex-not"
    required: true
  - id: "no-60minutes"
    description: "El nombre inválido '60minutes' fue corregido"
    pattern: "60minutes"
    hint: "Renombra '60minutes' a un nombre válido que comience con letra."
    type: "regex-not"
    required: true
  - id: "has-multiplication"
    description: "Hay una multiplicación para calcular los segundos"
    pattern: "\\w+\\s*\\*\\s*\\w+"
    hint: "Calcula: segundos = minutos_por_hora * segundos_por_minuto"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.14 — Variables: Parte 2

**Nivel de dificultad:** Fácil

## Objetivos

- Corregir nombres de variables inválidos
- Calcular una expresión aritmética simple con variables

## Escenario

El programa tiene **tres errores**: dos nombres de variables inválidos y un valor incorrecto. Corrígelos para producir:

```
One hour is 3600 seconds
```

> 💡 Recuerda: `1 hora = 60 minutos × 60 segundos = 3600 segundos`.

```c lab
#include <stdio.h>

int main()
{
    int 60seconds = 60;
    int 60minutes = 50;
    printf("One hour is %d seconds\n", 60seconds * 60minutes);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-3600", 1, "La salida debe ser: One hour is 3600 seconds");
}
```
