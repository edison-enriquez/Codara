---
id: "lab-05-numeros-4"
title: "Lab 1.2.11 — Solo números: Parte 4"
type: lab
language: c
difficulty: easy
order: 8
hints:
  - "Línea 1: '01x' no es un número válido. Debes usar números octales (base 8) para representar el 9."
  - "El número 9 en base 8 se escribe como 011 (cero-uno-uno)."
  - "Línea 2: '0x2' es el número hexadecimal 2, no el número 10."
  - "El número 10 en base 8 se escribe como 012. También puedes usar directamente el decimal 10."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "no-01x"
    description: "El literal inválido '01x' fue corregido"
    pattern: "01x"
    hint: "Reemplaza '01x' por el número octal correcto: 011"
    type: "regex-not"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.11 — Solo números: Parte 4

**Nivel de dificultad:** Fácil

## Objetivo: usar números octales (base 8)

Los octales en C se escriben con el prefijo `0` (cero). Por ejemplo:

| Decimal | Octal |
|---------|-------|
| 7       | `07`  |
| 8       | `010` |
| 9       | `011` |
| 10      | `012` |

## Escenario

El programa tiene **dos errores**. Corrígelos para obtener esta salida **usando representación octal**:

```
The value of nine is: 9
The value of ten is: 10
```

> 💡 Pista: `0x2` es un número **hexadecimal** (hex 2 = decimal 2), no 10. Para representar 10 en octal, usa `012`.

```c lab
#include <stdio.h>

int main()
{
    printf("The value of nine is: %d \n", 01x);
    printf("The value of ten is: %d \n", 0x2);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-nine", 1, "Debe imprimir: The value of nine is: 9");
    TEST("output-ten", 1, "Debe imprimir: The value of ten is: 10");
}
```
