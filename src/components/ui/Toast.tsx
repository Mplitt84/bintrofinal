import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastState = { id: number; message: string; onUndo?: () => void } | null

const ToastContext = createContext<(message: string, onUndo?: () => void) => void>(() => {})

/** Show a short status message, optionally with an Undo action. */
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback((message: string, onUndo?: () => void) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), message, onUndo })
    timer.current = setTimeout(() => setToast(null), onUndo ? 4500 : 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed left-1/2 -translate-x-1/2 z-[80] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-7 max-w-[calc(100vw-32px)] bg-royal text-white rounded-[14px] px-4.5 py-3 text-sm font-medium shadow-card flex items-center gap-3.5"
        >
          <span>{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                const undo = toast.onUndo
                clearTimeout(timer.current)
                setToast(null)
                undo?.()
              }}
              className="bg-transparent border-0 text-gold-bright font-semibold cursor-pointer px-1"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}
