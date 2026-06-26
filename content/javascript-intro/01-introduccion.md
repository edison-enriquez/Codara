---
id: "01-introduccion"
title: "¿Qué es JavaScript?"
type: lesson
language: javascript
difficulty: beginner
order: 1
---

# ¿Qué es JavaScript?

JavaScript es el **lenguaje de programación de la web**. Fue creado en 1995 por Brendan Eich en Netscape y actualmente es uno de los lenguajes más utilizados en el mundo.

Con JavaScript puedes:

- Hacer páginas web **interactivas** (responder a clics, formularios, animaciones)
- Crear **servidores** con Node.js
- Desarrollar **aplicaciones móviles** con React Native
- Hacer **inteligencia artificial** con TensorFlow.js

## Tu primer programa

¡Ejecuta el siguiente código haciendo clic en **Ejecutar**!

```js exec
console.log("¡Hola, mundo!");
console.log("Bienvenido a Codara 🚀");
```

> 💡 `console.log()` imprime texto en la consola del navegador. Es la herramienta de diagnóstico más usada en JavaScript.

## JavaScript en el navegador

JavaScript se ejecuta **directamente en el navegador**, sin necesidad de compilar. Esto lo hace muy rápido para probar ideas.

```js exec
// Podemos hacer cálculos simples
const resultado = 40 + 2;
console.log("La respuesta a todo:", resultado);

// Trabajar con texto
const saludo = "Hola" + ", " + "programador!";
console.log(saludo);
```

## Comentarios

Los comentarios son notas en el código que el programa ignora. Sirven para documentar y explicar:

```js exec
// Esto es un comentario de una línea

/*
  Esto es un comentario
  de múltiples líneas
*/

console.log("Los comentarios no afectan la ejecución");

// Prueba comentando y descomentando líneas:
console.log("Línea 1");
// console.log("Esta línea está comentada");
console.log("Línea 3");
```

## JavaScript es sensible a mayúsculas

Como C, JavaScript distingue entre mayúsculas y minúsculas (*case-sensitive*):

```js exec
let mensaje = "correcto";
// let Mensaje = "esto es una variable diferente"
// let MENSAJE = "esta también es diferente"

console.log(mensaje);
// console.log(Mensaje);  // ← daría error si no está declarada
```

## Punto y coma (`;`)

En JavaScript los `;` al final de cada instrucción son **opcionales** (el intérprete los añade automáticamente en la mayoría de casos). Sin embargo, es buena práctica incluirlos:

```js exec
console.log("Con punto y coma");  // ← recomendado
console.log("Sin punto y coma")   // ← también funciona
```

---

> **Resumen:** JavaScript es interpretado (no compilado), se ejecuta en el navegador, es case-sensitive y usa `;` opcionales. En la siguiente lección aprenderás sobre **variables y tipos de datos**.
