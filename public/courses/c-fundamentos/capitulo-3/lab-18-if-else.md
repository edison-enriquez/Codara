---
id: lab-18-if-else
title: "Lab 3.0 — Sentencia if-else"
type: lab
language: c
hints:
  - "Estructura: if (cond) { } else if (cond) { } else { }"
  - "Solo se ejecuta UN bloque: el primero cuya condición sea verdadera"
  - "Para comparar caracteres: if (letra >= 'A' && letra <= 'Z')"
  - "Recuerda cerrar cada bloque con llaves {}"
checks:
  - id: "has-if-else"
    description: "Usas if con al menos un else"
    pattern: "if\\s*\\([^)]+\\).*else"
    hint: "Agrega else: if (cond) { ... } else { ... }"
    type: "regex"
    required: true
  - id: "has-else-if"
    description: "Usas else if para múltiples condiciones"
    pattern: "else\\s+if\\s*\\("
    hint: "Encadena condiciones: else if (otra_cond) { ... }"
    type: "regex"
    required: true
  - id: "has-grade"
    description: "Clasificas según un valor numérico"
    pattern: "(>=\\s*9|>=\\s*8|>=\\s*7|>=\\s*6)"
    hint: "Clasifica la nota: >= 90 → A, >= 80 → B, etc."
    type: "regex"
    required: true
  - id: "has-nested"
    description: "Bonus: tienes un if dentro de otro (anidado)"
    pattern: "if\\s*\\([^)]+\\)\\s*\\{[^}]*if\\s*\\("
    hint: "Anida un if dentro de otro para condiciones más específicas"
    type: "regex"
    required: false
---

## La sentencia if-else

### Tu misión

Escribe un programa que clasifique una calificación numérica (0-100):

| Nota | Calificación |
|------|-------------|
| ≥ 90 | A — Excelente |
| ≥ 80 | B — Bien |
| ≥ 70 | C — Aprobado |
| ≥ 60 | D — Suficiente |
| < 60 | F — Reprobado |

Pruébalo con `int nota = 75`.

Bonus: también indica si pasó o no el examen (nota >= 60).

```c lab
#include <stdio.h>

int main(void)
{
    int nota = 75;

    printf("Nota: %d\n", nota);

    // Clasifica la nota con if, else if, else
    if (nota >= 90) {
        printf("Calificación: A — Excelente\n");
    }
    // Continúa con las demás condiciones...


    // Bonus: ¿aprobó o reprobó?


    return 0;
}
```

```c tests
void run_tests(void) {
    CAPTURE_STUDENT_OUTPUT();
    TEST_OUTPUT_CONTAINS("muestra-nota","75");
    TEST_OUTPUT_CONTAINS("letra-C",    "C");
    TEST_OUTPUT_CONTAINS("aprobo",     "Aprob");
}
```
