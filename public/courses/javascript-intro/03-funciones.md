---
id: "03-funciones"
title: "Funciones"
type: lesson
language: javascript
difficulty: beginner
order: 3
---

# Funciones

Una **función** es un bloque de código reutilizable que realiza una tarea específica. Son el bloque de construcción fundamental de cualquier programa.

## Declarar funciones

```js exec
// Declaración de función clásica
function saludar(nombre) {
  return "¡Hola, " + nombre + "!";
}

// Llamar a la función
const resultado = saludar("Codara");
console.log(resultado);
console.log(saludar("Programador"));
```

## Parámetros y valor de retorno

```js exec
// Función con múltiples parámetros
function sumar(a, b) {
  return a + b;
}

function multiplicar(a, b) {
  return a * b;
}

console.log("5 + 3 =", sumar(5, 3));
console.log("5 × 3 =", multiplicar(5, 3));

// Función sin return (retorna undefined)
function imprimirSaludo(nombre) {
  console.log("Hola,", nombre);
  // sin return → retorna undefined automáticamente
}

const valor = imprimirSaludo("Ana");
console.log("Valor retornado:", valor);  // undefined
```

## Arrow functions (funciones flecha)

La sintaxis moderna y concisa de ES6:

```js exec
// Arrow function
const cuadrado = (n) => n * n;

// Si hay un solo parámetro, los paréntesis son opcionales
const doble = n => n * 2;

// Con cuerpo de función (bloque {})
const potencia = (base, exp) => {
  let resultado = 1;
  for (let i = 0; i < exp; i++) {
    resultado *= base;
  }
  return resultado;
};

console.log(cuadrado(5));       // 25
console.log(doble(7));          // 14
console.log(potencia(2, 10));   // 1024
```

## Funciones como valores (primera clase)

En JavaScript, las funciones son **ciudadanos de primera clase**: puedes asignarlas a variables, pasarlas como argumentos y retornarlas desde otras funciones.

```js exec
// Guardar función en variable
const operar = function(a, b, operacion) {
  return operacion(a, b);
};

const suma = (a, b) => a + b;
const resta = (a, b) => a - b;
const producto = (a, b) => a * b;

console.log(operar(10, 3, suma));      // 13
console.log(operar(10, 3, resta));     // 7
console.log(operar(10, 3, producto));  // 30
```

## Recursión

Una función puede llamarse a sí misma:

```js exec
function factorial(n) {
  // Caso base: factorial de 0 o 1 es 1
  if (n <= 1) return 1;
  // Caso recursivo: n! = n × (n-1)!
  return n * factorial(n - 1);
}

console.log("0! =", factorial(0));  // 1
console.log("1! =", factorial(1));  // 1
console.log("5! =", factorial(5));  // 120
console.log("8! =", factorial(8));  // 40320
```

## Scope (ámbito)

Las variables declaradas dentro de una función solo existen dentro de ella:

```js exec
let variableGlobal = "soy global";

function miFuncion() {
  let variableLocal = "soy local";
  console.log(variableGlobal);  // ✅ puede acceder a la global
  console.log(variableLocal);   // ✅ puede acceder a la local
}

miFuncion();
console.log(variableGlobal);    // ✅ funciona
// console.log(variableLocal);  // ❌ error: no existe fuera de la función
```

## Métodos de arrays útiles

Las funciones son protagonistas en los métodos de arrays:

```js exec
const numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// map: transforma cada elemento
const dobles = numeros.map(n => n * 2);
console.log("Dobles:", dobles);

// filter: filtra elementos
const pares = numeros.filter(n => n % 2 === 0);
console.log("Pares:", pares);

// reduce: acumula un resultado
const suma = numeros.reduce((acc, n) => acc + n, 0);
console.log("Suma total:", suma);

// find: primer elemento que cumple condición
const primerMayorA5 = numeros.find(n => n > 5);
console.log("Primero > 5:", primerMayorA5);
```

---

> **Resumen:** Las funciones son el corazón de JavaScript. Prefieres las arrow functions modernas `=>` para código conciso, y las declaraciones de función `function` para funciones que necesitan hoisting o son recursivas.
