import { useEffect, useState } from 'react'
import { Bluetooth, BluetoothConnected, Check, ScanBarcode, Users } from 'lucide-react'
import {
  disconnectBluetoothScanner,
  onBluetoothCode,
  onBluetoothScannerState,
  pairBluetoothScanner,
  savedBluetoothScannerName,
  type BluetoothScannerState,
} from '@/lib/bluetooth-scanner'
import { STAFF_IDLE_MINUTES, getStaffAskMode, setStaffAskMode, type StaffAskMode } from '@/components/inventory/StaffPicker'

const PAIRING_STEPS: { device: string; steps: string[] }[] = [
  {
    device: 'iPhone or iPad',
    steps: [
      'Turn the scanner on and put it in pairing mode (usually hold the trigger, or scan the "Bluetooth HID" code in its manual).',
      'Open Settings → Bluetooth and turn Bluetooth on.',
      'Tap the scanner under Other Devices. If it asks for a PIN, scan the digits from the manual, then its Enter code.',
      'Come back to Bintro. Tip: double-press the scanner trigger to show the on-screen keyboard again, if your model supports it.',
    ],
  },
  {
    device: 'Android phone or tablet',
    steps: [
      'Put the scanner in pairing mode (keyboard / HID mode).',
      'Open Settings → Connected devices → Pair new device.',
      'Tap the scanner’s name and confirm.',
      'Back in Bintro, scan a barcode on the Scan tab.',
    ],
  },
  {
    device: 'Windows computer',
    steps: [
      'Put the scanner in pairing mode.',
      'Open Settings → Bluetooth & devices → Add device → Bluetooth.',
      'Pick the scanner and wait for “Connected”.',
    ],
  },
  {
    device: 'Mac',
    steps: [
      'Put the scanner in pairing mode.',
      'Open System Settings → Bluetooth.',
      'Click Connect next to the scanner. If a keyboard setup window opens, close it.',
    ],
  },
]

/** Settings → Scanner & Bluetooth: pair a scanner, test it, and choose when Bintro asks who's scanning. */
export function ScannerSettings() {
  // Filled in after mount; the server can't know whether this browser has Bluetooth.
  const [bt, setBt] = useState<BluetoothScannerState>({ supported: false, status: 'idle', deviceName: '', error: '' })
  const [savedName, setSavedName] = useState('')
  const [askMode, setAskMode] = useState<StaffAskMode>('every')
  const [test, setTest] = useState('')
  const [lastCode, setLastCode] = useState<{ code: string; via: string } | null>(null)

  useEffect(() => {
    setSavedName(savedBluetoothScannerName())
    setAskMode(getStaffAskMode())
    const offState = onBluetoothScannerState((s) => {
      setBt(s)
      setSavedName(savedBluetoothScannerName())
    })
    const offCode = onBluetoothCode((code) => setLastCode({ code, via: 'Bluetooth (direct)' }))
    return () => {
      offState()
      offCode()
    }
  }, [])

  function chooseAsk(mode: StaffAskMode) {
    setAskMode(mode)
    setStaffAskMode(mode)
  }

  const connected = bt.status === 'connected'

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white border border-line rounded-2xl p-4" aria-labelledby="bt-title">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 id="bt-title" className="m-0 text-[17px] font-bold flex items-center gap-2">
            {connected ? <BluetoothConnected size={18} className="text-action" /> : <Bluetooth size={18} className="text-ink-2" />}
            Bluetooth scanner
          </h2>
          <span
            className={`text-[12px] font-bold rounded-full px-2.5 py-1 ${
              connected ? 'bg-good-tint text-good' : bt.status === 'connecting' ? 'bg-warn-tint text-warn' : 'bg-surface text-ink-2'
            }`}
          >
            {connected ? 'Connected' : bt.status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </span>
        </div>
        <p className="text-ink-2 text-sm mt-0 mb-3">
          Most scanners pair as a keyboard in your device’s Bluetooth settings (steps below) and then work anywhere on the
          Scan tab. Scanners with a BLE serial mode can also connect straight to Bintro here.
        </p>

        {connected ? (
          <>
            <p className="text-sm m-0 mb-3">
              <b>{bt.deviceName}</b> is connected. Scans go to the Scan tab.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-tonal btn-sm" onClick={() => disconnectBluetoothScanner()}>
                Disconnect
              </button>
              <button className="btn btn-text btn-sm !text-bad" onClick={() => disconnectBluetoothScanner(true)}>
                Forget scanner
              </button>
            </div>
          </>
        ) : bt.supported ? (
          <>
            <button className="btn btn-primary btn-sm" disabled={bt.status === 'connecting'} onClick={() => pairBluetoothScanner()}>
              <Bluetooth size={16} />
              {savedName ? `Reconnect ${savedName}` : 'Pair a Bluetooth scanner'}
            </button>
            {savedName && (
              <button className="btn btn-text btn-sm ml-1" onClick={() => pairBluetoothScanner()}>
                Pair a different one
              </button>
            )}
          </>
        ) : (
          <p className="text-sm bg-surface rounded-xl px-3.5 py-2.5 m-0">
            This browser can’t connect to Bluetooth directly (Safari and iPhone/iPad browsers can’t). Pair the scanner in
            your device’s Bluetooth settings using the steps below — it works the same once paired.
          </p>
        )}
        {bt.error && <p className="text-bad text-sm mt-3 mb-0">{bt.error}</p>}

        <h3 className="text-[15px] font-bold mt-5 mb-2">Pair in your device’s Bluetooth settings</h3>
        <div className="flex flex-col gap-2">
          {PAIRING_STEPS.map((p) => (
            <details key={p.device} className="bg-surface rounded-xl px-3.5 py-2.5 text-sm">
              <summary className="cursor-pointer font-semibold">{p.device}</summary>
              <ol className="pl-5 mt-2 mb-1 flex flex-col gap-1.5">
                {p.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-white border border-line rounded-2xl p-4" aria-labelledby="test-title">
        <h2 id="test-title" className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
          <ScanBarcode size={18} className="text-ink-2" /> Test your scanner
        </h2>
        <p className="text-ink-2 text-sm mt-0 mb-3">Tap the box, then scan any barcode. Nothing is saved.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (test.trim()) setLastCode({ code: test.trim(), via: 'Keyboard / paired scanner' })
            setTest('')
          }}
        >
          <label htmlFor="scanner-test" className="sr-only">
            Scanner test
          </label>
          <input
            id="scanner-test"
            className="field-input text-center text-lg tracking-[0.1em]"
            value={test}
            onChange={(e) => setTest(e.target.value)}
            placeholder="Scan here"
            autoComplete="off"
            inputMode="none"
          />
        </form>
        {lastCode && (
          <p className="flex items-center gap-2 text-sm bg-good-tint text-good rounded-xl px-3.5 py-2.5 mt-3 mb-0" role="status">
            <Check size={16} className="shrink-0" />
            <span>
              Read <b className="num">{lastCode.code}</b> · {lastCode.via}. Your scanner is working.
            </span>
          </p>
        )}
      </section>

      <section className="bg-white border border-line rounded-2xl p-4" aria-labelledby="ask-title">
        <h2 id="ask-title" className="m-0 mb-1 text-[17px] font-bold flex items-center gap-2">
          <Users size={18} className="text-ink-2" /> Ask who’s scanning
        </h2>
        <p className="text-ink-2 text-sm mt-0 mb-3">A name picker pops up in the middle of the screen so every scan is logged under the right person. This setting is for this device.</p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="When to ask who's scanning">
          {(
            [
              { id: 'every', title: 'Before every scan', body: 'Best for shared devices at the front desk or bar.' },
              {
                id: 'idle',
                title: `After ${STAFF_IDLE_MINUTES} minutes without a scan`,
                body: 'Best when one person scans a whole delivery in a row.',
              },
            ] as const
          ).map((o) => (
            <label key={o.id} className="flex items-start gap-3 cursor-pointer bg-surface rounded-xl px-3.5 py-3">
              <input
                type="radio"
                name="ask-staff"
                checked={askMode === o.id}
                onChange={() => chooseAsk(o.id)}
                className="w-5 h-5 mt-0.5 accent-[var(--color-action)] shrink-0"
              />
              <span className="text-sm">
                <b className="block">{o.title}</b>
                <span className="text-ink-2 text-[13px]">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
