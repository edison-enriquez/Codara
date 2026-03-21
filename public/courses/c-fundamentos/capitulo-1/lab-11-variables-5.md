---
id: "lab-11-variables-5"
title: "Lab 1.2.17 — Variables: Parte 5"
type: lab
language: c
difficulty: easy
order: 14
hints:
  - "Q1 = enero(31) + febrero(28) + marzo(31) = 90 días."
  - "Q2 = abril(30) + mayo(31) + junio(30) = 91 días."
  - "Q3 = julio(31) + agosto(31) + septiembre(30) = 92 días."
  - "Q4 = octubre(31) + noviembre(30) + diciembre(31) = 92 días."
  - "Total = Q1 + Q2 + Q3 + Q4 = 365 días (2026 no es bisiesto)."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-4-int-vars"
    description: "Declaraste variables para los trimestres"
    pattern: "int\\s+\\w+"
    hint: "Declara 4 variables, una para cada trimestre (Q1, Q2, Q3, Q4)"
    type: "regex"
    required: true
  - id: "has-4-printfs"
    description: "Tienes al menos 4 llamadas a printf"
    pattern: "printf\\s*\\("
    hint: "Necesitas imprimir los 4 trimestres"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.17 — Variables: Parte 5

**Nivel de dificultad:** Fácil

## Objetivos

- Usar múltiples variables para organizar datos
- Calcular totales a partir de variables

## Escenario

Escribe un programa que calcule e imprima la cantidad de días en cada uno de los **cuatro trimestres** del año 2026 (no bisiesto).

| Trimestre | Meses                         | Días |
|-----------|-------------------------------|------|
| Q1        | Enero, Febrero, Marzo         |  90  |
| Q2        | Abril, Mayo, Junio            |  91  |
| Q3        | Julio, Agosto, Septiembre     |  92  |
| Q4        | Octubre, Noviembre, Diciembre |  92  |
| **Total** |                               | **365** |

La salida esperada es:

```
Days in Q1 of the current year: 90
Days in Q2 of the current year: 91
Days in Q3 of the current year: 92
Days in Q4 of the current year: 92
```

> 💡 Usa variables para cada trimestre. Esto hace el código más claro y fácil de modificar si el año cambia.

```c lab
#include <stdio.h>

int main(void)
{
    // Declara una variable int para cada trimestre
    int q1 = /* enero + febrero + marzo */;
    int q2 = /* abril + mayo + junio */;
    int q3 = /* julio + agosto + septiembre */;
    int q4 = /* octubre + noviembre + diciembre */;

    printf("Days in Q1 of the current year: %d\n", q1);
    printf("Days in Q2 of the current year: %d\n", q2);
    printf("Days in Q3 of the current year: %d\n", q3);
    printf("Days in Q4 of the current year: %d\n", q4);
    return 0;
}
```

```c io-tests
[
  {
    "name": "Salida completa correcta",
    "input": "",
    "expected": "Days in Q1 of the current year: 90\nDays in Q2 of the current year: 91\nDays in Q3 of the current year: 92\nDays in Q4 of the current year: 92"
  }
]
```
