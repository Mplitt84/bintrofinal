/**
 * Bluetooth barcode scanners, two ways:
 *
 * 1. Keyboard (HID) mode — what almost every scanner ships in. It pairs in the phone,
 *    tablet or computer's own Bluetooth settings and then "types" each code, which the
 *    Scan tab already catches. Browsers can't pair these, so Settings shows the steps.
 * 2. BLE serial mode — some scanners stream codes over a Bluetooth Low Energy serial
 *    service instead. Chrome / Edge on Android, Windows, macOS and ChromeOS can connect
 *    to those directly with Web Bluetooth; that's what this module does.
 *
 * The connection lives at module level so it survives tab changes in the app.
 */

// Common BLE serial services used by barcode scanners and BLE-UART bridges.
const SERIAL_SERVICES: (string | number)[] = [
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip / ISSC transparent UART
  0xffe0, // HM-10 style serial
  0xfff0, // generic vendor serial
  0xfee7,
  0x1812, // HID over GATT (usually blocked by browsers, tried last)
]

const SAVED_DEVICE_KEY = 'shagnoir-bt-scanner'

export type BluetoothScannerState = {
  supported: boolean
  status: 'idle' | 'connecting' | 'connected'
  deviceName: string
  error: string
}

type Listener<T> = (value: T) => void

/* Minimal Web Bluetooth types (not in TypeScript's DOM lib). */
type BTCharacteristic = EventTarget & {
  properties: { notify: boolean; indicate: boolean }
  value?: DataView
  startNotifications: () => Promise<BTCharacteristic>
}
type BTService = { getCharacteristics: () => Promise<BTCharacteristic[]> }
type BTServer = {
  connected: boolean
  connect: () => Promise<BTServer>
  disconnect: () => void
  getPrimaryService: (s: string | number) => Promise<BTService>
}
type BTDevice = EventTarget & { id: string; name?: string; gatt?: BTServer }
type BTNavigator = {
  bluetooth?: {
    requestDevice: (o: { acceptAllDevices: boolean; optionalServices: (string | number)[] }) => Promise<BTDevice>
    getDevices?: () => Promise<BTDevice[]>
  }
}

function bluetooth() {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as unknown as BTNavigator).bluetooth
}

let state: BluetoothScannerState = {
  supported: false,
  status: 'idle',
  deviceName: '',
  error: '',
}
let device: BTDevice | null = null
let userDisconnected = false
const stateListeners = new Set<Listener<BluetoothScannerState>>()
const codeListeners = new Set<Listener<string>>()

function setState(patch: Partial<BluetoothScannerState>) {
  state = { ...state, ...patch }
  stateListeners.forEach((l) => l(state))
}

export function getBluetoothScannerState(): BluetoothScannerState {
  return { ...state, supported: !!bluetooth() }
}

export function onBluetoothScannerState(listener: Listener<BluetoothScannerState>) {
  stateListeners.add(listener)
  listener(getBluetoothScannerState())
  return () => {
    stateListeners.delete(listener)
  }
}

/** Every complete barcode read from a connected BLE scanner. */
export function onBluetoothCode(listener: Listener<string>) {
  codeListeners.add(listener)
  return () => {
    codeListeners.delete(listener)
  }
}

export function savedBluetoothScannerName(): string {
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_DEVICE_KEY) || '{}').name || ''
  } catch {
    return ''
  }
}

let buffer = ''
let flushTimer: ReturnType<typeof setTimeout> | undefined
const decoder = new TextDecoder()

function emit(code: string) {
  const trimmed = code.replace(/[\u0000-\u001f]/g, '').trim()
  if (trimmed.length >= 3) codeListeners.forEach((l) => l(trimmed))
}

// Scanners end each code with CR / LF, or just stop sending; handle both.
function onValue(event: Event) {
  const value = (event.target as BTCharacteristic).value
  if (!value) return
  buffer += decoder.decode(value, { stream: true })
  const parts = buffer.split(/[\r\n]+/)
  buffer = parts.pop() ?? ''
  parts.forEach(emit)
  clearTimeout(flushTimer)
  if (buffer) {
    flushTimer = setTimeout(() => {
      emit(buffer)
      buffer = ''
    }, 120)
  }
}

async function subscribe(server: BTServer) {
  for (const uuid of SERIAL_SERVICES) {
    let service: BTService
    try {
      service = await server.getPrimaryService(uuid)
    } catch {
      continue
    }
    const characteristics = await service.getCharacteristics().catch(() => [] as BTCharacteristic[])
    const readable = characteristics.filter((c) => c.properties.notify || c.properties.indicate)
    if (readable.length === 0) continue
    for (const c of readable) {
      await c.startNotifications().catch(() => {})
      c.addEventListener('characteristicvaluechanged', onValue)
    }
    return true
  }
  return false
}

function onDisconnected() {
  setState({ status: 'idle' })
  // Scanners sleep to save battery; reconnect quietly when they wake, unless staff disconnected.
  if (!userDisconnected && device) {
    setTimeout(() => {
      if (device && !userDisconnected) connectDevice(device, true).catch(() => {})
    }, 1500)
  }
}

async function connectDevice(next: BTDevice, quiet = false) {
  if (!next.gatt) throw new Error('no-gatt')
  setState({ status: 'connecting', error: '', deviceName: next.name || 'Bluetooth scanner' })
  try {
    const server = await next.gatt.connect()
    const ok = await subscribe(server)
    if (!ok) {
      server.disconnect()
      device = null
      setState({
        status: 'idle',
        error: quiet
          ? ''
          : `${next.name || 'This scanner'} works as a keyboard. Pair it in your device's Bluetooth settings instead — the steps are below.`,
      })
      return false
    }
    if (device !== next) {
      device?.removeEventListener('gattserverdisconnected', onDisconnected)
      next.addEventListener('gattserverdisconnected', onDisconnected)
    }
    device = next
    window.localStorage.setItem(SAVED_DEVICE_KEY, JSON.stringify({ id: next.id, name: next.name || '' }))
    setState({ status: 'connected', error: '' })
    return true
  } catch {
    setState({ status: 'idle', error: quiet ? '' : "Couldn't connect. Wake the scanner (press its trigger) and try again." })
    return false
  }
}

/** Opens the browser's Bluetooth chooser and connects to the picked scanner. Needs a tap. */
export async function pairBluetoothScanner() {
  const bt = bluetooth()
  if (!bt) {
    setState({ error: 'This browser can’t connect to Bluetooth directly. Pair the scanner in your device’s Bluetooth settings.' })
    return false
  }
  userDisconnected = false
  let picked: BTDevice
  try {
    picked = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERIAL_SERVICES })
  } catch {
    // Chooser closed without picking.
    return false
  }
  return connectDevice(picked)
}

/** Reconnects to the last scanner without a prompt, where the browser allows it. */
export async function reconnectSavedBluetoothScanner() {
  const bt = bluetooth()
  if (!bt?.getDevices || state.status !== 'idle') return
  let saved: { id?: string }
  try {
    saved = JSON.parse(window.localStorage.getItem(SAVED_DEVICE_KEY) || '{}')
  } catch {
    return
  }
  if (!saved.id) return
  const devices = await bt.getDevices().catch(() => [] as BTDevice[])
  const match = devices.find((d) => d.id === saved.id)
  if (match) await connectDevice(match, true)
}

export function disconnectBluetoothScanner(forget = false) {
  userDisconnected = true
  device?.gatt?.disconnect()
  device = null
  if (forget) window.localStorage.removeItem(SAVED_DEVICE_KEY)
  setState({ status: 'idle', error: '', deviceName: forget ? '' : state.deviceName })
}
