---
id: lab-05-io-suma
title: "Lab: Suma con entrada del usuario"
type: lab
language: c
hints:
  - "Usa scanf(\"%d\", &a) para leer un entero desde teclado."
  - "Imprime con printf(\"La suma es: %d\\n\", suma);"
  - "Pide cada número en una línea separada con printf primero."
checks:
  - id: "has-scanf"
    description: "Usas scanf para leer datos"
    pattern: "scanf\\s*\\("
    hint: "Usa scanf(\"%d\", &variable) para leer un número"
    type: "regex"
    required: true
  - id: "has-printf-prompt"
    description: "Muestras un mensaje antes de leer"
    pattern: "printf\\s*\\(.*Ingrese"
    hint: "Muestra: printf(\"Ingrese el primer número:\\n\");"
    type: "regex"
    required: true
  - id: "has-sum-output"
    description: "Imprimes el resultado de la suma"
    pattern: "La suma es"
    hint: "Usa printf(\"La suma es: %d\\n\", resultado);"
    type: "regex"
    required: true
---

## Suma con entrada del usuario

En este lab aprenderás a leer datos desde el teclado con `scanf`.

### Tu misión

Escribe un programa que:
1. Pida al usuario dos números enteros
2. Los sume
3. Imprima el resultado

La salida debe tener exactamente este formato:
```
Ingrese el primer número:
Ingrese el segundo número:
La suma es: 8
```

```c lab
#include <stdio.h>

int main() {
    int a, b;

    // 1. Pide el primer número
    printf("Ingrese el primer número:\n");
    scanf("%d", &a);

    // 2. Pide el segundo número
    printf("Ingrese el segundo número:\n");
    // TODO: leer b con scanf

    // 3. Imprime la suma
    // TODO: printf("La suma es: %d\n", ...);

    return 0;
}
```

```c io-tests
[
  {
    "name": "Suma normal con números pequeños positivos",
    "input": "3\n5",
    "expected": "Ingrese el primer número:\nIngrese el segundo número:\nLa suma es: 8"
  },
  {
    "name": "Suma con cero",
    "input": "0\n0",
    "expected": "Ingrese el primer número:\nIngrese el segundo número:\nLa suma es: 0"
  },
  {
    "name": "Suma con número negativo",
    "input": "-3\n7",
    "expected": "Ingrese el primer número:\nIngrese el segundo número:\nLa suma es: 4"
  },
  {
    "name": "Suma de números grandes",
    "input": "1000\n2000",
    "expected": "Ingrese el primer número:\nIngrese el segundo número:\nLa suma es: 3000"
  }
]
```
