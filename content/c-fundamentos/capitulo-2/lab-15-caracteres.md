---
id: lab-15-caracteres
title: "Lab 2.2 — El tipo char y ASCII"
type: lab
language: c
hints:
  - "Declara un char así: char letra = 'A';"
  - "Para ver el código ASCII usa %d: printf(\"%d\", 'A'); imprime 65"
  - "La diferencia entre mayúscula y minúscula es siempre 32"
  - "Puedes hacer aritmética con char: 'A' + 1 es 'B'"
checks:
  - id: "has-char-var"
    description: "Declaras una variable char"
    pattern: "char\\s+\\w+"
    hint: "Declara: char letra = 'A';"
    type: "regex"
    required: true
  - id: "has-ascii-print"
    description: "Imprimes el código ASCII de un carácter"
    pattern: "printf\\s*\\(.*%d.*'[A-Za-z]'|printf\\s*\\(.*%d.*char"
    hint: "Usa %d para ver el número: printf(\"%d\\n\", 'A');"
    type: "regex"
    required: true
  - id: "has-case-convert"
    description: "Conviertes mayúscula a minúscula sumando 32"
    pattern: "[+]\\s*32|32\\s*[+]"
    hint: "Suma 32 para pasar a minúscula: minuscula = mayuscula + 32;"
    type: "regex"
    required: true
  - id: "has-char-loop"
    description: "Bonus: recorres caracteres en un bucle"
    pattern: "for.*'[A-Za-z]'.*'[A-Za-z]'"
    hint: "Prueba: for (c = 'A'; c <= 'Z'; c++) printf(\"%c\", c);"
    type: "regex"
    required: false
---

## Explorando el tipo char y ASCII

En C, los caracteres son en realidad números enteros pequeños que representan letras y símbolos según la tabla ASCII.

### Tu misión

1. Declara `char mayus = 'C'` e imprime:
   - El carácter con `%c`
   - Su código ASCII con `%d`
2. Convierte `mayus` a minúscula sumándole `32` y guárdalo en `char minus`
3. Imprime ambas versiones y sus códigos
4. Bonus: imprime el alfabeto completo en mayúsculas usando un bucle `for`

```c lab
#include <stdio.h>

int main(void)
{
    char mayus = 'C';
    char minus;

    // 1. Imprime el carácter y su código ASCII
    

    // 2. Convierte a minúscula (suma 32)
    

    // 3. Imprime minúscula y su código ASCII
    

    // Bonus: imprime el alfabeto A-Z

    return 0;
}
```

```c tests
void run_tests(void) {
    CAPTURE_STUDENT_OUTPUT();
    TEST_OUTPUT_CONTAINS("ascii-C-67","67");
    TEST_OUTPUT_CONTAINS("ascii-c-99","99");
}
```
