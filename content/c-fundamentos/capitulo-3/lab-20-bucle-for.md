---
id: lab-20-bucle-for
title: "Lab 3.3 — Bucle for y tabla de multiplicar"
type: lab
language: c
hints:
  - "Estructura: for (init; condición; actualización) { cuerpo; }"
  - "Para bucles anidados, usa variables distintas: i y j"
  - "Para espaciar con printf: printf(\"%4d\", n); ocupa 4 caracteres"
  - "El bucle interno completa una fila; el externo avanza a la siguiente"
checks:
  - id: "has-for"
    description: "Usas al menos un bucle for"
    pattern: "\\bfor\\s*\\("
    hint: "Usa: for (i = 1; i <= N; i++) { ... }"
    type: "regex"
    required: true
  - id: "has-nested-for"
    description: "Tienes bucles for anidados"
    pattern: "for\\s*\\([^)]+\\)[^{]*\\{[^}]*for\\s*\\("
    hint: "Anida dos for: uno para filas y otro para columnas"
    type: "regex"
    required: true
  - id: "has-multiplication"
    description: "Multiplicas los índices de los bucles"
    pattern: "[ij]\\s*\\*\\s*[ij]"
    hint: "Multiplica: i * j para cada celda de la tabla"
    type: "regex"
    required: true
  - id: "has-newline"
    description: "Imprimes una nueva línea al final de cada fila"
    pattern: "printf\\s*\\(\\s*\"\\\\n\""
    hint: "Después del bucle interno: printf(\"\\n\");"
    type: "regex"
    required: true
---

## Tabla de multiplicar con for

El bucle `for` es ideal cuando sabes exactamente cuántas repeticiones necesitas.

### Tu misión

Crea la **tabla de multiplicar del 1 al 5** usando dos bucles `for` anidados:

```
     1    2    3    4    5
     2    4    6    8   10
     3    6    9   12   15
     4    8   12   16   20
     5   10   15   20   25
```

- El bucle externo recorre las **filas** (del 1 al 5)
- El bucle interno recorre las **columnas** (del 1 al 5)
- Usa `%5d` para alinear los números en columnas de 5 caracteres

```c lab
#include <stdio.h>

int main(void)
{
    int i, j;

    // Bucle externo: filas (i del 1 al 5)
    for (i = 1; i <= 5; i++) {

        // Bucle interno: columnas (j del 1 al 5)
        for (j = 1; j <= 5; j++) {
            // Imprime i * j con ancho 5
            
        }

        // Nueva línea al terminar cada fila
        printf("\n");
    }

    return 0;
}
```

```c io-tests
[
  {
    "name": "Tabla de multiplicar 5x5",
    "input": "",
    "expected": "    1    2    3    4    5\n    2    4    6    8   10\n    3    6    9   12   15\n    4    8   12   16   20\n    5   10   15   20   25"
  }
]
```
