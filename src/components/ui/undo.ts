import { undoChange } from '@/server/trash.functions'

type Toast = (message: string, onUndo?: () => void | Promise<void>) => void

/**
 * A toast with an Undo that plays back the server's snapshot (see trash.server.ts), then
 * refreshes the screen. No snapshot id (nothing changed, or an older server) → plain toast.
 */
export function toastUndo(toast: Toast, message: string, undoId: number | null | undefined, after?: () => void | Promise<void>) {
  toast(
    message,
    undoId
      ? async () => {
          await undoChange({ data: { id: undoId } })
          await after?.()
        }
      : undefined,
  )
}
