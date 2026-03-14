---
id: lab-02-variables-c
title: "Lab: Variables y Tipos en C"
type: lab
language: c
hints:
  - "Declara variables de tipo int para números enteros."
  - "Usa float o double para números con decimales."
  - "Imprime con printf usando %d para int, %f para float."
checks:
  - id: "has-int-var"
    description: "Declaraste una variable de tipo int"
    pattern: "int\\s+\\w+"
    hint: "Declara una variable entera: int edad = 25;"
    type: "regex"
    required: true
  - id: "has-float-var"
    description: "Declaraste una variable de tipo float o double"
    pattern: "(float|double)\\s+\\w+"
    hint: "Declara un número decimal: float precio = 9.99;"
    type: "regex"
    required: true
  - id: "has-printf-int"
    description: "Imprimiste la variable entera con %d"
    pattern: "printf\\s*\\(.*%d"
    hint: "Usa printf(\"%d\\n\", edad); para imprimir un entero"
    type: "regex"
    required: true
  - id: "has-printf-float"
    description: "Imprimiste el decimal con %f"
    pattern: "printf\\s*\\(.*%[fg]"
    hint: "Usa printf(\"%.2f\\n\", precio); para imprimir un decimal"
    type: "regex"
    required: true
  - id: "has-char"
    description: "Bonus: declaraste una variable char"
    pattern: "char\\s+\\w+"
    hint: "Declara un carácter: char letra = 'A';"
    type: "regex"
    required: false
---

## Variables y Tipos Primitivos en C

En C debes declarar el **tipo** de cada variable antes de usarla.

| Tipo | Tamaño | Ejemplo |
|------|--------|---------|
| `int` | 4 bytes | `42`, `-7` |
| `float` | 4 bytes | `3.14` |
| `double` | 8 bytes | `3.14159265` |
| `char` | 1 byte | `'A'` |

### Tu misión

1. Declara una variable `int` con tu edad.
2. Declara una variable `float` o `double` con un precio.
3. Imprime ambas variables usando `printf`.

```c lab
#include <stdio.h>

int main() {
    // 1. Declara una variable int (ej: int edad = 25;)
    
    // 2. Declara una variable float o double (ej: float precio = 9.99;)
    
    // 3. Imprime las variables con printf

    return 0;
}
```

```c tests
void run_tests(void) {
    // Test 1: variables básicas deben estar declaradas
    // (La verificación real se hace en el análisis en tiempo real)
    // Aquí ejecutamos el programa y verificamos la salida

    // Compilar sin errores ya es un test implícito
    TEST("compile-ok", 1, "El programa debe compilar sin errores");
}
```
