---
id: lab-13-flotantes
title: "Lab 2.0 — Números de punto flotante"
type: lab
language: c
hints:
  - "Declara variables con: float nombre; o double nombre;"
  - "Para mostrar decimales usa %f en printf: printf(\"%f\", x);"
  - "Para controlar decimales: printf(\"%.2f\", x) muestra 2 decimales."
  - "La división entera 10/4 = 2, pero 10.0/4.0 = 2.5"
checks:
  - id: "has-float-or-double"
    description: "Declaras al menos una variable float o double"
    pattern: "(float|double)\\s+\\w+"
    hint: "Declara: float x; o double y;"
    type: "regex"
    required: true
  - id: "has-printf-float"
    description: "Imprimes un número flotante con printf"
    pattern: "printf\\s*\\(.*%[fg]"
    hint: "Usa %f o %g para imprimir flotantes: printf(\"%f\\n\", x);"
    type: "regex"
    required: true
  - id: "has-float-division"
    description: "Realizas una división que produce resultado decimal"
    pattern: "\\d+\\.\\d*\\s*/|/\\s*\\d+\\.\\d*"
    hint: "Usa al menos un operando con punto decimal: 10.0 / 4"
    type: "regex"
    required: true
  - id: "has-precision"
    description: "Bonus: controlas los decimales con %.Xf"
    pattern: "%\\.\\d+f"
    hint: "Prueba: printf(\"%.2f\\n\", resultado); para 2 decimales"
    type: "regex"
    required: false
---

## Explorando los números de punto flotante

Los números de punto flotante permiten representar valores con decimales. En este lab practicarás declararlos y mostrarlos con distintos formatos.

### Tu misión

1. Declara dos variables: `float radio` con el valor `5.0` y `double pi` con el valor `3.14159265`
2. Calcula el área del círculo: `area = pi * radio * radio`
3. Imprime el resultado con:
   - 2 decimales
   - 6 decimales  
4. Bonus: muestra también la diferencia entre dividir `10/4` y `10.0/4.0`

```c lab
#include <stdio.h>

int main(void)
{
    // 1. Declara las variables
    

    // 2. Calcula el área del círculo (pi * radio * radio)
    

    // 3. Imprime con 2 y 6 decimales
    

    return 0;
}
```

```c tests
void run_tests(void) {
    float radio = 5.0;
    double pi = 3.14159265;
    double area = pi * radio * radio;
    TEST("area-correcta",    area > 78.5 && area < 78.55,  "El área de radio=5 debe ser ≈78.54");
    TEST("division-entera",  10/4 == 2,                    "División entera: 10/4 = 2");
    TEST("division-flotante",(double)10/4 == 2.5,          "División flotante: 10.0/4 = 2.5");
}
```
