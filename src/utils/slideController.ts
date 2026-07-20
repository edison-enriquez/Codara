/**
 * Controlador mínimo para diapositivas embebidas en iframe Slidev.
 * Usa el protocolo interno de Slidev vía postMessage.
 * Estrategia: postMessage correcto primero, fallback a hash URL.
 */

export interface SlideAction {
  type: 'nextSlide' | 'prevSlide' | 'goToSlide'
  slide?: number
}

/**
 * Envía un comando de navegación a Slidev.
 * Slidev acepta mensajes con { target: 'slidev', type: 'navigate', operation, args }.
 */
function postSlidev(iframe: HTMLIFrameElement, operation: string, args: unknown[] = []) {
  iframe.contentWindow?.postMessage(
    { target: 'slidev', type: 'navigate', operation, args },
    '*'
  )
}

/**
 * Ejecuta acción en el iframe. Retorna true si éxito, false si falla o no hay iframe.
 */
export function executeSlideAction(iframe: HTMLIFrameElement | null, action: SlideAction): boolean {
  if (!iframe) return false

  try {
    switch (action.type) {
      case 'nextSlide':
        postSlidev(iframe, 'nextSlide')
        break
      case 'prevSlide':
        postSlidev(iframe, 'prevSlide')
        break
      case 'goToSlide':
        if (action.slide != null) {
          // Slidev usa slides 1-indexed en la operación go
          postSlidev(iframe, 'go', [action.slide])
        }
        break
    }
    return true
  } catch (e) {
    console.warn('[SlideController] postMessage falló:', e)
  }

  // Fallback: mutar el hash de la URL del iframe si el postMessage no funciona
  try {
    const src = iframe.getAttribute('src')
    if (!src) return false

    const url = new URL(src, window.location.origin)
    const currentMatch = url.hash.match(/#slide=(\d+)/)
    const current = currentMatch ? parseInt(currentMatch[1], 10) : 1

    let target = current
    if (action.type === 'nextSlide') target = current + 1
    else if (action.type === 'prevSlide') target = Math.max(1, current - 1)
    else if (action.type === 'goToSlide' && action.slide) target = action.slide

    url.hash = `slide=${target}`
    iframe.setAttribute('src', url.toString())
    return true
  } catch (e) {
    console.error('[SlideController] Error en fallback:', e)
    return false
  }
}

/**
 * Parsea string → SlideAction.
 * "nextSlide" | "prevSlide" | "goToSlide:5"
 */
export function parseSlideAction(actionStr: string): SlideAction | null {
  if (!actionStr) return null
  const trimmed = actionStr.trim().toLowerCase()

  if (trimmed === 'nextslide') return { type: 'nextSlide' }
  if (trimmed === 'prevslide') return { type: 'prevSlide' }

  const match = trimmed.match(/^gotoslide:(\d+)$/)
  if (match) return { type: 'goToSlide', slide: parseInt(match[1], 10) }

  return null
}
