---
id: "lab-07-variables-1"
title: "Lab 1.2.13 — Variables: Parte 1"
type: lab
language: c
difficulty: easy
order: 10
hints:
  - "Error 1: 'simpleVari able' tiene un espacio en el medio. Los nombres no pueden tener espacios."
  - "Corrígelo a 'simpleVariable' (sin espacio)."
  - "Error 2: el printf referencia 'otherVariable', pero esa variable no existe."
  - "Usa el mismo nombre que declaraste para imprimir su valor."
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "no-space-in-name"
    description: "El nombre con espacio 'simpleVari able' fue corregido"
    pattern: "simpleVari\\s+able"
    hint: "El nombre 'simpleVari able' tiene un espacio. Corrígelo a 'simpleVariable'."
    type: "regex-not"
    required: true
  - id: "no-other-variable"
    description: "La referencia a 'otherVariable' fue corregida"
    pattern: "otherVariable"
    hint: "No existe 'otherVariable'. Usa el nombre correcto de la variable que declaraste."
    type: "regex-not"
    required: true
  - id: "has-return"
    description: "Retornaste 0 al final"
    pattern: "return\\s+0"
    hint: "Agrega: return 0;"
    type: "regex"
    required: true
---

# Lab 1.2.13 — Variables: Parte 1

**Nivel de dificultad:** Fácil

## Objetivos

- Corregir errores en nombres de variables
- Entender las reglas de nomenclatura de variables en C

## Regla: nombres de variables

Los nombres de variables en C:
- Solo pueden contener **letras, dígitos y `_`** (guion bajo)
- **No pueden contener espacios**
- Deben comenzar con una **letra** o `_`

## Escenario

El programa tiene **dos errores**. Encuéntralos y corrígelos para producir:

```
The value of ten is: 10
```

> 💡 Pista: Analiza el nombre de la variable en la declaración y compáralo con el nombre usado en `printf`.

```c lab
#include <stdio.h>

int main()
{
    int simpleVari able = 10;
    printf("The value of ten is: %d \n", otherVariable);
    return 0;
}
```

```c io-tests
[
  {
    "name": "Salida correcta",
    "input": "",
    "expected": "The value of ten is: 10"
  }
]
```
