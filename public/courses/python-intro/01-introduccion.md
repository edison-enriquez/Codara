---
id: "01-introduccion"
title: "Introducción a Python"
type: lesson
language: python
difficulty: beginner
order: 1
---

# Introducción a Python

Python es uno de los lenguajes más populares del mundo. Es famoso por su **legibilidad** y **versatilidad**:

- Ciencia de datos e inteligencia artificial (PyTorch, TensorFlow, NumPy)
- Desarrollo web (Django, FastAPI, Flask)
- Automatización y scripts
- Educación (es el lenguaje más enseñado a nivel mundial)

> 💡 **Nota:** La primera vez que ejecutes código Python en esta página, el navegador cargará **Pyodide** (Python en WebAssembly). Puede tardar unos segundos. ¡Vale la pena esperar!

## Hola Mundo

```python exec
print("¡Hola, mundo!")
print("Bienvenido a Python en el navegador 🐍")
```

## Variables y tipos

Python es **dinámicamente tipado**: no necesitas declarar el tipo de una variable.

```python exec
# Strings (texto)
nombre = "Python"
version = "3.12"
mensaje = f"Usando {nombre} {version}"  # f-string (interpolación)
print(mensaje)

# Números
entero = 42
decimal = 3.14159
print(f"Entero: {entero}, Decimal: {decimal}")

# Booleanos (True/False con mayúscula!)
activo = True
inactivo = False
print(f"Activo: {activo}, Inactivo: {inactivo}")

# None (equivale a null)
sin_valor = None
print(f"Sin valor: {sin_valor}")
```

## Indentación — La regla más importante de Python

Python usa **indentación** (espacios o tabulaciones) para definir bloques de código, en lugar de llaves `{}`:

```python exec
x = 10

if x > 5:
    print("x es mayor que 5")      # ← adentro del if
    print("esto también está adentro")
else:
    print("x es 5 o menor")

print("esto está fuera del if")     # ← fuera del if
```

## Operadores

```python exec
a = 15
b = 4

print(f"{a} + {b} = {a + b}")    # 19
print(f"{a} - {b} = {a - b}")    # 11
print(f"{a} * {b} = {a * b}")    # 60
print(f"{a} / {b} = {a / b}")    # 3.75 (división exacta)
print(f"{a} // {b} = {a // b}")  # 3   (división entera)
print(f"{a} % {b} = {a % b}")    # 3   (módulo/resto)
print(f"{a} ** {b} = {a ** b}")  # 50625 (potencia)
```

## Strings en Python

```python exec
texto = "Python es increíble"

# Métodos básicos
print(texto.upper())           # PYTHON ES INCREÍBLE
print(texto.lower())           # python es increíble
print(texto.replace("Python", "Codara"))  # Codara es increíble
print(len(texto))              # 19 (longitud)

# Slicing (cortar)
print(texto[0:6])              # Python
print(texto[-10:])             # increíble
print(texto[::-1])             # elbíercni se nohtyP (reverso)

# Verificar contenido
print("Python" in texto)       # True
print(texto.startswith("Py"))  # True
```

## Listas

```python exec
frutas = ["manzana", "banana", "cereza", "durazno"]

# Acceder
print(frutas[0])        # manzana (base 0)
print(frutas[-1])       # durazno (último elemento)

# Modificar
frutas.append("fresa")
print("Después de append:", frutas)

frutas.remove("banana")
print("Después de remove:", frutas)

# Iterar
print("\nTodas las frutas:")
for fruta in frutas:
    print(f"  - {fruta}")

# List comprehension (poderoso!)
mayusculas = [f.upper() for f in frutas]
print("\nEn mayúsculas:", mayusculas)
```

---

> **Resumen:** Python usa indentación para bloques, es dinámicamente tipado, tiene f-strings para interpolación y listas en lugar de arrays. En la siguiente lección aprenderás **funciones** y **diccionarios**.
