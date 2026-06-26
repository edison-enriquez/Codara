---
id: lab-03-suma-c
title: "Lab: Función suma en C"
type: lab
language: c
hints:
  - "Una función en C tiene la forma: tipo nombre(parámetros) { cuerpo }"
  - "Para sumar dos enteros, retorna a + b."
  - "Declara la función ANTES de main, o usa un prototipo."
checks:
  - id: "has-function-signature"
    description: "Declaraste la función suma con tipo int"
    pattern: "int\\s+suma\\s*\\("
    hint: "La función debe retornar int: int suma(int a, int b)"
    type: "regex"
    required: true
  - id: "has-two-params"
    description: "La función recibe dos parámetros int"
    pattern: "int\\s+suma\\s*\\(\\s*int\\s+\\w+\\s*,\\s*int\\s+\\w+"
    hint: "Declara dos parámetros: int suma(int a, int b)"
    type: "regex"
    required: true
  - id: "has-return"
    description: "La función retorna el resultado"
    pattern: "return\\s+\\w+\\s*[+]\\s*\\w+"
    hint: "Usa: return a + b;"
    type: "regex"
    required: true
  - id: "has-printf-call"
    description: "Llamas a suma() desde main y la imprimes"
    pattern: "printf\\s*\\(.*suma\\s*\\("
    hint: "En main: printf(\"%d\\n\", suma(3, 4));"
    type: "regex"
    required: true
  - id: "has-negative-test"
    description: "Bonus: pruebas con números negativos"
    pattern: "suma\\s*\\(\\s*-"
    hint: "Prueba: printf(\"%d\\n\", suma(-1, 5));"
    type: "regex"
    required: false
---

## Función suma en C

En C, una función tiene esta estructura:

```c
tipo_retorno nombre(tipo param1, tipo param2) {
    // cuerpo
    return valor;
}
```

### Tu misión

Implementa una función `suma` que reciba **dos enteros** y retorne su suma.

Luego llámala desde `main` e imprime el resultado.

```c lab
#include <stdio.h>

// Implementa la función suma aquí
// Debe recibir dos int y retornar su suma


int main() {
    // Llama a suma() e imprime el resultado
    // Ejemplo: printf("%d\n", suma(3, 4));  // debe imprimir 7
    
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST_EQ_INT("suma-positivos",  "suma(3, 4)",     suma(3, 4),     7);
    TEST_EQ_INT("suma-cero",       "suma(0, 0)",     suma(0, 0),     0);
    TEST_EQ_INT("suma-negativos",  "suma(-2, -3)",   suma(-2, -3),  -5);
    TEST_EQ_INT("suma-mixta",      "suma(-1, 5)",    suma(-1, 5),    4);
    TEST_EQ_INT("suma-grande",     "suma(100, 200)", suma(100, 200), 300);
}
```
