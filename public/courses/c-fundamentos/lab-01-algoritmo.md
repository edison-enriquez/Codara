---
id: "lab-01-algoritmo"
title: "Lab: Diseña y simula tu primer algoritmo"
type: lab
language: javascript
difficulty: beginner
order: 4
hints:
  - "Un algoritmo es una serie de pasos ordenados. Primero describe QUÉ debe hacer tu programa paso a paso antes de escribir código."
  - "La función `calcularAreaRectangulo` debe recibir `base` y `altura` como parámetros y retornar su producto."
  - "La función `esPar` debe retornar true si el número es divisible entre 2, es decir: `numero % 2 === 0`."
  - "Para `factorial(n)`, piensa en que el factorial de n es n × factorial(n-1), con caso base factorial(0) = 1."
---

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
