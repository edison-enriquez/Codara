---
id: "02-funciones"
title: "Funciones y estructuras de datos"
type: lesson
language: python
difficulty: beginner
order: 2
---

# Funciones y estructuras de datos

## Definir funciones

```python exec
def saludar(nombre):
    return f"¡Hola, {nombre}!"

print(saludar("Codara"))
print(saludar("Programador"))
```

## Parámetros con valores por defecto

```python exec
def potencia(base, exponente=2):
    return base ** exponente

print(potencia(5))       # 25  (exponente=2 por defecto)
print(potencia(5, 3))    # 125 (exponente=3 explícito)
print(potencia(2, 8))    # 256
```

## Múltiples valores de retorno

```python exec
def min_max(lista):
    return min(lista), max(lista)

numeros = [3, 1, 4, 1, 5, 9, 2, 6]
minimo, maximo = min_max(numeros)
print(f"Mínimo: {minimo}")
print(f"Máximo: {maximo}")
```

## Funciones lambda

Las funciones lambda son funciones anónimas de una sola línea:

```python exec
# Equivale a: def cuadrado(n): return n * n
cuadrado = lambda n: n * n
doble    = lambda n: n * 2

print(cuadrado(5))  # 25
print(doble(7))     # 14

# Muy útiles con sorted, map, filter
numeros = [5, 2, 8, 1, 9, 3]
print(sorted(numeros))                          # [1, 2, 3, 5, 8, 9]
print(sorted(numeros, reverse=True))            # [9, 8, 5, 3, 2, 1]
print(list(map(lambda n: n**2, numeros)))       # [25, 4, 64, 1, 81, 9]
print(list(filter(lambda n: n > 4, numeros)))   # [5, 8, 9]
```

## Diccionarios

Un diccionario almacena pares **clave: valor**:

```python exec
persona = {
    "nombre": "Ana",
    "edad": 28,
    "ciudad": "México"
}

# Acceder
print(persona["nombre"])
print(persona.get("edad", "desconocida"))  # get es seguro (no lanza KeyError)

# Modificar / agregar
persona["email"] = "ana@ejemplo.com"
persona["edad"] = 29

# Iterar
print("\nDatos personales:")
for clave, valor in persona.items():
    print(f"  {clave}: {valor}")

# Verificar existencia
print("\n'email' en persona:", "email" in persona)
print("'telefono' en persona:", "telefono" in persona)
```

## Conjuntos (sets)

```python exec
a = {1, 2, 3, 4, 5}
b = {3, 4, 5, 6, 7}

print("Unión:", a | b)            # {1, 2, 3, 4, 5, 6, 7}
print("Intersección:", a & b)     # {3, 4, 5}
print("Diferencia:", a - b)       # {1, 2}
print("¿2 en a?", 2 in a)         # True

# Eliminar duplicados
lista_con_dupes = [1, 2, 2, 3, 3, 3, 4]
sin_dupes = list(set(lista_con_dupes))
print("Sin duplicados:", sin_dupes)
```

## Comprensiones (comprehensions)

Una de las características más poderosas de Python:

```python exec
# List comprehension
cuadrados = [n**2 for n in range(1, 11)]
print("Cuadrados:", cuadrados)

# Con filtro
pares = [n for n in range(1, 21) if n % 2 == 0]
print("Pares del 1 al 20:", pares)

# Dict comprehension
raices = {n: n**0.5 for n in range(1, 6)}
print("Raíces:", raices)

# Set comprehension
letras = {c.lower() for c in "Programación"}
print("Letras únicas:", letras)
```

---

> **Resumen:** Las funciones en Python se definen con `def`, pueden tener parámetros por defecto, retornar múltiples valores, y las lambdas son funciones anónimas. Los diccionarios son fundamentales en Python. Las comprensiones hacen el código más legible y conciso.
