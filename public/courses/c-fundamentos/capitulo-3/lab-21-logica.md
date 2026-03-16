---
id: lab-21-logica
title: "Lab 3.4 — Operadores lógicos"
type: lab
language: c
hints:
  - "AND (&&): ambas condiciones deben ser verdaderas"
  - "OR (||): basta con que una sea verdadera"
  - "NOT (!): invierte el valor: !0 es 1, !1 es 0"
  - "Cortocircuito: en &&, si el primero es falso no evalúa el segundo"
checks:
  - id: "has-and"
    description: "Usas el operador AND (&&)"
    pattern: "&&"
    hint: "Usa &&: if (a > 0 && a < 100) { ... }"
    type: "regex"
    required: true
  - id: "has-or"
    description: "Usas el operador OR (||)"
    pattern: "\\|\\|"
    hint: "Usa ||: if (x < 0 || x > 100) { ... }"
    type: "regex"
    required: true
  - id: "has-not"
    description: "Usas el operador NOT (!)"
    pattern: "![^=]"
    hint: "Usa !: if (!esValido) { ... }"
    type: "regex"
    required: true
  - id: "has-combined"
    description: "Bonus: combinas && y || en una misma condición"
    pattern: "&&.*\\|\\||\\|\\|.*&&"
    hint: "Combina: if (edad >= 18 && (ingresos > 2000 || credito > 700))"
    type: "regex"
    required: false
---

## Operadores lógicos en práctica

### Tu misión

Trabaja con estas variables:
```c
int edad = 22;
int ingresos = 1500;
int historial = 800;  // puntuación de crédito (0-850)
int enDeuda = 0;      // 0 = no, 1 = sí
```

Usando operadores lógicos, determina:

1. **¿Es mayor de edad?** → `edad >= 18`
2. **¿Puede abrir una cuenta básica?** → mayor de edad Y no está en deuda
3. **¿Puede pedir un préstamo?** → mayor de edad, (ingresos >= 2000 O historial >= 750), Y no está en deuda
4. **¿Es cliente de bajo riesgo?** → no está en deuda Y historial >= 700

```c lab
#include <stdio.h>

int main(void)
{
    int edad     = 22;
    int ingresos = 1500;
    int historial = 800;
    int enDeuda   = 0;

    // 1. ¿Es mayor de edad?
    if (edad >= 18) {
        printf("Es mayor de edad.\n");
    } else {
        printf("Es menor de edad.\n");
    }

    // 2. ¿Puede abrir cuenta básica? (mayor de edad Y sin deuda)


    // 3. ¿Puede pedir préstamo? (mayor de 18, [ingresos>=2000 O historial>=750], Y sin deuda)


    // 4. ¿Cliente de bajo riesgo? (sin deuda Y historial >= 700)


    return 0;
}
```

```c tests
void run_tests(void) {
    int edad=22, ingresos=1500, historial=800, enDeuda=0;
    TEST("mayor-edad",   edad >= 18,                              "22 es mayor de edad");
    TEST("cuenta-ok",    edad >= 18 && !enDeuda,                  "Puede abrir cuenta");
    TEST("prestamo-ok",  edad>=18 && (ingresos>=2000||historial>=750) && !enDeuda, "Puede pedir préstamo con buen historial");
    TEST("bajo-riesgo",  !enDeuda && historial >= 700,            "Es cliente de bajo riesgo");
    TEST("not-deuda",    !enDeuda == 1,                           "!0 es verdadero (1)");
}
```
