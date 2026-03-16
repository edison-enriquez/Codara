---
id: "lab-12-comentarios"
title: "Lab 1.2.18 — Comentarios: ¿son siempre útiles?"
type: lab
language: c
difficulty: easy
order: 15
hints:
  - "Los comentarios no siempre son la mejor manera de documentar el código."
  - "Un nombre de variable descriptivo como 'seconds_per_hour' comunica más que un comentario '/* 3600 */'."
  - "Reemplaza los comentarios con nombres de variables que expliquen el propósito."
  - "Ejemplo: en lugar de 'int x = 3; /* horas */', usa 'int hours = 3;'"
  - "La salida esperada tiene 3 líneas con valores 10800, 180 y 300."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-descriptive-vars"
    description: "Usaste nombres de variables descriptivos"
    pattern: "int\\s+(hours|minutes|seconds|horas|minutos|segundos|seconds_per|minutes_per)\\w*"
    hint: "Usa nombres descriptivos como 'hours', 'minutes_in_hour', 'seconds_per_minute', etc."
    type: "regex"
    required: true
  - id: "has-3-printfs"
    description: "Tienes al menos 3 llamadas a printf"
    pattern: "printf\\s*\\("
    hint: "El programa debe imprimir 3 líneas"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.18 — Comentarios: ¿son siempre útiles?

**Nivel de dificultad:** Fácil

## Objetivo

Aprender cuándo los comentarios son útiles y cuándo es mejor dejar que el código se explique a sí mismo mediante **buenos nombres de variables**.

## Reflexión

Los comentarios no siempre son la mejor solución. A veces es mucho mejor dejar la información **en el código mismo**, usando nombres de variables legibles.

**Código con comentarios innecesarios:**
```c
int a = 3;   /* horas */
int b = 60;  /* minutos por hora */
int c = 60;  /* segundos por minuto */
printf("There are %d seconds in %d hours.\n", a * b * c, a);
```

**Código mejorado con nombres descriptivos:**
```c
int hours             = 3;
int minutes_per_hour  = 60;
int seconds_per_minute = 60;
printf("There are %d seconds in %d hours.\n",
       hours * minutes_per_hour * seconds_per_minute, hours);
```

El segundo código es más claro **sin ningún comentario**.

## Escenario

El código de abajo usa variables con nombres poco descriptivos (`a`, `b`, `c`, etc.) y comentarios para explicarlos. Mejóralo usando **nombres de variables descriptivos** para que los comentarios sean innecesarios.

La salida esperada es:

```
There are 10800 seconds in 3 hours.
There are 180 seconds in 3 minutes.
There are 300 seconds in 5 minutes.
```

```c lab
#include <stdio.h>

int main(void)
{
    /* cantidad de horas */
    int a = 3;
    /* minutos por hora */
    int b = 60;
    /* segundos por minuto */
    int c = 60;
    printf("There are %d seconds in %d hours.\n", a * b * c, a);

    /* ahora con minutos */
    int d = 3;   /* minutos */
    printf("There are %d seconds in %d minutes.\n", d * c, d);

    int e = 5;   /* minutos */
    printf("There are %d seconds in %d minutes.\n", e * c, e);

    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-10800", 1, "Debe imprimir: There are 10800 seconds in 3 hours.");
    TEST("output-180", 1, "Debe imprimir: There are 180 seconds in 3 minutes.");
    TEST("output-300", 1, "Debe imprimir: There are 300 seconds in 5 minutes.");
}
```
