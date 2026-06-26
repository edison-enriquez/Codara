---
id: "lab-04-numeros-3"
title: "Lab 1.2.10 — Solo números: Parte 3"
type: lab
language: c
difficulty: easy
order: 7
hints:
  - "Error 1: '0087' no es un número octal válido. Los octales solo usan dígitos del 0 al 7."
  - "Error 2: '(8000x - 7992x)/x' usa la letra 'x' como sufijo, lo cual es inválido."
  - "Para imprimir 7: puedes usar el decimal 7, o el octal 07."
  - "Para imprimir 8: puedes usar el decimal 8, o una expresión aritmética válida."
  - "También falta el return 0; al final."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "no-0087"
    description: "El literal octal inválido '0087' fue corregido"
    pattern: "0087"
    hint: "Los octales solo usan dígitos 0-7. Usa 7 o 07 para el valor 7."
    type: "regex-not"
    required: true
  - id: "no-x-suffix"
    description: "El sufijo 'x' inválido fue eliminado"
    pattern: "\\d+x"
    hint: "Los números en C no pueden tener el sufijo 'x' (excepto en la notación hexadecimal 0x...)"
    type: "regex-not"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.10 — Solo números: Parte 3

**Nivel de dificultad:** Fácil

## Objetivos

- Corregir errores con números octales
- Entender las restricciones de los literales numéricos en C

## Escenario

El programa tiene **dos errores** — uno por cada línea de `printf`. Encuéntralos y corrígelos. La salida esperada es:

```
The value of seven is: 7
The value of eight is: 8
```

> 💡 Recuerda: un número que comience con `0` (cero) es tratado como **octal** por el compilador. Los octales solo admiten dígitos del 0 al 7. ¿Qué pasa con `0087`?

```c lab
#include <stdio.h>

int main()
{
    printf("The value of seven is: %d \n", 0087);
    printf("The value of eight is: %d \n", (8000x - 7992x)/x);
}
```

```c io-tests
[
  {
    "name": "Imprime seven = 7",
    "input": "",
    "expected": "The value of seven is: 7\nThe value of eight is: 8"
  }
]

```
