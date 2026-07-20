/**
 * Harness del agente tutor.
 *
 * Capa alrededor del modelo (reemplazable) que posee las decisiones:
 *  - tutorSchema.ts   → contrato de salida + JSON Schema para salida estructurada
 *  - parse.ts         → validación del contrato, tool calls y verificación de citas
 *  - tutorHarness.ts  → bucle agente: herramientas, reintento con feedback, fallback
 *  - tools.ts         → herramientas del tutor (get_lesson_section)
 *  - context.ts       → chunking inteligente de la lección (secciones por relevancia)
 *  - tutorPrompt.ts   → system prompt del tutor (propiedad del harness)
 *  - advanceGate.ts   → gate determinista de avance de lección
 *  - telemetry.ts     → métricas de salud del agente
 */
export * from './tutorSchema'
export * from './parse'
export * from './advanceGate'
export * from './telemetry'
export * from './tutorHarness'
export * from './context'
export * from './tools'
export * from './tutorPrompt'
