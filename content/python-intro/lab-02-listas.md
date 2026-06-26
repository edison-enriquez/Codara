---
id: "lab-02-listas"
title: "Lab: Manipulación de listas"
type: lab
language: python
difficulty: beginner
order: 4
hints:
  - "Para `aplanar(lista)`, necesitas recorrer cada elemento y si es una lista, agregar sus elementos individualmente. Usa `isinstance(item, list)` para verificar si un elemento es lista."
  - "Para `contar_ocurrencias(lista, elemento)`, puedes usar el método `.count()` de las listas: `lista.count(elemento)`. O contarlo manualmente con un bucle."
  - "Para `rotar(lista, k)`, mover k posiciones a la derecha significa que los últimos k elementos van al principio. Ejemplo: rotar([1,2,3,4,5], 2) → [4,5,1,2,3]. Hint: usa slicing `lista[-k:] + lista[:-k]`."
  - "Para `interseccion(a, b)`, los elementos que aparecen en ambas listas (sin duplicados). Puedes convertir a sets: `list(set(a) & set(b))`, pero recuerda que el orden puede variar."
---

# Lab: Manipulación de listas

Las listas son una de las estructuras más usadas en Python. Dominar sus operaciones es fundamental.

## Funciones a implementar

### 1. `aplanar(lista)`
Dada una lista que puede contener sub-listas de un nivel, retorna una lista simple con todos los elementos.

- `aplanar([1, [2, 3], [4, 5], 6])` → `[1, 2, 3, 4, 5, 6]`
- `aplanar([[1, 2], [3, 4]])` → `[1, 2, 3, 4]`
- `aplanar([1, 2, 3])` → `[1, 2, 3]`

---

### 2. `contar_ocurrencias(lista, elemento)`
Retorna cuántas veces aparece `elemento` en `lista`.

- `contar_ocurrencias([1, 2, 2, 3, 2], 2)` → `3`
- `contar_ocurrencias(["a", "b", "a"], "a")` → `2`

---

### 3. `rotar(lista, k)`
Retorna una nueva lista rotada `k` posiciones a la **derecha**.

- `rotar([1, 2, 3, 4, 5], 2)` → `[4, 5, 1, 2, 3]`
- `rotar([1, 2, 3], 1)` → `[3, 1, 2]`

---

### 4. `interseccion(a, b)`
Retorna una lista con los elementos que aparecen en ambas listas (sin duplicados, ordenada).

- `interseccion([1, 2, 3, 4], [3, 4, 5, 6])` → `[3, 4]`
- `interseccion([1, 1, 2], [1, 2, 2])` → `[1, 2]`

```python lab
def aplanar(lista):
    # Tu código aquí
    pass

def contar_ocurrencias(lista, elemento):
    # Tu código aquí
    pass

def rotar(lista, k):
    # Tu código aquí
    pass

def interseccion(a, b):
    # Tu código aquí
    pass
```

```python tests
def check(cond, msg):
    assert cond, msg

test("aplanar lista mixta", lambda: check(aplanar([1, [2, 3], [4, 5], 6]) == [1, 2, 3, 4, 5, 6], f"Obtuvo: {aplanar([1, [2, 3], [4, 5], 6])}"))
test("aplanar lista simple", lambda: check(aplanar([1, 2, 3]) == [1, 2, 3], f"Obtuvo: {aplanar([1, 2, 3])}"))
test("aplanar lista de listas", lambda: check(aplanar([[1, 2], [3, 4]]) == [1, 2, 3, 4], f"Obtuvo: {aplanar([[1, 2], [3, 4]])}"))

test("contar_ocurrencias 3×2", lambda: check(contar_ocurrencias([1, 2, 2, 3, 2], 2) == 3, f"Obtuvo: {contar_ocurrencias([1, 2, 2, 3, 2], 2)}"))
test("contar_ocurrencias strings", lambda: check(contar_ocurrencias(['a', 'b', 'a'], 'a') == 2, f"Obtuvo: {contar_ocurrencias(['a', 'b', 'a'], 'a')}"))
test("contar_ocurrencias cuando no existe", lambda: check(contar_ocurrencias([1, 2, 3], 9) == 0, f"Obtuvo: {contar_ocurrencias([1, 2, 3], 9)}"))

test("rotar k=2", lambda: check(rotar([1, 2, 3, 4, 5], 2) == [4, 5, 1, 2, 3], f"Obtuvo: {rotar([1, 2, 3, 4, 5], 2)}"))
test("rotar k=1", lambda: check(rotar([1, 2, 3], 1) == [3, 1, 2], f"Obtuvo: {rotar([1, 2, 3], 1)}"))

test("interseccion básica", lambda: check(sorted(interseccion([1, 2, 3, 4], [3, 4, 5, 6])) == [3, 4], f"Obtuvo: {sorted(interseccion([1, 2, 3, 4], [3, 4, 5, 6]))}"))
test("interseccion sin duplicados", lambda: check(sorted(interseccion([1, 1, 2], [1, 2, 2])) == [1, 2], f"Obtuvo: {sorted(interseccion([1, 1, 2], [1, 2, 2]))}"))
```
