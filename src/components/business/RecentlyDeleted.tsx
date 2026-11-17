import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { timeAgo } from '@/components/ui/bits'
import { getRecentlyDeleted, undoChange } from '@/server/trash.functions'

type Item = { id: number; kind: string; label: string; by: string; createdAt: string }

/** Settings → Recently deleted: everything removed in the last 30 days, with Restore. */
export function RecentlyDeletedCard({ onRestored }: { onRestored?: () => void | Promise<void> }) {
  const toast = useToast()
  const [items, setItems] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [all, setAll] = useState(false)

  const load = () =>
    getRecentlyDeleted()
      .then((r) => setItems(r as Item[]))
      .catch(() => setItems([]))
  useEffect(() => {
    load()
  }, [])

  async function restore(item: Item) {
    setBusy(item.id)
    try {
      await undoChange({ data: { id: item.id } })
      toast(`Restored: ${item.label.replace(/^Deleted |^Removed |^Canceled /, '')}`)
      await load()
      await onRestored?.()
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : "Couldn't restore that. Try again.")
    } finally {
      setBusy(null)
    }
  }

  const shown = all ? (items ?? []) : (items ?? []).slice(0, 6)
  return (
    <section className="bg-white border border-line rounded-2xl p-4 mb-5">
      <h3 className="m-0 mb-1 text-base font-bold">Recently deleted</h3>
      <p className="m-0 mb-3 text-sm text-ink-2">Anything removed in the last 30 days: products, visits, photos, expenses, events, team members, categories, suppliers. Restore puts it back with its history.</p>
      {!items ? (
        <div className="skel h-12 rounded-xl" />
      ) : items.length === 0 ? (
        <p className="m-0 text-sm text-ink-2">Nothing deleted in the last 30 days.</p>
      ) : (
        <>
          <ul className="list-none m-0 p-0">
            {shown.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2 border-b border-line last:border-b-0">
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block truncate">{i.label}</span>
                  <span className="text-[12px] text-ink-2">
                    {timeAgo(i.createdAt)}
                    {i.by ? ` · ${i.by}` : ''}
                  </span>
                </span>
                <button type="button" className="btn btn-tonal btn-sm shrink-0" disabled={busy === i.id} onClick={() => restore(i)}>
                  <RotateCcw size={14} /> {busy === i.id ? 'Restoring…' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
          {items.length > 6 && (
            <button type="button" className="btn btn-text btn-sm mt-1" onClick={() => setAll((v) => !v)}>
              {all ? 'Show fewer' : `Show all ${items.length}`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
