import { createContext, useContext, useRef, type ReactNode } from 'react'

interface SlideControllerContextValue {
  iframeRef: React.MutableRefObject<HTMLIFrameElement | null>
}

const SlideControllerContext = createContext<SlideControllerContextValue | null>(null)

export function SlideControllerProvider({ children }: { children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  return (
    <SlideControllerContext.Provider value={{ iframeRef }}>
      {children}
    </SlideControllerContext.Provider>
  )
}

export function useSlideController() {
  const ctx = useContext(SlideControllerContext)
  if (!ctx) throw new Error('useSlideController must be inside SlideControllerProvider')
  return ctx
}
