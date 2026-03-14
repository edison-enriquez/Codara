---
id: "lab-02-strings"
title: "Lab: Manipulación de strings"
type: lab
language: javascript
difficulty: beginner
order: 5
hints:
  - "Para invertir un string, puedes convertirlo a array con `.split('')`, invertirlo con `.reverse()` y unirlo con `.join('')`."
  - "Para contar vocales, itera sobre cada carácter y verifica si está en el conjunto de vocales: `'aeiouAEIOU'.includes(char)`."
  - "Para `esPalindromo`: un palíndromo es una cadena que se lee igual de adelante hacia atrás. Compara la cadena original con su reverso (ambos en minúsculas, sin espacios). Tip: usa `str.toLowerCase().replace(/\\s/g, '')`."
  - "Para `capitalizarPalabras`, separa el string en palabras con `.split(' ')`, capitaliza la primera letra de cada palabra con `word[0].toUpperCase() + word.slice(1).toLowerCase()`, y vuelve a unirlas."
---

# Lab: Manipulación de Strings

Los strings son uno de los tipos de datos más usados en programación. En este lab practicarás las operaciones más comunes.

## Métodos útiles de String

Antes de comenzar, aquí tienes algunos métodos que podrías necesitar:

| Método | Descripción | Ejemplo |
|--------|-------------|---------|
| `.length` | Longitud del string | `"hola".length` → 4 |
| `.toUpperCase()` | Mayúsculas | `"hola".toUpperCase()` → "HOLA" |
| `.toLowerCase()` | Minúsculas | `"HOLA".toLowerCase()` → "hola" |
| `.split(sep)` | Divide en array | `"a,b".split(",")` → ["a","b"] |
| `.includes(sub)` | ¿Contiene? | `"hola".includes("ol")` → true |
| `.trim()` | Elimina espacios | `" hola ".trim()` → "hola" |
| `.replace(a, b)` | Reemplaza | `"hi".replace("h","H")` → "Hi" |

## Funciones a implementar

### 1. `invertir(str)`
Retorna el string al revés.

- `invertir("hola")` → `"aloh"`
- `invertir("JavaScript")` → `"tpircSavaJ"`

### 2. `contarVocales(str)`
Retorna la cantidad de vocales (a, e, i, o, u — mayúsculas y minúsculas).

- `contarVocales("Hola Mundo")` → `4`
- `contarVocales("JavaScript")` → `3`

### 3. `esPalindromo(str)`
Retorna `true` si la cadena es un palíndromo (se lee igual al revés), ignorando espacios y mayúsculas.

- `esPalindromo("racecar")` → `true`
- `esPalindromo("Anita lava la tina")` → `true`
- `esPalindromo("hola")` → `false`

### 4. `capitalizarPalabras(str)`
Capitaliza la primera letra de cada palabra.

- `capitalizarPalabras("hola mundo")` → `"Hola Mundo"`
- `capitalizarPalabras("javascript es genial")` → `"Javascript Es Genial"`

```js lab
function invertir(str) {
  // Tu código aquí
}

function contarVocales(str) {
  // Tu código aquí
}

function esPalindromo(str) {
  // Tu código aquí
}

function capitalizarPalabras(str) {
  // Tu código aquí
}
```

```js tests
test("invertir('hola') es 'aloh'", () => {
  expect(invertir("hola")).toBe("aloh");
});

test("invertir('JavaScript') es 'tpircSavaJ'", () => {
  expect(invertir("JavaScript")).toBe("tpircSavaJ");
});

test("invertir string vacío", () => {
  expect(invertir("")).toBe("");
});

test("contarVocales('Hola Mundo') es 4", () => {
  expect(contarVocales("Hola Mundo")).toBe(4);
});

test("contarVocales('JavaScript') es 3", () => {
  expect(contarVocales("JavaScript")).toBe(3);
});

test("contarVocales sin vocales", () => {
  expect(contarVocales("bcdfg")).toBe(0);
});

test("'racecar' es palíndromo", () => {
  expect(esPalindromo("racecar")).toBe(true);
});

test("'Anita lava la tina' es palíndromo", () => {
  expect(esPalindromo("Anita lava la tina")).toBe(true);
});

test("'hola' no es palíndromo", () => {
  expect(esPalindromo("hola")).toBe(false);
});

test("capitalizarPalabras('hola mundo')", () => {
  expect(capitalizarPalabras("hola mundo")).toBe("Hola Mundo");
});

test("capitalizarPalabras con múltiples palabras", () => {
  expect(capitalizarPalabras("javascript es genial")).toBe("Javascript Es Genial");
});
```
