import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useBusiness } from "@/components/business/BusinessContext";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, PageHead } from "@/components/ui/bits";
import { Field, Sheet } from "@/components/ui/Sheet";
import { LiveCamera } from "@/components/inventory/LiveCamera";
import { ColorTheory } from "@/components/color/ColorTheory";
import { shrinkImage } from "@/lib/images";
import {
  formulaKindFor,
  formulaTabLabel,
  formulasCsv,
  groupByClient,
  linesText,
  type ClientFormula,
  type ClientRecord,
  type FormulaInput,
  type FormulaKind,
  type FormulaPhoto,
  type RetailLine,
} from "@/lib/formulas";
import {
  addFormulaPhoto,
  deleteClientFormula,
  deleteFormulaPhoto,
  exportFormulas,
  getFormulaPhotos,
  getFormulas,
  saveAftercareTemplate,
  saveClientFormula,
} from "@/server/formulas.functions";
import {
  recordSpecFor,
  showsColorTheoryTab,
  type RecordSpec,
} from "@/lib/industry";
import type { Product } from "@/components/inventory/types";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const prettyDate = (ymd: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
/** Used only if a record is opened on a business type with no client records. */
const FALLBACK_SPEC = recordSpecFor("other")!;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Selected practices shown as small pills on a visit. */
function TagPills({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1 mt-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full bg-action-tint text-action"
        >
          {t}
        </span>
      ))}
    </span>
  );
}

/** Tap-to-select practices for the visit, grouped by the industry's lists. Keeps any saved tag that is no longer listed. */
function PracticePicker({
  groups,
  value,
  onChange,
}: {
  groups: RecordSpec["tagGroups"];
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  if (!groups.length) return null;
  const listed = new Set(groups.flatMap((g) => g.options));
  const extra = value.filter((t) => !listed.has(t));
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const all = extra.length
    ? [...groups, { label: "Other saved", options: extra }]
    : groups;
  return (
    <div className="mb-4" data-practices>
      <span className="block text-[13px] font-semibold text-ink-2">
        Practices for this visit
        {value.length > 0 && (
          <span className="font-normal"> · {value.length} picked</span>
        )}
      </span>
      <span className="block text-[12px] text-ink-2 mb-2">
        Tap all that apply. They show on the client’s record and in the backup.
      </span>
      {all.map((g) => (
        <div key={g.label} className="mb-2.5" role="group" aria-label={g.label}>
          <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-2 mb-1.5">
            {g.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {g.options.map((o) => (
              <button
                key={o}
                type="button"
                className="chip"
                aria-pressed={value.includes(o)}
                onClick={() => toggle(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function blankVisit(
  kind: FormulaKind,
  spec: RecordSpec,
  staffName: string,
  aftercare: string,
  clientName = "",
): FormulaInput {
  return {
    kind,
    clientName,
    serviceDate: today(),
    service: spec.services?.[0] ?? "",
    lines: [{ item: "", amount: "" }],
    tags: [],
    retail: [],
    developer: "",
    ratio: "",
    processingMinutes: 0,
    leftover: "",
    aftercare: spec.aftercare ? aftercare : "",
    followUpOn: "",
    notes: "",
    staffName,
  };
}

/** Formulas tab: client records (color formula or ink log, retail prescription, photos) + color theory. */
export function FormulasView({
  staffName,
  team,
  products,
  onChanged,
}: {
  staffName: string;
  /** Saved team member names, for "whose client is this". */
  team: string[];
  products: Product[];
  onChanged: () => void;
}) {
  const { profile } = useBusiness();
  const kind = formulaKindFor(profile.businessType);
  const [section, setSection] = useState<"records" | "theory">("records");
  // Salons and tattoo shops see Color theory here; everyone else finds it in Settings.
  const theory = showsColorTheoryTab(profile.businessType);
  return (
    <>
      <PageHead
        title={formulaTabLabel(profile.businessType)}
        lead={recordSpecFor(profile.businessType)?.lead ?? ""}
      />
      {theory && (
        <div
          className="inline-flex bg-surface rounded-full p-1 mb-4"
          role="tablist"
          aria-label="Sections"
        >
          {(
            [
              ["records", "Client records"],
              ["theory", "Color theory"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(id)}
              className={`px-4 py-2 rounded-full border-0 cursor-pointer text-sm font-semibold ${
                section === id
                  ? "bg-white text-ink shadow-sm"
                  : "bg-transparent text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {section === "records" || !theory ? (
        <ClientRecords
          kind={kind}
          staffName={staffName}
          team={team}
          products={products}
          onChanged={onChanged}
        />
      ) : (
        <ColorTheory businessType={profile.businessType} />
      )}
    </>
  );
}

function ClientRecords({
  kind,
  staffName,
  team,
  products,
  onChanged,
}: {
  kind: FormulaKind;
  staffName: string;
  team: string[];
  products: Product[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const { profile } = useBusiness();
  const spec = recordSpecFor(profile.businessType) ?? FALLBACK_SPEC;
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<ClientFormula[] | null>(null);
  const [aftercare, setAftercare] = useState("");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    (FormulaInput & { id?: number }) | null
  >(null);

  function load() {
    return getFormulas({ data: { search } })
      .then((r) => {
        setRows(r.formulas);
        setAftercare(r.aftercareTemplate);
      })
      .catch(() => setRows([]));
  }
  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const [member, setMember] = useState("");
  const allClients = useMemo(() => groupByClient(rows ?? []), [rows]);
  // Everyone who has a client on record, plus the saved team.
  const members = useMemo(
    () =>
      [
        ...new Set(
          [...team, ...(rows ?? []).map((r) => r.staffName)].filter(Boolean),
        ),
      ].sort(),
    [team, rows],
  );
  // A client belongs to whoever saw them last.
  const clients = useMemo(
    () =>
      member
        ? allClients.filter((c) => c.visits[0]?.staffName === member)
        : allClients,
    [allClients, member],
  );
  const current =
    clients.find((c) => c.name.toLowerCase() === openClient?.toLowerCase()) ??
    null;

  async function backup() {
    try {
      const all = await exportFormulas();
      const blob = new Blob([formulasCsv(all)], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `client-records-${today()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast("Couldn’t make the backup. Try again.");
    }
  }

  function startNew(client?: ClientRecord) {
    const last = client?.visits[0];
    setEditing(
      last
        ? {
            ...last,
            id: undefined,
            serviceDate: today(),
            staffName: staffName || last.staffName,
            retail: [],
            followUpOn: "",
            notes: "",
            leftover: "",
          }
        : blankVisit(kind, spec, staffName, aftercare),
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <label className="flex-1 min-w-[200px] flex items-center gap-2 bg-surface rounded-full px-4 py-2.5">
          <Search size={18} className="text-ink-2" />
          <input
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px]"
            placeholder="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {members.length > 0 && (
          <select
            className="field-input !w-auto !rounded-full"
            value={member}
            onChange={(e) => setMember(e.target.value)}
            aria-label="Show clients of"
          >
            <option value="">Everyone’s clients</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}’s clients
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => startNew()}
        >
          <Plus size={16} /> New client visit
        </button>
        <button
          type="button"
          className="btn btn-tonal"
          onClick={backup}
          title="Download every record as a spreadsheet"
        >
          <Download size={16} /> Backup
        </button>
      </div>

      {!rows && <div className="skel h-32 rounded-2xl" />}
      {rows && clients.length === 0 && (
        <EmptyState
          title={search ? "No client by that name" : "No client records yet"}
        >
          Tap “New client visit” after each {spec.visitNoun}. The next time they
          come in, everything is here.
        </EmptyState>
      )}
      <ul className="m-0 p-0 list-none grid grid-cols-1 min-[700px]:grid-cols-2 min-[1060px]:grid-cols-3 gap-3">
        {clients.map((c) => {
          const last = c.visits[0];
          return (
            <li key={c.name}>
              <button
                type="button"
                onClick={() => setOpenClient(c.name)}
                className="w-full text-left bg-white border border-line rounded-2xl p-4 cursor-pointer hover:border-ink-2/40"
              >
                <span className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-[#002CB7] text-white font-bold grid place-items-center shrink-0">
                    {c.name
                      .split(/\s+/)
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block truncate text-[16px]">{c.name}</b>
                    <span className="text-[13px] text-ink-2">
                      {c.visits.length} visit{c.visits.length === 1 ? "" : "s"}{" "}
                      · last {prettyDate(c.lastVisit)}
                    </span>
                    {last.staffName && (
                      <span className="block text-[12px] font-semibold text-action truncate">
                        {last.staffName}’s client
                      </span>
                    )}
                  </span>
                  <ChevronRight size={18} className="text-ink-2" />
                </span>
                <span className="block text-[13px] mt-2 truncate">
                  <b>{last.service || spec.linesHeading}:</b>{" "}
                  {linesText(last.lines) || "no products listed"}
                </span>
                {last.tags.length > 0 && (
                  <span className="block text-[12px] text-ink-2 mt-0.5 truncate">
                    {last.tags.join(" · ")}
                  </span>
                )}
                {last.retail.length > 0 && (
                  <span className="block text-[12px] text-ink-2 mt-0.5 truncate">
                    Takes home: {last.retail.map((r) => r.name).join(", ")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet
        open={Boolean(current)}
        onClose={() => setOpenClient(null)}
        title={current?.name ?? ""}
        subtitle={
          current
            ? `${current.visits.length} visit${current.visits.length === 1 ? "" : "s"}`
            : undefined
        }
        wide
      >
        {current && (
          <>
            <button
              type="button"
              className="btn btn-primary w-full mb-4"
              onClick={() => startNew(current)}
            >
              <Copy size={16} /> New visit (start from the last one)
            </button>
            <ClientOwner visits={current.visits} />
            <ol className="m-0 p-0 list-none space-y-3">
              {current.visits.map((v) => (
                <VisitCard
                  key={v.id}
                  visit={v}
                  onEdit={() => setEditing(v)}
                  onDeleted={() => {
                    load();
                    if (current.visits.length === 1) setOpenClient(null);
                  }}
                />
              ))}
            </ol>
          </>
        )}
      </Sheet>

      {editing && (
        <VisitForm
          value={editing}
          products={products}
          aftercareTemplate={aftercare}
          team={members}
          onClose={() => setEditing(null)}
          onSaved={(saved, soldAny, template) => {
            setEditing(null);
            if (template !== undefined) setAftercare(template);
            setOpenClient(saved.clientName);
            load();
            if (soldAny) onChanged();
          }}
        />
      )}
    </>
  );
}

/** Whose client this is now (latest visit) and who saw them before. */
function ClientOwner({ visits }: { visits: ClientFormula[] }) {
  const current = visits[0]?.staffName ?? "";
  const before = [
    ...new Set(
      visits.map((v) => v.staffName).filter((n) => n && n !== current),
    ),
  ];
  if (!current && before.length === 0) return null;
  return (
    <p className="text-sm bg-surface rounded-xl px-3.5 py-2.5 mt-0 mb-3">
      {current ? (
        <>
          <b>{current}</b>’s client
        </>
      ) : (
        "No team member set on the latest visit"
      )}
      {before.length > 0 && (
        <span className="text-ink-2">
          {" "}
          · previously with {before.join(", ")}
        </span>
      )}
    </p>
  );
}

function VisitCard({
  visit: v,
  onEdit,
  onDeleted,
}: {
  visit: ClientFormula;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const { profile } = useBusiness();
  const spec = recordSpecFor(profile.businessType) ?? FALLBACK_SPEC;
  const [confirm, setConfirm] = useState(false);
  const [photos, setPhotos] = useState<FormulaPhoto[] | null>(null);
  const [photoCount, setPhotoCount] = useState(v.photoCount);
  const [camera, setCamera] = useState<"before" | "after" | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingLabel = useRef<"before" | "after">("after");

  useEffect(() => {
    if (v.photoCount > 0)
      getFormulaPhotos({ data: { formulaId: v.id } })
        .then(setPhotos)
        .catch(() => setPhotos([]));
    else setPhotos([]);
  }, [v.id, v.photoCount]);

  async function remove() {
    if (!confirm) return setConfirm(true);
    try {
      await deleteClientFormula({ data: { id: v.id } });
      toast("Visit deleted");
      onDeleted();
    } catch {
      toast("Couldn’t delete. Try again.");
    }
  }

  function takePhoto(label: "before" | "after") {
    pendingLabel.current = label;
    const touch =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches;
    if (touch) {
      if (fileRef.current) fileRef.current.value = "";
      fileRef.current?.click();
    } else setCamera(label);
  }

  async function addPhoto(file: File) {
    setCamera(null);
    setBusy(true);
    try {
      const data = await shrinkImage(file, 1200);
      const list = await addFormulaPhoto({
        data: { formulaId: v.id, label: pendingLabel.current, data },
      });
      setPhotos(list);
      setPhotoCount(list.length);
    } catch {
      toast("Couldn’t save the photo. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(id: number) {
    try {
      const list = await deleteFormulaPhoto({ data: { id } });
      setPhotos(list);
      setPhotoCount(list.length);
    } catch {
      toast("Couldn’t remove the photo.");
    }
  }

  return (
    <li className="bg-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <b className="block text-[15px]">{prettyDate(v.serviceDate)}</b>
          <span className="text-[13px] text-ink-2">
            {v.service}
            {v.staffName ? ` · ${v.staffName}` : ""}
          </span>
          <TagPills tags={v.tags} />
        </div>
        <span className="flex gap-1 shrink-0">
          <button
            type="button"
            className="btn btn-text btn-sm !px-2"
            onClick={onEdit}
            aria-label="Edit visit"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="btn btn-text btn-sm !px-2 text-bad"
            onClick={remove}
            aria-label="Delete visit"
          >
            {confirm ? "Delete?" : <Trash2 size={15} />}
          </button>
        </span>
      </div>

      {v.lines.length > 0 && (
        <div className="mt-2">
          <span className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wide">
            {spec.linesHeading}
          </span>
          <ul className="m-0 mt-1 p-0 list-none text-[15px]">
            {v.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{l.item}</span>
                <b className="num">{l.amount}</b>
              </li>
            ))}
          </ul>
          {(v.developer || v.ratio || v.processingMinutes > 0) && (
            <p className="text-[13px] m-0 mt-1">
              {[
                v.developer && `Developer ${v.developer}`,
                v.ratio && `ratio ${v.ratio}`,
                v.processingMinutes > 0 && `${v.processingMinutes} min`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {v.leftover && (
            <p className="text-[12px] text-ink-2 m-0 mt-0.5">
              Left over: {v.leftover}
            </p>
          )}
        </div>
      )}

      {v.retail.length > 0 && (
        <div className="mt-3">
          <span className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wide">
            Retail prescription
          </span>
          <ul className="m-0 mt-1 p-0 list-none text-[14px]">
            {v.retail.map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  {r.qty} × {r.name}
                </span>
                <span
                  className={`text-[12px] font-semibold ${r.sold ? "text-good" : "text-ink-2"}`}
                >
                  {r.sold ? "Bought" : "Recommended"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.aftercare && (
        <div className="mt-3">
          <span className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wide">
            Aftercare given
          </span>
          <p className="text-[14px] m-0 mt-1 whitespace-pre-line">
            {v.aftercare}
          </p>
        </div>
      )}
      {v.followUpOn && (
        <p className="text-[13px] m-0 mt-2">
          Follow-up: <b>{prettyDate(v.followUpOn)}</b>
        </p>
      )}
      {v.notes && (
        <p className="text-[14px] m-0 mt-2 bg-white rounded-lg px-3 py-2 whitespace-pre-line">
          {v.notes}
        </p>
      )}

      <div className="mt-3">
        {photos && photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
            {photos.map((p) => (
              <figure key={p.id} className="relative m-0 shrink-0">
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img
                    src={p.url}
                    alt={`${p.label} photo`}
                    className="w-24 h-24 object-cover rounded-xl border border-line"
                  />
                </a>
                <figcaption className="absolute left-1 bottom-1 bg-black/60 text-white text-[10px] font-bold rounded px-1.5 py-0.5 capitalize">
                  {p.label}
                </figcaption>
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-line grid place-items-center"
                  aria-label="Remove photo"
                >
                  <X size={12} />
                </button>
              </figure>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-tonal btn-sm"
            disabled={busy}
            onClick={() => takePhoto("before")}
          >
            <Camera size={14} /> Before
          </button>
          <button
            type="button"
            className="btn btn-tonal btn-sm"
            disabled={busy}
            onClick={() => takePhoto("after")}
          >
            <Camera size={14} /> After
          </button>
          {busy && (
            <span className="text-[13px] text-ink-2 self-center">
              Saving photo…
            </span>
          )}
          {!busy && photoCount === 0 && (
            <span className="text-[12px] text-ink-2 self-center flex items-center gap-1">
              <ImageIcon size={13} /> No photos yet
            </span>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0])}
        />
        <LiveCamera
          open={camera !== null}
          title={camera === "before" ? "Before photo" : "After photo"}
          hint="Good light, whole area in frame."
          onClose={() => setCamera(null)}
          onPhoto={addPhoto}
          onChooseFile={() => {
            setCamera(null);
            if (fileRef.current) fileRef.current.value = "";
            fileRef.current?.click();
          }}
        />
      </div>
    </li>
  );
}

function VisitForm({
  value,
  products,
  aftercareTemplate,
  team,
  onClose,
  onSaved,
}: {
  value: FormulaInput & { id?: number };
  products: Product[];
  aftercareTemplate: string;
  team: string[];
  onClose: () => void;
  onSaved: (saved: ClientFormula, soldAny: boolean, template?: string) => void;
}) {
  const toast = useToast();
  const [f, setF] = useState(value);
  const [saving, setSaving] = useState(false);
  const [rxSearch, setRxSearch] = useState("");
  const [saveTemplate, setSaveTemplate] = useState(false);
  const set = (patch: Partial<FormulaInput>) =>
    setF((x) => ({ ...x, ...patch }));
  const { profile } = useBusiness();
  const spec = recordSpecFor(profile.businessType) ?? FALLBACK_SPEC;

  const productNames = useMemo(
    () =>
      [
        ...new Set(
          products.map((p) =>
            [p.brand, p.name, p.size].filter(Boolean).join(" "),
          ),
        ),
      ].sort(),
    [products],
  );
  // Retail first: products with a retail price are the ones clients take home.
  const rxMatches = useMemo(() => {
    const q = rxSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => `${p.brand} ${p.name} ${p.size}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          (b.retailPriceCents > 0 ? 1 : 0) - (a.retailPriceCents > 0 ? 1 : 0),
      )
      .slice(0, 6);
  }, [products, rxSearch]);

  function addRx(p: Product | null) {
    const name = p
      ? [p.brand, p.name, p.size].filter(Boolean).join(" ")
      : rxSearch.trim();
    if (!name) return;
    set({
      retail: [
        ...f.retail,
        { productId: p?.id ?? null, name, qty: 1, sold: false },
      ],
    });
    setRxSearch("");
  }
  const setRx = (i: number, patch: Partial<RetailLine>) =>
    set({ retail: f.retail.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const setLine = (
    i: number,
    patch: Partial<{ item: string; amount: string }>,
  ) =>
    set({ lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  async function save() {
    if (!f.clientName.trim()) return toast("Add the client’s name");
    setSaving(true);
    try {
      const soldAny = f.retail.some((r) => r.sold && !r.logged && r.productId);
      const saved = await saveClientFormula({ data: f });
      let template: string | undefined;
      if (spec.aftercare && saveTemplate && f.aftercare.trim()) {
        await saveAftercareTemplate({ data: { text: f.aftercare } });
        template = f.aftercare.trim();
      }
      toast(
        soldAny
          ? `Saved. Sold items were taken out of stock.`
          : `Saved ${saved.clientName}’s visit`,
      );
      onSaved(saved, soldAny, template);
    } catch {
      toast("Couldn’t save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={value.id ? "Edit visit" : "New client visit"}
      subtitle="Only the client’s name is saved about them."
      wide
    >
      <datalist id="formula-products">
        {productNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-x-3">
        <Field label="Client" htmlFor="v-client">
          <input
            id="v-client"
            className="field-input"
            value={f.clientName}
            onChange={(e) => set({ clientName: e.target.value })}
            placeholder="First name and last initial"
            autoFocus={!value.clientName}
          />
        </Field>
        <Field label="Date" htmlFor="v-date">
          <input
            id="v-date"
            className="field-input"
            type="date"
            value={f.serviceDate}
            onChange={(e) => set({ serviceDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Team member (whose client)" htmlFor="v-staff">
        <select
          id="v-staff"
          className="field-input"
          value={f.staffName}
          onChange={(e) => set({ staffName: e.target.value })}
        >
          <option value="">Not set</option>
          {[...new Set([...team, f.staffName].filter(Boolean))].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </Field>
      <Field label={spec.serviceLabel} htmlFor="v-service">
        {!spec.services ? (
          <input
            id="v-service"
            className="field-input"
            value={f.service}
            onChange={(e) => set({ service: e.target.value })}
            placeholder={spec.servicePlaceholder}
          />
        ) : (
          <select
            id="v-service"
            className="field-input"
            value={f.service}
            onChange={(e) => set({ service: e.target.value })}
          >
            {[...new Set([...spec.services, f.service].filter(Boolean))].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        )}
      </Field>

      <PracticePicker
        groups={spec.tagGroups}
        value={f.tags}
        onChange={(tags) => set({ tags })}
      />

      <span className="block text-[13px] font-semibold text-ink-2 mb-1.5">
        {spec.linesLabel}
      </span>
      <ul className="m-0 p-0 list-none space-y-2 mb-2">
        {f.lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <input
              className="field-input flex-1 min-w-0"
              list="formula-products"
              value={l.item}
              onChange={(e) => setLine(i, { item: e.target.value })}
              placeholder={spec.itemPlaceholder}
              aria-label={`Item ${i + 1}`}
            />
            <input
              className="field-input !w-24 shrink-0"
              value={l.amount}
              onChange={(e) => setLine(i, { amount: e.target.value })}
              placeholder={spec.amountPlaceholder}
              aria-label={`Amount ${i + 1}`}
            />
            {f.lines.length > 1 && (
              <button
                type="button"
                className="w-9 shrink-0 bg-transparent border-0 text-ink-2"
                onClick={() =>
                  set({ lines: f.lines.filter((_, j) => j !== i) })
                }
                aria-label="Remove line"
              >
                <X size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {f.lines.length < 20 && (
        <button
          type="button"
          className="btn btn-text btn-sm !px-0 mb-3"
          onClick={() => set({ lines: [...f.lines, { item: "", amount: "" }] })}
        >
          <Plus size={14} /> Add {spec.addLabel}
        </button>
      )}

      {spec.mix && (
        <div className="grid grid-cols-2 min-[560px]:grid-cols-4 gap-x-3">
          <Field label="Developer" htmlFor="v-dev">
            <input
              id="v-dev"
              className="field-input"
              value={f.developer}
              onChange={(e) => set({ developer: e.target.value })}
              placeholder="20 vol"
            />
          </Field>
          <Field label="Ratio" htmlFor="v-ratio">
            <input
              id="v-ratio"
              className="field-input"
              value={f.ratio}
              onChange={(e) => set({ ratio: e.target.value })}
              placeholder="1:1.5"
            />
          </Field>
          <Field label="Minutes" htmlFor="v-min">
            <input
              id="v-min"
              className="field-input"
              type="number"
              inputMode="numeric"
              value={f.processingMinutes || ""}
              onChange={(e) =>
                set({
                  processingMinutes: Math.max(0, Number(e.target.value) || 0),
                })
              }
              placeholder="35"
            />
          </Field>
          <Field label="Left over" htmlFor="v-left">
            <input
              id="v-left"
              className="field-input"
              value={f.leftover}
              onChange={(e) => set({ leftover: e.target.value })}
              placeholder="5 g"
            />
          </Field>
        </div>
      )}

      {spec.aftercare && (
        <>
          <Field label="Aftercare given" htmlFor="v-after">
            <textarea
              id="v-after"
              className="field-input min-h-[110px]"
              value={f.aftercare}
              onChange={(e) => set({ aftercare: e.target.value })}
              placeholder="Your aftercare instructions for this client"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 -mt-1 mb-3 text-[13px]">
            {aftercareTemplate && f.aftercare !== aftercareTemplate && (
              <button
                type="button"
                className="btn btn-text btn-sm !px-0"
                onClick={() => set({ aftercare: aftercareTemplate })}
              >
                Use my usual aftercare
              </button>
            )}
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={saveTemplate}
                onChange={(e) => setSaveTemplate(e.target.checked)}
              />{" "}
              Save as my usual aftercare
            </label>
          </div>
          <Field label={spec.followUpLabel} htmlFor="v-follow">
            <input
              id="v-follow"
              className="field-input"
              type="date"
              value={f.followUpOn}
              onChange={(e) => set({ followUpOn: e.target.value })}
            />
          </Field>
        </>
      )}

      <div className="bg-surface rounded-2xl p-3 mb-3">
        <span className="flex items-center gap-1.5 text-[14px] font-bold mb-1">
          <ShoppingBag size={16} /> Retail prescription
        </span>
        <p className="text-[12px] text-ink-2 m-0 mb-2">
          What they should use at home. Tick “Bought” and Bintro takes it out of
          stock when you save.
        </p>
        {f.retail.length > 0 && (
          <ul className="m-0 p-0 list-none space-y-2 mb-2">
            {f.retail.map((r, i) => {
              const p = r.productId
                ? products.find((x) => x.id === r.productId)
                : null;
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 bg-white rounded-xl px-3 py-2"
                >
                  <span className="flex-1 min-w-0 text-[14px]">
                    <span className="block truncate">{r.name}</span>
                    {p && p.retailPriceCents > 0 && (
                      <span className="text-[12px] text-ink-2">
                        {money(p.retailPriceCents)} · {p.qty} in stock
                      </span>
                    )}
                    {!r.productId && (
                      <span className="text-[12px] text-ink-2">
                        Not in your inventory
                      </span>
                    )}
                  </span>
                  <input
                    className="field-input !w-14 !px-2 text-center"
                    type="number"
                    min={1}
                    value={r.qty}
                    disabled={r.logged}
                    onChange={(e) =>
                      setRx(i, {
                        qty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    aria-label="Quantity"
                  />
                  <label className="flex items-center gap-1 text-[12px] font-semibold shrink-0">
                    <input
                      type="checkbox"
                      checked={r.sold}
                      disabled={r.logged || !r.productId}
                      onChange={(e) => setRx(i, { sold: e.target.checked })}
                    />{" "}
                    Bought
                  </label>
                  {!r.logged && (
                    <button
                      type="button"
                      className="w-7 bg-transparent border-0 text-ink-2"
                      onClick={() =>
                        set({ retail: f.retail.filter((_, j) => j !== i) })
                      }
                      aria-label="Remove"
                    >
                      <X size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <input
          className="field-input"
          value={rxSearch}
          onChange={(e) => setRxSearch(e.target.value)}
          placeholder="Search your retail products"
          aria-label="Search retail products"
        />
        {rxSearch.trim() && (
          <ul className="m-0 mt-1 p-0 list-none bg-white rounded-xl border border-line divide-y divide-line">
            {rxMatches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 bg-transparent border-0 cursor-pointer text-[14px]"
                  onClick={() => addRx(p)}
                >
                  {[p.brand, p.name, p.size].filter(Boolean).join(" ")}
                  <span className="text-[12px] text-ink-2">
                    {" "}
                    ·{" "}
                    {p.retailPriceCents
                      ? money(p.retailPriceCents)
                      : "no retail price"}{" "}
                    · {p.qty} in stock
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="w-full text-left px-3 py-2 bg-transparent border-0 cursor-pointer text-[14px] text-action"
                onClick={() => addRx(null)}
              >
                Add “{rxSearch.trim()}” (not in inventory)
              </button>
            </li>
          </ul>
        )}
      </div>

      <Field label="Notes" htmlFor="v-notes">
        <textarea
          id="v-notes"
          className="field-input min-h-[80px]"
          value={f.notes}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder={spec.notesPlaceholder}
        />
      </Field>
      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : "Save visit"}
      </button>
      {!value.id && (
        <p className="text-[12px] text-ink-2 text-center mt-2 mb-0">
          Add before and after photos from the client’s record after saving.
        </p>
      )}
    </Sheet>
  );
}
