---
id: lab-16-condicionales
title: "Lab 2.3 — Condicionales con if"
type: lab
language: c
hints:
  - "La sintaxis es: if (condición) { instrucciones; }"
  - "Usa == para comparar (no = que es asignación)"
  - "Para verificar si es par: if (numero % 2 == 0)"
  - "Puedes encadenar: if (...) { } else if (...) { } else { }"
checks:
  - id: "has-if"
    description: "Usas la sentencia if"
    pattern: "if\\s*\\("
    hint: "Usa: if (condición) { ... }"
    type: "regex"
    required: true
  - id: "has-comparison"
    description: "Usas un operador de comparación"
    pattern: "(==|!=|>=|<=|>|<)"
    hint: "Compara con ==, !=, >, <, >= o <="
    type: "regex"
    required: true
  - id: "has-modulo-even"
    description: "Verificas si el número es par con módulo"
    pattern: "%\\s*2"
    hint: "Un número es par si: numero % 2 == 0"
    type: "regex"
    required: true
  - id: "has-else"
    description: "Tienes al menos un else"
    pattern: "\\belse\\b"
    hint: "Agrega else para el caso contrario"
    type: "regex"
    required: true
---

## Tomando decisiones con if

Las condiciones permiten que el programa tome caminos distintos según el valor de las variables.

### Tu misión

Tiene la variable `int numero = 42`. Con ella:

1. Comprueba si es **positivo**, **negativo** o **cero** — imprime el resultado
2. Comprueba si es **par** o **impar** (pista: usa `%`)
3. Bonus: clasifícalo en rangos: pequeño (< 10), mediano (10-99) o grande (>= 100)

```c lab
#include <stdio.h>

int main(void)
{
    int numero = 42;

    // 1. ¿Es positivo, negativo o cero?
    if (numero > 0) {
        printf("El número es positivo.\n");
    }
    // Agrega else if y else para negativo y cero


    // 2. ¿Es par o impar?


    // Bonus: clasificar por rango


    return 0;
}
```

```c tests
void run_tests(void) {
    CAPTURE_STUDENT_OUTPUT();
    TEST_OUTPUT_CONTAINS("es-positivo","positivo");
    TEST_OUTPUT_CONTAINS("es-par",     "par");
}
```
