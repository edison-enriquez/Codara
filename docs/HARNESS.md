# El Harness del Agente Tutor

Guía completa del harness de Codara: qué es, cómo está construido, qué le
aporta al agente tutor y cómo sacarle partido si eres educador.

---

## 1. ¿Qué es un "harness" (arnés)?

Cuando hablas con un agente de IA, lo que ves **no es el modelo**: es el
modelo *más* todo lo que lo rodea. Ese "todo lo demás" es el **harness**:

> **Modelo** = el LLM (Groq, Llama local…). Intercambiable.
> **Harness** = todo lo que la aplicación hace alrededor del modelo:
> construir el contexto, definir el formato de salida, validar lo que el
> modelo dice, corregirlo cuando falla, decidir qué acciones ejecuta,
> medir su comportamiento y evaluar su calidad.

Una analogía: el modelo es el motor de un coche; el harness es el chasis,
los frenos, el volante y el cuadro de instrumentos. Un motor potente sin
frenos es peligroso; un motor modesto con un buen chasis es útil y seguro.

**La idea clave de la ingeniería de harness**: el modelo es un componente
reemplazable; el harness es *tu producto*. Cuando mejora el modelo, tu
harness sigue ahí. Cuando el modelo falla (y falla), el harness decide qué
pasa: reintenta, repara, degrada con elegancia o registra el fallo.

### Sin harness vs. con harness

| Situación | Sin harness | Con harness (Codara) |
|---|---|---|
| El modelo responde JSON roto | El estudiante ve basura en pantalla | Reintento con feedback + reparación |
| El modelo inventa una cita de la lección | Se subraya texto que no existe | La marca se rechaza y se cuenta |
| El modelo dice "¡adelante!" sin motivo | El estudiante salta de lección | El **gate** bloquea el avance |
| Lección de 12 secciones | Contexto truncado a la mitad | **Chunking** por relevancia + herramienta para leer más |
| ¿Funciona bien el tutor? | "Parece que sí" | Métricas + golden set + juez LLM |
| Cambiar de Groq a modelo local | Reescribir el agente | Cambiar un desplegable en ajustes |

---

## 2. Arquitectura de la aplicación

### Vista general de Codara

Codara es una plataforma de cursos de programación (estilo HackerRank)
100% en el navegador:

```
┌──────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                             │
│                                                              │
│  React (UI)                                                  │
│   ├── Lecciones Markdown (content/ → public/courses/)        │
│   ├── Labs con Monaco + tests (JS sandbox / Python Pyodide)  │
│   ├── AgentPanel (asistente de código en labs)               │
│   └── VoiceTutor ────────┐                                   │
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │   HARNESS (src/harness)│ ← este documento     │
│              └───────────┬───────────┘                       │
│                          ▼                                   │
│              llmClient (interfaz única)                      │
│                ├── Groq (nube, API key del usuario)          │
│                └── WebLLM (modelo local en WebGPU)           │
└──────────────────────────────────────────────────────────────┘
```

No hay backend de IA: el estudiante elige entre **Groq** (nube, rápido) o
**WebLLM** (modelo de 1–8B ejecutándose en su propia GPU, sin que nada
salga del navegador — relevante para privacidad en el aula).

### El flujo de un turno del tutor, paso a paso

```
Estudiante habla/escribe
        │
        ▼
┌─ VoiceTutor (UI) ───────────────────────────────────────────┐
│ 1. STT → texto del estudiante                               │
│ 2. buildLessonContext: selecciona las secciones de la       │
│    lección más relevantes a la conversación (chunking)      │
│ 3. buildSystemPrompt: prompt oficial + índice + contexto    │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─ tutorHarness.runTutorTurn (bucle agente) ──────────────────┐
│                                                             │
│  ┌─► LLM (salida estructurada nativa si se admite)          │
│  │        │                                                 │
│  │        ▼                                                 │
│  │   validateModelResponse                                  │
│  │        │                                                 │
│  │   ┌────┴───────────────┬──────────────────┐              │
│  │   ▼                    ▼                  ▼              │
│  │ TOOL CALL          TURNO VÁLIDO        INVÁLIDO          │
│  │   │                    │                  │              │
│  │   ▼                    │                  ▼              │
│  │ executeTutorTool       │          feedback al modelo ───┤
│  │ (get_lesson_section)   │          (reintento, máx. 2)    │
│  └────┴────────────────────┘                               │
│       Todo se registra en telemetría                       │
└──────────────┬──────────────────────────────────────────────┘
               ▼
┌─ VoiceTutor ────────────────────────────────────────────────┐
│ 4. decideAdvance (GATE): ¿hay evidencia para avanzar?       │
│ 5. TTS lee el speech; las marcas verificadas se subrayan    │
│    en la lección; la acción de diapositivas se ejecuta      │
└─────────────────────────────────────────────────────────────┘
```

### Los 8 archivos del harness (`src/harness/`)

| Archivo | Rol | Analogía |
|---|---|---|
| `tutorSchema.ts` | Contrato de salida del tutor + JSON Schema para el proveedor | El molde |
| `tutorPrompt.ts` | System prompt oficial (reglas pedagógicas, formato, herramientas) | El guion del profesor |
| `context.ts` | Chunking: divide la lección en secciones y elige las relevantes | El índice del libro |
| `parse.ts` | Valida/repara la salida; verifica citas contra la lección real | El corrector |
| `tools.ts` | Herramienta `get_lesson_section` (leer secciones omitidas) | La consulta |
| `tutorHarness.ts` | El bucle: herramientas → validación → reintento → fallback | El director de orquesta |
| `advanceGate.ts` | Gate determinista de avance de lección | Los frenos |
| `telemetry.ts` | Métricas de salud del agente | El cuadro de instrumentos |

---

## 3. Cómo se aplica el harness: las 7 piezas en detalle

### 3.1 Contrato de salida (`tutorSchema.ts`)

El tutor nunca responde texto libre: responde un objeto con 5 campos:

```json
{
  "speech": "lo que dirá en voz alta",
  "marks": [{ "text": "cita exacta de la lección", "style": "highlight" }],
  "advance": false,
  "action": null,
  "verdict": "correct"
}
```

- `speech` → se sintetiza por voz y se muestra en el chat.
- `marks` → fragmentos de la lección que se resaltan/subrayan en pantalla.
- `advance` → *solicitud* de pasar a la siguiente lección (ver gate, 3.6).
- `action` → control de presentaciones Slidev (`nextSlide`, `goToSlide:N`…).
- `verdict` → evaluación de la última respuesta del estudiante
  (`correct` / `partial` / `incorrect`), la evidencia que usa el gate.

El mismo contrato existe como **JSON Schema** que se envía al proveedor:
WebLLM lo usa para *constrained decoding* (la salida cumple el esquema por
construcción) y Groq para su modo JSON. Si el proveedor no lo admite, se
cae a generación libre y la validación (3.3) sigue aplicando.

### 3.2 Chunking del contexto (`context.ts`)

Una lección larga no cabe entera en el prompt. Antes se truncaba a los
primeros 6000 caracteres (cortando frases a la mitad). Ahora:

1. La lección se divide en **secciones** por sus encabezados Markdown.
2. Cada sección se puntúa por **solapamiento de palabras clave** con los
   últimos 4 turnos de la conversación.
3. Se rellena el presupuesto con las más relevantes (la introducción
   siempre entra), preservando el orden del documento.
4. Las secciones que quedan fuera se **anuncian en el índice** del system
   prompt: el modelo sabe que existen y puede pedirlas (ver 3.4).

Resultado: si el estudiante pregunta "¿y las constantes?", la sección de
constantes entra en el contexto de ese turno aunque esté al final de la
lección.

### 3.3 Validación y reintento con feedback (`parse.ts` + `tutorHarness.ts`)

Cada respuesta del modelo pasa por `validateModelResponse`:

- **JSON inválido o sin `speech`** → el harness devuelve al modelo un
  mensaje de feedback ("tu respuesta fue RECHAZADA porque…") y reintenta
  (máx. 2 intentos). La mayoría de fallos se autocorrigen.
- **JSON truncado** → se repara por regex sin molestar al modelo.
- **Marcas que no son citas exactas de la lección** → se descartan
  silenciosamente (el estudiante nunca ve un subrayado inventado) y se
  cuentan en telemetría.
- **Todo agotado** → fallback controlado: se habla el texto crudo en vez
  de dejar al estudiante esperando. Se registra el fallo.

### 3.4 Herramientas y bucle agente (`tools.ts`)

El tutor dispone de una herramienta, `get_lesson_section`, para leer
secciones no incluidas en el contexto:

```json
{"tool_call": {"name": "get_lesson_section", "args": {"section": 3}}}
```

El harness la ejecuta, devuelve el contenido al modelo y el bucle continúa
(máx. 2 rondas por turno). Es un mini-agente real: *decide que necesita
información → la pide → responde con ella*.

> **Decisión de diseño**: protocolo JSON mediado por el harness en vez de
> tool-calling nativo del proveedor. Funciona igual en Groq y en modelos
> locales de 1–3B (WebLLM), y es testeable sin red.

### 3.5 El prompt como propiedad del harness (`tutorPrompt.ts`)

El system prompt vive en el harness, no en el componente de UI: contiene
las reglas pedagógicas (preguntas abiertas, corrección amable, no avanzar
sin comprensión), el formato de salida y la documentación de la
herramienta. Los evals ejercitan **exactamente el mismo prompt** que la app.

### 3.6 El gate de avance (`advanceGate.ts`)

Avanzar de lección tiene efectos reales (marca progreso, navega). Por eso
**el modelo propone y el harness dispone**:

```
avance permitido ⇔ el estudiante pidió continuar explícitamente
                 ("siguiente", "continuar", "adelante"…)
                 O el modelo evaluó su última respuesta como "correct"
```

Un `advance: true` sin evidencia queda **bloqueado** y registrado
(`advanceBlocked`). El tutor sigue la conversación en la misma lección.

### 3.7 Telemetría (`telemetry.ts`)

Cada evento del harness incrementa un contador persistido en localStorage:

```js
// En la consola del navegador:
__codaraHarness.getMetrics()
// { turns: 42, parseFailures: 3, retries: 3, retrySuccesses: 2,
//   toolCalls: 5, toolErrors: 1, marksRejected: 7,
//   advanceAllowed: 4, advanceBlocked: 2, fallbackUsed: 1, ... }
```

### 3.8 Evals: golden set + LLM-as-judge

`evals/golden/tutor-turns.json` contiene casos dorados con respuestas del
modelo guionizadas. Corren en `npm test` contra el harness real:

- marcas inventadas → deben rechazarse;
- `advance` sin evidencia → el gate debe bloquearlo;
- tool call → debe ejecutarse y llegar el resultado al modelo;
- prosa sin JSON → debe disparar el reintento con feedback…

Los casos `live: true` usan un **LLM juez** que puntúa (1–5) corrección,
pedagogía y brevedad de respuestas del modelo real:

```bash
GROQ_API_KEY=gsk_... npm run eval:tutor
```

---

## 4. Qué características le da al agente

| Característica | Pieza del harness | Qué significa en el aula |
|---|---|---|
| **Fiabilidad** | Salida estructurada + reintento con feedback + reparación | El tutor casi nunca "se rompe" delante del estudiante |
| **Honestidad** | Verificación de citas | Solo se subraya lo que realmente dice la lección; cero referencias inventadas |
| **Ritmo pedagógico** | Gate de avance | Nadie salta de lección sin demostrar comprensión o pedirlo |
| **Atención** | Chunking por relevancia | El tutor "recuerda" de qué se estaba hablando y trae el material adecuado |
| **Agencia** | Herramienta `get_lesson_section` | El tutor puede ir a buscar el contenido que necesita antes de responder |
| **Medición** | Telemetría | Comportamiento observable, no intuición |
| **Calidad continua** | Golden set + juez | Las regresiones se detectan antes de llegar al aula |
| **Portabilidad** | `llmClient` + protocolo JSON | Mismo tutor en la nube o 100% local; el modelo es un desplegable |
| **Privacidad** | WebLLM | Con el modelo local, nada sale del navegador del estudiante |

---

## 5. Cómo usarlo un educador / profesor

### 5.1 Elegir el modo de ejecución según el contexto

- **Groq (nube)**: máxima calidad de conversación. Requiere API key y conexión.
  Bueno para clases online o material delicado en cuanto a calidad.
- **WebLLM (local)**: el modelo se descarga una vez y corre en el navegador.
  Bueno para aulas sin internet fiable, y **cuando la normativa exige que los
  datos del estudiante no salgan del dispositivo** (menores, RGPD).

### 5.2 Escribir lecciones que el harness aprovecha

El harness amplifica lo que ya haces bien al escribir contenido:

1. **Usa encabezados claros** (`## Concepto`, `## Ejemplo`…). Son las
   unidades del chunking: encabezados bien puestos = el tutor siempre
   encuentra la sección correcta cuando un estudiante pregunta.
2. **Definiciones literales y autocontenidas**. Las marcas del tutor son
   citas exactas; frases como *"Una variable es un contenedor para guardar
   datos"* son perfectas para resaltar.
3. **Una idea por sección**. Facilita la relevancia del chunking y las
   respuestas del tutor.
4. **Prosa legible en voz alta**: el tutor habla el contenido; evita
   párrafos que dependan de ver una imagen o tabla.

### 5.3 Vigilar la salud del tutor con las métricas

Después de una sesión de clase, abre la consola del navegador:

```js
__codaraHarness.getMetrics()
```

| Si ves esto… | …probablemente significa | Qué hacer |
|---|---|---|
| `advanceBlocked` alto | El modelo intenta avanzar sin comprensión demostrada | El gate está trabajando: revisa si la lección evalúa bien |
| `advanceAllowed` ≈ 0 en toda la clase | Nadie llega a `verdict: correct` | ¿Las preguntas del tutor son demasiado difíciles? ¿La lección es confusa? |
| `marksRejected` alto | El modelo inventa citas | Revisa que la lección tenga definiciones literales fáciles de citar |
| `parseFailures` alto | El modelo no sigue el formato | Con modelos locales, prueba uno mayor (3B+) o Groq |
| `fallbackUsed` > 0 | Hubo turnos sin respuesta válida | Mira la consola: suele ser modelo local demasiado pequeño |
| `toolErrors` alto | El modelo pide secciones que no existen | Revisa que los encabezados sean claros y numerables |

Puedes reiniciar los contadores entre clases con `__codaraHarness.reset()`.

### 5.4 Evaluar el tutor antes de estrenar una lección

Si tienes una API key de Groq, ejecuta los evals:

```bash
GROQ_API_KEY=gsk_... npm run eval:tutor
```

Verás la nota del juez (1–5) por caso en vivo. Si una lección nueva hace
bajar las notas, el problema está en el contenido o en el prompt, no en el
modelo.

### 5.5 Añadir tus propios casos al golden set

El golden set es tu red de seguridad pedagógica. Edita
`evals/golden/tutor-turns.json`:

```json
{
  "id": "mi-caso",
  "description": "Qué debe pasar cuando…",
  "studentText": "lo que dice el estudiante",
  "modelResponses": ["{\"speech\": \"...\", \"marks\": [], \"advance\": false, \"action\": null, \"verdict\": \"partial\"}"],
  "expect": { "verdict": "partial", "gate": { "allowed": false } }
}
```

Corre determinista en `npm test` (sin API key). Úsalo para fijar
comportamientos: "si el estudiante se rinde, el tutor no debe avanzar",
"las marcas deben citar la lección", etc. Cada caso es una regla
pedagógica hecha test.

### 5.6 Ajustar el comportamiento (para educadores con perfil técnico)

| Quiero que… | Dónde tocar |
|---|---|
| El avance sea más estricto (2 respuestas correctas) | `decideAdvance` en `src/harness/advanceGate.ts` |
| El tutor sea más/menos extenso al hablar | Reglas en `TUTOR_SYSTEM_PROMPT` (`src/harness/tutorPrompt.ts`) |
| Más contexto de lección por turno | `budget: 6000` en `buildLLMMessages` (`VoiceTutor.tsx`) |
| Más reintentos de formato | `maxAttempts` en `runTutorTurn` |
| Más lecturas por turno | `maxToolRounds` en `runTutorTurn` |
| Otra nota mínima del juez | `JUDGE_MIN_SCORE` en `live-judge.test.ts` |

---

## 6. Glosario rápido

- **Harness**: todo el código alrededor del modelo que hace que el agente
  sea fiable, medible y seguro.
- **Contrato / schema**: el formato exacto que debe producir el modelo.
- **Validación**: comprobar la salida antes de usarla; lo inválido se
  reintenta con feedback o se degrada con control.
- **Chunking**: seleccionar qué partes de la lección entran en el prompt.
- **Tool calling**: el modelo pide ejecutar una acción/lectura; el harness
  la ejecuta y devuelve el resultado.
- **Gate**: regla determinista que autoriza (o no) una acción propuesta
  por el modelo.
- **Telemetría**: contadores de salud del agente.
- **Golden set**: casos de comportamiento esperado que actúan como tests.
- **LLM-as-judge**: un segundo LLM que puntúa la calidad de las respuestas.
