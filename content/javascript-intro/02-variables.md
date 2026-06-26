---
id: "02-variables"
title: "Variables y tipos de datos"
type: lesson
language: javascript
difficulty: beginner
order: 2
---

# Variables y tipos de datos

Una **variable** es un contenedor con nombre para almacenar datos. Piensa en ella como una caja etiquetada donde guardas información.

## Declarar variables

JavaScript moderno usa `let` y `const`:

```js exec
// let → variable que puede cambiar
let edad = 25;
console.log("Edad inicial:", edad);

edad = 26;  // reasignamos el valor
console.log("Edad actualizada:", edad);

// const → constante, no puede cambiar
const PI = 3.14159;
console.log("PI:", PI);

// PI = 3;  // ← daría error: no se puede reasignar una const
```

## Tipos de datos primitivos

JavaScript tiene 7 tipos primitivos. Los más importantes:

```js exec
// String (texto)
let nombre = "Codara";
let apellido = 'Plataforma';  // comillas simples también funcionan
let mensaje = `Hola, ${nombre}!`;  // template literal (interpolación)
console.log(mensaje);

// Number (números, tanto enteros como decimales)
let entero = 42;
let decimal = 3.14;
let negativo = -100;
console.log(entero, decimal, negativo);

// Boolean (verdadero/falso)
let esActivo = true;
let estaLogeado = false;
console.log("¿Activo?", esActivo);
console.log("¿Logeado?", estaLogeado);

// null y undefined
let sinValor = null;       // asignado explícitamente como "sin valor"
let noDefinido;            // no se le asignó nada → undefined
console.log(sinValor, noDefinido);
```

## Operadores aritméticos

```js exec
let a = 10;
let b = 3;

console.log("Suma:          ", a + b);   // 13
console.log("Resta:         ", a - b);   // 7
console.log("Multiplicación:", a * b);   // 30
console.log("División:      ", a / b);   // 3.333...
console.log("Módulo (resto):", a % b);   // 1
console.log("Potencia:      ", a ** b);  // 1000
```

## Operadores de comparación

```js exec
let x = 5;
let y = 10;

console.log(x > y);   // false
console.log(x < y);   // true
console.log(x === 5); // true  (igual en valor y tipo)
console.log(x !== y); // true  (diferente)

// ⚠️ Usa === en lugar de == (evita conversiones de tipo inesperadas)
console.log("5" == 5);   // true  (¡comparación laxa, peligroso!)
console.log("5" === 5);  // false (comparación estricta, recomendado)
```

## El operador `typeof`

```js exec
console.log(typeof 42);           // "number"
console.log(typeof "hola");       // "string"
console.log(typeof true);         // "boolean"
console.log(typeof undefined);    // "undefined"
console.log(typeof null);         // "object"  ← ¡un bug histórico de JS!
console.log(typeof [1, 2, 3]);    // "object"
console.log(typeof function(){}); // "function"
```

## Conversión de tipos

```js exec
// String a Number
let numStr = "42";
let num = Number(numStr);
console.log(num + 1);        // 43 (número)
console.log(numStr + 1);     // "421" (concatenación de strings!)

// Number a String
let n = 100;
let str = String(n);
console.log(str + " metros");  // "100 metros"

// Boolean conversión
console.log(Boolean(0));      // false
console.log(Boolean(""));     // false
console.log(Boolean(null));   // false
console.log(Boolean(1));      // true
console.log(Boolean("texto")); // true
```

## Arrays (listas)

Un array almacena múltiples valores en una sola variable:

```js exec
let frutas = ["manzana", "banana", "cereza"];
console.log(frutas[0]);        // "manzana" (índice base 0)
console.log(frutas.length);    // 3

frutas.push("durazno");        // agregar al final
console.log(frutas);

frutas.pop();                  // eliminar el último
console.log(frutas);

// Iterar
for (let fruta of frutas) {
  console.log("Fruta:", fruta);
}
```

---

> **Resumen:** JavaScript tiene tipos dinámicos (una variable puede cambiar de tipo). Usa `const` por defecto, `let` cuando necesites reasignar, y **nunca** `var`. Usa `===` en lugar de `==`.
