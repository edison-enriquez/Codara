---
id: "lab-03-numeros-2"
title: "Lab 1.2.9 — Solo números: Parte 2"
type: lab
language: c
difficulty: easy
order: 6
hints:
  - "El segundo argumento de printf es inválido: '16,0-10-' tiene errores de sintaxis."
  - "¿Qué operación daría como resultado 6? Piensa en una expresión aritmética simple."
  - "Puedes usar directamente el número 6, o una expresión como 16-10."
  - "Recuerda: el especificador %d espera un número entero."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-printf-six"
    description: "Usaste printf para imprimir 'six'"
    pattern: "printf\\s*\\(.*six"
    hint: "La cadena de formato debe contener 'six'"
    type: "regex"
    required: true
  - id: "no-invalid-expr"
    description: "El argumento inválido fue corregido"
    pattern: "16,0-10-"
    hint: "Reemplaza '16,0-10-' por una expresión válida que dé 6"
    type: "regex-not"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.9 — Solo números: Parte 2

**Nivel de dificultad:** Fácil

## Objetivos

- Corregir errores de sintaxis en expresiones numéricas
- Entender cómo escribir expresiones aritméticas válidas en C

## Escenario

El programa de abajo tiene errores. Encuéntralos y corrígelos para producir exactamente esta salida:

```
The value of six is: 6
```

> 💡 Analiza el argumento que se pasa a `printf`. ¿Es una expresión válida en C? Intenta encontrar los errores **antes** de compilar.

```c lab
#include <stdio.h>

int main()
{
    printf("The value of six is: %d \n", 16,0-10-);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-correct", 1, "La salida debe ser: The value of six is: 6");
}
```
