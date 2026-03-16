---
id: "lab-02-numeros-1"
title: "Lab 1.1.3 — Solo números: Parte 1"
type: lab
language: c
difficulty: easy
order: 5
hints:
  - "Busca el error en el argumento de printf: '5int' no es un número válido en C."
  - "En C, los números literales son solo dígitos: escribe simplemente 5."
  - "Recuerda que el especificador %d espera un número entero."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-printf"
    description: "Usaste printf para imprimir"
    pattern: "printf\\s*\\("
    hint: "Usa printf con el especificador %d"
    type: "regex"
    required: true
  - id: "no-5int"
    description: "El literal '5int' fue corregido"
    pattern: "5int"
    hint: "Reemplaza '5int' por simplemente '5'"
    type: "regex-not"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.1.3 — Solo números: Parte 1

**Nivel de dificultad:** Fácil

## Objetivos

- Corregir errores en un programa
- Entender cómo se escriben los números enteros en C
- Usar `printf` con el especificador `%d`

## Escenario

El programa de abajo tiene **errores de compilación** y **errores lógicos**. Encuéntralos y corrígelos.

Tu versión del programa debe producir exactamente la siguiente salida:

```
The value of five is: 5
```

> 💡 **Pista:** Antes de usar el compilador, intenta encontrar los errores solo mediante **análisis manual** del código. El error está en el argumento de la función `printf`.

```c lab
#include <stdio.h>

int main()
{
    printf("The value of five is: %d \n", 5int);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-correct", 1, "La salida debe ser: The value of five is: 5");
}
```
