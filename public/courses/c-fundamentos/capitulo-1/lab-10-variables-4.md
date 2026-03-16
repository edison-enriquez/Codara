---
id: "lab-10-variables-4"
title: "Lab 1.2.16 — Variables: Parte 4"
type: lab
language: c
difficulty: easy
order: 13
hints:
  - "El año 2026 NO es bisiesto. Febrero tiene 28 días."
  - "Primera mitad: enero (31) + febrero (28) + marzo (31) + abril (30) + mayo (31) + junio (30) = 181."
  - "Segunda mitad: julio (31) + agosto (31) + septiembre (30) + octubre (31) + noviembre (30) + diciembre (31) = 184."
  - "Total del año = primera_mitad + segunda_mitad = 365."
  - "Declara variables int para cada semestre y para el total."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-int-vars"
    description: "Declaraste variables int"
    pattern: "int\\s+\\w+"
    hint: "Declara variables para almacenar los días de cada mitad del año"
    type: "regex"
    required: true
  - id: "has-3-printfs"
    description: "Tienes al menos 3 llamadas a printf"
    pattern: "printf\\s*\\("
    hint: "Necesitas imprimir: primera mitad, segunda mitad y total"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.16 — Variables: Parte 4

**Nivel de dificultad:** Fácil

## Objetivos

- Usar variables para almacenar y calcular días del año
- Sumar variables para obtener un total

## Escenario

Escribe un programa que calcule e imprima los días del año actual (**2026**, año no bisiesto) dividido en dos mitades.

**Primera mitad** (enero–junio):

| Mes | Días |
|-----|------|
| Enero | 31 |
| Febrero | 28 |
| Marzo | 31 |
| Abril | 30 |
| Mayo | 31 |
| Junio | 30 |
| **Total** | **181** |

**Segunda mitad** (julio–diciembre):

| Mes | Días |
|-----|------|
| Julio | 31 |
| Agosto | 31 |
| Septiembre | 30 |
| Octubre | 31 |
| Noviembre | 30 |
| Diciembre | 31 |
| **Total** | **184** |

La salida esperada es:

```
Days in the first half of the current year: 181
Days in the second half of the current year: 184
Days in the current year: 365
```

```c lab
#include <stdio.h>

int main(void)
{
    // Declara variables para cada mitad del año y el total
    int first_half  = /* suma de días enero-junio */;
    int second_half = /* suma de días julio-diciembre */;
    int total       = first_half + second_half;

    printf("Days in the first half of the current year: %d\n",  first_half);
    printf("Days in the second half of the current year: %d\n", second_half);
    printf("Days in the current year: %d\n", total);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-181", 1, "La primera mitad debe ser 181 días");
    TEST("output-184", 1, "La segunda mitad debe ser 184 días");
    TEST("output-365", 1, "El total debe ser 365 días");
}
```
