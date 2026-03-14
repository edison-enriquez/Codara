---
id: "lab-01-suma"
title: "Lab: Operaciones matemáticas"
type: lab
language: javascript
difficulty: beginner
order: 4
hints:
  - "Para calcular el mínimo entre dos números, puedes usar if/else o el operador ternario: `a < b ? a : b`."
  - "Para `esBisiesto(año)`: un año es bisiesto si es divisible por 4, EXCEPTO los años divisibles por 100, a menos que también sean divisibles por 400. Por ejemplo: 2000 ✅, 1900 ❌, 2024 ✅."
  - "Para `fibonacci(n)`: la secuencia es 0, 1, 1, 2, 3, 5, 8, 13... Cada número es la suma de los dos anteriores. Caso base: fibonacci(0) = 0, fibonacci(1) = 1."
  - "Para fibonacci con recursión: `return fibonacci(n-1) + fibonacci(n-2)`. Para la solución iterativa, usa un bucle con dos variables que van avanzando."
---

# Lab: Operaciones matemáticas

Implementa cuatro funciones matemáticas. ¡Prueba tu solución con el botón **Ejecutar pruebas**!

## Funciones a implementar

### 1. `minimo(a, b)`
Retorna el **menor** de los dos números.

- `minimo(3, 7)` → `3`
- `minimo(10, 2)` → `2`
- `minimo(5, 5)` → `5`

---

### 2. `potencia(base, exponente)`
Retorna `base` elevado a la potencia `exponente`.
**Sin usar `Math.pow` ni el operador `**`** — impleméntalo tú con un bucle.

- `potencia(2, 3)` → `8`
- `potencia(5, 0)` → `1`
- `potencia(3, 4)` → `81`

---

### 3. `esBisiesto(año)`
Retorna `true` si el año es bisiesto, `false` si no.

**Reglas:**
- Divisible por 4 → posiblemente bisiesto
- Divisible por 100 → NO bisiesto (excepción)
- Divisible por 400 → SÍ bisiesto (excepción de la excepción)

- `esBisiesto(2024)` → `true`
- `esBisiesto(1900)` → `false`
- `esBisiesto(2000)` → `true`

---

### 4. `fibonacci(n)`
Retorna el n-ésimo número de la secuencia de Fibonacci (base 0).

La secuencia: **0, 1, 1, 2, 3, 5, 8, 13, 21, 34...**

- `fibonacci(0)` → `0`
- `fibonacci(7)` → `13`

```js lab
function minimo(a, b) {
  // Tu código aquí
}

function potencia(base, exponente) {
  // Tu código aquí
}

function esBisiesto(año) {
  // Tu código aquí
}

function fibonacci(n) {
  // Tu código aquí
}
```

```js tests
test("minimo(3, 7) es 3", () => {
  expect(minimo(3, 7)).toBe(3);
});

test("minimo(10, 2) es 2", () => {
  expect(minimo(10, 2)).toBe(2);
});

test("minimo(5, 5) es 5", () => {
  expect(minimo(5, 5)).toBe(5);
});

test("potencia(2, 3) es 8", () => {
  expect(potencia(2, 3)).toBe(8);
});

test("potencia(5, 0) es 1", () => {
  expect(potencia(5, 0)).toBe(1);
});

test("potencia(3, 4) es 81", () => {
  expect(potencia(3, 4)).toBe(81);
});

test("2024 es bisiesto", () => {
  expect(esBisiesto(2024)).toBe(true);
});

test("1900 no es bisiesto", () => {
  expect(esBisiesto(1900)).toBe(false);
});

test("2000 es bisiesto", () => {
  expect(esBisiesto(2000)).toBe(true);
});

test("2023 no es bisiesto", () => {
  expect(esBisiesto(2023)).toBe(false);
});

test("fibonacci(0) es 0", () => {
  expect(fibonacci(0)).toBe(0);
});

test("fibonacci(1) es 1", () => {
  expect(fibonacci(1)).toBe(1);
});

test("fibonacci(7) es 13", () => {
  expect(fibonacci(7)).toBe(13);
});

test("fibonacci(10) es 55", () => {
  expect(fibonacci(10)).toBe(55);
});
```
