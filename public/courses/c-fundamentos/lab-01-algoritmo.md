---
id: "lab-01-algoritmo"
title: "Lab: Tu primer programa completo en C"
type: lab
language: c
difficulty: beginner
order: 4
hints:
  - "Empieza por incluir stdio.h con: #include <stdio.h>"
  - "Toda función main debe tener: int main(void) { ... return 0; }"
  - "Usa printf para imprimir texto y variables."
  - "Para imprimir con salto de línea usa \\n dentro del string: printf(\"Hola\\n\");"
checks:
  - id: "has-include"
    description: "Incluiste la librería stdio.h"
    pattern: "#include\\s*<stdio\\.h>"
    hint: "Agrega al inicio: #include <stdio.h>"
    type: "regex"
    required: true
  - id: "has-main"
    description: "Definiste la función main"
    pattern: "int\\s+main\\s*\\("
    hint: "Declara la función principal: int main(void) {"
    type: "regex"
    required: true
  - id: "has-printf"
    description: "Usaste printf para imprimir"
    pattern: "printf\\s*\\("
    hint: "Usa printf para mostrar texto: printf(\"Hola, mundo!\\n\");"
    type: "regex"
    required: true
  - id: "has-return"
    description: "Retornás 0 al final de main"
    pattern: "return\\s+0"
    hint: "Agrega al final de main: return 0;"
    type: "regex"
    required: true
  - id: "has-newline"
    description: "Tu texto incluye un salto de línea (\\n)"
    pattern: "\\\\n"
    hint: "Dentro del string agrega \\n: printf(\"texto\\n\");"
    type: "regex"
    required: false
---

# Lab: Tu primer programa completo en C

Es hora de escribir tu **primer programa en C desde cero**, sin andamiaje previo.

## Tu misión

Escribe un programa completo que imprima en pantalla:

```
Hola, mundo!
Aprendiendo C con Codara.
```

### Requisitos

1. Incluir `stdio.h`
2. Definir la función `main`
3. Usar `printf` para cada línea
4. Retornar `0` al final

> 💡 Cada `printf` imprime una línea. Recuerda el `\n` al final del string para el salto de línea.

```c lab
#include <stdio.h>

int main(void)
{
    // Imprime las dos líneas aquí

    return 0;
}
```

```c tests
void run_tests(void) {
    CAPTURE_STUDENT_OUTPUT();
    TEST_OUTPUT_CONTAINS("imprime-hola-mundo",      "Hola, mundo!");
    TEST_OUTPUT_CONTAINS("imprime-aprendiendo",     "Aprendiendo C con Codara.");
}
```


# Lab: Tu primer algoritmo

En este lab pondrás en práctica los conceptos de **algoritmo**, **variables** y **funciones** que vimos en las lecciones anteriores.

Aunque el lenguaje C no se ejecuta en el navegador, implementarás los mismos conceptos **en JavaScript** — que usa sintaxis muy similar a C y sí corre directamente aquí.

## Tu misión

Implementa **tres funciones** que simulan operaciones matemáticas básicas:

### 1. `calcularAreaRectangulo(base, altura)`
Retorna el **área** de un rectángulo.

**Ejemplo:** `calcularAreaRectangulo(5, 3)` → `15`

---

### 2. `esPar(numero)`
Retorna `true` si el número es par, `false` si es impar.

**Ejemplo:**
- `esPar(4)` → `true`
- `esPar(7)` → `false`

---

### 3. `factorial(n)`
Retorna el **factorial** de `n` (para n ≥ 0).

Recuerda que:
- `factorial(0)` = 1
- `factorial(1)` = 1
- `factorial(5)` = 5 × 4 × 3 × 2 × 1 = 120

**Ejemplo:** `factorial(5)` → `120`

```js lab
// Implementa las tres funciones:

function calcularAreaRectangulo(base, altura) {
  // Tu código aquí
}

function esPar(numero) {
  // Tu código aquí
}

function factorial(n) {
  // Tu código aquí
}
```

```js tests
test("Área de rectángulo 5×3 = 15", () => {
  expect(calcularAreaRectangulo(5, 3)).toBe(15);
});

test("Área de rectángulo 10×2 = 20", () => {
  expect(calcularAreaRectangulo(10, 2)).toBe(20);
});

test("Área con un lado = 0 es 0", () => {
  expect(calcularAreaRectangulo(0, 5)).toBe(0);
});

test("4 es par", () => {
  expect(esPar(4)).toBe(true);
});

test("7 es impar", () => {
  expect(esPar(7)).toBe(false);
});

test("0 es par", () => {
  expect(esPar(0)).toBe(true);
});

test("factorial(0) = 1", () => {
  expect(factorial(0)).toBe(1);
});

test("factorial(1) = 1", () => {
  expect(factorial(1)).toBe(1);
});

test("factorial(5) = 120", () => {
  expect(factorial(5)).toBe(120);
});

test("factorial(3) = 6", () => {
  expect(factorial(3)).toBe(6);
});
```
