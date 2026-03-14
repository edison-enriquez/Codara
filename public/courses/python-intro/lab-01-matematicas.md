---
id: "lab-01-matematicas"
title: "Lab: Funciones matemáticas en Python"
type: lab
language: python
difficulty: beginner
order: 3
hints:
  - "Para `es_primo(n)`, un número es primo si solo es divisible por 1 y por sí mismo. Verifica que n > 1 y que ningún número del 2 al √n (int(n**0.5)+1) lo divida."
  - "Para `suma_digitos(n)`, convierte el número a string, itera sobre cada carácter, conviértelo de vuelta a int y súmalos. Ejemplo: str(123) → '1','2','3' → 1+2+3 = 6."
  - "Para `mcd(a, b)`, usa el algoritmo de Euclides: mientras b != 0, calcula (a, b) = (b, a % b). Cuando b sea 0, retorna a."
  - "La solución de mcd con recursión es: `if b == 0: return a; return mcd(b, a % b)`"
---

# Lab: Funciones matemáticas en Python

Implementa tres funciones matemáticas clásicas en Python.

## Funciones a implementar

### 1. `es_primo(n)`
Retorna `True` si `n` es un número primo, `False` si no.

Un número primo es mayor que 1 y solo divisible por 1 y sí mismo.

- `es_primo(2)` → `True`
- `es_primo(17)` → `True`
- `es_primo(4)` → `False`
- `es_primo(1)` → `False`

---

### 2. `suma_digitos(n)`
Retorna la suma de los dígitos de un número entero positivo.

- `suma_digitos(123)` → `6` (1+2+3)
- `suma_digitos(9999)` → `36` (9+9+9+9)

---

### 3. `mcd(a, b)`
Retorna el **Máximo Común Divisor** de dos enteros positivos.

Usa el **algoritmo de Euclides**.

- `mcd(12, 8)` → `4`
- `mcd(100, 75)` → `25`
- `mcd(17, 5)` → `1`

```python lab
def es_primo(n):
    # Tu código aquí
    pass

def suma_digitos(n):
    # Tu código aquí
    pass

def mcd(a, b):
    # Tu código aquí
    pass
```

```python tests
def check(cond, msg):
    assert cond, msg

test("2 es primo", lambda: check(es_primo(2) == True, "2 debería ser primo"))
test("17 es primo", lambda: check(es_primo(17) == True, "17 debería ser primo"))
test("4 no es primo", lambda: check(es_primo(4) == False, "4 no es primo"))
test("1 no es primo", lambda: check(es_primo(1) == False, "1 no es primo"))
test("97 es primo", lambda: check(es_primo(97) == True, "97 debería ser primo"))

test("suma_digitos(123) = 6", lambda: check(suma_digitos(123) == 6, f"Esperaba 6, obtuvo {suma_digitos(123)}"))
test("suma_digitos(9999) = 36", lambda: check(suma_digitos(9999) == 36, f"Esperaba 36, obtuvo {suma_digitos(9999)}"))
test("suma_digitos(100) = 1", lambda: check(suma_digitos(100) == 1, f"Esperaba 1, obtuvo {suma_digitos(100)}"))

test("mcd(12, 8) = 4", lambda: check(mcd(12, 8) == 4, f"Esperaba 4, obtuvo {mcd(12, 8)}"))
test("mcd(100, 75) = 25", lambda: check(mcd(100, 75) == 25, f"Esperaba 25, obtuvo {mcd(100, 75)}"))
test("mcd(17, 5) = 1", lambda: check(mcd(17, 5) == 1, f"Esperaba 1, obtuvo {mcd(17, 5)}"))
```
