---
id: lab-17-printf-formato
title: "Lab 2.4 — Formatear salida con printf"
type: lab
language: c
hints:
  - "Para anchura fija: printf(\"%10d\", n); — 10 caracteres, alineado derecha"
  - "Para alinear izquierda: printf(\"%-10d\", n);"
  - "Para decimales: printf(\"%.2f\", x); — exactamente 2 decimales"
  - "Para combinar anchura y precisión: printf(\"%8.2f\", x);"
checks:
  - id: "has-width"
    description: "Usas un especificador con anchura de campo"
    pattern: "%[0-9]+"
    hint: "Usa anchura: printf(\"%8d\", n); o printf(\"%10s\", texto);"
    type: "regex"
    required: true
  - id: "has-precision"
    description: "Usas precisión decimal con %.Xf"
    pattern: "%\\.\\d+f"
    hint: "Controla decimales: printf(\"%.2f\\n\", precio);"
    type: "regex"
    required: true
  - id: "has-left-align"
    description: "Usas alineación a la izquierda con %-"
    pattern: "%-\\d+"
    hint: "Alinea izquierda con signo menos: printf(\"%-10d\", n);"
    type: "regex"
    required: true
  - id: "has-table"
    description: "Bonus: creas una tabla con columnas alineadas"
    pattern: "(printf.*%.*\\\\t.*%|printf.*%-\\d+.*%-\\d+)"
    hint: "Combina múltiples campos en una línea para crear tablas"
    type: "regex"
    required: false
---

## Formateando la salida con printf

`printf` tiene muchas opciones para controlar exactamente cómo se muestran los valores.

### Tu misión

Imprime la siguiente **tabla de productos** con columnas perfectamente alineadas:

```
Producto          Precio    Stock
---------------------------------
Manzana            1.25       50
Banana             0.89      120
Naranja            1.50       35
```

- La columna "Producto" ocupa **18 caracteres** — alineada a la izquierda
- La columna "Precio" ocupa **8 caracteres** con **2 decimales** — alineada a la derecha
- La columna "Stock" ocupa **8 caracteres** — alineada a la derecha

```c lab
#include <stdio.h>

int main(void)
{
    // Encabezado
    printf("%-18s%8s%8s\n", "Producto", "Precio", "Stock");
    printf("---------------------------------\n");

    // Escribe las filas de la tabla con el formato correcto
    // Manzana: precio 1.25, stock 50


    // Banana: precio 0.89, stock 120


    // Naranja: precio 1.50, stock 35


    return 0;
}
```

```c tests
void run_tests(void) {
    TEST("precio-2dec", 1== 1, "Usa %.2f para los precios");
    TEST("ancho-precio", 1==1, "Usa %8.2f para precios");
    TEST("izq-prod",     1==1, "Usa %-18s para productos (izquierda)");
    double precio = 1.25;
    TEST("valor-precio", precio == 1.25, "Precio manzana correcto");
    int stock = 50;
    TEST("valor-stock",  stock == 50, "Stock manzana correcto");
}
```
