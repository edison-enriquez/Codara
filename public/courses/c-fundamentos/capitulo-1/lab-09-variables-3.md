---
id: "lab-09-variables-3"
title: "Lab 1.2.15 — Variables: Parte 3"
type: lab
language: c
difficulty: easy
order: 12
hints:
  - "La IP 127.0.0.1 tiene 4 partes: 127, 0, 0 y 1."
  - "Declara 4 variables int para cada octeto de la dirección IP."
  - "Usa printf con múltiples %d y puntos para formatear la IP."
  - "El formato sería: printf(\"%d.%d.%d.%d\\n\", a, b, c, d);"
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-int-vars"
    description: "Declaraste variables int para los octetos"
    pattern: "int\\s+\\w+"
    hint: "Declara variables int para cada parte de la IP: int a = 127;"
    type: "regex"
    required: true
  - id: "has-printf"
    description: "Usaste printf para imprimir"
    pattern: "printf\\s*\\("
    hint: "Usa printf para mostrar la IP"
    type: "regex"
    required: true
  - id: "has-127"
    description: "La IP contiene 127"
    pattern: "127"
    hint: "El primer octeto de localhost es 127"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.15 — Variables: Parte 3

**Nivel de dificultad:** Fácil

## Objetivos

- Declarar y usar múltiples variables `int`
- Imprimir valores con un formato específico

## Escenario

La dirección IP de **localhost** es `127.0.0.1`. Está compuesta por 4 números separados por puntos, llamados **octetos**.

Escribe un programa que:

1. Declare **4 variables `int`**, una para cada octeto: `127`, `0`, `0`, `1`.
2. Imprima la IP usando esas variables en el formato indicado.

La salida esperada es:

```
Localhost IP is 127.0.0.1
```

> 💡 Puedes usar `printf` con múltiples especificadores `%d` separados por puntos para formatear la dirección IP.

```c lab
#include <stdio.h>

int main(void)
{
    // Declara 4 variables int para los 4 octetos de 127.0.0.1
    int octet1 = /* ?? */;
    int octet2 = /* ?? */;
    int octet3 = /* ?? */;
    int octet4 = /* ?? */;

    // Imprime el resultado en el formato: "Localhost IP is X.X.X.X"
    printf("Localhost IP is %d.%d.%d.%d\n", octet1, octet2, octet3, octet4);
    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
    TEST("output-ip", 1, "La salida debe ser: Localhost IP is 127.0.0.1");
}
```
