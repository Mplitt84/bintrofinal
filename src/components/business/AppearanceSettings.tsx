import { useState } from 'react'
import { Check, Palette as PaletteIcon } from 'lucide-react'
import type { BusinessProfile } from '@/lib/business-types'
import { PALETTES, PALETTE_FAMILIES, paletteById, type Palette } from '@/lib/palettes'
import { updateBusinessProfile } from '@/server/business.functions'
import { useToast } from '@/components/ui/Toast'

/** Settings → Look & feel: pick a color palette that matches the business's brand. */
export function AppearanceSettings({
  profile,
  onProfile,
}: {
  profile: BusinessProfile
  onProfile: (p: BusinessProfile) => void
}) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const current = paletteById(profile.palette).id

  async function choose(p: Palette) {
    if (p.id === current || saving) return
    const before = profile
    // Preview straight away; the saved palette is shared with every device.
    onProfile({ ...profile, palette: p.id })
    setSaving(true)
    try {
      onProfile((await updateBusinessProfile({ data: { palette: p.id } })) as BusinessProfile)
      toast(`${p.label} palette applied`)
    } catch {
      onProfile(before)
      toast("Couldn't save the palette. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-[18px] font-bold text-royal m-0 mb-1 flex items-center gap-2">
        <PaletteIcon size={18} className="text-gold-ink" /> Color palette
      </h2>
      <p className="text-ink-2 text-[13px] mt-0 mb-4">
        Pick the colors closest to your brand. Buttons, the scan circle, tabs and accents change on every device; stock
        alerts stay green, amber and red so they read the same.
      </p>

      {PALETTE_FAMILIES.map((family) => (
        <section key={family.id} className="mb-5" aria-labelledby={`palette-${family.id}`}>
          <h3 id={`palette-${family.id}`} className="text-[15px] font-bold m-0">
            {family.label}
          </h3>
          <p className="text-ink-2 text-[13px] m-0 mb-2">{family.blurb}</p>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5" role="radiogroup" aria-label={`${family.label} palettes`}>
            {PALETTES.filter((p) => p.family === family.id).map((p) => (
              <PaletteCard key={p.id} palette={p} selected={p.id === current} onSelect={() => choose(p)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function PaletteCard({ palette, selected, onSelect }: { palette: Palette; selected: boolean; onSelect: () => void }) {
  const c = palette.colors
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="text-left rounded-2xl p-3 cursor-pointer border-2 bg-white transition-colors"
      style={{ borderColor: selected ? c.action : 'var(--color-line)' }}
    >
      {/* Mini preview drawn in the palette's own colors. */}
      <span className="block rounded-xl overflow-hidden mb-2.5" style={{ background: c.surface }}>
        <span className="block h-[3px]" style={{ background: `linear-gradient(90deg, ${c.action}, ${c['royal-2']} 45%, ${c.gold} 80%, ${c['gold-bright']})` }} />
        <span className="flex items-center gap-2 px-2.5 py-2.5">
          <span
            className="w-7 h-7 rounded-lg shrink-0"
            style={{ background: `linear-gradient(160deg, ${c['royal-2']}, ${c.royal})`, boxShadow: `inset 0 0 0 1.5px ${c['gold-bright']}` }}
          />
          <span className="flex-1 min-w-0">
            <span className="block h-2 rounded w-[70%]" style={{ background: c.ink }} />
            <span className="block h-1.5 rounded w-[45%] mt-1" style={{ background: c['ink-2'], opacity: 0.6 }} />
          </span>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: c.action }}>
            Scan
          </span>
          <span className="w-5 h-5 rounded-full" style={{ background: c.gold }} />
        </span>
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-ink">{palette.label}</span>
        {selected ? (
          <span className="w-6 h-6 rounded-full grid place-items-center text-white" style={{ background: c.action }}>
            <Check size={14} strokeWidth={3} />
          </span>
        ) : (
          <span className="flex gap-1" aria-hidden="true">
            {[c.royal, c.action, c.gold, c['gold-tint']].map((hex) => (
              <span key={hex} className="w-4 h-4 rounded-full border border-line" style={{ background: hex }} />
            ))}
          </span>
        )}
      </span>
    </button>
  )
}
