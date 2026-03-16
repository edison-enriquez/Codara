---
id: "lab-06-numeros-5"
title: "Lab 1.2.12 — Solo números: Parte 5"
type: lab
language: c
difficulty: easy
order: 9
hints:
  - "Los hexadecimales en C usan el prefijo 0x seguido de dígitos 0-9 y letras A-F."
  - "21 en hexadecimal es 0x15 (1×16 + 5 = 21)."
  - "22 en hexadecimal es 0x16 (1×16 + 6 = 22)."
  - "62 en hexadecimal es 0x3E (3×16 + 14 = 62)."
  - "74 en hexadecimal es 0x4A (4×16 + 10 = 74)."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-hex"
    description: "Usaste al menos un número hexadecimal (prefijo 0x)"
    pattern: "0[xX][0-9a-fA-F]+"
    hint: "Usa notación hexadecimal: 0x15 para 21, 0x16 para 22, 0x3E para 62, 0x4A para 74"
    type: "regex"
    required: true
  - id: "has-4-printfs"
    description: "Tienes 4 llamadas a printf"
    pattern: "printf\\s*\\("
    hint: "Necesitas 4 llamadas a printf, una por cada número"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.12 — Solo números: Parte 5

**Nivel de dificultad:** Fácil

## Objetivo: usar números hexadecimales (base 16)

Los hexadecimales en C usan el prefijo `0x`. Los dígitos van del `0` al `9` y de `A` a `F` (donde A=10, B=11, ..., F=15).

Tabla de conversión útil:

| Decimal | Hexadecimal | Cálculo              |
|---------|-------------|----------------------|
| 21      | `0x15`      | 1×16 + 5 = 21        |
| 22      | `0x16`      | 1×16 + 6 = 22        |
| 62      | `0x3E`      | 3×16 + 14(E) = 62    |
| 74      | `0x4A`      | 4×16 + 10(A) = 74    |

## Escenario

Escribe un programa que imprima los siguientes valores **usando representación hexadecimal** en los literales numéricos:

```
The value of twenty-one is: 21
The value of twenty-two is: 22
The value of sixty-two is: 62
The value of seventy-four is: 74
```

```c lab
#include <stdio.h>

int main(void)
{
    // Usa literales hexadecimales (0x...) para cada número
    printf("The value of twenty-one is: %d\n",   /* 0x?? */);
    printf("The value of twenty-two is: %d\n",   /* 0x?? */);
    printf("The value of sixty-two is: %d\n",    /* 0x?? */);
    printf("The value of seventy-four is: %d\n", /* 0x?? */);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-21", 1, "Debe imprimir 'The value of twenty-one is: 21'");
    TEST("output-22", 1, "Debe imprimir 'The value of twenty-two is: 22'");
    TEST("output-62", 1, "Debe imprimir 'The value of sixty-two is: 62'");
    TEST("output-74", 1, "Debe imprimir 'The value of seventy-four is: 74'");
}
```
