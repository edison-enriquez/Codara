---
id: lab-14-operadores
title: "Lab 2.1 — Operadores aritméticos"
type: lab
language: c
hints:
  - "El operador % (módulo) da el resto de la división: 10 % 3 = 1"
  - "La precedencia: * y / se evalúan antes que + y -"
  - "Usa paréntesis para forzar el orden: (2 + 3) * 5 = 25"
  - "i++ incrementa después de usar el valor; ++i incrementa antes."
checks:
  - id: "has-modulo"
    description: "Usas el operador módulo %"
    pattern: "\\w+\\s*%\\s*\\w+"
    hint: "Usa % para obtener el resto: 17 % 5"
    type: "regex"
    required: true
  - id: "has-compound"
    description: "Usas algún operador de asignación compuesta (+=, -=, etc.)"
    pattern: "[+\\-*/%]="
    hint: "Usa +=, -=, *= o /= para abreviar operaciones"
    type: "regex"
    required: true
  - id: "has-increment"
    description: "Usas ++ o -- para incrementar/decrementar"
    pattern: "(\\+\\+|--)"
    hint: "Usa i++ o ++i para incrementar una variable"
    type: "regex"
    required: true
  - id: "has-priority-demo"
    description: "Bonus: demuestras la precedencia con paréntesis"
    pattern: "\\(.*[+\\-].*\\).*[*/]|[*/].*\\(.*[+\\-]"
    hint: "Compara: 2+3*5 vs (2+3)*5"
    type: "regex"
    required: false
---

## Operadores aritméticos en acción

### Tu misión

Tienes las variables `int a = 17` y `int b = 5`. Con ellas:

1. Calcula e imprime: suma, resta, multiplicación, división entera y **módulo (resto)**
2. Demuestra la precedencia:
   - Imprime `a + b * 2` (sin paréntesis)
   - Imprime `(a + b) * 2` (con paréntesis)
3. Incrementa `a` con `a++` y muestra el nuevo valor
4. Usa `b += 3` para sumar 3 a `b` y muestra el resultado

```c lab
#include <stdio.h>

int main(void)
{
    int a = 17;
    int b = 5;

    // 1. Operaciones básicas
    printf("Suma:      %d\n", a + b);
    // Agrega resta, multiplicación, división y MÓDULO


    // 2. Precedencia (con y sin paréntesis)


    // 3. Incremento con ++


    // 4. Asignación compuesta +=


    return 0;
}
```

```c tests
void run_tests(void) {
    int a = 17, b = 5;
    TEST("suma",       a + b == 22,  "17 + 5 debe ser 22");
    TEST("resta",      a - b == 12,  "17 - 5 debe ser 12");
    TEST("modulo",     a % b == 2,   "17 % 5 debe ser 2 (resto)");
    TEST("precedencia",a + b * 2 == 27, "17 + 5*2 = 27 (no 44)");
    TEST("parentesis", (a + b) * 2 == 44, "(17+5)*2 = 44");
    int c = a; c++; TEST("incremento", c == 18, "a++ debe dar 18");
    int d = b; d += 3; TEST("compuesto", d == 8, "b+=3 debe dar 8");
}
```
