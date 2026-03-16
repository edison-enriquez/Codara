---
id: lab-19-bucle-while
title: "Lab 3.3 — Bucle while"
type: lab
language: c
hints:
  - "La estructura es: while (condición) { instrucciones; }"
  - "No olvides actualizar la variable del bucle o será infinito"
  - "Para sumar usa: suma += i; (equivale a suma = suma + i)"
  - "La suma de 1 a N es N*(N+1)/2 — puedes verificar tu resultado"
checks:
  - id: "has-while"
    description: "Usas un bucle while"
    pattern: "\\bwhile\\s*\\("
    hint: "Usa: while (condición) { ... }"
    type: "regex"
    required: true
  - id: "has-accumulator"
    description: "Acumulas valores en una variable"
    pattern: "(suma|total|acum)\\s*[+]?=\\s*(suma|total|acum|i|j|\\w+)"
    hint: "Acumula con: suma += i; o suma = suma + i;"
    type: "regex"
    required: true
  - id: "has-counter-update"
    description: "Incrementas el contador del bucle"
    pattern: "(\\+\\+|\\+= ?1|= ?\\w+ ?\\+ ?1)"
    hint: "Incrementa el contador: i++; o i += 1;"
    type: "regex"
    required: true
  - id: "has-for-bonus"
    description: "Bonus: resuelves el mismo problema con for"
    pattern: "\\bfor\\s*\\("
    hint: "Prueba reescribir el while como: for (i = 1; i <= N; i++)"
    type: "regex"
    required: false
---

## Bucles while en acción

### Tu misión

Usa un bucle `while` para:

1. Imprimir todos los números del 1 al 10
2. Calcular la **suma de todos los números del 1 al 100**
3. Imprime el resultado con: `"La suma de 1 a 100 es: X"`

Pista matemática: el resultado correcto es `5050`.

Bonus: resuelve el mismo cálculo usando un bucle `for`.

```c lab
#include <stdio.h>

int main(void)
{
    int i;
    int suma;

    // 1. Imprimir del 1 al 10
    printf("Números del 1 al 10:\n");
    i = 1;
    while (i <= 10) {
        printf("%d ", i);
        i++;
    }
    printf("\n");

    // 2. Sumar del 1 al 100
    suma = 0;
    i = 1;
    // Completa el bucle while aquí


    // 3. Imprime la suma
    

    return 0;
}
```

```c tests
void run_tests(void) {
    int suma = 0, i;
    for (i = 1; i <= 100; i++) suma += i;
    TEST("suma-1-100",   suma == 5050,       "La suma de 1 a 100 es 5050");
    TEST("suma-1-10",    1+2+3+4+5+6+7+8+9+10 == 55, "Suma 1-10 = 55");
    TEST("primer-val",   1 >= 1,             "El bucle empieza en 1");
    TEST("ultimo-val",   100 <= 100,         "El bucle termina en 100");
}
```
