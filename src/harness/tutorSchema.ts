/**
 * Contrato de salida del agente tutor.
 *
 * El harness define QUÉ debe producir el modelo (este schema), lo valida en
 * cada turno (parse.ts) y decide qué hacer cuando no se cumple (tutorHarness.ts).
 * El modelo es reemplazable; este contrato es estable.
 */

export interface TutorMark {
  text: string
  style: 'highlight' | 'underline'
}

/** Evaluación del modelo sobre la última respuesta del estudiante. */
export type Verdict = 'correct' | 'partial' | 'incorrect'

/** Un turno del tutor ya validado y listo para ejecutar (TTS, marcas, acciones). */
export interface TutorTurn {
  /** Lo que el tutor dirá en voz alta. */
  speech: string
  /** Citas exactas de la lección a resaltar/subrayar (ya verificadas). */
  marks: TutorMark[]
  /** El modelo pide avanzar de lección (el gate del harness decide si se permite). */
  advance: boolean
  /** Acción de presentación: "nextSlide" | "prevSlide" | "goToSlide:N" | null. */
  action: string | null
  /** Veredicto sobre la última respuesta del estudiante (null si no aplica). */
  verdict: Verdict | null
}

/**
 * JSON Schema del contrato, para salida estructurada nativa del proveedor
 * (constrained decoding en WebLLM; modo JSON en Groq). El parseo/validación
 * del harness sigue activo como red de seguridad aunque se use esto.
 */
export const TUTOR_RESPONSE_SCHEMA = {
  name: 'tutor_turn',
  schema: {
    type: 'object',
    properties: {
      speech: {
        type: 'string',
        description: 'Lo que el tutor dirá en voz alta (texto natural, conversacional, en español).',
      },
      marks: {
        type: 'array',
        description: 'Citas EXACTAS del contenido de la lección a marcar (máx. 3).',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Cita exacta copiada tal cual de la lección.' },
            style: { type: 'string', enum: ['highlight', 'underline'] },
          },
          required: ['text', 'style'],
          additionalProperties: false,
        },
      },
      advance: {
        type: 'boolean',
        description: 'true solo si el estudiante demostró comprensión o pidió explícitamente continuar.',
      },
      action: {
        type: ['string', 'null'],
        description: 'null, o una de: "nextSlide", "prevSlide", "goToSlide:N" (N = número de diapositiva).',
      },
      verdict: {
        type: ['string', 'null'],
        enum: ['correct', 'partial', 'incorrect', null],
        description: 'Evaluación de la última respuesta del estudiante; null si no hay nada que evaluar.',
      },
    },
    required: ['speech', 'marks', 'advance', 'action', 'verdict'],
    additionalProperties: false,
  } as Record<string, unknown>,
}
