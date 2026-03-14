---
id: lab-04-loops-c
title: "Lab: Bucles y Contadores en C"
type: lab
language: c
hints:
  - "El bucle for en C: for (int i = 0; i < n; i++) { ... }"
  - "Usa una variable acumuladora inicializada en 0."
  - "El bucle while continúa mientras la condición sea verdadera."
checks:
  - id: "has-for-loop"
    description: "Usaste un bucle for"
    pattern: "for\\s*\\("
    hint: "Declara un for: for (int i = 1; i <= 10; i++)"
    type: "regex"
    required: true
  - id: "has-accumulator"
    description: "Tienes una variable acumuladora (suma/total)"
    pattern: "(suma|total|resultado|acc)\\s*(=|\\+?=)"
    hint: "Declara: int suma = 0; y suma += i; dentro del bucle"
    type: "regex"
    required: true
  - id: "has-printf-loop"
    description: "Imprimes dentro o después del bucle"
    pattern: "printf"
    hint: "Usa printf(\"%d\\n\", suma); para ver el resultado"
    type: "regex"
    required: true
  - id: "has-function-suma-n"
    description: "Encapsulaste la lógica en una función"
    pattern: "int\\s+\\w+\\s*\\(\\s*int\\s+n"
    hint: "Crea: int sumar_hasta(int n) { ... }"
    type: "regex"
    required: false
---

## Bucles y Contadores en C

Los bucles te permiten repetir instrucciones:

```c
// for: cuando sabes cuántas iteraciones
for (int i = 1; i <= 10; i++) {
    printf("%d\n", i);
}

// while: cuando no sabes cuántas iteraciones
int n = 10;
while (n > 0) {
    n--;
}
```

### Tu misión

1. Usa un bucle `for` para sumar los números del 1 al 10.
2. Imprime la suma total.
3. **Bonus:** Crea una función `sumar_hasta(int n)` que reciba `n` y retorne la suma de 1 a n.

```c lab
#include <stdio.h>

// Bonus: implementa sumar_hasta(int n) aquí


int main() {
    // 1. Declara una variable acumuladora
    
    // 2. Usa un for del 1 al 10, acumulando
    
    // 3. Imprime el resultado (debe ser 55)
    
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("sumar-hasta-10",  sumar_hasta(10)  == 55,   "sumar_hasta(10) debe ser 55");
    TEST("sumar-hasta-1",   sumar_hasta(1)   == 1,    "sumar_hasta(1) debe ser 1");
    TEST("sumar-hasta-0",   sumar_hasta(0)   == 0,    "sumar_hasta(0) debe ser 0");
    TEST("sumar-hasta-100", sumar_hasta(100) == 5050, "sumar_hasta(100) debe ser 5050");
}
```
