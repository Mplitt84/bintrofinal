import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useRef, useId, useEffect, useState, useCallback, createContext, useContext, useMemo, forwardRef } from "react";
import { X, Sparkles, Trash2, Check, Plus, Search, Copy, Mic, Lock, Square, GitMerge, Camera, Tags, ExternalLink, Wand2, RotateCcw, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, AlertTriangle, Users, UserPlus, ScanBarcode, PackagePlus, Undo2, EyeOff, History, ClipboardCheck, Gauge, CircleMinus, Tag, CheckSquare, Pencil, ClipboardList, Mail, RefreshCw, Download, Printer, FileText, CheckCheck, PackageCheck, Truck, CalendarPlus, ChevronLeft, ChevronRight, Landmark, Repeat, CalendarDays, CheckCircle2, Send, FileUp, TriangleAlert, Plug, Lightbulb, Boxes, Leaf, CalendarClock, PiggyBank, ArrowRight, Palette, BluetoothConnected, Bluetooth, Crown, PlayCircle, CreditCard, XCircle, PauseCircle, Receipt, Flame, TrendingUp, TrendingDown, Globe, Settings, Store, Wallet, Activity } from "lucide-react";
import { c as createSsrRpc, s as saveProductCategories, r as removeProductCategories, l as lookupBarcodeDetails, a as readSpokenProduct, b as readLabelPhoto, d as suggestProduct, e as readStockPhotoFn, f as createProduct, g as recordProductMovement, h as getMovementsSince, i as searchProducts, j as scanMovement, u as undoMovement, k as linkBarcodeToProduct, m as bulkUpdateProducts, n as updateBusinessProfile, o as mergeProducts, p as deleteProduct, q as updateProduct, t as bulkDeleteProducts, v as emailBelowPar, w as emailPurchaseOrder, x as toDay, y as parseDay, z as occurrences, A as eventKind, E as EVENT_KINDS, B as formatTime, R as REPEATS, C as estimatedTaxDates, D as googleCalendarUrl, F as outlookCalendarUrl, G as subscribeUrls, H as buildIcs, I as getBudgetOverview, J as listExpenses, K as getIntegrations, L as quickbooksPushMonth, M as editExpense, N as createExpense, O as readReceiptPhoto, P as removeExpense, Q as saveMonthBudget, S as resumePlan, T as lockInFounding, U as cancelSubscription, V as getBillingHistory, W as saveAccountDetails, X as selectPlan, Y as openPaymentPortal, Z as pausePlan, _ as addTeamMember, $ as removeTeamMember, a0 as getSquareRetailCategories, a1 as disconnect, a2 as setSquareRetailCategories, a3 as squareImportCatalog, a4 as squareSyncSales, a5 as squareSendCounts, a6 as Route, a7 as listProducts, a8 as getRecentMovements, a9 as getAccount } from "./router-BOO3xrAZ.js";
import { createPortal } from "react-dom";
import { c as createServerFn } from "../server.js";
import { z } from "zod";
import { d as daysBetween, P as PRICE_STALE_DAYS, k as WEB_PRICE_SOURCE_LABELS, g as daysLabel, h as SLOW_GROUP_LABELS, B as BULK_COVER_DAYS, o as outVerb, S as SLOW_WINDOW_DAYS } from "./insights-BQ2QJiNr.js";
import { D as DEFAULT_REORDER_THRESHOLD, d as deriveInitials, i as isBelowPar, e as stockStatus, M as MAX_ORDER_QTY, S as STOCK_STATUS_LABEL, o as onHandQty, f as orderUpTo, g as casePack, s as suggestedOrderQty, c as clampOrderQty, u as unitsToPar, b as selectBelowPar, a as stockStats } from "./inventory-defaults-BnRHgx1T.js";
import { d as displayBusinessName, a as businessTypeById, E as EMPTY_PROFILE, T as TAX_GROUPS, t as taxKind, c as categorySuggestionsFor, g as guessTaxGroup, e as taxGroupById, f as findCategory, b as businessSlug, m as monthKey, r as recentMonths, h as monthRange, i as monthLabel, j as dayKey, s as selectableBusinessTypes } from "./business-types-DKNVcfJE.js";
import { o as planById, q as planHas, t as planFor, F as FEATURE_INFO, v as centsLabel, w as priceFor, x as PLANS, P as PAUSE_OPTIONS, C as CANCEL_REASONS, y as planRank } from "./account.server-IhIPs_LL.js";
import { M as MAX_IMPORT_LINES, S as SALES_REPORT_APPS, P as PRICE_BATCH, a as MAX_IMPORT_BYTES, n as needsPrice } from "./bulk-import-Bd6tmV71.js";
import { g as groupPurchaseOrderLines, a as purchaseOrderTotals, b as buildPurchaseOrderCsv, p as purchaseOrderFilename, l as lineTotalCents } from "./purchase-order-1ZyUH4cu.js";
import { L as LINKS } from "./LegalPage-DZ1ney0Q.js";
import "@tanstack/react-router";
import "./calendar.server-Ao_GjwJ3.js";
import "drizzle-orm";
import "node:crypto";
import "./index-CaPewqP7.js";
import "drizzle-orm/netlify-db";
import "drizzle-orm/pg-core";
import "./business.server-CHGYL_45.js";
import "./integrations.server-v9usGWZc.js";
import "./inventory.server-s1_t35IV.js";
import "node:async_hooks";
import "node:stream";
import "@tanstack/react-router/ssr/server";
function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const frame = requestAnimationFrame(() => {
      if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key !== "Escape") return;
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] === panelRef.current) onClose();
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-end justify-center min-[700px]:items-center", children: [
      /* @__PURE__ */ jsx("div", { className: "sheet-scrim absolute inset-0 bg-royal/45", onClick: onClose }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          ref: panelRef,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleId,
          tabIndex: -1,
          className: `sheet-panel outline-none relative w-full max-h-[92vh] overflow-auto bg-white rounded-t-[24px] px-5 pt-2 pb-[calc(24px+env(safe-area-inset-bottom,0px))] min-[700px]:rounded-[24px] min-[700px]:pt-6 ${wide ? "min-[700px]:w-[680px]" : "min-[700px]:w-[560px]"}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "w-10 h-1 rounded bg-line mx-auto mt-1 mb-3.5 min-[700px]:hidden" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                "aria-label": "Close",
                className: "absolute right-3 top-3 min-[700px]:top-4 w-9 h-9 rounded-full border-0 bg-surface text-ink-2 grid place-items-center cursor-pointer hover:bg-surface-2",
                children: /* @__PURE__ */ jsx(X, { size: 18 })
              }
            ),
            /* @__PURE__ */ jsx("h2", { id: titleId, className: "text-[22px] font-bold tracking-tight m-0 mb-1 pr-10", children: title }),
            subtitle && /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm m-0 mb-4", children: subtitle }),
            children
          ]
        }
      )
    ] }),
    document.body
  );
}
function Field({
  label: label2,
  htmlFor,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
    /* @__PURE__ */ jsx("label", { htmlFor, className: "block text-[13px] font-semibold text-ink-2 mb-1.5", children: label2 }),
    children
  ] });
}
function SheetActions({ children }) {
  return /* @__PURE__ */ jsx("div", { className: "flex gap-2.5 mt-5 [&>.btn]:flex-1", children });
}
const ToastContext = createContext(() => {
});
function useToast() {
  return useContext(ToastContext);
}
function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(void 0);
  const show = useCallback((message, onUndo) => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), message, onUndo });
    timer.current = setTimeout(() => setToast(null), onUndo ? 4500 : 2600);
  }, []);
  return /* @__PURE__ */ jsxs(ToastContext.Provider, { value: show, children: [
    children,
    toast && /* @__PURE__ */ jsxs(
      "div",
      {
        role: "status",
        className: "toast-in fixed left-1/2 -translate-x-1/2 z-[80] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-7 max-w-[calc(100vw-32px)] bg-royal text-white rounded-[14px] px-4.5 py-3 text-sm font-medium shadow-card flex items-center gap-3.5",
        children: [
          /* @__PURE__ */ jsx("span", { children: toast.message }),
          toast.onUndo && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                const undo = toast.onUndo;
                clearTimeout(timer.current);
                setToast(null);
                undo?.();
              },
              className: "bg-transparent border-0 text-gold-bright font-semibold cursor-pointer px-1",
              children: "Undo"
            }
          )
        ]
      },
      toast.id
    )
  ] });
}
const TONE_TEXT = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad"
};
function StatTile({ label: label2, value, tone }) {
  return /* @__PURE__ */ jsxs("div", { className: "relative overflow-hidden bg-gradient-to-b from-surface to-white border border-line rounded-2xl p-3.5 min-w-0", children: [
    /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-0 w-6 h-[3px] rounded-b-full bg-gold/70", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("b", { className: `num block text-2xl font-bold tracking-tight truncate ${tone ? TONE_TEXT[tone] : ""}`, children: value }),
    /* @__PURE__ */ jsx("span", { className: "text-[13px] text-ink-2", children: label2 })
  ] });
}
function StatGrid({ children }) {
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 min-[560px]:grid-cols-4 gap-2.5 mb-5", children });
}
function Thumb({
  imageUrl,
  label: label2,
  size = "md"
}) {
  const box = size === "lg" ? "w-14 h-14" : "w-11 h-11";
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `${box} rounded-xl bg-surface shrink-0 grid place-items-center overflow-hidden font-bold text-ink-2 text-[15px]`,
      children: imageUrl ? /* @__PURE__ */ jsx("img", { src: imageUrl, alt: "", loading: "lazy", className: "w-full h-full object-contain bg-white" }) : (label2.trim()[0] ?? "?").toUpperCase()
    }
  );
}
function EmptyState({ title, children }) {
  return /* @__PURE__ */ jsxs("div", { className: "text-center px-5 py-9 text-ink-2 bg-surface rounded-2xl", children: [
    /* @__PURE__ */ jsx("b", { className: "block text-ink text-[17px] mb-1", children: title }),
    children
  ] });
}
function PageHead({
  title,
  lead,
  action
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3 flex-wrap", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("span", { className: "block w-8 h-[3px] rounded-full bg-gradient-to-r from-gold to-gold-bright mt-1 mb-2", "aria-hidden": "true" }),
      /* @__PURE__ */ jsx("h1", { className: "text-[28px] leading-tight tracking-tight font-bold mt-0 mb-1 text-royal", children: title }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 mt-0 mb-5", children: lead })
    ] }),
    action
  ] });
}
function timeAgo(value) {
  const s = (Date.now() - new Date(value).getTime()) / 1e3;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function centsToDollars(cents) {
  return (cents / 100).toFixed(2);
}
function dollarsShort(cents) {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}
const READER_ID = "bintro-reader";
function CameraScanner({
  open,
  onClose,
  onScan,
  onTypeInstead,
  onPhotoInstead
}) {
  const [message, setMessage] = useState("");
  const [waiting, setWaiting] = useState(false);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMessage("");
    setWaiting(false);
    const waitTimer = setTimeout(() => {
      if (!cancelled && !document.querySelector(`#${READER_ID} video`)) setWaiting(true);
    }, 2500);
    async function start() {
      let lib;
      try {
        lib = await import("html5-qrcode");
      } catch {
        if (!cancelled) setMessage("The camera scanner could not load. Check your connection, or type the barcode instead.");
        return;
      }
      if (cancelled) return;
      const F = lib.Html5QrcodeSupportedFormats;
      const formatsToSupport = [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE];
      let handled = false;
      const onDecoded = (text) => {
        if (handled) return;
        handled = true;
        stopScanner().then(() => onScanRef.current(text.trim()));
      };
      const config = {
        fps: 12,
        qrbox: (w, h) => ({
          width: Math.max(80, Math.floor(Math.min(w * 0.82, 340))),
          height: Math.max(60, Math.floor(Math.min(h * 0.32, 170)))
        })
      };
      let lastError;
      for (const native of [true, false]) {
        if (cancelled) return;
        let scanner;
        try {
          scanner = new lib.Html5Qrcode(READER_ID, {
            verbose: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: native },
            formatsToSupport
          });
        } catch (error) {
          lastError = error;
          continue;
        }
        scannerRef.current = scanner;
        try {
          await scanner.start({ facingMode: "environment" }, config, onDecoded, () => {
          });
          setWaiting(false);
          if (cancelled) await stopScanner(scanner);
          return;
        } catch (error) {
          lastError = error;
          await stopScanner(scanner);
          const name = error instanceof Error ? error.name : String(error);
          if (/NotAllowed|Permission|NotFound|NotReadable|Overconstrained/i.test(name + String(error))) break;
        }
      }
      if (!cancelled) {
        console.error("Camera scanner failed to start", lastError);
        setMessage(
          window.isSecureContext === false ? "The camera only works on the secure (https://) address of this site. You can also use a Bluetooth or USB scanner, or type the code." : "Bintro needs camera access to scan. Allow the camera in your browser settings, then try again. You can also use a Bluetooth or USB scanner, or type the code."
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      clearTimeout(waitTimer);
      stopScanner();
    };
  }, [open]);
  async function stopScanner(target = scannerRef.current) {
    if (!target) return;
    if (scannerRef.current === target) scannerRef.current = null;
    try {
      await target.stop();
    } catch {
    }
    try {
      target.clear();
    } catch {
    }
  }
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    /* @__PURE__ */ jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": "Camera scanner", className: "fixed inset-0 z-[70] bg-black flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] text-white", children: [
        /* @__PURE__ */ jsx("strong", { children: "Scan a barcode" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "border-0 bg-white/15 text-white rounded-full px-4 py-2.5 font-semibold cursor-pointer",
            children: "Close"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 relative overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: /* @__PURE__ */ jsx("div", { id: READER_ID, className: "bintro-reader w-full max-h-full" }) }),
        waiting && !message && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 m-auto h-fit text-white text-center px-6 py-10 max-w-[420px]", children: /* @__PURE__ */ jsxs("p", { className: "m-0", children: [
          "Starting the camera… If your browser asks to use the camera, tap ",
          /* @__PURE__ */ jsx("b", { children: "Allow" }),
          "."
        ] }) }),
        message && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 m-auto h-fit text-white text-center px-6 py-10 max-w-[420px]", children: [
          /* @__PURE__ */ jsx("p", { className: "m-0 mb-4", children: message }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 justify-center", children: [
            onPhotoInstead && /* @__PURE__ */ jsx("button", { className: "btn btn-primary", onClick: onPhotoInstead, children: "Snap a photo instead" }),
            onTypeInstead && /* @__PURE__ */ jsx("button", { className: "btn btn-tonal", onClick: onTypeInstead, children: "Type the barcode" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "text-white text-center px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] text-[15px]", children: [
        "Hold steady about 6 inches from the barcode",
        onPhotoInstead && !message && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: onPhotoInstead,
            className: "block mx-auto mt-3 border-0 bg-white/15 text-white rounded-full px-4 py-2.5 font-semibold cursor-pointer",
            children: "Won't scan? Snap a photo of the SKU or label"
          }
        )
      ] })
    ] }),
    document.body
  );
}
function shrinkImage(file, maxEdge = 1400) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}
function validGs1(code) {
  let sum = 0;
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(code[i]) * w;
  return (10 - sum % 10) % 10 === Number(code[code.length - 1]);
}
function validUpcE(code) {
  if (code[0] !== "0" && code[0] !== "1") return false;
  const d = code.slice(1, 7);
  const last = d[5];
  let body;
  if (last <= "2") body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
  else if (last === "3") body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
  else if (last === "4") body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
  else body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  return validGs1(`${code[0]}${body}${code[7]}`);
}
function checkUnknownScan(code, knownBarcodes) {
  if (!/^\d+$/.test(code)) return { ok: true };
  if (knownBarcodes.some((b) => b.length > code.length && b.includes(code))) return { ok: false, reason: "fragment" };
  if (code.length < 8) return { ok: false, reason: "short" };
  if (code.length > 14) return { ok: true };
  if (code.length === 8 && (validGs1(code) || validUpcE(code))) return { ok: true };
  if ((code.length === 12 || code.length === 13 || code.length === 14) && validGs1(code)) return { ok: true };
  return { ok: false, reason: code.length < 12 && code.length !== 8 ? "short" : "checksum" };
}
const COUNT_REASONS = [
  "Miscounted before",
  "Used on a client, not scanned",
  "Sold, not scanned",
  "Received, not scanned in",
  "Damaged or spilled",
  "Expired",
  "Missing",
  "Not sure"
];
function needsRecount(expected, counted, unitCostCents) {
  const diff = Math.abs(counted - Math.max(0, expected));
  if (diff === 0) return false;
  return diff >= 3 || diff * unitCostCents >= 2500 || expected > 0 && diff / expected >= 0.25 && diff >= 2;
}
function lastCountedLabel(p) {
  if (!p.lastCountedAt) return "Never counted";
  const when = new Date(p.lastCountedAt).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
  return `Last counted ${when}${p.lastCountedBy ? ` by ${p.lastCountedBy}` : ""}`;
}
const EXPIRY_WARN_DAYS = 60;
const SHELF_LIFE_OPTIONS = [18, 24, 36];
function monthsFromToday(months, from = /* @__PURE__ */ new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isExpiryDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function daysToExpiry(value, now = /* @__PURE__ */ new Date()) {
  if (!isExpiryDate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const end = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((end - today) / 864e5);
}
function expiryState(value, now = /* @__PURE__ */ new Date()) {
  if (value === "none") return "none";
  const days = daysToExpiry(value, now);
  if (days === null) return "unset";
  if (days < 0) return "expired";
  return days <= EXPIRY_WARN_DAYS ? "soon" : "ok";
}
function expiryLabel(value) {
  if (value === "none") return "No expiration";
  if (!isExpiryDate(value)) return "";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
}
const KindSchema = z.enum(["weekly", "monthly", "fast"]);
const getInsights = createServerFn({
  method: "GET"
}).handler(createSsrRpc("08ccd14865d516fb455ca8ecc85f1226b605386556c7d4af3e3f54106e04aeb3"));
const getInsightSummary = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  kind: KindSchema
})).handler(createSsrRpc("b0755821f285543af9317e907f849527e2025919870fab838916fc903fd55bdc"));
const sendInsightReportNow = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  kind: KindSchema
})).handler(createSsrRpc("8a5cdce2e3594cdbb1763bc5ca5a423c0e06b3456788d6a0864c260d8d214b84"));
const PriceFieldsSchema = z.object({
  productId: z.number().int().positive().optional(),
  name: z.string().max(200).default(""),
  brand: z.string().max(120).default(""),
  size: z.string().max(60).default(""),
  category: z.string().max(80).default(""),
  vendor: z.string().max(120).default(""),
  barcode: z.string().max(64).default("")
});
const checkWebPrice = createServerFn({
  method: "POST"
}).inputValidator(PriceFieldsSchema).handler(createSsrRpc("6a3e722c6decd120d655deff6e327fd1bb25f2de144af22924707b3586e10156"));
const applyWebPrice = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productId: z.number().int().positive(),
  checkId: z.number().int().nonnegative().optional(),
  unitCostCents: z.number().int().nonnegative().max(1e7).optional(),
  retailPriceCents: z.number().int().nonnegative().max(1e7).optional()
})).handler(createSsrRpc("9177352979bdd25707a8e28d888613648e8d2c1f2e94ce02c00f6c99b6afb802"));
const confirmPrices = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  productId: z.number().int().positive()
})).handler(createSsrRpc("8dd7a7a2cddcfe3bde69e3b6a2141d3a9ad49f42632f598e1f6b54be9a908306"));
const fold = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function words$1(v) {
  return fold(v).split(/[\s\-/.,'()]+/).filter((w) => w.length >= 3);
}
function similarity(p, ctx) {
  let score = 0;
  if (ctx.brand?.trim() && fold(p.brand) === fold(ctx.brand)) score += 4;
  if (ctx.category?.trim() && fold(p.category) === fold(ctx.category)) score += 2;
  if (ctx.size?.trim() && fold(p.size) === fold(ctx.size)) score += 2;
  if (ctx.vendor?.trim() && fold(p.vendor) === fold(ctx.vendor)) score += 1;
  if (ctx.name?.trim()) {
    const mine = new Set(words$1(ctx.name));
    score += Math.min(3, words$1(p.name).filter((w) => mine.has(w)).length);
  }
  return score;
}
const newestFirst = (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id;
function rankPreviousEntries(products, ctx, query = "", limit = 6) {
  const q = fold(query);
  const pool = q ? products.filter((p) => fold([p.name, p.brand, p.category, p.vendor, p.size, p.barcode].join(" ")).includes(q)) : products;
  return pool.map((p) => ({ p, score: similarity(p, ctx) })).sort((a, b) => b.score - a.score || newestFirst(a.p, b.p)).slice(0, limit).map(({ p, score }) => ({ product: p, similar: score >= 3 }));
}
function bestSimilarEntry(products, ctx) {
  let best = null;
  let bestScore = 0;
  for (const p of products) {
    const s = similarity(p, ctx);
    if (s > bestScore || s === bestScore && best && newestFirst(p, best) < 0) {
      best = p;
      bestScore = s;
    }
  }
  return bestScore >= 3 ? best : null;
}
function median(values) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function predictPrices(products, field, ctx, limit = 6) {
  const groups = /* @__PURE__ */ new Map();
  for (const p of products) {
    const cents = p[field];
    if (p.id === ctx.excludeId || cents <= 0) continue;
    const score = similarity(p, ctx);
    const g = groups.get(cents);
    if (!g) groups.set(cents, { total: 1 + score, count: 1, best: p, bestScore: score });
    else {
      g.total += 1 + score;
      g.count += 1;
      if (score > g.bestScore) {
        g.best = p;
        g.bestScore = score;
      }
    }
  }
  const options = Array.from(groups, ([cents, g]) => ({
    cents,
    rank: g.total,
    hint: g.bestScore > 0 ? `Same as ${g.best.name}${g.count > 1 ? ` +${g.count - 1}` : ""}` : g.count > 1 ? `Used on ${g.count} products` : `From ${g.best.name}`
  }));
  if (ctx.otherCents > 0) {
    const paired = products.filter((p) => p.id !== ctx.excludeId && p.unitCostCents > 0 && p.retailPriceCents > p.unitCostCents);
    const alike = paired.filter((p) => similarity(p, ctx) >= 2);
    const basis = alike.length >= 2 ? alike : paired;
    const ratio = median(basis.map((p) => p.retailPriceCents / p.unitCostCents));
    if (ratio > 1) {
      const raw = field === "retailPriceCents" ? ctx.otherCents * ratio : ctx.otherCents / ratio;
      const cents = field === "retailPriceCents" ? Math.max(50, Math.round(raw / 50) * 50) : Math.round(raw);
      const existing = options.find((o) => o.cents === cents);
      const hint = `Your usual ${ratio.toFixed(1)}× markup${alike.length >= 2 ? " for items like this" : ""}`;
      if (existing) {
        existing.rank = Number.POSITIVE_INFINITY;
        existing.hint = hint;
      } else options.push({ cents, hint, rank: Number.POSITIVE_INFINITY });
    }
  }
  return options.sort((a, b) => b.rank - a.rank || a.cents - b.cents).slice(0, limit).map(({ cents, hint }) => ({ cents, hint }));
}
function rankSuggestions(query, options, limit = 6) {
  const fold2 = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = fold2(query.trim());
  if (!q) return options.slice(0, limit);
  const words2 = q.split(/\s+/);
  const scored = [];
  for (const value of options) {
    const v = fold2(value);
    if (v === q) continue;
    const vWords = v.split(/[\s\-/.,'()]+/);
    let score = -1;
    if (v.startsWith(q)) score = 3;
    else if (words2.every((w) => vWords.some((vw) => vw.startsWith(w)))) score = 2;
    else if (v.includes(q)) score = 1;
    if (score > 0) scored.push({ value, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.value.length - b.value.length || a.value.localeCompare(b.value)).slice(0, limit).map((s) => s.value);
}
function AutoInput({
  id,
  value,
  onChange,
  onPick,
  suggestions,
  placeholder,
  className = "field-input",
  inputMode,
  autoFocus,
  showWhenEmpty = false,
  onBlur
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(
    () => value.trim() || showWhenEmpty ? rankSuggestions(value, suggestions) : [],
    [value, suggestions, showWhenEmpty]
  );
  const visible = open && matches.length > 0;
  function pick(v) {
    onChange(v);
    onPick?.(v);
    setOpen(false);
    setActive(-1);
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        id,
        className,
        value,
        placeholder,
        inputMode,
        autoFocus,
        autoComplete: "off",
        role: "combobox",
        "aria-expanded": visible,
        "aria-controls": listId,
        "aria-autocomplete": "list",
        "aria-activedescendant": visible && active >= 0 ? `${listId}-${active}` : void 0,
        onChange: (e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        },
        onFocus: () => setOpen(true),
        onBlur: () => {
          setTimeout(() => setOpen(false), 120);
          onBlur?.();
        },
        onKeyDown: (e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => i <= 0 ? matches.length - 1 : i - 1);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Tab" && matches.length > 0 && value.trim()) {
            if (active >= 0 || matches[0].toLowerCase().startsWith(value.trim().toLowerCase())) {
              e.preventDefault();
              pick(matches[Math.max(0, active)]);
            }
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
        }
      }
    ),
    visible && /* @__PURE__ */ jsx(
      "ul",
      {
        id: listId,
        role: "listbox",
        className: "absolute z-20 left-0 right-0 mt-1 list-none m-0 p-1 bg-white border border-line rounded-xl shadow-card max-h-60 overflow-auto",
        children: matches.map((m, i) => /* @__PURE__ */ jsx(
          "li",
          {
            id: `${listId}-${i}`,
            role: "option",
            "aria-selected": i === active,
            onMouseDown: (e) => {
              e.preventDefault();
              pick(m);
            },
            className: `px-3 py-2.5 rounded-lg cursor-pointer text-[15px] truncate ${i === active ? "bg-action-tint" : "hover:bg-surface"}`,
            children: m
          },
          m
        ))
      }
    )
  ] });
}
function QuickChips({
  options,
  value,
  onPick,
  label: label2
}) {
  if (options.length === 0) return null;
  return /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 overflow-x-auto -mt-1.5 mb-3 pb-0.5", role: "group", "aria-label": label2, children: options.map((o) => /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      className: "chip !px-2.5 !py-1 !text-[13px]",
      "aria-pressed": value.trim().toLowerCase() === o.toLowerCase(),
      onClick: () => onPick(o),
      children: o
    },
    o
  )) });
}
const PriceInput = forwardRef(function PriceInput2({ id, value, onChange, onPick, suggestions, placeholder, align = "left" }, ref) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => {
    const typed = value.trim().replace(/^\$/, "");
    if (!typed) return suggestions;
    return suggestions.filter((s) => {
      const d = centsToDollars(s.cents);
      return d.startsWith(typed) && Number(d) !== Number(typed);
    });
  }, [value, suggestions]);
  const visible = open && matches.length > 0;
  function pick(s) {
    const v = centsToDollars(s.cents);
    onChange(v);
    setOpen(false);
    setActive(-1);
    onPick?.(v);
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        ref,
        id,
        className: "field-input num",
        type: "number",
        inputMode: "decimal",
        step: "0.01",
        min: 0,
        autoComplete: "off",
        placeholder,
        value,
        role: "combobox",
        "aria-expanded": visible,
        "aria-controls": listId,
        "aria-autocomplete": "list",
        "aria-activedescendant": visible && active >= 0 ? `${listId}-${active}` : void 0,
        onChange: (e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        },
        onFocus: () => setOpen(true),
        onBlur: () => setTimeout(() => setOpen(false), 120),
        onKeyDown: (e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => i <= 0 ? matches.length - 1 : i - 1);
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Tab" && !e.shiftKey && (active >= 0 || value.trim())) {
            e.preventDefault();
            pick(matches[Math.max(0, active)]);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
        }
      }
    ),
    visible && /* @__PURE__ */ jsxs(
      "ul",
      {
        id: listId,
        role: "listbox",
        "aria-label": "Prices from earlier entries",
        className: `absolute z-20 ${align === "right" ? "right-0" : "left-0"} w-[min(260px,calc(100vw-56px))] mt-1 list-none m-0 p-1 bg-white border border-line rounded-xl shadow-card max-h-64 overflow-auto`,
        children: [
          /* @__PURE__ */ jsx("li", { role: "presentation", className: "px-3 pt-1.5 pb-1 text-[12px] font-semibold text-ink-2", children: "From earlier entries" }),
          matches.map((s, i) => /* @__PURE__ */ jsxs(
            "li",
            {
              id: `${listId}-${i}`,
              role: "option",
              "aria-selected": i === active,
              onMouseDown: (e) => {
                e.preventDefault();
                pick(s);
              },
              className: `px-3 py-2 rounded-lg cursor-pointer ${i === active ? "bg-action-tint" : "hover:bg-surface"}`,
              children: [
                /* @__PURE__ */ jsxs("span", { className: "num block text-[15px] font-semibold", children: [
                  "$",
                  centsToDollars(s.cents)
                ] }),
                /* @__PURE__ */ jsx("span", { className: "block text-[12px] text-ink-2 truncate", children: s.hint })
              ]
            },
            s.cents
          ))
        ]
      }
    )
  ] });
});
const BusinessContext = createContext({
  profile: EMPTY_PROFILE,
  type: businessTypeById(EMPTY_PROFILE.businessType),
  name: displayBusinessName(EMPTY_PROFILE),
  categories: [],
  onCategories: () => {
  },
  account: null,
  onAccount: () => {
  },
  plan: planById("free"),
  can: () => true,
  openPlans: () => {
  }
});
function BusinessProvider({
  profile,
  categories,
  onCategories,
  account,
  onAccount,
  openPlans,
  children
}) {
  const can = (feature) => account ? planHas(account.effectivePlan, feature) : true;
  return /* @__PURE__ */ jsx(
    BusinessContext.Provider,
    {
      value: {
        profile,
        type: businessTypeById(profile.businessType),
        name: displayBusinessName(profile),
        categories,
        onCategories,
        account,
        onAccount,
        plan: planById(account?.effectivePlan ?? "premium"),
        can,
        openPlans
      },
      children
    }
  );
}
function useBusiness() {
  return useContext(BusinessContext);
}
const key = (v) => v.trim().toLowerCase();
function CategorySetupSheet({
  open,
  onClose,
  productCategories = [],
  onSaved
}) {
  const toast = useToast();
  const { type, categories, onCategories } = useBusiness();
  const suggestions = useMemo(() => categorySuggestionsFor(type.id), [type]);
  const [picked, setPicked] = useState(/* @__PURE__ */ new Map());
  const [custom, setCustom] = useState("");
  const [customGroup, setCustomGroup] = useState(TAX_GROUPS[1].id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setPicked(new Map(categories.map((c) => [key(c.name), { name: c.name, group: c.taxGroup }])));
    setCustom("");
    setError("");
  }, [open, categories]);
  const onProducts = useMemo(() => {
    const known = /* @__PURE__ */ new Set([...suggestions.map((s) => key(s.name)), ...categories.map((c) => key(c.name))]);
    const seen = /* @__PURE__ */ new Set();
    return productCategories.filter((c) => {
      const k = key(c);
      if (!k || known.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [productCategories, suggestions, categories]);
  const byGroup = useMemo(() => {
    const groups = /* @__PURE__ */ new Map();
    const add = (group, name) => {
      const list = groups.get(group) ?? [];
      if (!list.some((n) => key(n) === key(name))) list.push(name);
      groups.set(group, list);
    };
    for (const s of suggestions) add(picked.get(key(s.name))?.group ?? s.group, s.name);
    for (const p of picked.values()) if (!onProducts.some((c) => key(c) === key(p.name))) add(p.group, p.name);
    return TAX_GROUPS.filter((g) => groups.has(g.id)).map((g) => ({ group: g, names: groups.get(g.id) }));
  }, [suggestions, picked, onProducts]);
  function toggle(name, group) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(key(name))) next.delete(key(name));
      else next.set(key(name), { name, group });
      return next;
    });
  }
  function pickAll(names, group) {
    setPicked((prev) => {
      const next = new Map(prev);
      const allOn = names.every((n) => next.has(key(n)));
      for (const n of names) {
        if (allOn) next.delete(key(n));
        else if (!next.has(key(n))) next.set(key(n), { name: n, group });
      }
      return next;
    });
  }
  function addCustom(e) {
    e?.preventDefault();
    e?.stopPropagation();
    const name = custom.trim().slice(0, 60);
    if (!name) return;
    setPicked((prev) => new Map(prev).set(key(name), { name, group: customGroup }));
    setCustom("");
  }
  const savedKeys = new Set(categories.map((c) => key(c.name)));
  const additions = Array.from(picked.values()).filter((p) => !savedKeys.has(key(p.name)));
  const refiled = categories.filter((c) => {
    const p = picked.get(key(c.name));
    return p && p.group !== c.taxGroup;
  });
  const removals = categories.filter((c) => !picked.has(key(c.name)));
  const changes = additions.length + refiled.length + removals.length;
  async function save() {
    setSaving(true);
    setError("");
    try {
      let next = categories;
      const upserts = [
        ...additions.map((p) => ({ name: p.name, taxGroup: p.group })),
        ...refiled.map((c) => ({ name: c.name, taxGroup: picked.get(key(c.name)).group }))
      ];
      if (upserts.length) next = await saveProductCategories({ data: { items: upserts } });
      if (removals.length) next = await removeProductCategories({ data: { ids: removals.map((c) => c.id) } });
      onCategories(next);
      toast(
        additions.length ? `Added ${additions.length} categor${additions.length === 1 ? "y" : "ies"}` : "Categories updated"
      );
      onSaved?.(additions.map((a) => a.name));
      onClose();
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      wide: true,
      title: `Categories for your ${type.label.toLowerCase()}`,
      subtitle: /* @__PURE__ */ jsx(Fragment, { children: "Tap the ones you use. Each is filed under the tax line your accountant books it to, so your reports are ready at tax time. Only the ones you pick show up as quick choices." }),
      children: [
        onProducts.length > 0 && /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-line p-3.5 mb-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 mb-1", children: [
            /* @__PURE__ */ jsx("h3", { className: "m-0 text-[15px] font-bold", children: "Already on your products" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm !py-1", onClick: () => onProducts.forEach((c) => !picked.has(key(c)) && toggle(c, guessTaxGroup(c, suggestions))), children: "Add all" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "m-0 mb-2.5 text-[13px] text-ink-2", children: "Keep what you’ve been using. Bintro files each one under its likely tax group." }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: onProducts.map((c) => {
            const on = picked.has(key(c));
            const group = picked.get(key(c))?.group ?? guessTaxGroup(c, suggestions);
            return /* @__PURE__ */ jsxs("button", { type: "button", className: "chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1", "aria-pressed": on, onClick: () => toggle(c, group), children: [
              on && /* @__PURE__ */ jsx(Check, { size: 14 }),
              c,
              /* @__PURE__ */ jsxs("span", { className: `font-normal ${on ? "text-white/70" : "text-ink-2"}`, children: [
                "· ",
                taxGroupById(group).label
              ] })
            ] }, c);
          }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: byGroup.map(({ group, names }) => {
          const onCount = names.filter((n) => picked.has(key(n))).length;
          return /* @__PURE__ */ jsxs("section", { className: "rounded-2xl bg-surface p-3.5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxs("h3", { className: "m-0 text-[15px] font-bold flex items-center gap-2 flex-wrap", children: [
                  group.label,
                  " (",
                  taxKind(group),
                  ")",
                  group.cogs && /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white text-ink-2", children: "COGS" })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "m-0 text-[13px] text-ink-2", children: group.why })
              ] }),
              /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm !py-1 shrink-0", onClick: () => pickAll(names, group.id), children: onCount === names.length ? "Clear" : "Pick all" })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 mb-2.5 text-[12px] text-ink-2", children: [
              /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "For your accountant:" }),
              " ",
              group.taxLine,
              " · QuickBooks “",
              group.qbAccount,
              "”"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", role: "group", "aria-label": group.label, children: names.map((n) => {
              const on = picked.has(key(n));
              return /* @__PURE__ */ jsxs("button", { type: "button", className: "chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1", "aria-pressed": on, onClick: () => toggle(n, group.id), children: [
                on ? /* @__PURE__ */ jsx(Check, { size: 14 }) : /* @__PURE__ */ jsx(Plus, { size: 14, className: "text-ink-2" }),
                n
              ] }, n);
            }) })
          ] }, group.id);
        }) }),
        /* @__PURE__ */ jsxs("form", { onSubmit: addCustom, className: "rounded-2xl border border-dashed border-line p-3.5 mt-3", children: [
          /* @__PURE__ */ jsx("h3", { className: "m-0 text-[15px] font-bold", children: "Add something specific" }),
          /* @__PURE__ */ jsx("p", { className: "m-0 mb-2.5 text-[13px] text-ink-2", children: "Get as specific as you like, e.g. “Chrome powders” or “Brazilian wax”. Pick where it’s booked." }),
          /* @__PURE__ */ jsxs("div", { className: "grid min-[560px]:grid-cols-[1fr_auto_auto] gap-2", children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "cat-custom", className: "sr-only", children: "Category name" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "cat-custom",
                className: "field-input",
                value: custom,
                onChange: (e) => setCustom(e.target.value),
                placeholder: "Category name",
                autoComplete: "off"
              }
            ),
            /* @__PURE__ */ jsx("label", { htmlFor: "cat-custom-group", className: "sr-only", children: "Tax group" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                id: "cat-custom-group",
                className: "field-input min-[560px]:!w-auto",
                value: customGroup,
                onChange: (e) => setCustomGroup(e.target.value),
                children: TAX_GROUPS.map((g) => /* @__PURE__ */ jsxs("option", { value: g.id, children: [
                  g.label,
                  " (",
                  taxKind(g),
                  ")"
                ] }, g.id))
              }
            ),
            /* @__PURE__ */ jsxs("button", { type: "submit", className: "btn btn-tonal", disabled: !custom.trim(), children: [
              /* @__PURE__ */ jsx(Plus, { size: 18 }),
              "Add"
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "m-0 mt-2 text-[12px] text-ink-2", children: taxGroupById(customGroup).taxLine })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-[12px] text-ink-2 mt-3 mb-0", children: "Tax lines follow the US Schedule C and are a starting point. Your accountant has the final say." }),
        error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: error }),
        /* @__PURE__ */ jsx("div", { className: "sticky bottom-0 bg-white -mx-5 px-5 pt-1 pb-0.5", children: /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: saving || changes === 0, onClick: save, children: saving ? "Saving…" : changes === 0 ? `${picked.size} picked` : `Save ${picked.size} categor${picked.size === 1 ? "y" : "ies"}` })
        ] }) })
      ]
    }
  );
}
function CategoryManager({ productCategories }) {
  const toast = useToast();
  const { type, categories, onCategories } = useBusiness();
  const [setupOpen, setSetupOpen] = useState(false);
  const usage = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const c of productCategories) m.set(key(c), (m.get(key(c)) ?? 0) + 1);
    return m;
  }, [productCategories]);
  const grouped = TAX_GROUPS.map((g) => ({ group: g, items: categories.filter((c) => c.taxGroup === g.id) })).filter(
    (g) => g.items.length > 0
  );
  async function refile(c, taxGroup) {
    try {
      onCategories(await saveProductCategories({ data: { items: [{ name: c.name, taxGroup }] } }));
      toast(`${c.name} moved to ${taxGroupById(taxGroup).label}`);
    } catch {
      toast("Could not update. Try again.");
    }
  }
  async function remove(c) {
    try {
      onCategories(await removeProductCategories({ data: { ids: [c.id] } }));
      toast(`${c.name} removed`, async () => {
        onCategories(await saveProductCategories({ data: { items: [{ name: c.name, taxGroup: c.taxGroup }] } }));
      });
    } catch {
      toast("Could not remove. Try again.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap bg-action-tint rounded-2xl p-4 mb-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 text-sm", children: [
        /* @__PURE__ */ jsxs("b", { className: "block text-[15px]", children: [
          "Suggestions for a ",
          type.label.toLowerCase()
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "Pick from what most shops like yours track, or add your own." })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => setSetupOpen(true), children: [
        /* @__PURE__ */ jsx(Sparkles, { size: 16 }),
        categories.length ? "Add more" : "Set up categories"
      ] })
    ] }),
    grouped.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 bg-surface rounded-2xl px-4 py-5 text-center m-0", children: "No categories yet. Set them up once and they appear as one-tap choices when adding products." }) : /* @__PURE__ */ jsx("div", { className: "grid gap-3", children: grouped.map(({ group, items }) => /* @__PURE__ */ jsxs("section", { className: "bg-surface rounded-2xl px-4 pt-3 pb-1", children: [
      /* @__PURE__ */ jsxs("h3", { className: "m-0 text-[15px] font-bold", children: [
        group.label,
        " (",
        taxKind(group),
        ")"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "m-0 text-[12px] text-ink-2 mb-1", children: [
        group.taxLine,
        " · QuickBooks “",
        group.qbAccount,
        "”"
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: items.map((c) => {
        const n = usage.get(key(c.name)) ?? 0;
        return /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-2 py-2 border-b border-line last:border-b-0", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold block truncate", children: c.name }),
            /* @__PURE__ */ jsx("span", { className: "text-[12px] text-ink-2", children: n ? `${n} product${n === 1 ? "" : "s"}` : "Not used yet" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "sr-only", htmlFor: `cat-group-${c.id}`, children: [
            "Tax group for ",
            c.name
          ] }),
          /* @__PURE__ */ jsx(
            "select",
            {
              id: `cat-group-${c.id}`,
              className: "chip !py-1.5 !text-[13px] max-w-[46%]",
              value: c.taxGroup,
              onChange: (e) => refile(c, e.target.value),
              children: TAX_GROUPS.map((g) => /* @__PURE__ */ jsxs("option", { value: g.id, children: [
                g.label,
                " (",
                taxKind(g),
                ")"
              ] }, g.id))
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "w-9 h-9 rounded-full border-0 bg-transparent grid place-items-center text-bad cursor-pointer hover:bg-white shrink-0",
              onClick: () => remove(c),
              "aria-label": `Remove ${c.name}`,
              children: /* @__PURE__ */ jsx(Trash2, { size: 16 })
            }
          )
        ] }, c.id);
      }) })
    ] }, group.id)) }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-3 mb-0", children: "Removing a category from the list doesn’t change products already filed under it." }),
    /* @__PURE__ */ jsx(CategorySetupSheet, { open: setupOpen, onClose: () => setSetupOpen(false), productCategories })
  ] });
}
const COPY_PROMPT_OFF_KEY = "shagnoir-copy-prompt-off";
function CopyPreviousSheet({
  open,
  products,
  context,
  onPick,
  onClose
}) {
  const [query, setQuery] = useState("");
  const [dontAsk, setDontAsk] = useState(() => {
    try {
      return localStorage.getItem(COPY_PROMPT_OFF_KEY) === "1";
    } catch {
      return false;
    }
  });
  const entries = useMemo(() => rankPreviousEntries(products, context, query), [products, context, query]);
  const anySimilar = !query && entries.some((e) => e.similar);
  function toggleDontAsk(v) {
    setDontAsk(v);
    try {
      if (v) localStorage.setItem(COPY_PROMPT_OFF_KEY, "1");
      else localStorage.removeItem(COPY_PROMPT_OFF_KEY);
    } catch {
    }
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: anySimilar ? "Looks like something you’ve added" : "Copy a previous entry?",
      subtitle: "Pick one and Bintro copies its brand, category, size, supplier, reorder level and prices. You only add the name and barcode.",
      children: [
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2.5 bg-surface rounded-full px-4 mb-2", children: [
          /* @__PURE__ */ jsx(Search, { size: 18, className: "text-ink-2 shrink-0" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "search",
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: "Find another entry",
              "aria-label": "Search previous entries",
              className: "flex-1 border-0 bg-transparent py-3 text-base outline-none"
            }
          )
        ] }),
        entries.length === 0 ? /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm text-center py-6 m-0", children: [
          "Nothing matches “",
          query,
          "”."
        ] }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: entries.map(({ product: p, similar }) => /* @__PURE__ */ jsx("li", { className: "border-b border-line last:border-b-0", children: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => onPick(p),
            className: "w-full flex items-center gap-3 py-3 text-left border-0 bg-transparent cursor-pointer rounded-xl hover:bg-surface px-1 -mx-1",
            children: [
              /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxs("div", { className: "font-semibold truncate", children: [
                  p.name,
                  similar && /* @__PURE__ */ jsx("span", { className: "ml-2 align-middle inline-block text-[11px] font-semibold px-2 rounded-full bg-action-tint text-action", children: "Similar" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [p.brand, p.category, p.size, p.vendor].filter(Boolean).join(", ") || p.barcode })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap num", children: [
                /* @__PURE__ */ jsxs("div", { className: "text-[15px] font-bold leading-tight", children: [
                  p.unitCostCents > 0 ? `$${centsToDollars(p.unitCostCents)}` : "—",
                  /* @__PURE__ */ jsx("span", { className: "text-[12px] font-semibold text-ink-2", children: " cost" })
                ] }),
                p.retailPriceCents > 0 && /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2", children: [
                  "sells $",
                  centsToDollars(p.retailPriceCents)
                ] })
              ] }),
              /* @__PURE__ */ jsx(Copy, { size: 16, className: "text-ink-2 shrink-0", "aria-hidden": true })
            ]
          }
        ) }, p.id)) }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm text-ink-2 mt-3 cursor-pointer", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: dontAsk, onChange: (e) => toggleDontAsk(e.target.checked) }),
          "Don’t pop this up automatically (the Copy button stays on the form)"
        ] }),
        /* @__PURE__ */ jsx(SheetActions, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Start blank" }) })
      ]
    }
  );
}
function recognitionCtor() {
  if (typeof window === "undefined") return void 0;
  const w = window;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const DICTATION_ERROR_TEXT = {
  denied: "Bintro needs the microphone. Allow it in your browser settings, then try again.",
  "no-speech": "Didn't catch that. Tap the mic and speak again.",
  failed: "Voice input stopped. Check your connection and try again."
};
function useDictation() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const rec = useRef(null);
  useEffect(() => {
    setSupported(!!recognitionCtor());
    return () => rec.current?.abort();
  }, []);
  const stop = useCallback(() => rec.current?.stop(), []);
  const start = useCallback((onDone, opts = {}) => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = opts.continuous ?? false;
    r.interimResults = true;
    let finalText = "";
    let failed = "";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += `${piece} `;
        else live += piece;
      }
      setInterim(`${finalText}${live}`.trim());
    };
    r.onerror = (e) => {
      failed = e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "no-speech" ? "no-speech" : e.error === "aborted" ? "" : "failed";
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      setListening(false);
      setInterim("");
      const text = finalText.trim();
      if (text) onDone(text);
      else setError(failed || "no-speech");
    };
    rec.current = r;
    setError("");
    setInterim("");
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError("failed");
    }
  }, []);
  return { supported, listening, interim, error, start, stop, clearError: () => setError("") };
}
function MicButton({ label: label2, onText }) {
  const { supported, listening, error, start, stop } = useDictation();
  if (!supported) return null;
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: () => listening ? stop() : start((t) => onText(tidy(t))),
      "aria-label": listening ? `Stop listening for ${label2}` : `Say the ${label2}`,
      "aria-pressed": listening,
      title: error ? DICTATION_ERROR_TEXT[error] : `Say the ${label2}`,
      className: `mic-btn shrink-0 w-12 rounded-xl border grid place-items-center cursor-pointer ${listening ? "mic-live bg-bad text-white border-bad" : error ? "bg-bad-tint text-bad border-bad/30" : "bg-white text-action border-line hover:bg-surface"}`,
      children: listening ? /* @__PURE__ */ jsx(Square, { size: 16, fill: "currentColor" }) : /* @__PURE__ */ jsx(Mic, { size: 19 })
    }
  );
}
function tidy(text) {
  const t = text.trim().replace(/[.。]$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function SpeakDetails({
  aiOn,
  busy,
  onTranscript
}) {
  const { supported, listening, interim, error, start, stop, clearError } = useDictation();
  if (!supported) return null;
  if (listening) {
    return /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-action-tint p-3.5 mb-4", role: "status", "aria-live": "polite", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ jsx("span", { className: "mic-live w-11 h-11 rounded-full bg-bad text-white grid place-items-center shrink-0", "aria-hidden": "true", children: /* @__PURE__ */ jsx(Mic, { size: 20 }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("b", { className: "block text-sm text-ink", children: "Listening…" }),
        /* @__PURE__ */ jsx("p", { className: "m-0 text-[13px] text-ink-2 line-clamp-3", children: interim || "Say the brand, product name and size — and the count and prices if you know them." })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm shrink-0", onClick: stop, children: "Done" })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "btn btn-tonal w-full",
        disabled: busy,
        onClick: () => {
          clearError();
          start(onTranscript, { continuous: true });
        },
        children: [
          /* @__PURE__ */ jsx(Mic, { size: 18 }),
          busy ? "Filling in…" : "Speak product details",
          !aiOn && /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1 text-[11px] font-bold text-gold-ink", children: [
            /* @__PURE__ */ jsx(Lock, { size: 11 }),
            " Plus fills every field"
          ] })
        ]
      }
    ),
    error ? /* @__PURE__ */ jsx("p", { className: "text-bad text-[13px] mt-1.5 mb-0", children: DICTATION_ERROR_TEXT[error] }) : /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[12px] mt-1.5 mb-0 text-center", children: "e.g. “Redken Shades EQ 9V, two ounce, color, we have six, costs eight fifty, sells for nineteen”" })
  ] });
}
const NOISE = /* @__PURE__ */ new Set(["gm", "the", "and", "oz", "ml", "fl", "sm", "lg", "refill", "new"]);
function words(p) {
  return new Set(
    `${p.brand} ${p.name}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length > 1 && !NOISE.has(w))
  );
}
function likeness(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.max(a.size, b.size);
}
function MergePanel({
  product,
  products,
  onMerge
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const options = useMemo(() => {
    const mine = words(product);
    const q = query.trim().toLowerCase();
    return products.filter((p) => p.id !== product.id).filter((p) => !q || `${p.brand} ${p.name} ${p.barcode}`.toLowerCase().includes(q)).map((p) => ({ p, score: likeness(mine, words(p)) })).filter((o) => q || o.score > 0).sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name)).slice(0, 8).map((o) => o.p);
  }, [product, products, query]);
  if (!open) {
    return /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-text btn-sm mt-3", onClick: () => setOpen(true), children: [
      /* @__PURE__ */ jsx(GitMerge, { size: 16 }),
      "Duplicate? Merge into another product"
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-3 mt-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold m-0", children: "Which product is this really?" }),
    /* @__PURE__ */ jsxs("p", { className: "text-[12px] text-ink-2 m-0 mt-0.5 mb-2", children: [
      product.name,
      " will be folded into the one you pick: its barcode, Square link and sales history move over, the product you pick keeps its own count, and this copy is removed."
    ] }),
    /* @__PURE__ */ jsxs("label", { className: "relative block mb-2", children: [
      /* @__PURE__ */ jsx(Search, { size: 15, className: "absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "field-input !pl-9",
          placeholder: "Search products",
          value: query,
          onChange: (e) => {
            setQuery(e.target.value);
            setTarget(null);
          }
        }
      )
    ] }),
    options.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-[13px] text-ink-2 m-0", children: "No close matches. Search by name, brand or barcode." }) : /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-1.5", children: options.map((p) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "chip !justify-start !text-left !rounded-xl !px-3 !py-2",
        "aria-pressed": target?.id === p.id,
        onClick: () => setTarget(p),
        children: /* @__PURE__ */ jsxs("span", { className: "flex flex-col", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold", children: p.name }),
          /* @__PURE__ */ jsx("span", { className: `text-[12px] font-normal ${target?.id === p.id ? "text-white/70" : "text-ink-2"}`, children: [p.brand, p.category, `${p.qty} on hand`].filter(Boolean).join(" · ") })
        ] })
      },
      p.id
    )) }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-2 mb-0", children: error }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "btn btn-tonal btn-sm",
          onClick: () => {
            setOpen(false);
            setTarget(null);
            setError("");
          },
          children: "Cancel"
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "btn btn-primary btn-sm",
          disabled: !target || merging,
          onClick: async () => {
            if (!target) return;
            setMerging(true);
            setError("");
            try {
              await onMerge(target);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not merge. Try again.");
              setMerging(false);
            }
          },
          children: [
            /* @__PURE__ */ jsx(GitMerge, { size: 15 }),
            merging ? "Merging…" : target ? `Merge into ${target.name}` : "Pick a product"
          ]
        }
      )
    ] })
  ] });
}
function ProductForm({
  product,
  initialBarcode = "",
  initialDetails,
  barcodeLocked = false,
  autoLookup = false,
  products,
  saveLabel,
  qtyLabel = "On hand",
  onCancel,
  onSave,
  onDelete,
  onMerge
}) {
  const [barcode, setBarcode] = useState(product?.barcode ?? initialBarcode);
  const [extraBarcodes, setExtraBarcodes] = useState(product?.extraBarcodes ?? []);
  const [extraDraft, setExtraDraft] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [name, setName] = useState(product?.name ?? initialDetails?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? initialDetails?.brand ?? "");
  const [vendor, setVendor] = useState(product?.vendor ?? "");
  const [category, setCategory] = useState(product?.category ?? initialDetails?.category ?? "");
  const [size, setSize] = useState(product?.size ?? initialDetails?.size ?? "");
  const [qty, setQty] = useState(String(product?.qty ?? 0));
  const [par, setPar] = useState(String(product?.reorderThreshold ?? DEFAULT_REORDER_THRESHOLD));
  const [maxQty, setMaxQty] = useState(product?.maxQty ? String(product.maxQty) : "");
  const [packSize, setPackSize] = useState(product && product.packSize > 1 ? String(product.packSize) : "");
  const [expiresOn, setExpiresOn] = useState(product?.expiresOn ?? "");
  const [expiryMode, setExpiryMode] = useState(
    product?.expiresOn === "none" ? "none" : product?.expiresOn ? "date" : "unset"
  );
  const [cost, setCost] = useState(product?.unitCostCents ? centsToDollars(product.unitCostCents) : "");
  const [retail, setRetail] = useState(product?.retailPriceCents ? centsToDollars(product.retailPriceCents) : "");
  const [price, setPrice] = useState({ kind: "idle" });
  const [webPrice, setWebPrice] = useState({ kind: "idle" });
  const priceDaysOld = product ? daysBetween(product.priceUpdatedAt ?? product.createdAt) : 0;
  const priceStale = Boolean(product) && (priceDaysOld >= PRICE_STALE_DAYS || !product?.unitCostCents);
  const autoPriced = useRef(Boolean(product));
  const { type, categories: savedCategories, onCategories, can } = useBusiness();
  const aiOn = can("ai");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const offeredCategories = useRef(false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [prefill, setPrefill] = useState({ kind: "none" });
  const [reading, setReading] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef(null);
  const nameRef = useRef(null);
  const retailRef = useRef(null);
  const others = useMemo(() => products.filter((p) => p.id !== product?.id), [products, product]);
  const canCopy = !product && others.length > 0;
  const [copyOpen, setCopyOpen] = useState(false);
  const [copiedFrom, setCopiedFrom] = useState(null);
  const [similarDismissed, setSimilarDismissed] = useState(false);
  const offeredCopy = useRef(false);
  const brands = useMemo(() => uniq(products.map((p) => p.brand)), [products]);
  const vendors = useMemo(() => uniq(products.map((p) => p.vendor)), [products]);
  const categories = useMemo(
    () => uniq([...savedCategories.map((c) => c.name), ...products.map((p) => p.category)]),
    [products, savedCategories]
  );
  const sizes = useMemo(() => uniq([...products.map((p) => p.size), ...type.sizes]), [products, type]);
  const names = useMemo(() => {
    const b = brand.trim().toLowerCase();
    const sameBrand = b ? products.filter((p) => p.brand.toLowerCase() === b) : [];
    return uniq([...sameBrand.map((p) => p.name), ...products.map((p) => p.name)]);
  }, [products, brand]);
  const context = useMemo(() => ({ name, brand, category, size, vendor }), [name, brand, category, size, vendor]);
  const costOptions = useMemo(
    () => predictPrices(others, "unitCostCents", {
      ...context,
      otherCents: Math.round((Number(retail) || 0) * 100)
    }),
    [others, context, retail]
  );
  const retailOptions = useMemo(
    () => predictPrices(others, "retailPriceCents", {
      ...context,
      otherCents: Math.round((Number(cost) || 0) * 100)
    }),
    [others, context, cost]
  );
  const similar = useMemo(() => {
    if (!canCopy || copiedFrom || similarDismissed || category && cost) return null;
    const match = bestSimilarEntry(others, { name, brand });
    return match && match.name.toLowerCase() !== name.trim().toLowerCase() ? match : null;
  }, [canCopy, copiedFrom, similarDismissed, others, name, brand, category, cost]);
  const quickCategories = useMemo(() => {
    const used = /* @__PURE__ */ new Map();
    for (const p of products) if (p.category) used.set(p.category.toLowerCase(), (used.get(p.category.toLowerCase()) ?? 0) + 1);
    return [...savedCategories].sort((a, b) => (used.get(b.name.toLowerCase()) ?? 0) - (used.get(a.name.toLowerCase()) ?? 0) || a.name.localeCompare(b.name)).map((c) => c.name);
  }, [products, savedCategories]);
  const savedCategory = findCategory(savedCategories, category);
  const productCategoryNames = useMemo(() => products.map((p) => p.category), [products]);
  function maybeOfferCategories() {
    if (offeredCategories.current || savedCategories.length > 0) return;
    offeredCategories.current = true;
    setCategoryOpen(true);
  }
  const [newCategoryGroup, setNewCategoryGroup] = useState("");
  const guessedGroup = guessTaxGroup(category, categorySuggestionsFor(type.id), savedCategories);
  const chosenGroup = newCategoryGroup || guessedGroup;
  async function saveTypedCategory() {
    const name2 = category.trim();
    if (!name2) return;
    const taxGroup = chosenGroup;
    setNewCategoryGroup("");
    try {
      onCategories(await saveProductCategories({ data: { items: [{ name: name2, taxGroup }] } }));
    } catch {
      setError("Could not add that category. Try again.");
    }
  }
  function vendorFor(b) {
    const match = products.find((p) => p.vendor && p.brand.toLowerCase() === b.trim().toLowerCase());
    return match?.vendor ?? "";
  }
  function copyFromExisting(pickedName) {
    const match = products.find((p) => p.name.toLowerCase() === pickedName.toLowerCase() && p.id !== product?.id);
    if (!match) return;
    setBrand((v) => v || match.brand);
    setCategory((v) => v || match.category);
    setSize((v) => v || match.size);
    setVendor((v) => v || match.vendor);
    setPar((v) => product ? v : String(match.reorderThreshold));
    setPackSize((v) => v || (match.packSize > 1 ? String(match.packSize) : ""));
    setCost((v) => v || (match.unitCostCents ? centsToDollars(match.unitCostCents) : ""));
    setRetail((v) => v || (match.retailPriceCents ? centsToDollars(match.retailPriceCents) : ""));
    if (match.unitCostCents || match.retailPriceCents) autoPriced.current = true;
    if (!product) setCopiedFrom(match);
  }
  function copyEntry(match) {
    setBrand(match.brand);
    setCategory(match.category);
    setSize(match.size);
    setVendor(match.vendor);
    setPar(String(match.reorderThreshold));
    setCost(match.unitCostCents ? centsToDollars(match.unitCostCents) : "");
    setRetail(match.retailPriceCents ? centsToDollars(match.retailPriceCents) : "");
    autoPriced.current = true;
    if (match.unitCostCents || match.retailPriceCents) {
      setPrice({ kind: "done", note: `Prices copied from ${match.name}.` });
    }
    setCopiedFrom(match);
    setCopyOpen(false);
    if (!name.trim()) setTimeout(() => nameRef.current?.querySelector("input")?.focus(), 250);
  }
  function offerCopy() {
    if (!canCopy || offeredCopy.current) return;
    offeredCopy.current = true;
    try {
      if (localStorage.getItem(COPY_PROMPT_OFF_KEY) === "1") return;
    } catch {
    }
    setTimeout(() => setCopyOpen(true), 250);
  }
  async function estimatePrice(force, fields = { brand, name, size, category, vendor }) {
    if (!fields.name.trim() && !fields.brand.trim()) {
      return;
    }
    autoPriced.current = true;
    setPrice({ kind: "loading" });
    try {
      const r = await suggestProduct({ data: fields });
      if (!r.ok) {
        setPrice({ kind: "error", message: r.message });
        return;
      }
      setBrand((v) => v || r.brand);
      setSize((v) => v || r.size);
      setCategory((v) => v || r.category);
      if (r.unitCostCents) setCost((v) => force || !v ? centsToDollars(r.unitCostCents) : v);
      if (r.retailPriceCents) setRetail((v) => force || !v ? centsToDollars(r.retailPriceCents) : v);
      setPrice({
        kind: "done",
        note: r.unitCostCents || r.retailPriceCents ? r.note || "AI estimate. Adjust to your invoice." : "No confident price for this one. Enter it from your invoice."
      });
    } catch {
      setPrice({ kind: "error", message: "Price estimate failed. Check your connection." });
    }
  }
  async function findWebPrice() {
    if (!name.trim()) {
      setWebPrice({ kind: "done", result: { ok: false, message: "Type a product name first." } });
      return;
    }
    setWebPrice({ kind: "loading" });
    try {
      const result = await checkWebPrice({
        data: { productId: product?.id, name, brand, size, category, vendor, barcode }
      });
      if (result.ok) {
        if (result.unitCostCents) setCost(centsToDollars(result.unitCostCents));
        if (result.retailPriceCents) setRetail(centsToDollars(result.retailPriceCents));
      }
      setWebPrice({ kind: "done", result });
    } catch {
      setWebPrice({ kind: "done", result: { ok: false, message: "Couldn't reach the price search. Try again in a minute." } });
    }
  }
  async function keepPrices() {
    if (!product) return;
    try {
      await confirmPrices({ data: { productId: product.id } });
      setWebPrice({ kind: "confirmed" });
    } catch {
      setWebPrice({ kind: "done", result: { ok: false, message: "Couldn't save that. Try again." } });
    }
  }
  function maybeAutoPrice(fields) {
    if (autoPriced.current || cost || retail) return;
    const f = fields ?? { brand, name, size, category, vendor };
    if (f.name.trim().length < 3) return;
    if (aiOn) estimatePrice(false, f);
  }
  function applyDetails(d) {
    setBrand((v) => v || d.brand);
    setName((v) => v || d.name);
    setSize((v) => v || d.size);
    setCategory((v) => v || d.category);
    if (d.imageUrl) setImageUrl((v) => v || d.imageUrl);
    setVendor((v) => v || vendorFor(d.brand));
  }
  async function runLookup(code) {
    if (!code.trim()) return;
    setPrefill({ kind: "loading" });
    try {
      const r = await lookupBarcodeDetails({ data: { barcode: code } });
      if (r.found) {
        applyDetails(r);
        setPrefill({ kind: "found", note: `Found in ${r.source}. Check the details, then save.` });
        maybeAutoPrice({
          brand: brand || r.brand,
          name: name || r.name,
          size: size || r.size,
          category: category || r.category,
          vendor
        });
      } else {
        setPrefill({ kind: "miss" });
      }
    } catch {
      setPrefill({ kind: "miss" });
    }
    offerCopy();
  }
  useEffect(() => {
    if (autoLookup) runLookup(barcode);
    else offerCopy();
  }, []);
  async function onLabelFile(file) {
    setReading(true);
    setError("");
    try {
      const image = await shrinkImage(file);
      const r = await readLabelPhoto({ data: { image, mediaType: "image/jpeg" } });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      if (r.brand) setBrand(r.brand);
      if (r.name) setName(r.name);
      if (r.size) setSize(r.size);
      if (r.category) setCategory((v) => v || r.category);
      setVendor((v) => v || vendorFor(r.brand));
      setPrefill({ kind: "found", note: "Read from your photo. Check it before saving." });
      maybeAutoPrice({
        brand: r.brand || brand,
        name: r.name || name,
        size: r.size || size,
        category: category || r.category,
        vendor
      });
    } catch {
      setError("That photo could not be opened. Try another one.");
    } finally {
      setReading(false);
    }
  }
  async function onSpoken(transcript) {
    setError("");
    if (!aiOn) {
      setName(transcript.charAt(0).toUpperCase() + transcript.slice(1));
      setPrefill({ kind: "found", note: "Heard you. Bintro Plus also picks out brand, size and prices." });
      return;
    }
    setHearing(true);
    try {
      const r = await readSpokenProduct({ data: { transcript } });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      if (r.brand) setBrand(r.brand);
      if (r.name) setName(r.name);
      if (r.size) setSize(r.size);
      if (r.category) setCategory(r.category);
      if (r.vendor) setVendor(r.vendor);
      else setVendor((v) => v || vendorFor(r.brand || brand));
      if (r.qty !== null) setQty(String(r.qty));
      if (r.par !== null) setPar(String(r.par));
      if (r.unitCostCents) setCost(centsToDollars(r.unitCostCents));
      if (r.retailPriceCents) setRetail(centsToDollars(r.retailPriceCents));
      if (r.unitCostCents || r.retailPriceCents) autoPriced.current = true;
      setPrefill({ kind: "found", note: `Heard: “${transcript}”. Check it before saving.` });
      maybeAutoPrice({
        brand: r.brand || brand,
        name: r.name || name,
        size: r.size || size,
        category: r.category || category,
        vendor: r.vendor || vendor
      });
    } catch {
      setError("Couldn't fill that in. Check your connection and try again.");
    } finally {
      setHearing(false);
    }
  }
  function pendingExtras() {
    const draft = extraDraft.trim();
    return draft && !extraBarcodes.includes(draft) ? [...extraBarcodes, draft] : extraBarcodes;
  }
  function addExtra() {
    const code = extraDraft.trim();
    if (!code) return;
    if (code === barcode.trim() || extraBarcodes.includes(code)) {
      setError("This product already scans with that code.");
      return;
    }
    const owner = products.find((p) => p.id !== product?.id && (p.barcode === code || p.extraBarcodes?.includes(code)));
    if (owner) {
      setError(`That code already belongs to ${owner.name}.`);
      return;
    }
    setError("");
    setExtraBarcodes([...extraBarcodes, code]);
    setExtraDraft("");
  }
  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Add a product name to save.");
      return;
    }
    if (!barcode.trim()) {
      setError("Add a barcode to save.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        barcode: barcode.trim(),
        name: name.trim(),
        brand: brand.trim(),
        vendor: vendor.trim(),
        category: category.trim(),
        size: size.trim(),
        qty: Math.trunc(Number(qty) || 0),
        reorderThreshold: Math.max(0, Math.trunc(Number(par) || 0)),
        maxQty: Math.max(0, Math.trunc(Number(maxQty) || 0)),
        packSize: Math.max(1, Math.trunc(Number(packSize) || 1)),
        expiresOn: expiryMode === "none" ? "none" : expiryMode === "date" && isExpiryDate(expiresOn) ? expiresOn : "",
        unitCostCents: Math.max(0, Math.round((Number(cost) || 0) * 100)),
        retailPriceCents: Math.max(0, Math.round((Number(retail) || 0) * 100)),
        imageUrl,
        extraBarcodes: pendingExtras().filter((c) => c !== barcode.trim())
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /unique|duplicate/i.test(message) ? "Another product already uses that barcode." : "Could not save. Check your connection and try again."
      );
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: submit, noValidate: true, children: [
    prefill.kind === "loading" && /* @__PURE__ */ jsxs("div", { className: "flex gap-3 items-center bg-surface rounded-2xl p-3 mb-4", children: [
      /* @__PURE__ */ jsx(Thumb, { label: "", size: "lg" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("div", { className: "skel w-[70%]" }),
        /* @__PURE__ */ jsx("div", { className: "skel w-[45%]" })
      ] })
    ] }),
    prefill.kind === "found" && /* @__PURE__ */ jsxs("div", { className: "flex gap-3 items-center bg-surface rounded-2xl p-3 mb-4", children: [
      /* @__PURE__ */ jsx(Thumb, { imageUrl, label: brand || name, size: "lg" }),
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 text-sm", children: [
        /* @__PURE__ */ jsx("b", { className: "block truncate", children: name || "Product" }),
        /* @__PURE__ */ jsx("p", { className: "m-0 text-ink-2 truncate", children: [brand, size].filter(Boolean).join(", ") }),
        /* @__PURE__ */ jsx("p", { className: "m-0 text-ink-2", children: prefill.note })
      ] })
    ] }),
    prefill.kind === "miss" && /* @__PURE__ */ jsxs("div", { className: "bg-warn-tint rounded-2xl p-3 mb-4 text-sm", children: [
      /* @__PURE__ */ jsx("b", { children: "No match in the barcode databases." }),
      " Snap the front label and Bintro fills this in for you."
    ] }),
    /* @__PURE__ */ jsx(SpeakDetails, { aiOn, busy: hearing, onTranscript: onSpoken }),
    /* @__PURE__ */ jsxs("div", { className: `grid gap-2 mb-4 ${canCopy ? "grid-cols-2" : ""}`, children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "btn btn-tonal !px-3",
          disabled: reading || !aiOn,
          title: aiOn ? void 0 : "AI label reading comes with Bintro Plus",
          onClick: () => {
            if (fileRef.current) fileRef.current.value = "";
            fileRef.current?.click();
          },
          children: [
            aiOn ? /* @__PURE__ */ jsx(Camera, { size: 18 }) : /* @__PURE__ */ jsx(Lock, { size: 16 }),
            reading ? "Reading…" : canCopy ? "Label photo" : "Fill in from a label photo",
            !aiOn && /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold text-gold-ink", children: "Plus" })
          ]
        }
      ),
      canCopy && /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal !px-3", onClick: () => setCopyOpen(true), children: [
        /* @__PURE__ */ jsx(Copy, { size: 18 }),
        "Copy previous"
      ] })
    ] }),
    copiedFrom && /* @__PURE__ */ jsxs("div", { className: "flex gap-3 items-center bg-good-tint rounded-2xl p-3 mb-4", children: [
      /* @__PURE__ */ jsx(Thumb, { imageUrl: copiedFrom.imageUrl, label: copiedFrom.brand || copiedFrom.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-sm", children: [
        /* @__PURE__ */ jsxs("b", { className: "block truncate", children: [
          "Copied from ",
          copiedFrom.name
        ] }),
        /* @__PURE__ */ jsx("p", { className: "m-0 text-ink-2", children: "Change anything that’s different, then save." })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm shrink-0", onClick: () => setCopyOpen(true), children: "Change" })
    ] }),
    similar && /* @__PURE__ */ jsxs("div", { className: "flex gap-3 items-center bg-action-tint rounded-2xl p-3 mb-4", children: [
      /* @__PURE__ */ jsx(Thumb, { imageUrl: similar.imageUrl, label: similar.brand || similar.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-sm", children: [
        /* @__PURE__ */ jsxs("b", { className: "block", children: [
          "Looks like ",
          similar.name
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "m-0 text-ink-2 truncate", children: [
          "Copy its ",
          [similar.category, similar.size, similar.unitCostCents ? "prices" : ""].filter(Boolean).join(", ") || "details",
          "?"
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm shrink-0", onClick: () => copyEntry(similar), children: "Copy" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          "aria-label": "No thanks",
          className: "w-9 h-9 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-white shrink-0",
          onClick: () => setSimilarDismissed(true),
          children: /* @__PURE__ */ jsx(X, { size: 16 })
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: fileRef,
        type: "file",
        accept: "image/*",
        capture: "environment",
        hidden: true,
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) onLabelFile(file);
        }
      }
    ),
    /* @__PURE__ */ jsx(Field, { label: "Product name", htmlFor: "pf-name", children: /* @__PURE__ */ jsxs("div", { ref: nameRef, className: "flex gap-2 [&>:first-child]:flex-1 [&>:first-child]:min-w-0", children: [
      /* @__PURE__ */ jsx(
        AutoInput,
        {
          id: "pf-name",
          value: name,
          onChange: setName,
          onPick: copyFromExisting,
          suggestions: names,
          placeholder: copiedFrom ? `e.g. ${copiedFrom.name}` : "Start typing — Bintro suggests as you go",
          onBlur: () => setTimeout(() => maybeAutoPrice(), 150)
        }
      ),
      /* @__PURE__ */ jsx(MicButton, { label: "product name", onText: setName })
    ] }) }),
    /* @__PURE__ */ jsx(Field, { label: "Brand", htmlFor: "pf-brand", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 [&>:first-child]:flex-1 [&>:first-child]:min-w-0", children: [
      /* @__PURE__ */ jsx(
        AutoInput,
        {
          id: "pf-brand",
          value: brand,
          onChange: setBrand,
          onPick: (b) => setVendor((v) => v || vendorFor(b)),
          suggestions: brands,
          onBlur: () => setVendor((v) => v || vendorFor(brand))
        }
      ),
      /* @__PURE__ */ jsx(
        MicButton,
        {
          label: "brand",
          onText: (b) => {
            setBrand(b);
            setVendor((v) => v || vendorFor(b));
          }
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx(Field, { label: "Category", htmlFor: "pf-category", children: /* @__PURE__ */ jsx("div", { onFocus: maybeOfferCategories, children: /* @__PURE__ */ jsx(AutoInput, { id: "pf-category", value: category, onChange: setCategory, suggestions: categories }) }) }),
    quickCategories.length === 0 ? /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "w-full flex items-center gap-3 text-left rounded-2xl border border-dashed border-line bg-white px-3.5 py-2.5 -mt-1.5 mb-3 cursor-pointer hover:bg-surface",
        onClick: () => setCategoryOpen(true),
        children: [
          /* @__PURE__ */ jsx(Tags, { size: 18, className: "text-action shrink-0" }),
          /* @__PURE__ */ jsxs("span", { className: "text-[13px]", children: [
            /* @__PURE__ */ jsxs("b", { className: "block text-ink", children: [
              "Set up categories for your ",
              type.label.toLowerCase()
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "Pick from common ones, filed the way your accountant books them." })
          ] })
        ]
      }
    ) : /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5 overflow-x-auto -mt-1.5 mb-1.5 pb-0.5", role: "group", "aria-label": "Your categories", children: [
      quickCategories.map((o) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "chip !px-2.5 !py-1 !text-[13px]",
          "aria-pressed": category.trim().toLowerCase() === o.toLowerCase(),
          onClick: () => setCategory(o),
          children: o
        },
        o
      )),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "chip !px-2.5 !py-1 !text-[13px] inline-flex items-center gap-1 !border-dashed !text-action",
          onClick: () => setCategoryOpen(true),
          children: [
            /* @__PURE__ */ jsx(Plus, { size: 14 }),
            "Add"
          ]
        }
      )
    ] }),
    category.trim() && /* @__PURE__ */ jsx("p", { className: "text-[12px] text-ink-2 m-0 mb-3", children: savedCategory ? /* @__PURE__ */ jsxs(Fragment, { children: [
      "Booked as ",
      /* @__PURE__ */ jsx("b", { className: "text-ink", children: taxGroupById(savedCategory.taxGroup).label }),
      " ",
      /* @__PURE__ */ jsxs("span", { className: "font-semibold", children: [
        "(",
        taxKind(taxGroupById(savedCategory.taxGroup)),
        ")"
      ] }),
      " ·",
      " ",
      taxGroupById(savedCategory.taxGroup).taxLine
    ] }) : /* @__PURE__ */ jsxs("span", { className: "flex flex-col gap-1.5", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        "“",
        category.trim(),
        "” is new. Choose how your accountant should book it:"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          "select",
          {
            "aria-label": "Tax group for the new category",
            className: "field-input !w-auto !py-1.5 !text-[13px]",
            value: chosenGroup,
            onChange: (e) => setNewCategoryGroup(e.target.value),
            children: TAX_GROUPS.map((g) => /* @__PURE__ */ jsxs("option", { value: g.id, children: [
              g.label,
              " (",
              taxKind(g),
              ")"
            ] }, g.id))
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal btn-sm", onClick: saveTypedCategory, children: "Add category" })
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        taxGroupById(chosenGroup).why,
        " ",
        taxGroupById(chosenGroup).taxLine
      ] })
    ] }) }),
    quickCategories.length > 0 && !category.trim() && /* @__PURE__ */ jsx("div", { className: "mb-3" }),
    /* @__PURE__ */ jsx(Field, { label: "Size", htmlFor: "pf-size", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 [&>:first-child]:flex-1 [&>:first-child]:min-w-0", children: [
      /* @__PURE__ */ jsx(AutoInput, { id: "pf-size", value: size, onChange: setSize, suggestions: sizes, placeholder: type.sizes[0] }),
      /* @__PURE__ */ jsx(MicButton, { label: "size", onText: setSize })
    ] }) }),
    /* @__PURE__ */ jsx(QuickChips, { label: "Common sizes", options: type.sizes, value: size, onPick: setSize }),
    /* @__PURE__ */ jsx(Field, { label: "Buy it from", htmlFor: "pf-vendor", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2 [&>:first-child]:flex-1 [&>:first-child]:min-w-0", children: [
      /* @__PURE__ */ jsx(
        AutoInput,
        {
          id: "pf-vendor",
          value: vendor,
          onChange: setVendor,
          suggestions: vendors,
          placeholder: type.vendorExample
        }
      ),
      /* @__PURE__ */ jsx(MicButton, { label: "supplier", onText: setVendor })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-3 mb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 mb-2 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "text-[13px] font-semibold text-ink-2 mr-auto", children: "Pricing" }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "btn btn-text btn-sm !py-1.5",
            disabled: webPrice.kind === "loading" || !aiOn,
            onClick: findWebPrice,
            title: aiOn ? "Checks your supplier first, then professional distributors, then the brand — never eBay-style resellers" : "AI price checks come with Bintro Plus",
            children: [
              aiOn ? /* @__PURE__ */ jsx(Sparkles, { size: 16 }) : /* @__PURE__ */ jsx(Lock, { size: 14 }),
              webPrice.kind === "loading" ? "Checking distributors…" : "AI price check"
            ]
          }
        )
      ] }),
      priceStale && webPrice.kind === "idle" && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[13px] rounded-xl bg-gold-tint text-gold-ink px-3 py-2", children: [
        product?.unitCostCents ? `Prices last updated ${product.priceUpdatedAt ? `${priceDaysOld} days ago` : "a while ago"}. Check they're still right.` : "No cost saved yet — add it so orders and budgets are accurate.",
        product?.unitCostCents ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm !py-0 !px-1.5 !text-gold-ink underline", onClick: keepPrices, children: "Still right" }) : null
      ] }),
      webPrice.kind === "confirmed" && /* @__PURE__ */ jsx("p", { className: "m-0 mb-2 text-[13px] text-good font-semibold", children: "Prices marked as up to date." }),
      webPrice.kind === "loading" && /* @__PURE__ */ jsx("p", { className: "m-0 mb-2 text-[13px] text-ink-2", children: "Checking manufacturer, distributor and Amazon listings — up to a minute." }),
      webPrice.kind === "done" && !webPrice.result.ok && /* @__PURE__ */ jsx("p", { className: "m-0 mb-2 text-[13px] text-bad", children: webPrice.result.message }),
      webPrice.kind === "done" && webPrice.result.ok && /* @__PURE__ */ jsxs("div", { className: "mb-2 rounded-xl border border-gold/40 bg-gold-tint px-3 py-2 text-[13px]", children: [
        /* @__PURE__ */ jsxs("b", { className: "text-gold-ink", children: [
          WEB_PRICE_SOURCE_LABELS[webPrice.result.sourceType],
          webPrice.result.sourceName && webPrice.result.sourceType !== "estimate" ? ` · ${webPrice.result.sourceName}` : ""
        ] }),
        webPrice.result.sourceUrl && /* @__PURE__ */ jsxs(
          "a",
          {
            href: webPrice.result.sourceUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "ml-2 inline-flex items-center gap-1 text-action font-medium",
            children: [
              "View listing ",
              /* @__PURE__ */ jsx(ExternalLink, { size: 12 })
            ]
          }
        ),
        webPrice.result.note && /* @__PURE__ */ jsx("span", { className: "block text-ink-2 mt-0.5", children: webPrice.result.note }),
        /* @__PURE__ */ jsx("span", { className: "block text-ink-2 mt-0.5", children: "Filled in below — adjust to your invoice, then save." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
        /* @__PURE__ */ jsx(Field, { label: "Your cost", htmlFor: "pf-cost", children: /* @__PURE__ */ jsx(
          PriceInput,
          {
            id: "pf-cost",
            placeholder: price.kind === "loading" ? "…" : "0.00",
            value: cost,
            onChange: setCost,
            onPick: () => setTimeout(() => retailRef.current?.focus(), 0),
            suggestions: costOptions
          }
        ) }),
        /* @__PURE__ */ jsx(Field, { label: "Sells for", htmlFor: "pf-retail", children: /* @__PURE__ */ jsx(
          PriceInput,
          {
            ref: retailRef,
            id: "pf-retail",
            align: "right",
            placeholder: price.kind === "loading" ? "…" : "Not sold",
            value: retail,
            onChange: setRetail,
            suggestions: retailOptions
          }
        ) })
      ] }),
      /* @__PURE__ */ jsx(PriceNote, { cost, retail, state: price })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
      /* @__PURE__ */ jsx(Field, { label: qtyLabel, htmlFor: "pf-qty", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-qty",
          className: "field-input num",
          type: "number",
          inputMode: "numeric",
          value: qty,
          onChange: (e) => setQty(e.target.value)
        }
      ) }),
      /* @__PURE__ */ jsx(Field, { label: "Reorder at", htmlFor: "pf-par", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-par",
          className: "field-input num",
          type: "number",
          inputMode: "numeric",
          min: 0,
          value: par,
          onChange: (e) => setPar(e.target.value)
        }
      ) })
    ] }),
    product && /* @__PURE__ */ jsx("p", { className: "m-0 -mt-1 text-[12px] text-ink-2", children: lastCountedLabel(product) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsx(Field, { label: "Order up to", htmlFor: "pf-max", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-max",
          className: "field-input num",
          type: "number",
          inputMode: "numeric",
          min: 0,
          placeholder: "Same as reorder",
          value: maxQty,
          onChange: (e) => setMaxQty(e.target.value)
        }
      ) }),
      /* @__PURE__ */ jsx(Field, { label: "Case pack", htmlFor: "pf-pack", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-pack",
          className: "field-input num",
          type: "number",
          inputMode: "numeric",
          min: 1,
          placeholder: "1 (single units)",
          value: packSize,
          onChange: (e) => setPackSize(e.target.value)
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs(Field, { label: "Expires", htmlFor: "pf-expiry", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", role: "group", "aria-label": "Expiry", children: [
        SHELF_LIFE_OPTIONS.map((m) => {
          const date = monthsFromToday(m);
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "chip",
              "aria-pressed": expiryMode === "date" && expiresOn === date,
              onClick: () => {
                setExpiryMode("date");
                setExpiresOn(date);
              },
              children: [
                m,
                " months"
              ]
            },
            m
          );
        }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "chip",
            "aria-pressed": expiryMode === "none",
            onClick: () => {
              setExpiryMode("none");
              setExpiresOn("none");
            },
            children: "No expiration"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-expiry",
          type: "date",
          className: "field-input mt-2",
          value: expiryMode === "date" ? expiresOn : "",
          onChange: (e) => {
            setExpiresOn(e.target.value);
            setExpiryMode(e.target.value ? "date" : "unset");
          },
          "aria-label": "Or enter the expiry date"
        }
      ),
      /* @__PURE__ */ jsxs("span", { className: "block mt-1 text-[12px] text-ink-2", children: [
        expiryMode === "none" ? "Marked as doesn't expire." : expiryMode === "date" && isExpiryDate(expiresOn) ? `Expires ${expiryLabel(expiresOn)}. Months count from today, or type the date printed on the product.` : "Tap a shelf life (counted from today) or enter the date printed on the product.",
        expiryMode !== "unset" && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "ml-2 border-0 bg-transparent p-0 text-action font-semibold cursor-pointer text-[12px]",
            onClick: () => {
              setExpiryMode("unset");
              setExpiresOn("");
            },
            children: "Clear"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "m-0 -mt-1 text-[12px] text-ink-2", children: "Reorder at: when to order. Order up to: the most worth having on your shelf, so orders refill to here. Case pack: how many come in a case (e.g. 12 wine, 24 sparkling water); orders round up to full cases. Smart par can set these for you." }),
    barcodeLocked ? /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm m-0", children: [
      "Barcode ",
      barcode
    ] }) : /* @__PURE__ */ jsx(Field, { label: "Barcode or SKU", htmlFor: "pf-barcode", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "pf-barcode",
          className: "field-input",
          autoComplete: "off",
          value: barcode,
          onChange: (e) => setBarcode(e.target.value)
        }
      ),
      !product && barcode.trim() && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "btn btn-tonal btn-sm shrink-0",
          disabled: prefill.kind === "loading",
          onClick: () => runLookup(barcode),
          children: "Look up"
        }
      ),
      !barcode.trim() && /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "btn btn-tonal btn-sm shrink-0",
          onClick: () => setBarcode(makeSku(products)),
          title: "For items without a barcode, like house-made or loose stock",
          children: [
            /* @__PURE__ */ jsx(Wand2, { size: 16 }),
            "Make one"
          ]
        }
      )
    ] }) }),
    product && /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
      extraBarcodes.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mb-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] font-semibold m-0 mb-1.5", children: "Also scans as" }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: extraBarcodes.map((code) => /* @__PURE__ */ jsxs("span", { className: "chip", children: [
          code,
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "-mr-1 p-0.5 text-ink-2",
              "aria-label": `Remove ${code}`,
              onClick: () => setExtraBarcodes(extraBarcodes.filter((c) => c !== code)),
              children: /* @__PURE__ */ jsx(X, { size: 14 })
            }
          )
        ] }, code)) })
      ] }),
      extraOpen ? /* @__PURE__ */ jsx(Field, { label: "Additional barcode or SKU", htmlFor: "pf-extra-barcode", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "pf-extra-barcode",
            className: "field-input",
            autoComplete: "off",
            autoFocus: true,
            placeholder: "Scan with a wand or type it",
            value: extraDraft,
            onChange: (e) => setExtraDraft(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExtra();
              }
            }
          }
        ),
        extraDraft.trim() ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal btn-sm shrink-0", onClick: addExtra, children: "Add" }) : /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "btn btn-tonal btn-sm shrink-0",
            onClick: () => setExtraDraft(makeSku(products)),
            title: "Make an internal code, e.g. for a refill or bundle",
            children: [
              /* @__PURE__ */ jsx(Wand2, { size: 16 }),
              "Make one"
            ]
          }
        )
      ] }) }) : /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-text btn-sm", onClick: () => setExtraOpen(true), children: [
        /* @__PURE__ */ jsx(Plus, { size: 16 }),
        "Add another SKU"
      ] })
    ] }),
    product && onMerge && /* @__PURE__ */ jsx(MergePanel, { product, products, onMerge }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: error }),
    confirmDelete && !deleting && /* @__PURE__ */ jsxs("p", { className: "text-bad text-sm mt-3 mb-0", children: [
      "Deleting removes ",
      product?.name || "this product",
      " and its scan history for good. Tap again to confirm."
    ] }),
    /* @__PURE__ */ jsxs(SheetActions, { children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onCancel, children: "Cancel" }),
      onDelete && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: `btn ${confirmDelete ? "bg-bad text-white" : "bg-bad-tint text-bad"}`,
          disabled: saving || deleting,
          onClick: async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            setDeleting(true);
            setError("");
            try {
              await onDelete();
            } catch {
              setError("Could not delete this product. Try again.");
              setDeleting(false);
              setConfirmDelete(false);
            }
          },
          onBlur: () => !deleting && setConfirmDelete(false),
          children: deleting ? "Deleting…" : confirmDelete ? "Tap to confirm" : "Delete"
        }
      ),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving || deleting, children: saving ? "Saving…" : saveLabel })
    ] }),
    /* @__PURE__ */ jsx(
      CategorySetupSheet,
      {
        open: categoryOpen,
        onClose: () => setCategoryOpen(false),
        productCategories: productCategoryNames,
        onSaved: (added) => {
          if (!category.trim() && added.length === 1) setCategory(added[0]);
        }
      }
    ),
    canCopy && /* @__PURE__ */ jsx(
      CopyPreviousSheet,
      {
        open: copyOpen,
        products: others,
        context,
        onPick: copyEntry,
        onClose: () => setCopyOpen(false)
      }
    )
  ] });
}
function uniq(values) {
  const seen = /* @__PURE__ */ new Map();
  for (const v of values) {
    const t = v.trim();
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
function makeSku(products) {
  const taken = new Set(products.flatMap((p) => [p.barcode, ...p.extraBarcodes ?? []]));
  let code = "";
  do {
    code = `BT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  } while (taken.has(code));
  return code;
}
function PriceNote({ cost, retail, state: state2 }) {
  const c = Number(cost) || 0;
  const r = Number(retail) || 0;
  const margin = c > 0 && r > c ? Math.round((r - c) / r * 100) : null;
  return /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2 min-h-[18px]", children: [
    margin !== null && /* @__PURE__ */ jsxs("span", { className: "font-semibold text-good", children: [
      margin,
      "% margin · $",
      (r - c).toFixed(2),
      " profit each.",
      " "
    ] }),
    state2.kind === "loading" && /* @__PURE__ */ jsx("span", { children: "Checking typical prices…" }),
    state2.kind === "done" && /* @__PURE__ */ jsx("span", { children: state2.note }),
    state2.kind === "error" && /* @__PURE__ */ jsx("span", { className: "text-bad", children: state2.message })
  ] });
}
const PHOTO_READER_ID = "bintro-photo-reader";
async function decodeOnDevice(file) {
  try {
    const Detector = window.BarcodeDetector;
    if (Detector) {
      const bitmap = await createImageBitmap(file);
      const found = await new Detector().detect(bitmap);
      const value = found.find((f) => f.rawValue?.trim())?.rawValue?.trim();
      if (value) return value;
    }
  } catch {
  }
  try {
    const lib = await import("html5-qrcode");
    const reader = new lib.Html5Qrcode(PHOTO_READER_ID, { verbose: false });
    try {
      return (await reader.scanFile(file, false)).trim();
    } finally {
      try {
        reader.clear();
      } catch {
      }
    }
  } catch {
    return "";
  }
}
function PhotoStockSheet({
  file,
  initialMode,
  staffName,
  products,
  onRetake,
  onClose,
  onLogged
}) {
  const [stage, setStage] = useState({ kind: "reading" });
  const [preview, setPreview] = useState("");
  const [mode, setMode] = useState(initialMode);
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage({ kind: "reading" });
    setMode(initialMode);
    setQty(1);
    setPicked(null);
    setError("");
    (async () => {
      try {
        const [image, onDevice] = await Promise.all([shrinkImage(file), decodeOnDevice(file)]);
        const known = products.flatMap((p) => [p.barcode, ...p.extraBarcodes ?? []]);
        const deviceBarcode = onDevice && (known.includes(onDevice) || checkUnknownScan(onDevice, known).ok) ? onDevice : void 0;
        const r = await readStockPhotoFn({ data: { image, mediaType: "image/jpeg", deviceBarcode } });
        if (cancelled) return;
        if (!r.ok) {
          setStage({ kind: "retake", message: r.message });
          return;
        }
        const read2 = r;
        setPicked(read2.product?.id ?? (read2.candidates.length === 1 ? read2.candidates[0].id : null));
        setStage({ kind: "pick", read: read2 });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        setStage({
          kind: "retake",
          message: /plan|upgrade|feature/i.test(message) ? "Snap & log is on the Plus plan. A clear photo of the barcode still works when the phone can read it." : "Couldn't read that photo. Check your connection and try again."
        });
      }
    })();
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);
  async function log(productId, captured) {
    setSaving(true);
    setError("");
    try {
      const { product, movement } = await recordProductMovement({
        data: { productId, type: mode, qty, staffName, captured }
      });
      await onLogged(product, movement.id, mode, qty);
    } catch {
      setError("Couldn't log that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  const read = stage.kind === "pick" || stage.kind === "new" ? stage.read : null;
  const options = read ? read.product ? [read.product] : read.candidates : [];
  const label2 = read ? [read.brand, read.name, read.size].filter(Boolean).join(" · ") : "";
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open: file !== null,
      onClose,
      title: stage.kind === "new" ? "Add as a new product" : "Log from photo",
      subtitle: stage.kind === "new" ? "Check the details from the photo, then save." : "Snap the SKU or the full front label.",
      children: [
        /* @__PURE__ */ jsx("div", { id: PHOTO_READER_ID, className: "hidden" }),
        stage.kind !== "new" && /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 mb-4", children: [
          preview && /* @__PURE__ */ jsx("img", { src: preview, alt: "Your photo", className: "w-20 h-20 rounded-xl object-cover bg-surface shrink-0" }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 text-sm", children: [
            stage.kind === "reading" && /* @__PURE__ */ jsx("p", { className: "m-0 text-ink-2", children: "Reading the SKU and label…" }),
            stage.kind === "retake" && /* @__PURE__ */ jsx("p", { className: "m-0 text-bad font-semibold", children: stage.message }),
            read && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("p", { className: "m-0 font-semibold", children: read.captured === "sku" ? "SKU / barcode captured" : "Full label captured" }),
              read.barcode && /* @__PURE__ */ jsx("p", { className: "m-0 num text-ink-2", children: read.barcode }),
              label2 && /* @__PURE__ */ jsx("p", { className: "m-0 text-ink-2", children: label2 })
            ] })
          ] })
        ] }),
        stage.kind === "retake" && /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Cancel" }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-primary", onClick: onRetake, children: [
            /* @__PURE__ */ jsx(RotateCcw, { size: 18 }),
            "Retake photo"
          ] })
        ] }),
        stage.kind === "pick" && read && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { role: "radiogroup", "aria-label": "Adding or scanning out", className: "flex bg-surface rounded-full p-1 mb-4", children: ["in", "out"].map((m) => {
            const Icon = m === "in" ? ArrowDownToLine : ArrowUpFromLine;
            const active = mode === m;
            return /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                role: "radio",
                "aria-checked": active,
                onClick: () => setMode(m),
                className: `flex-1 flex items-center justify-center gap-2 rounded-full border-0 py-2.5 text-[15px] font-semibold cursor-pointer ${active ? m === "in" ? "bg-good text-white" : "bg-action text-white" : "bg-transparent text-ink-2"}`,
                children: [
                  /* @__PURE__ */ jsx(Icon, { size: 18 }),
                  m === "in" ? "Adding to inventory" : "Scanning out"
                ]
              },
              m
            );
          }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-ink-2", children: "How many" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-surface rounded-full", children: [
              /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Fewer", onClick: () => setQty((q) => Math.max(1, q - 1)), className: "w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer", children: "−" }),
              /* @__PURE__ */ jsx("span", { className: "num min-w-7 text-center font-bold", children: qty }),
              /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "More", onClick: () => setQty((q) => Math.min(999, q + 1)), className: "w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer", children: "+" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold mt-0 mb-2", children: read.product ? "Matched product" : options.length > 0 ? "Which product is it?" : "No product in Bintro matches this photo yet." }),
          options.length > 0 && /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 mb-2", children: options.map((p) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              "aria-pressed": picked === p.id,
              onClick: () => setPicked(p.id),
              className: `w-full flex items-center gap-3 py-2.5 px-2 mb-1.5 rounded-xl border text-left cursor-pointer ${picked === p.id ? "border-action bg-surface" : "border-line bg-transparent"}`,
              children: [
                /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
                /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("span", { className: "block font-semibold truncate", children: p.name }),
                  /* @__PURE__ */ jsx("span", { className: "block text-[13px] text-ink-2 truncate", children: [p.brand, p.size, p.category, `${p.qty} on hand`].filter(Boolean).join(" · ") })
                ] }),
                picked === p.id && /* @__PURE__ */ jsx(Check, { size: 18, className: "text-action shrink-0" })
              ]
            }
          ) }, p.id)) }),
          !read.product && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: () => setStage({ kind: "new", read }), children: options.length > 0 ? "None of these: add it as a new product" : "Add it as a new product" }),
          error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-2 mb-0", children: error }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal", onClick: onRetake, children: [
              /* @__PURE__ */ jsx(Camera, { size: 18 }),
              "Retake"
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "btn btn-primary",
                disabled: picked === null || saving,
                onClick: () => picked !== null && log(picked, read.captured),
                children: saving ? "Saving…" : mode === "in" ? `Add ${qty} to inventory` : `Scan out ${qty}`
              }
            )
          ] })
        ] }),
        stage.kind === "new" && read && /* @__PURE__ */ jsx(
          ProductForm,
          {
            initialBarcode: read.barcode || makeSku(products),
            initialDetails: { brand: read.brand, name: read.name, size: read.size, category: read.category },
            autoLookup: Boolean(read.barcode),
            products,
            qtyLabel: "Already on shelf",
            saveLabel: mode === "in" ? `Save and add ${qty}` : `Save and scan out ${qty}`,
            onCancel: () => setStage({ kind: "pick", read }),
            onSave: async (values) => {
              const created = await createProduct({ data: values });
              await log(created.id, read.captured);
            }
          },
          `${read.barcode}-${read.name}`
        )
      ]
    }
  );
}
const parseImport = createServerFn({
  method: "POST"
}).inputValidator(z.discriminatedUnion("kind", [z.object({
  kind: z.literal("csv"),
  text: z.string().min(1).max(4e6)
}), z.object({
  kind: z.literal("document"),
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
})])).handler(createSsrRpc("1620febdb4067bb98e7d350594ac5c9c4eab48bbbcf9c68b5a33d1dc39131b6c"));
const estimateImportPrices = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  items: z.array(z.object({
    name: z.string().max(200),
    brand: z.string().max(160),
    size: z.string().max(60),
    category: z.string().max(80)
  })).min(1).max(PRICE_BATCH)
})).handler(createSsrRpc("20bf5a75a4edbf48b80a16a026d0cb79a2129e64cd6f72053b979ac9b7e42f31"));
const LineSchema = z.object({
  productId: z.number().int().nullable(),
  barcode: z.string().max(60),
  name: z.string().max(200),
  brand: z.string().max(160),
  size: z.string().max(60),
  category: z.string().max(80),
  vendor: z.string().max(120),
  qty: z.number().int().min(0).max(1e6).nullable(),
  unitCostCents: z.number().int().min(0).max(1e7),
  retailPriceCents: z.number().int().min(0).max(1e7)
});
const applyImport = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  mode: z.enum(["inventory", "receipt", "prices"]),
  staffName: z.string().max(60),
  source: z.string().max(160),
  lines: z.array(LineSchema).min(1).max(MAX_IMPORT_LINES)
})).handler(createSsrRpc("20025aaed2bc46dd8065664de0ce970c35cdc9ed6fdd8acc5179a688172eafce"));
const applyReceiptPrices = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  staffName: z.string().max(60).optional()
})).handler(createSsrRpc("e85c248ec3b804eb7e73c9e7df38322438247f357e6811aa2511e14b9c0d2d9b"));
const FileSchema = z.discriminatedUnion("kind", [z.object({
  kind: z.literal("csv"),
  text: z.string().min(1).max(4e6)
}), z.object({
  kind: z.literal("document"),
  data: z.string().min(1).max(58e5),
  mediaType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
})]);
const parseSalesReport = createServerFn({
  method: "POST"
}).inputValidator(FileSchema).handler(createSsrRpc("bf70584d5b142e730fe2deaddb2a3ab4cbe99677bb068fc921318e35c498f523"));
const logSalesReport = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  app: z.enum(SALES_REPORT_APPS),
  period: z.string().max(60),
  staffName: z.string().max(60),
  force: z.boolean(),
  lines: z.array(z.object({
    productId: z.number().int(),
    qty: z.number().int().min(1).max(1e5)
  })).min(1).max(MAX_IMPORT_LINES)
})).handler(createSsrRpc("04a3d82ebea9236975adab4fd578664123a041a305022b75d2336bb795ab8feb"));
const APP_KEY = "bintro.salesReportApp";
function readAsBase64$2(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function savedApp() {
  try {
    const v = localStorage.getItem(APP_KEY);
    if (v && SALES_REPORT_APPS.includes(v)) return v;
  } catch {
  }
  return SALES_REPORT_APPS[0];
}
function SalesReportSheet({
  open,
  products,
  askStaff,
  onClose,
  onDone
}) {
  const [stage, setStage] = useState({ kind: "start" });
  const [app, setApp] = useState(SALES_REPORT_APPS[0]);
  const [period, setPeriod] = useState("");
  const [rows, setRows] = useState([]);
  const fileInput = useRef(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  useEffect(() => {
    if (open) {
      setStage({ kind: "start" });
      setRows([]);
      setPeriod("");
      setApp(savedApp());
    }
  }, [open]);
  function pickApp(next) {
    setApp(next);
    try {
      localStorage.setItem(APP_KEY, next);
    } catch {
    }
  }
  async function readFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isCsv = file.type === "text/csv" || name.endsWith(".csv") || name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
    if (isPdf && file.size > MAX_IMPORT_BYTES) {
      setStage({ kind: "start", error: "That PDF is over 4 MB. Export a CSV or a shorter date range instead." });
      return;
    }
    setStage({ kind: "reading", fileName: file.name });
    try {
      const parsed = await parseSalesReport({
        data: isCsv ? { kind: "csv", text: await file.text() } : isPdf ? { kind: "document", data: await readAsBase64$2(file), mediaType: "application/pdf" } : { kind: "document", data: await shrinkImage(file, 2e3), mediaType: "image/jpeg" }
      });
      if (!parsed.ok) {
        setStage({ kind: "start", error: parsed.message });
        return;
      }
      setRows(parsed.lines.map((l) => ({ ...l, sold: String(l.qty), include: l.productId !== null })));
      if (parsed.period) setPeriod(parsed.period.slice(0, 60));
      setStage({ kind: "review" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStage({
        kind: "start",
        error: /plan|upgrade|feature/i.test(message) ? "Sales report upload is on the Plus plan." : isCsv ? "Couldn't read that file. Check your connection and try again." : "Couldn't read that file. A CSV export works best; PDFs and photos need Bintro's AI reader."
      });
    }
  }
  function patch(key2, change) {
    setRows((all) => all.map((r) => r.key === key2 ? { ...r, ...change } : r));
  }
  const ready = rows.filter((r) => r.include && r.productId !== null && Number(r.sold) > 0);
  const units = ready.reduce((s, r) => s + Math.trunc(Number(r.sold)), 0);
  const unmatched = rows.filter((r) => r.productId === null).length;
  async function confirm(force) {
    if (ready.length === 0) return;
    const who = await askStaff({ direction: "out" });
    if (!who) return;
    setStage({ kind: "saving" });
    try {
      const result = await logSalesReport({
        data: {
          app,
          period: period.trim(),
          staffName: who,
          force,
          lines: ready.map((r) => ({ productId: r.productId, qty: Math.trunc(Number(r.sold)) }))
        }
      });
      if (!result.ok) {
        setStage({ kind: "review", duplicate: true, error: result.message });
        return;
      }
      setStage({ kind: "done", units: result.units, products: result.products });
      await onDone();
    } catch {
      setStage({ kind: "review", error: "Couldn't log the report. Check your connection and try again." });
    }
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Upload a sales report",
      subtitle: "For booking apps Bintro can't connect to. Retail sold comes off your shelf counts.",
      children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInput,
            type: "file",
            accept: ".csv,text/csv,application/pdf,image/*",
            className: "hidden",
            "aria-hidden": "true",
            tabIndex: -1,
            onChange: (e) => {
              readFile(e.target.files?.[0]);
              e.target.value = "";
            }
          }
        ),
        stage.kind === "start" && /* @__PURE__ */ jsxs("div", { className: "grid gap-3", children: [
          stage.error && /* @__PURE__ */ jsx("p", { className: "m-0 text-bad text-sm font-semibold", children: stage.error }),
          /* @__PURE__ */ jsxs("label", { className: "text-sm font-semibold", children: [
            "Booking app",
            /* @__PURE__ */ jsx("select", { className: "field-input !py-2 mt-1", value: app, onChange: (e) => pickApp(e.target.value), children: SALES_REPORT_APPS.map((a) => /* @__PURE__ */ jsx("option", { value: a, children: a }, a)) })
          ] }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-primary justify-start", onClick: () => fileInput.current?.click(), children: [
            /* @__PURE__ */ jsx(FileSpreadsheet, { size: 18 }),
            "Choose the report (CSV, PDF or photo)"
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "m-0 text-[13px] text-ink-2", children: [
            "In ",
            app === "Other" ? "your booking app" : app,
            ", export the ",
            /* @__PURE__ */ jsx("b", { className: "text-ink", children: "product sales" }),
            " report for the days since your last upload. A CSV works best. You check every line before anything changes."
          ] }),
          /* @__PURE__ */ jsx("p", { className: "m-0 text-[13px] text-ink-2", children: "Square sales already sync on their own, so don't upload those here." })
        ] }),
        stage.kind === "reading" && /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm", children: [
          "Reading ",
          stage.fileName,
          "…"
        ] }),
        stage.kind === "saving" && /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Logging the sales…" }),
        stage.kind === "review" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("label", { className: "block text-sm font-semibold mb-3", children: [
            "Report period",
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "field-input !py-2 mt-1",
                value: period,
                maxLength: 60,
                placeholder: "e.g. Nov 1–7",
                onChange: (e) => setPeriod(e.target.value)
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "block text-[12px] font-normal text-ink-2 mt-1", children: "Bintro uses this to stop the same report being logged twice." })
          ] }),
          unmatched > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[13px] text-ink-2", children: [
            unmatched,
            " line",
            unmatched === 1 ? "" : "s",
            " didn't match a product. Pick the product, or leave it unticked to skip it."
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 max-h-[48vh] overflow-auto", children: rows.map((r) => {
            const product = r.productId !== null ? byId.get(r.productId) : void 0;
            return /* @__PURE__ */ jsx("li", { className: `py-3 border-b border-line last:border-b-0 ${r.include ? "" : "opacity-50"}`, children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: r.include,
                  disabled: r.productId === null,
                  onChange: (e) => patch(r.key, { include: e.target.checked }),
                  "aria-label": `Include ${r.name}`,
                  className: "mt-1"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: r.name }),
                /* @__PURE__ */ jsx("div", { className: "text-[12px] text-ink-2 truncate", children: [r.brand, r.size].filter(Boolean).join(" · ") }),
                r.productId === null ? /* @__PURE__ */ jsxs(
                  "select",
                  {
                    className: "field-input !py-1.5 text-sm mt-1",
                    value: "",
                    onChange: (e) => {
                      const id = Number(e.target.value);
                      const p = byId.get(id);
                      if (p) patch(r.key, { productId: id, name: p.name, brand: p.brand, size: p.size, include: true });
                    },
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "", children: "Which product is this?" }),
                      products.map((p) => /* @__PURE__ */ jsx("option", { value: p.id, children: [p.brand, p.name, p.size].filter(Boolean).join(" · ") }, p.id))
                    ]
                  }
                ) : product && /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-ink-2 mt-0.5", children: [
                  product.qty,
                  " on hand now"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "text-[11px] text-ink-2 text-center", children: [
                "Sold",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    min: 0,
                    inputMode: "numeric",
                    value: r.sold,
                    onChange: (e) => patch(r.key, { sold: e.target.value }),
                    className: "field-input w-16 text-center px-1 py-1.5 mt-0.5"
                  }
                )
              ] })
            ] }) }, r.key);
          }) }),
          stage.error && /* @__PURE__ */ jsxs("p", { className: "text-sm mt-2 mb-0 flex items-start gap-1.5 text-bad", children: [
            /* @__PURE__ */ jsx(AlertTriangle, { size: 16, className: "mt-0.5 shrink-0" }),
            stage.error
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-[13px] text-ink-2 mt-3 mb-0", children: [
            "Takes ",
            /* @__PURE__ */ jsx("b", { className: "text-ink", children: units }),
            " unit",
            units === 1 ? "" : "s",
            " off ",
            ready.length,
            " product",
            ready.length === 1 ? "" : "s",
            ", logged as ",
            app,
            " sales."
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage({ kind: "start" }), children: "Back" }),
            stage.duplicate ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: () => confirm(true), disabled: units === 0, children: "Log it again anyway" }) : /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: () => confirm(false), disabled: units === 0, children: "Take off the shelf" })
          ] })
        ] }),
        stage.kind === "done" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("p", { className: "m-0 font-semibold", children: [
            "Logged ",
            stage.units,
            " unit",
            stage.units === 1 ? "" : "s",
            " sold across ",
            stage.products,
            " product",
            stage.products === 1 ? "" : "s",
            " from ",
            app,
            "."
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-[13px] text-ink-2", children: [
            "They show in Activity as ",
            app,
            " sales, and anything now below par is on your restock list."
          ] }),
          /* @__PURE__ */ jsx(SheetActions, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: onClose, children: "Done" }) })
        ] })
      ]
    }
  );
}
const TOOL_TONES = {
  /** Garnet: the main brand action (count, snap & log, build order). */
  garnet: { bg: "#8B1A2F", fg: "#FFFFFF" },
  /** Bold yellow: Smart par. Dark icon for contrast. */
  yellow: { bg: "#F5B700", fg: "#2A1C00" },
  /** Royal blue: anything that emails. */
  royal: { bg: "#1D3FAF", fg: "#FFFFFF" },
  /** Green: deliveries coming in. */
  green: { bg: "#11804A", fg: "#FFFFFF" },
  /** Red: fix a problem (negative counts). */
  red: { bg: "#C62828", fg: "#FFFFFF" },
  /** Orange: missing information (costs). */
  orange: { bg: "#E46A12", fg: "#FFFFFF" },
  /** Purple: duplicates. */
  purple: { bg: "#6A3EA1", fg: "#FFFFFF" },
  /** Teal: files in and out (sales reports, CSV). */
  teal: { bg: "#0B7A84", fg: "#FFFFFF" },
  /** Charcoal: utilities (refresh, print). */
  charcoal: { bg: "#2F2B2C", fg: "#FFFFFF" }
};
function ToolButton({
  icon,
  tone,
  label: label2,
  badge,
  onClick,
  disabled = false,
  busy = false
}) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      disabled: disabled || busy,
      "aria-label": badge ? `${label2}: ${badge}` : label2,
      className: "group flex flex-col items-center gap-1.5 shrink-0 w-[82px] bg-transparent border-0 p-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45",
      children: [
        /* @__PURE__ */ jsxs(
          "span",
          {
            style: { backgroundColor: TOOL_TONES[tone].bg, color: TOOL_TONES[tone].fg },
            className: `relative grid place-items-center w-14 h-14 rounded-full shadow-[0_6px_14px_-6px_rgba(0,0,0,0.45)] ring-4 ring-white transition-transform group-enabled:group-hover:-translate-y-0.5 group-enabled:group-active:scale-95 ${busy ? "animate-pulse" : ""}`,
            children: [
              icon,
              badge ? /* @__PURE__ */ jsx("span", { className: "absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-ink text-[11px] font-extrabold grid place-items-center border-2 border-current shadow-sm", children: badge }) : null
            ]
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "text-[12px] font-semibold text-ink leading-tight text-center", children: label2 })
      ]
    }
  );
}
function ToolRow({ children, label: label2, className = "" }) {
  return /* @__PURE__ */ jsx("div", { className: `flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 ${className}`, role: "group", "aria-label": label2, children });
}
const ASK_KEY = "shagnoir-ask-staff";
const STAFF_IDLE_MINUTES = 10;
function getStaffAskMode() {
  if (typeof window === "undefined") return "every";
  return window.localStorage.getItem(ASK_KEY) === "idle" ? "idle" : "every";
}
function setStaffAskMode(mode) {
  window.localStorage.setItem(ASK_KEY, mode);
}
function StaffPicker({
  open,
  prompt,
  team,
  current,
  onPick,
  onClose,
  onManageTeam
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDraft("");
    setAdding(team.length === 0);
    const opener = document.activeElement;
    const frame = requestAnimationFrame(() => {
      const selected = panelRef.current?.querySelector('[aria-pressed="true"]');
      if (!panelRef.current?.contains(document.activeElement)) (selected ?? panelRef.current)?.focus();
    });
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  const { direction } = prompt;
  const DirIcon = direction === "in" ? ArrowDownToLine : ArrowUpFromLine;
  const title = direction === "in" ? "Who’s scanning in?" : direction === "out" ? "Who’s scanning out?" : "Who’s working?";
  function submitNew(e) {
    e.preventDefault();
    const next = draft.trim().slice(0, 60);
    if (next) onPick(next);
  }
  return createPortal(
    /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-[60] flex items-center justify-center p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "sheet-scrim absolute inset-0 bg-royal/55 backdrop-blur-[2px]", onClick: onClose }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          ref: panelRef,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titleId,
          tabIndex: -1,
          className: "staff-pop outline-none relative w-full max-w-[520px] max-h-[88vh] overflow-auto bg-white rounded-[28px] px-5 pt-6 pb-5 shadow-[var(--shadow-lift)] text-center",
          children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                "aria-label": "Close",
                className: "absolute right-3 top-3 w-9 h-9 rounded-full border-0 bg-surface text-ink-2 grid place-items-center cursor-pointer hover:bg-surface-2",
                children: /* @__PURE__ */ jsx(X, { size: 18 })
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "brand-tile mx-auto w-14 h-14 rounded-full text-white grid place-items-center mb-3", "aria-hidden": "true", children: /* @__PURE__ */ jsx(Users, { size: 26 }) }),
            direction && /* @__PURE__ */ jsxs(
              "span",
              {
                className: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold mb-2 ${direction === "in" ? "bg-good-tint text-good" : "bg-action-tint text-action"}`,
                children: [
                  /* @__PURE__ */ jsx(DirIcon, { size: 14 }),
                  direction === "in" ? "Scan in" : "Scan out"
                ]
              }
            ),
            /* @__PURE__ */ jsx("h2", { id: titleId, className: "text-[26px] font-extrabold tracking-tight text-royal m-0 mb-1", children: title }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm m-0 mb-5", children: "Tap your name. The scan is logged under you." }),
            team.length > 0 && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 min-[440px]:grid-cols-3 gap-2.5 mb-4", role: "group", "aria-label": "Team members", children: team.map((m) => {
              const on = m.name === current;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  "aria-pressed": on,
                  onClick: () => onPick(m.name),
                  className: `relative flex flex-col items-center gap-2 rounded-2xl px-2 pt-4 pb-3 cursor-pointer border-2 transition-colors ${on ? "border-action bg-action-tint" : "border-line bg-white hover:bg-surface"}`,
                  children: [
                    /* @__PURE__ */ jsx(
                      "span",
                      {
                        className: `w-14 h-14 rounded-full text-white text-[18px] font-bold grid place-items-center ${on ? "bg-action" : "brand-tile"}`,
                        children: deriveInitials(m.name)
                      }
                    ),
                    /* @__PURE__ */ jsx("span", { className: "text-[15px] font-bold text-ink leading-tight break-words max-w-full", children: m.name }),
                    on && /* @__PURE__ */ jsxs("span", { className: "absolute top-2 right-2 w-6 h-6 rounded-full bg-action text-white grid place-items-center", children: [
                      /* @__PURE__ */ jsx(Check, { size: 14, strokeWidth: 3 }),
                      /* @__PURE__ */ jsx("span", { className: "sr-only", children: " (last used)" })
                    ] })
                  ]
                },
                m.id
              );
            }) }),
            adding ? /* @__PURE__ */ jsxs("form", { onSubmit: submitNew, className: "flex gap-2 text-left", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "staff-new-name", className: "sr-only", children: "Your name" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "staff-new-name",
                  value: draft,
                  onChange: (e) => setDraft(e.target.value.slice(0, 60)),
                  placeholder: team.length ? "Someone new — type a name" : "Type your name",
                  autoComplete: "name",
                  autoFocus: true,
                  className: "field-input"
                }
              ),
              /* @__PURE__ */ jsxs("button", { type: "submit", className: "btn btn-primary shrink-0", disabled: !draft.trim(), children: [
                /* @__PURE__ */ jsx(UserPlus, { size: 18 }),
                "Go"
              ] })
            ] }) : /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal w-full", onClick: () => setAdding(true), children: [
              /* @__PURE__ */ jsx(UserPlus, { size: 18 }),
              "Someone new"
            ] }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm mt-2", onClick: onManageTeam, children: "Manage team" })
          ]
        }
      )
    ] }),
    document.body
  );
}
const SERIAL_SERVICES = [
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  // Nordic UART
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  // Microchip / ISSC transparent UART
  65504,
  // HM-10 style serial
  65520,
  // generic vendor serial
  65255,
  6162
  // HID over GATT (usually blocked by browsers, tried last)
];
const SAVED_DEVICE_KEY = "shagnoir-bt-scanner";
function bluetooth() {
  if (typeof navigator === "undefined") return void 0;
  return navigator.bluetooth;
}
let state = {
  supported: false,
  status: "idle",
  deviceName: "",
  error: ""
};
let device = null;
let userDisconnected = false;
const stateListeners = /* @__PURE__ */ new Set();
const codeListeners = /* @__PURE__ */ new Set();
function setState(patch) {
  state = { ...state, ...patch };
  stateListeners.forEach((l) => l(state));
}
function getBluetoothScannerState() {
  return { ...state, supported: !!bluetooth() };
}
function onBluetoothScannerState(listener) {
  stateListeners.add(listener);
  listener(getBluetoothScannerState());
  return () => {
    stateListeners.delete(listener);
  };
}
function onBluetoothCode(listener) {
  codeListeners.add(listener);
  return () => {
    codeListeners.delete(listener);
  };
}
function savedBluetoothScannerName() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVED_DEVICE_KEY) || "{}").name || "";
  } catch {
    return "";
  }
}
let buffer = "";
let flushTimer;
const decoder = new TextDecoder();
function emit(code) {
  const trimmed = code.replace(/[\u0000-\u001f]/g, "").trim();
  if (trimmed.length >= 3) codeListeners.forEach((l) => l(trimmed));
}
function onValue(event) {
  const value = event.target.value;
  if (!value) return;
  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split(/[\r\n]+/);
  buffer = parts.pop() ?? "";
  parts.forEach(emit);
  clearTimeout(flushTimer);
  if (buffer) {
    flushTimer = setTimeout(() => {
      emit(buffer);
      buffer = "";
    }, 120);
  }
}
async function subscribe(server) {
  for (const uuid of SERIAL_SERVICES) {
    let service;
    try {
      service = await server.getPrimaryService(uuid);
    } catch {
      continue;
    }
    const characteristics = await service.getCharacteristics().catch(() => []);
    const readable = characteristics.filter((c) => c.properties.notify || c.properties.indicate);
    if (readable.length === 0) continue;
    for (const c of readable) {
      await c.startNotifications().catch(() => {
      });
      c.addEventListener("characteristicvaluechanged", onValue);
    }
    return true;
  }
  return false;
}
function onDisconnected() {
  setState({ status: "idle" });
  if (!userDisconnected && device) {
    setTimeout(() => {
      if (device && !userDisconnected) connectDevice(device, true).catch(() => {
      });
    }, 1500);
  }
}
async function connectDevice(next, quiet = false) {
  if (!next.gatt) throw new Error("no-gatt");
  setState({ status: "connecting", error: "", deviceName: next.name || "Bluetooth scanner" });
  try {
    const server = await next.gatt.connect();
    const ok = await subscribe(server);
    if (!ok) {
      server.disconnect();
      device = null;
      setState({
        status: "idle",
        error: quiet ? "" : `${next.name || "This scanner"} works as a keyboard. Pair it in your device's Bluetooth settings instead — the steps are below.`
      });
      return false;
    }
    if (device !== next) {
      device?.removeEventListener("gattserverdisconnected", onDisconnected);
      next.addEventListener("gattserverdisconnected", onDisconnected);
    }
    device = next;
    window.localStorage.setItem(SAVED_DEVICE_KEY, JSON.stringify({ id: next.id, name: next.name || "" }));
    setState({ status: "connected", error: "" });
    return true;
  } catch {
    setState({ status: "idle", error: quiet ? "" : "Couldn't connect. Wake the scanner (press its trigger) and try again." });
    return false;
  }
}
async function pairBluetoothScanner() {
  const bt = bluetooth();
  if (!bt) {
    setState({ error: "This browser can’t connect to Bluetooth directly. Pair the scanner in your device’s Bluetooth settings." });
    return false;
  }
  userDisconnected = false;
  let picked;
  try {
    picked = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERIAL_SERVICES });
  } catch {
    return false;
  }
  return connectDevice(picked);
}
async function reconnectSavedBluetoothScanner() {
  const bt = bluetooth();
  if (!bt?.getDevices || state.status !== "idle") return;
  let saved;
  try {
    saved = JSON.parse(window.localStorage.getItem(SAVED_DEVICE_KEY) || "{}");
  } catch {
    return;
  }
  if (!saved.id) return;
  const devices = await bt.getDevices().catch(() => []);
  const match = devices.find((d) => d.id === saved.id);
  if (match) await connectDevice(match, true);
}
function disconnectBluetoothScanner(forget = false) {
  userDisconnected = true;
  device?.gatt?.disconnect();
  device = null;
  if (forget) window.localStorage.removeItem(SAVED_DEVICE_KEY);
  setState({ status: "idle", error: "", deviceName: forget ? "" : state.deviceName });
}
const IDLE_SUB = "Point your camera at the barcode";
let audioCtx;
function beep(ok) {
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = ok ? 880 : 220;
    o.type = "sine";
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(1e-3, audioCtx.currentTime + 0.18);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.2);
  } catch {
  }
  navigator.vibrate?.(ok ? 40 : [60, 40, 60]);
}
function errorBuzz() {
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();
    const t = audioCtx.currentTime;
    for (const [start, freq] of [[0, 330], [0.22, 220]]) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(1e-4, t + start);
      g.gain.linearRampToValueAtTime(0.14, t + start + 0.01);
      g.gain.setValueAtTime(0.14, t + start + 0.15);
      g.gain.exponentialRampToValueAtTime(1e-4, t + start + 0.18);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t + start);
      o.stop(t + start + 0.2);
    }
  } catch {
  }
  navigator.vibrate?.([120, 60, 120]);
}
const PARTIAL_SUB = {
  short: "Only part of the barcode came through. Scan it again.",
  fragment: "Only part of the barcode came through. Scan it again.",
  checksum: "That barcode didn't read cleanly. Scan it again."
};
let staffConfirmedAt = 0;
function startOfToday() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function ScanView({
  staffName,
  askStaff,
  recent,
  products,
  belowParCount,
  onProduct,
  onChanged,
  onOpenRestock,
  onReceiveDelivery
}) {
  const toast = useToast();
  const [mode, setMode] = useState("out");
  const [qty, setQty] = useState(1);
  const [orb, setOrb] = useState({ kind: "idle" });
  const [bump, setBump] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typedCode, setTypedCode] = useState("");
  const [unknownBarcode, setUnknownBarcode] = useState(null);
  const [unknownTab, setUnknownTab] = useState("new");
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [today, setToday] = useState([]);
  const orbTimer = useRef(void 0);
  const [partialCode, setPartialCode] = useState(null);
  const photoInput = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [photoWho, setPhotoWho] = useState("");
  const scanWho = useRef(staffName);
  useEffect(() => {
    getMovementsSince({ data: { since: startOfToday().toISOString() } }).then((rows) => setToday(rows)).catch(() => {
    });
  }, [recent]);
  useEffect(() => {
    if (!linkQuery.trim()) {
      setLinkResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const results = await searchProducts({ data: { query: linkQuery } });
      setLinkResults(results);
    }, 220);
    return () => clearTimeout(handle);
  }, [linkQuery]);
  async function safeRefresh() {
    try {
      await onChanged();
    } catch {
    }
  }
  function showOrb(next) {
    setOrb(next);
    setBump((b) => b + 1);
    clearTimeout(orbTimer.current);
    if (next.kind !== "idle" && next.kind !== "warn") {
      orbTimer.current = setTimeout(() => setOrb({ kind: "idle" }), 3e3);
    }
  }
  const confirmStaff = useCallback(
    async (direction) => {
      const fresh = Date.now() - staffConfirmedAt < STAFF_IDLE_MINUTES * 6e4;
      if (getStaffAskMode() === "idle" && staffName.trim() && fresh) return staffName.trim();
      const who = await askStaff({ direction });
      if (who) staffConfirmedAt = Date.now();
      return who;
    },
    [askStaff, staffName]
  );
  const submitScan = useCallback(
    async (code, direction = mode, who = scanWho.current) => {
      const trimmed = code.trim();
      if (!trimmed || busy) return;
      setPartialCode(null);
      scanWho.current = who;
      setBusy(true);
      let result;
      try {
        result = await scanMovement({ data: { barcode: trimmed, type: direction, qty, staffName: who } });
      } catch {
        beep(false);
        showOrb({ kind: "bad", title: "Scan failed", sub: "Check your connection and try again" });
        setBusy(false);
        return;
      }
      try {
        if (result.status === "unknown") {
          beep(true);
          showOrb({ kind: "warn", title: "New product", sub: "Looking it up" });
          setUnknownTab("new");
          setLinkQuery("");
          setUnknownBarcode(result.barcode);
          return;
        }
        const p = result.product;
        const movement = result.movement;
        onProduct?.(p);
        const low = p.qty <= p.reorderThreshold;
        beep(true);
        showOrb({
          kind: direction,
          title: direction === "in" ? `Received ${movement.delta}` : `Taken ${Math.abs(movement.delta)}`,
          sub: `${p.name} · ${p.qty} on hand${low ? " · below par" : ""}`
        });
        toast(`${direction === "in" ? "Added" : "Took"} ${Math.abs(movement.delta)} × ${p.name}`, async () => {
          const reverted = await undoMovement({ data: { movementId: movement.id } });
          if (reverted) onProduct?.(reverted);
          await safeRefresh();
          toast("Scan undone");
        });
        staffConfirmedAt = Date.now();
      } finally {
        setBusy(false);
      }
      await safeRefresh();
    },
    // showOrb/toast are stable enough for this handler; mode, qty and staff drive it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, qty, busy, onChanged, onProduct]
  );
  const rejectIfPartial = useCallback(
    (code) => {
      const trimmed = code.trim();
      const barcodes = products.flatMap((p) => [p.barcode, ...p.extraBarcodes ?? []]);
      if (barcodes.includes(trimmed)) return false;
      const check = checkUnknownScan(trimmed, barcodes);
      if (check.ok) return false;
      errorBuzz();
      showOrb({ kind: "bad", title: "Scan again", sub: PARTIAL_SUB[check.reason] });
      setPartialCode(trimmed);
      return true;
    },
    // showOrb is stable enough; the product list drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products]
  );
  const scanFromDevice = useCallback(
    async (code) => {
      if (rejectIfPartial(code)) return;
      const who = await confirmStaff(mode);
      if (who) await submitScan(code, mode, who);
    },
    [rejectIfPartial, confirmStaff, submitScan, mode]
  );
  const fragmentRef = useRef(() => {
  });
  fragmentRef.current = () => {
    errorBuzz();
    showOrb({ kind: "bad", title: "Scan again", sub: PARTIAL_SUB.short });
    setPartialCode(null);
  };
  async function acceptPartialCode() {
    const code = partialCode;
    if (!code) return;
    setPartialCode(null);
    const who = await confirmStaff(mode);
    if (who) await submitScan(code, mode, who);
  }
  async function startCamera() {
    const who = await confirmStaff(mode);
    if (!who) return;
    scanWho.current = who;
    setCameraOpen(true);
  }
  function startPhoto() {
    setCameraOpen(false);
    if (photoInput.current) {
      photoInput.current.value = "";
      photoInput.current.click();
    }
  }
  async function onPhotoPicked(file) {
    if (!file) return;
    if (photo && photoWho) {
      setPhoto(file);
      return;
    }
    const who = await confirmStaff(mode);
    if (!who) return;
    setPhotoWho(who);
    setPhoto(file);
  }
  async function startTyping() {
    const who = await confirmStaff(mode);
    if (!who) return;
    scanWho.current = who;
    setTypedCode("");
    setTyping(true);
  }
  const submitRef = useRef(scanFromDevice);
  submitRef.current = scanFromDevice;
  useEffect(() => {
    let buffer2 = "";
    let lastKey = 0;
    function onKey(e) {
      const target = e.target;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"]')) return;
      const now = performance.now();
      if (now - lastKey > 80) buffer2 = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer2.length >= 4) {
          e.preventDefault();
          submitRef.current(buffer2);
        } else if (buffer2.length >= 2) {
          e.preventDefault();
          fragmentRef.current();
        }
        buffer2 = "";
        return;
      }
      if (e.key.length === 1) buffer2 += e.key;
    }
    document.addEventListener("keydown", onKey);
    const offBluetooth = onBluetoothCode((code) => {
      if (document.querySelector('[role="dialog"]')) return;
      submitRef.current(code);
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      offBluetooth();
    };
  }, []);
  function closeUnknown() {
    setUnknownBarcode(null);
    setOrb({ kind: "idle" });
  }
  async function handleLinkExisting(productId) {
    if (!unknownBarcode) return;
    await linkBarcodeToProduct({ data: { productId, barcode: unknownBarcode } });
    const code = unknownBarcode;
    setUnknownBarcode(null);
    await submitScan(code);
  }
  async function undo(m) {
    try {
      const reverted = await undoMovement({ data: { movementId: m.id } });
      if (reverted) onProduct?.(reverted);
    } catch {
      toast("Couldn't undo that. Check your connection and try again.");
      return;
    }
    await safeRefresh();
    toast(`Undid ${m.productName}`);
  }
  const outToday = today.filter((m) => m.delta < 0 && m.type === "out");
  const unitsOut = outToday.reduce((sum, m) => sum - m.delta, 0);
  const unitsIn = today.filter((m) => m.delta > 0 && m.type === "in").reduce((sum, m) => sum + m.delta, 0);
  const usedCents = outToday.reduce((sum, m) => sum - m.delta * m.unitCostCents, 0);
  const orbClass = orb.kind === "idle" ? "" : orb.kind === "in" ? "orb-in" : orb.kind === "out" ? "orb-out" : `orb-${orb.kind}`;
  const OrbIcon = orb.kind === "idle" ? ScanBarcode : orb.kind === "bad" ? X : orb.kind === "warn" ? Plus : Check;
  return /* @__PURE__ */ jsxs("div", { className: "grid gap-6 min-[900px]:grid-cols-[1.1fr_0.9fr] min-[900px]:items-start", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-[24px] px-5 pt-5 pb-6 flex flex-col items-center text-center", children: [
      /* @__PURE__ */ jsx("div", { role: "radiogroup", "aria-label": "Scan direction", className: "flex w-full max-w-[360px] bg-white rounded-full p-1 mb-6 shadow-card", children: ["out", "in"].map((m) => {
        const Icon = m === "in" ? ArrowDownToLine : ArrowUpFromLine;
        const active = mode === m;
        return /* @__PURE__ */ jsxs(
          "button",
          {
            role: "radio",
            "aria-checked": active,
            onClick: () => setMode(m),
            className: `flex-1 flex items-center justify-center gap-2 rounded-full border-0 py-2.5 text-[15px] font-semibold cursor-pointer transition-colors ${active ? m === "in" ? "bg-good text-white" : "bg-action text-white" : "bg-transparent text-ink-2"}`,
            children: [
              /* @__PURE__ */ jsx(Icon, { size: 18 }),
              m === "in" ? "Scan in" : "Scan out"
            ]
          },
          m
        );
      }) }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: `orb ${orbClass} ${bump > 0 && orb.kind !== "idle" ? "orb-bump" : ""}`,
          onClick: startCamera,
          "aria-live": "polite",
          disabled: busy,
          children: [
            /* @__PURE__ */ jsx(
              OrbIcon,
              {
                size: 44,
                strokeWidth: 2,
                className: orb.kind === "in" ? "text-good" : orb.kind === "warn" ? "text-warn" : orb.kind === "bad" ? "text-bad" : "text-action"
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-2xl font-bold tracking-tight", children: orb.kind === "idle" ? busy ? "Scanning…" : "Tap to scan" : orb.title }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-ink-2 max-w-[78%] line-clamp-2", children: orb.kind === "idle" ? mode === "in" ? "Receiving stock onto the shelf" : IDLE_SUB : orb.sub })
          ]
        },
        bump
      ),
      partialCode && /* @__PURE__ */ jsxs("p", { className: "mt-4 mb-0 text-[13px] text-ink-2", role: "status", children: [
        "Read only ",
        /* @__PURE__ */ jsx("b", { className: "num text-ink", children: partialCode }),
        ".",
        " ",
        /* @__PURE__ */ jsx("button", { type: "button", className: "border-0 bg-transparent p-0 text-action font-semibold cursor-pointer", onClick: acceptPartialCode, children: "That's the full code — use it" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-5", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold text-ink-2", children: "Qty per scan" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-white rounded-full shadow-card", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              "aria-label": "Fewer per scan",
              onClick: () => setQty((q) => Math.max(1, q - 1)),
              className: "w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2",
              children: "−"
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "num min-w-7 text-center font-bold", children: qty }),
          /* @__PURE__ */ jsx(
            "button",
            {
              "aria-label": "More per scan",
              onClick: () => setQty((q) => Math.min(999, q + 1)),
              className: "w-10 h-10 rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2",
              children: "+"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mt-4 mb-1 text-sm text-ink-2 flex items-center gap-2 justify-center flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-good shadow-[0_0_0_4px_var(--color-good-tint)]", "aria-hidden": "true" }),
        "Bluetooth and USB scanners work anytime on this screen"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "m-0 text-[13px] text-ink-2", children: staffName.trim() ? /* @__PURE__ */ jsxs(Fragment, { children: [
        "Last scanned by ",
        /* @__PURE__ */ jsx("b", { className: "text-ink", children: staffName.trim() }),
        " · you'll pick your name before each scan"
      ] }) : "You'll pick your name before each scan" }),
      /* @__PURE__ */ jsxs(ToolRow, { label: "More ways to log stock", className: "justify-center mt-4", children: [
        /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Camera, { size: 24 }), tone: "garnet", label: "Snap & log", onClick: startPhoto }),
        onReceiveDelivery && /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(PackagePlus, { size: 24 }), tone: "green", label: "Check in delivery", onClick: onReceiveDelivery }),
        /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(FileSpreadsheet, { size: 24 }), tone: "teal", label: "Sales report", onClick: () => setSalesOpen(true) })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "m-0 text-[12px] text-ink-2 text-center max-w-[420px] mx-auto", children: "Snap a photo of the SKU or label, check a delivery in from its invoice, or upload sales from another booking app." }),
      /* @__PURE__ */ jsx(
        "input",
        {
          ref: photoInput,
          type: "file",
          accept: "image/*",
          capture: "environment",
          className: "hidden",
          "aria-hidden": "true",
          tabIndex: -1,
          onChange: (e) => onPhotoPicked(e.target.files?.[0])
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-text",
          onClick: startTyping,
          children: "Type a barcode instead"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2.5 mb-5", children: [
        /* @__PURE__ */ jsx(StatTile, { label: "Used today", value: unitsOut }),
        /* @__PURE__ */ jsx(StatTile, { label: "Product used", value: dollarsShort(usedCents) }),
        /* @__PURE__ */ jsx(StatTile, { label: "Received today", value: unitsIn, tone: unitsIn > 0 ? "good" : void 0 })
      ] }),
      belowParCount > 0 && /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: onOpenRestock,
          className: "w-full text-left flex items-center gap-2 bg-warn-tint text-ink rounded-2xl px-3.5 py-3 text-sm -mt-2 mb-5 border-0 cursor-pointer",
          children: [
            /* @__PURE__ */ jsxs("span", { className: "flex-1", children: [
              /* @__PURE__ */ jsx("b", { children: belowParCount }),
              " product",
              belowParCount === 1 ? " is" : "s are",
              " at or below par."
            ] }),
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-warn whitespace-nowrap", children: "Restock →" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold mt-0 mb-2.5", children: "Recent" }),
      recent.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Nothing scanned yet", children: "Tap the circle to scan your first product." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: recent.slice(0, 12).map((m) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-3 border-b border-line last:border-b-0", children: [
        /* @__PURE__ */ jsx(Thumb, { imageUrl: m.productImageUrl, label: m.productBrand || m.productName }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: m.productName }),
          /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [m.productBrand, m.staffName || m.staffInitials, timeAgo(m.createdAt)].filter(Boolean).join(" · ") })
        ] }),
        /* @__PURE__ */ jsxs("b", { className: `num text-[15px] ${m.delta > 0 ? "text-good" : "text-action"}`, children: [
          m.delta > 0 ? "+" : "",
          m.delta
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => undo(m),
            "aria-label": `Undo ${m.productName}`,
            title: "Undo",
            className: "w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface",
            children: /* @__PURE__ */ jsx(Undo2, { size: 18 })
          }
        )
      ] }, m.id)) })
    ] }),
    /* @__PURE__ */ jsx(
      CameraScanner,
      {
        open: cameraOpen,
        onClose: () => setCameraOpen(false),
        onScan: (code) => {
          setCameraOpen(false);
          if (!rejectIfPartial(code)) submitScan(code);
        },
        onTypeInstead: () => {
          setCameraOpen(false);
          setTypedCode("");
          setTyping(true);
        },
        onPhotoInstead: startPhoto
      }
    ),
    /* @__PURE__ */ jsx(
      SalesReportSheet,
      {
        open: salesOpen,
        products,
        askStaff,
        onClose: () => setSalesOpen(false),
        onDone: safeRefresh
      }
    ),
    /* @__PURE__ */ jsx(
      PhotoStockSheet,
      {
        file: photo,
        initialMode: mode,
        staffName: photoWho,
        products,
        onClose: () => setPhoto(null),
        onRetake: startPhoto,
        onLogged: async (p, movementId, direction, n) => {
          setPhoto(null);
          onProduct?.(p);
          staffConfirmedAt = Date.now();
          const low = p.qty <= p.reorderThreshold;
          beep(true);
          showOrb({
            kind: direction,
            title: direction === "in" ? `Received ${n}` : `Taken ${n}`,
            sub: `${p.name} · ${p.qty} on hand${low ? " · below par" : ""}`
          });
          toast(`${direction === "in" ? "Added" : "Took"} ${n} × ${p.name}`, async () => {
            const reverted = await undoMovement({ data: { movementId } });
            if (reverted) onProduct?.(reverted);
            await safeRefresh();
            toast("Photo log undone");
          });
          await safeRefresh();
        }
      }
    ),
    /* @__PURE__ */ jsx(Sheet, { open: typing, onClose: () => setTyping(false), title: "Type a barcode", subtitle: "Use the numbers printed under the bars.", children: /* @__PURE__ */ jsxs(
      "form",
      {
        onSubmit: (e) => {
          e.preventDefault();
          const code = typedCode.trim();
          if (!code) return;
          setTyping(false);
          submitScan(code);
        },
        children: [
          /* @__PURE__ */ jsx(Field, { label: "Barcode", htmlFor: "typed-code", children: /* @__PURE__ */ jsx(
            "input",
            {
              id: "typed-code",
              autoFocus: true,
              inputMode: "numeric",
              autoComplete: "off",
              className: "field-input text-center text-xl tracking-[0.12em]",
              value: typedCode,
              onChange: (e) => setTypedCode(e.target.value)
            }
          ) }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setTyping(false), children: "Cancel" }),
            /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", disabled: !typedCode.trim(), children: mode === "in" ? "Scan in" : "Scan out" })
          ] })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(
      Sheet,
      {
        open: unknownBarcode !== null,
        onClose: closeUnknown,
        title: "New barcode",
        subtitle: /* @__PURE__ */ jsxs(Fragment, { children: [
          "First time scanning ",
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: unknownBarcode }),
          ". Save it once and Bintro knows it from now on."
        ] }),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-4", role: "group", "aria-label": "How to add this barcode", children: [
            /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": unknownTab === "new", onClick: () => setUnknownTab("new"), children: "New product" }),
            /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": unknownTab === "link", onClick: () => setUnknownTab("link"), children: "Link to an existing product" })
          ] }),
          unknownBarcode && unknownTab === "new" && /* @__PURE__ */ jsx(
            ProductForm,
            {
              initialBarcode: unknownBarcode,
              barcodeLocked: true,
              autoLookup: true,
              products,
              qtyLabel: "Already on shelf",
              saveLabel: mode === "in" ? "Save and scan in" : "Save and scan out",
              onCancel: closeUnknown,
              onSave: async (values) => {
                await createProduct({ data: values });
                const code = unknownBarcode;
                setUnknownBarcode(null);
                await submitScan(code);
              }
            },
            unknownBarcode
          ),
          unknownTab === "link" && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                value: linkQuery,
                onChange: (e) => setLinkQuery(e.target.value),
                placeholder: "Search name, brand or category",
                "aria-label": "Search existing products",
                autoFocus: true,
                className: "field-input"
              }
            ),
            /* @__PURE__ */ jsxs("ul", { className: "list-none mt-2 p-0 max-h-72 overflow-auto", children: [
              linkResults.map((p) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
                "button",
                {
                  onClick: () => handleLinkExisting(p.id),
                  className: "w-full flex items-center gap-3 py-2.5 px-1 border-0 border-b border-line bg-transparent text-left cursor-pointer hover:bg-surface rounded-lg",
                  children: [
                    /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
                    /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
                      /* @__PURE__ */ jsx("span", { className: "block font-semibold truncate", children: p.name }),
                      /* @__PURE__ */ jsx("span", { className: "block text-[13px] text-ink-2 truncate", children: [p.brand, p.size, p.barcode ? `now ${p.barcode}` : ""].filter(Boolean).join(" · ") })
                    ] })
                  ]
                }
              ) }, p.id)),
              linkQuery.trim() && linkResults.length === 0 && /* @__PURE__ */ jsx("li", { className: "text-ink-2 text-sm py-3", children: "No products match that search." })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-3 mb-0", children: "Linking replaces that product's barcode with this one, then logs the scan." })
          ] })
        ]
      }
    )
  ] });
}
const toCents$1 = (v) => Math.max(0, Math.round((Number(v.replace(/[$,\s]/g, "")) || 0) * 100));
const toInt = (v, min) => Math.max(min, Math.trunc(Number(v) || 0));
function BulkEditSheet({
  open,
  products,
  onClose,
  onDone
}) {
  const toast = useToast();
  const [category, setCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [brand, setBrand] = useState("");
  const [par, setPar] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [pack, setPack] = useState("");
  const [cost, setCost] = useState("");
  const [retail, setRetail] = useState("");
  const [expiry, setExpiry] = useState({ mode: "keep" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setCategory("");
    setVendor("");
    setBrand("");
    setPar("");
    setMaxQty("");
    setPack("");
    setCost("");
    setRetail("");
    setExpiry({ mode: "keep" });
  }, [open]);
  const options = useMemo(() => {
    const uniq2 = (k) => Array.from(new Set(products.map((p) => p[k]).filter(Boolean))).sort();
    return { category: uniq2("category"), vendor: uniq2("vendor"), brand: uniq2("brand") };
  }, [products]);
  const changes = useMemo(() => {
    const c = {};
    if (category.trim()) c.category = category.trim();
    if (vendor.trim()) c.vendor = vendor.trim();
    if (brand.trim()) c.brand = brand.trim();
    if (par.trim() !== "") c.reorderThreshold = toInt(par, 0);
    if (maxQty.trim() !== "") c.maxQty = toInt(maxQty, 0);
    if (pack.trim() !== "") c.packSize = toInt(pack, 1);
    if (cost.trim() !== "") c.unitCostCents = toCents$1(cost);
    if (retail.trim() !== "") c.retailPriceCents = toCents$1(retail);
    if (expiry.mode === "none") c.expiresOn = "none";
    if (expiry.mode === "clear") c.expiresOn = "";
    if (expiry.mode === "date" && isExpiryDate(expiry.value)) c.expiresOn = expiry.value;
    return c;
  }, [category, vendor, brand, par, maxQty, pack, cost, retail, expiry]);
  const count = Object.keys(changes).length;
  async function save() {
    setSaving(true);
    try {
      const r = await bulkUpdateProducts({ data: { productIds: products.map((p) => p.id), changes } });
      await onDone();
      toast(`Updated ${r.updated} product${r.updated === 1 ? "" : "s"}`);
      onClose();
    } catch {
      toast("Couldn't save the changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  const text = (id, label2, value, set, list, placeholder = "Leave as is") => /* @__PURE__ */ jsxs("label", { className: "block text-sm font-semibold", htmlFor: id, children: [
    label2,
    /* @__PURE__ */ jsx(
      "input",
      {
        id,
        className: "field-input !py-2 mt-1 font-normal",
        value,
        placeholder,
        list: list ? `${id}-list` : void 0,
        onChange: (e) => set(e.target.value)
      }
    ),
    list && /* @__PURE__ */ jsx("datalist", { id: `${id}-list`, children: list.map((o) => /* @__PURE__ */ jsx("option", { value: o }, o)) })
  ] });
  const num = (id, label2, value, set, placeholder = "Leave as is", decimal = false) => /* @__PURE__ */ jsxs("label", { className: "block text-sm font-semibold", htmlFor: id, children: [
    label2,
    /* @__PURE__ */ jsx(
      "input",
      {
        id,
        className: "field-input num !py-2 mt-1 font-normal",
        inputMode: decimal ? "decimal" : "numeric",
        type: decimal ? "text" : "number",
        min: 0,
        value,
        placeholder,
        onChange: (e) => set(e.target.value)
      }
    )
  ] });
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: `Edit ${products.length} product${products.length === 1 ? "" : "s"}`,
      subtitle: "Fill in only what you want to change on all of them. Blank fields stay as they are. Counts never change here.",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-3 max-h-[56vh] overflow-auto pr-1", children: [
          text("bulk-category", "Category", category, setCategory, options.category),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            text("bulk-vendor", "Vendor", vendor, setVendor, options.vendor),
            text("bulk-brand", "Brand", brand, setBrand, options.brand)
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
            num("bulk-par", "Reorder at", par, setPar),
            num("bulk-max", "Order up to", maxQty, setMaxQty),
            num("bulk-pack", "Case pack", pack, setPack)
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            num("bulk-cost", "Your cost $", cost, setCost, "Leave as is", true),
            num("bulk-retail", "Sells for $", retail, setRetail, "Leave as is", true)
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "m-0 mb-1.5 text-sm font-semibold", children: "Expires" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", role: "group", "aria-label": "Expiry", children: [
              /* @__PURE__ */ jsx("button", { type: "button", className: "chip", "aria-pressed": expiry.mode === "keep", onClick: () => setExpiry({ mode: "keep" }), children: "Leave as is" }),
              SHELF_LIFE_OPTIONS.map((m) => {
                const date = monthsFromToday(m);
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    className: "chip",
                    "aria-pressed": expiry.mode === "date" && expiry.value === date,
                    onClick: () => setExpiry({ mode: "date", value: date }),
                    children: [
                      m,
                      " months"
                    ]
                  },
                  m
                );
              }),
              /* @__PURE__ */ jsx("button", { type: "button", className: "chip", "aria-pressed": expiry.mode === "none", onClick: () => setExpiry({ mode: "none" }), children: "No expiration" }),
              /* @__PURE__ */ jsx("button", { type: "button", className: "chip", "aria-pressed": expiry.mode === "clear", onClick: () => setExpiry({ mode: "clear" }), children: "Clear expiry" })
            ] }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "date",
                className: "field-input !py-2 mt-2",
                "aria-label": "Or enter the expiry date",
                value: expiry.mode === "date" ? expiry.value : "",
                onChange: (e) => setExpiry(e.target.value ? { mode: "date", value: e.target.value } : { mode: "keep" })
              }
            ),
            expiry.mode === "date" && isExpiryDate(expiry.value) && /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-[12px] text-ink-2", children: [
              "All selected products will expire ",
              expiryLabel(expiry.value),
              "."
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: count === 0 || saving, onClick: save, children: saving ? "Saving…" : count === 0 ? "Choose a change" : `Apply to ${products.length}` })
        ] })
      ]
    }
  );
}
const getSmartPars = createServerFn({
  method: "GET"
}).handler(createSsrRpc("1925026b1c10db48c12f4e2bc0a90574b72aeb87e7330a3827a67fccd409c630"));
const setPars = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  staffName: z.string().max(60).optional(),
  items: z.array(z.object({
    productId: z.number().int().positive(),
    par: z.number().int().min(0).max(999),
    max: z.number().int().min(0).max(1e5).optional()
  })).max(2e3)
})).handler(createSsrRpc("d2eb947b190bba465fbef4ff0d9f99bd3795e54e602970ea5d986889b4a3d83c"));
const undoPars = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  batchId: z.string().min(1).max(80)
})).handler(createSsrRpc("5e9cc7bed4be53338cc819999df27b71a3b7f2e251a871bec2af6e8aacdf1c05"));
const getCategoryGroups = createServerFn({
  method: "GET"
}).handler(createSsrRpc("c99eae04126c4837f668644332b10e45598e6bab6fce5175259446c534e8becc"));
const mergeCategories = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  from: z.array(z.string().max(80)).min(2).max(30),
  to: z.string().trim().min(1).max(80)
})).handler(createSsrRpc("7230639abe8c0164ddf5e85cd8ab6e7ee157f506a9ba2fe42176a6c72ac33fcc"));
const getDuplicateGroups = createServerFn({
  method: "GET"
}).handler(createSsrRpc("c728e1641680bb1e244ecbe094379db36ff732fc76318b2a6e4de1f0f2e82b44"));
createServerFn({
  method: "POST"
}).inputValidator(z.object({
  staffName: z.string().max(60),
  counts: z.array(z.object({
    productId: z.number().int().positive(),
    counted: z.number().int().min(0).max(1e5)
  })).min(1).max(2e3)
})).handler(createSsrRpc("94dc5d50022411a6f751d02b53efd5d2a75c57a40aaded921d36dec0e85d3213"));
const getCategoryList = createServerFn({
  method: "GET"
}).handler(createSsrRpc("96f04bf3fed34aecfd38cecaae8c2d98736f6c1e6a67aceefa2043d3f0ab4245"));
const deleteCategory = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  name: z.string().min(1).max(80),
  moveTo: z.string().max(80)
})).handler(createSsrRpc("877e4e27227a92db358a8d6d55b5295a38b2fb78c1b6aa8e3174209fdf9b131e"));
function DuplicatesSheet({ open, onClose, onDone }) {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [keep, setKeep] = useState({});
  const [busy, setBusy] = useState(null);
  async function load() {
    const g = await getDuplicateGroups();
    setGroups(g);
    setKeep(Object.fromEntries(g.map((grp, i) => [i, grp.products[0].id])));
  }
  useEffect(() => {
    if (open) load().catch(() => setGroups([]));
  }, [open]);
  async function merge(index, group) {
    const target = keep[index] ?? group.products[0].id;
    setBusy(index);
    try {
      for (const p of group.products) {
        if (p.id !== target) await mergeProducts({ data: { sourceId: p.id, targetId: target } });
      }
      toast(`Merged into ${group.products.find((p) => p.id === target)?.name}`);
      await onDone();
      await load();
    } catch (error) {
      toast(error instanceof Error && error.message ? error.message : "Couldn't merge those. Try from the product's Edit sheet.");
    } finally {
      setBusy(null);
    }
  }
  return /* @__PURE__ */ jsx(Sheet, { open, onClose, title: "Possible duplicates", subtitle: "Same name, size and category. Pick the one to keep; the others fold into it with their stock and barcodes.", children: !groups ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Looking for duplicates…" }) : groups.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "No duplicates found. Retail and backbar copies of a product are kept apart on purpose." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 max-h-[60vh] overflow-auto grid gap-3", children: groups.map((g, i) => /* @__PURE__ */ jsxs("li", { className: "bg-surface rounded-2xl p-3", children: [
    g.products.map((p) => /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2 py-1 cursor-pointer", children: [
      /* @__PURE__ */ jsx("input", { type: "radio", name: `keep-${i}`, checked: keep[i] === p.id, onChange: () => setKeep((k) => ({ ...k, [i]: p.id })), className: "mt-1" }),
      /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
        /* @__PURE__ */ jsx("b", { children: p.name }),
        " ",
        /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: [p.brand, p.size, p.category, `${p.qty} on hand`, p.linkedToSquare ? "Square" : ""].filter(Boolean).join(" · ") })
      ] })
    ] }, p.id)),
    /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm mt-2", disabled: busy !== null, onClick: () => merge(i, g), children: busy === i ? "Merging…" : "Keep the selected one and merge" })
  ] }, g.products.map((p) => p.id).join("-"))) }) });
}
function FillCostsSheet({
  open,
  onClose,
  products,
  onDone
}) {
  const missing = useMemo(() => products.filter((p) => !p.unitCostCents), [products]);
  const [state2, setState2] = useState({
    running: false,
    done: 0,
    found: 0,
    failed: 0,
    message: ""
  });
  const stop = useRef(false);
  const [log, setLog] = useState([]);
  useEffect(() => {
    if (!open) stop.current = true;
  }, [open]);
  async function run() {
    stop.current = false;
    setLog([]);
    setState2({ running: true, done: 0, found: 0, failed: 0, message: "" });
    const queue = [...missing];
    let unreachable = 0;
    let found = 0;
    let failed = 0;
    let done = 0;
    const worker = async () => {
      while (queue.length && !stop.current) {
        const p = queue.shift();
        try {
          const r = await checkWebPrice({
            data: { productId: p.id, name: p.name, brand: p.brand, size: p.size, category: p.category, vendor: p.vendor, barcode: p.barcode }
          });
          if (r.ok && r.unitCostCents > 0) {
            await applyWebPrice({
              data: {
                productId: p.id,
                checkId: r.checkId || void 0,
                unitCostCents: r.unitCostCents,
                retailPriceCents: p.retailPriceCents ? void 0 : r.retailPriceCents || void 0
              }
            });
            found++;
            setLog((l) => [`${p.name}: $${centsToDollars(r.unitCostCents)} (${r.sourceName})`, ...l].slice(0, 30));
          } else {
            failed++;
            if (!r.ok && /couldn't check|isn't available/i.test(r.message)) unreachable++;
          }
        } catch {
          failed++;
          unreachable++;
        }
        done++;
        setState2((s) => ({ ...s, done, found, failed }));
        if (unreachable >= 3 && found === 0) {
          stop.current = true;
          setState2((s) => ({
            ...s,
            message: "The AI price service isn't answering on this site right now. Nothing was changed."
          }));
        }
      }
    };
    await Promise.all([worker(), worker()]);
    setState2((s) => ({ ...s, running: false }));
    await onDone();
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose: () => {
        stop.current = true;
        onClose();
      },
      title: "Fill missing costs",
      subtitle: "Checks your supplier first, then professional distributors, then the brand's site. Resale sites like eBay are never used.",
      children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm mt-0", children: [
          /* @__PURE__ */ jsx("b", { children: missing.length }),
          " product",
          missing.length === 1 ? " has" : "s have",
          " no cost. Each check takes 20–40 seconds; keep this open while it runs."
        ] }),
        (state2.running || state2.done > 0) && /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
          "Checked ",
          state2.done,
          " of ",
          missing.length,
          " · ",
          /* @__PURE__ */ jsxs("b", { className: "text-good", children: [
            state2.found,
            " filled"
          ] }),
          state2.failed > 0 && ` · ${state2.failed} not found`
        ] }),
        state2.message && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm font-semibold", children: state2.message }),
        log.length > 0 && /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 text-[13px] text-ink-2 max-h-40 overflow-auto", children: log.map((l) => /* @__PURE__ */ jsx("li", { children: l }, l)) }),
        /* @__PURE__ */ jsx(SheetActions, { children: state2.running ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => stop.current = true, children: "Stop" }) : /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: missing.length === 0, onClick: run, children: state2.done > 0 ? "Run again" : `Fill ${missing.length} cost${missing.length === 1 ? "" : "s"}` }) })
      ]
    }
  );
}
const ORDER_CYCLES = [
  { days: 3, label: "Twice a week" },
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Monthly" }
];
function SmartParSheet({ open, onClose, onDone }) {
  const toast = useToast();
  const { profile } = useBusiness();
  const [data, setData] = useState(null);
  const [skip, setSkip] = useState(/* @__PURE__ */ new Set());
  const [saving, setSaving] = useState(false);
  const [cycleBusy, setCycleBusy] = useState(false);
  const [undoing, setUndoing] = useState(false);
  function load() {
    setData(null);
    getSmartPars().then((d) => {
      setData(d);
      setSkip(new Set(d.suggestions.filter((i) => i.suggested === 0).map((i) => i.productId)));
    }).catch(() => setData({ suggestions: [], overstock: [], orderEveryDays: profile.orderEveryDays || 7, lastChange: null }));
  }
  useEffect(() => {
    if (!open) return;
    setSkip(/* @__PURE__ */ new Set());
    load();
  }, [open]);
  async function setCycle(days) {
    setCycleBusy(true);
    try {
      await updateBusinessProfile({ data: { orderEveryDays: days } });
      load();
    } catch {
      toast("Couldn't save how often you order. Try again.");
    } finally {
      setCycleBusy(false);
    }
  }
  const items = data?.suggestions ?? [];
  const chosen = items.filter((i) => !skip.has(i.productId));
  const quieted = chosen.filter((i) => i.suggested === 0).length;
  const unused = items.filter((i) => i.suggested === 0).length;
  const cycle = data?.orderEveryDays ?? profile.orderEveryDays ?? 7;
  const tiedUp = (data?.overstock ?? []).reduce((sum, o) => sum + o.extraCents, 0);
  async function undo(batchId, count) {
    setUndoing(true);
    try {
      const r = await undoPars({ data: { batchId } });
      toast(`Put ${r.restored || count} product${(r.restored || count) === 1 ? "" : "s"} back to their old levels`);
      await onDone();
      load();
    } catch {
      toast("Couldn't undo. Check your connection and try again.");
    } finally {
      setUndoing(false);
    }
  }
  async function apply() {
    setSaving(true);
    try {
      const r = await setPars({ data: { items: chosen.map((i) => ({ productId: i.productId, par: i.suggested, max: i.suggestedMax })) } });
      await onDone();
      onClose();
      toast(`Updated ${r.updated} product${r.updated === 1 ? "" : "s"}. Your counts didn't change.`, r.batchId ? () => undo(r.batchId, r.updated) : void 0);
    } catch {
      toast("Couldn't save the new levels. Nothing was changed, or use Undo in Smart par if some were.");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Smart par",
      subtitle: "Lean stock levels from what you really use and how long your vendors really take. Reorder before you run out, and order only up to what one order cycle needs.",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
          /* @__PURE__ */ jsx("p", { className: "m-0 mb-1.5 text-sm font-semibold", children: "How often do you place orders?" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", role: "group", "aria-label": "How often you order", children: ORDER_CYCLES.map((c) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "chip",
              "aria-pressed": cycle === c.days,
              disabled: cycleBusy,
              onClick: () => cycle !== c.days && setCycle(c.days),
              children: c.label
            },
            c.days
          )) }),
          /* @__PURE__ */ jsx("p", { className: "m-0 mt-1.5 text-[12px] text-ink-2", children: "Ordering more often keeps less on the shelf and less cash tied up." })
        ] }),
        data?.lastChange && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 mb-3 text-sm", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex-1", children: [
            "Last applied ",
            new Date(data.lastChange.at).toLocaleString(void 0, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
            " to",
            " ",
            /* @__PURE__ */ jsx("b", { children: data.lastChange.products }),
            " product",
            data.lastChange.products === 1 ? "" : "s",
            ". Only levels changed, never counts."
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-tonal btn-sm shrink-0",
              disabled: undoing,
              onClick: () => undo(data.lastChange.batchId, data.lastChange.products),
              children: undoing ? "Undoing…" : "Undo"
            }
          )
        ] }),
        !data ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Working out your usage…" }) : /* @__PURE__ */ jsxs("div", { className: "max-h-[50vh] overflow-auto", children: [
          data.overstock.length > 0 && /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-warn-tint p-3 mb-3 text-sm", children: [
            /* @__PURE__ */ jsxs("p", { className: "m-0 font-semibold text-warn", children: [
              "About $",
              centsToDollars(tiedUp),
              " is sitting on the shelf beyond what you need"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "m-0 mt-0.5 text-[13px]", children: "Hold off reordering these until they come down. Consider featuring them or using them first." }),
            /* @__PURE__ */ jsx("ul", { className: "list-none m-0 mt-2 p-0", children: data.overstock.slice(0, 6).map((o) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-2 py-0.5", children: [
              /* @__PURE__ */ jsx("span", { className: "truncate", children: o.name }),
              /* @__PURE__ */ jsxs("span", { className: "whitespace-nowrap text-[13px] num", children: [
                o.onHand,
                " on hand · ~",
                o.daysOfStock,
                " days · $",
                centsToDollars(o.extraCents),
                " extra"
              ] })
            ] }, o.productId)) })
          ] }),
          items.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Your levels already match how fast you use things." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm mt-0", children: [
              items.length - unused,
              " product",
              items.length - unused === 1 ? "" : "s",
              " to tune from real use. Untick any you want to keep as they are.",
              unused > 0 && /* @__PURE__ */ jsxs("span", { className: "block mt-1 text-[13px] text-ink-2", children: [
                unused,
                " more had nothing scanned out in 90 days. They're left unticked: if you use them on clients but don't scan them out, keep their alerts on. Tick only the ones you've truly stopped using",
                quieted > 0 ? ` (${quieted} ticked)` : "",
                "."
              ] })
            ] }),
            /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: items.map((i) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2 py-2.5 border-b border-line last:border-b-0", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  className: "mt-1",
                  checked: !skip.has(i.productId),
                  "aria-label": `Apply to ${i.name}`,
                  onChange: (e) => setSkip((s) => {
                    const next = new Set(s);
                    if (e.target.checked) next.delete(i.productId);
                    else next.add(i.productId);
                    return next;
                  })
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold leading-snug", children: i.name }),
                /* @__PURE__ */ jsx("div", { className: "text-[12px] text-ink-2", children: i.reason })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap text-[13px] num", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  "Reorder at ",
                  i.current !== i.suggested && /* @__PURE__ */ jsx("span", { className: "text-ink-2 line-through mr-1", children: i.current }),
                  /* @__PURE__ */ jsx("b", { children: i.suggested })
                ] }),
                i.suggestedMax > 0 && /* @__PURE__ */ jsxs("div", { className: "text-ink-2", children: [
                  "Order up to ",
                  /* @__PURE__ */ jsx("b", { className: "text-ink", children: i.suggestedMax }),
                  i.packSize > 1 && ` (cases of ${i.packSize})`
                ] })
              ] })
            ] }, i.productId)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: chosen.length === 0 || saving || !data, onClick: apply, children: saving ? "Saving…" : `Apply ${chosen.length}` })
        ] })
      ]
    }
  );
}
function CategoryCleanup({ onChanged }) {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    getCategoryGroups().then((g) => {
      setGroups(g);
      setPick(Object.fromEntries(g.map((grp, i) => [i, grp.names[0].name])));
    }).catch(() => setGroups([]));
  }, []);
  if (!groups || groups.length === 0) return null;
  async function merge(i, g) {
    const to = pick[i] ?? g.names[0].name;
    setBusy(i);
    try {
      const next = await mergeCategories({ data: { from: g.names.map((n) => n.name), to } });
      setGroups(next);
      setPick(Object.fromEntries(next.map((grp, j) => [j, grp.names[0].name])));
      toast(`Merged into “${to.trim()}”`);
      await onChanged?.();
    } catch {
      toast("Couldn't merge those categories. Try again.");
    } finally {
      setBusy(null);
    }
  }
  return /* @__PURE__ */ jsxs("section", { className: "bg-warn-tint rounded-2xl p-4 mb-5", children: [
    /* @__PURE__ */ jsx("h3", { className: "m-0 mb-1 text-base font-bold", children: "Tidy up categories" }),
    /* @__PURE__ */ jsx("p", { className: "m-0 mb-3 text-sm text-ink-2", children: "These look like the same category spelled different ways, which splits your reports and tax totals." }),
    /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 grid gap-2.5", children: groups.map((g, i) => /* @__PURE__ */ jsxs("li", { className: "bg-white rounded-xl p-3", children: [
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: g.names.map((n) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "chip",
          "aria-pressed": pick[i] === n.name,
          onClick: () => setPick((p) => ({ ...p, [i]: n.name })),
          children: [
            pick[i] === n.name && /* @__PURE__ */ jsx(Check, { size: 14 }),
            n.name.trim() || "(blank)",
            " · ",
            n.products
          ]
        },
        n.name
      )) }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm", disabled: busy !== null, onClick: () => merge(i, g), children: busy === i ? "Merging…" : `Use “${(pick[i] ?? g.names[0].name).trim()}” for all ${g.total}` })
    ] }, g.names.map((n) => n.name).join("|"))) })
  ] });
}
function CategoryList({ onChanged }) {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getCategoryList().then(setList).catch(() => setList([]));
  }, []);
  async function confirm(name) {
    setBusy(true);
    try {
      const r = await deleteCategory({ data: { name, moveTo } });
      setList(r.list);
      setDeleting(null);
      toast(
        r.moved ? `Deleted “${name}”. ${r.moved} product${r.moved === 1 ? "" : "s"} moved to ${moveTo ? `“${moveTo}”` : "no category"}.` : `Deleted “${name}”.`
      );
      await onChanged?.();
    } catch {
      toast("Couldn't delete that category. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (!list || list.length === 0) return null;
  return /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4 mb-5", children: [
    /* @__PURE__ */ jsx("h3", { className: "m-0 mb-1 text-base font-bold", children: "All categories in use" }),
    /* @__PURE__ */ jsx("p", { className: "m-0 mb-3 text-sm text-ink-2", children: "Delete one you don't need. Its products move to the category you pick, so nothing is lost." }),
    /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: list.map((c) => /* @__PURE__ */ jsxs("li", { className: "py-2.5 border-b border-line last:border-b-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold block truncate", children: c.name }),
          /* @__PURE__ */ jsx("span", { className: "text-[12px] text-ink-2", children: c.products ? `${c.products} product${c.products === 1 ? "" : "s"}` : "No products" })
        ] }),
        deleting !== c.name && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "btn btn-text btn-sm !text-bad",
            onClick: () => {
              setDeleting(c.name);
              setMoveTo("");
            },
            children: "Delete"
          }
        )
      ] }),
      deleting === c.name && /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-xl bg-bad-tint p-3 text-sm", children: [
        c.products > 0 && /* @__PURE__ */ jsxs("label", { className: "block mb-2", children: [
          "Move its ",
          c.products,
          " product",
          c.products === 1 ? "" : "s",
          " to",
          /* @__PURE__ */ jsxs("select", { className: "field-input !py-2 mt-1", value: moveTo, onChange: (e) => setMoveTo(e.target.value), children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "No category" }),
            list.filter((o) => o.name !== c.name).map((o) => /* @__PURE__ */ jsx("option", { value: o.name, children: o.name }, o.name))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-danger btn-sm", disabled: busy, onClick: () => confirm(c.name), children: busy ? "Deleting…" : `Delete “${c.name}”` }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal btn-sm", disabled: busy, onClick: () => setDeleting(null), children: "Keep it" })
        ] })
      ] })
    ] }, c.name)) })
  ] });
}
const approveStockCount = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  scope: z.string().max(120),
  blind: z.boolean(),
  staffName: z.string().max(60),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    counted: z.number().int().min(0).max(1e5),
    reason: z.string().max(80)
  })).min(1).max(3e3)
})).handler(createSsrRpc("3af6d1532c5910dfeaf1944cfd3ea22a6cfe5d6d2cd58a6f7be05c8a845b4581"));
const getCountHistory = createServerFn({
  method: "GET"
}).handler(createSsrRpc("70a49bef360b5fee1216cae4408b5adaa514ef6d444589a51890f9fe5b87f134"));
const getCountLines = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  countId: z.number().int().positive()
})).handler(createSsrRpc("f61d34714fb847548ce8ac02dc39c8f7402907e44e82cf47e337f1bcaf53d121"));
const DRAFT_KEY$1 = "bintro.countDraft";
const money$1 = (cents) => `${cents < 0 ? "−" : ""}$${centsToDollars(Math.abs(cents))}`;
function readDraft$1() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY$1);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(d) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY$1, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY$1);
  } catch {
  }
}
function CountReconcileSheet({
  open,
  onClose,
  products,
  staffName,
  initialScope,
  onDone
}) {
  const toast = useToast();
  const [stage, setStage] = useState("setup");
  const [kind, setKind] = useState("all");
  const [value, setValue] = useState("");
  const [blind, setBlind] = useState(true);
  const [counts, setCounts] = useState({});
  const [picked, setPicked] = useState([]);
  const [startedAt, setStartedAt] = useState("");
  const [query, setQuery] = useState("");
  const [reasons, setReasons] = useState({});
  const [confirmed, setConfirmed] = useState(/* @__PURE__ */ new Set());
  const [recounting, setRecounting] = useState(/* @__PURE__ */ new Set());
  const [uncountedZero, setUncountedZero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  const [draftFound, setDraftFound] = useState(null);
  const scanRef = useRef(null);
  const inputRefs = useRef({});
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(), [products]);
  const vendors = useMemo(() => Array.from(new Set(products.map((p) => p.vendor).filter(Boolean))).sort(), [products]);
  useEffect(() => {
    if (!open) return;
    setStage("setup");
    setResult(null);
    setQuery("");
    setReasons({});
    setConfirmed(/* @__PURE__ */ new Set());
    setRecounting(/* @__PURE__ */ new Set());
    setUncountedZero(false);
    setOpenCount(null);
    const draft = readDraft$1();
    setDraftFound(draft && Object.values(draft.counts).some((v) => String(v).trim() !== "") ? draft : null);
    if (initialScope) {
      setKind(initialScope);
      setValue("");
      setBlind(initialScope !== "negatives");
    }
    getCountHistory().then(setHistory).catch(() => setHistory([]));
  }, [open]);
  const scoped = useMemo(() => {
    const list = products.filter((p) => {
      if (kind === "category") return p.category === value;
      if (kind === "vendor") return p.vendor === value;
      if (kind === "below") return isBelowPar(p);
      if (kind === "negatives") return p.qty < 0;
      if (kind === "pick") return picked.includes(p.id);
      return true;
    });
    const extra = Object.keys(counts).map(Number).filter((id) => !list.some((p) => p.id === id)).map((id) => byId.get(id)).filter((p) => Boolean(p));
    return [...list, ...extra].sort((a, b) => (a.category || "~").localeCompare(b.category || "~") || a.name.localeCompare(b.name));
  }, [products, kind, value, picked, counts, byId]);
  const scopeLabel = kind === "all" ? "Everything" : kind === "category" ? `Category: ${value}` : kind === "vendor" ? `Vendor: ${value}` : kind === "below" ? "Below par" : kind === "negatives" ? "Negative counts" : "Picked products";
  function persist(next) {
    writeDraft({ kind, value, blind, counts, picked, startedAt, ...next });
  }
  function setCount(id, v) {
    setCounts((c) => {
      const next = { ...c, [id]: v };
      persist({ counts: next });
      return next;
    });
  }
  function start() {
    const at = (/* @__PURE__ */ new Date()).toISOString();
    setStartedAt(at);
    setCounts({});
    writeDraft({ kind, value, blind, counts: {}, picked, startedAt: at });
    setStage("count");
    setTimeout(() => scanRef.current?.focus(), 50);
  }
  function resume(d) {
    setKind(d.kind);
    setValue(d.value);
    setBlind(d.blind);
    setCounts(d.counts);
    setPicked(d.picked ?? []);
    setStartedAt(d.startedAt);
    setDraftFound(null);
    setStage("count");
  }
  function discardDraft() {
    writeDraft(null);
    setDraftFound(null);
  }
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => [p.name, p.brand, p.size, p.barcode, ...p.extraBarcodes ?? []].join(" ").toLowerCase().includes(q)).slice(0, 6);
  }, [query, products]);
  function hit(p, addOne) {
    if (kind === "pick" && !picked.includes(p.id)) {
      const next = [...picked, p.id];
      setPicked(next);
      persist({ picked: next });
    }
    if (addOne) setCount(p.id, String((Number(counts[p.id]) || 0) + 1));
    setQuery("");
    setTimeout(() => {
      const el = inputRefs.current[p.id];
      if (addOne) scanRef.current?.focus();
      else el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 30);
  }
  function onScanEnter() {
    const q = query.trim();
    const exact = products.find((p) => p.barcode === q || (p.extraBarcodes ?? []).includes(q));
    if (exact) hit(exact, true);
    else if (matches.length === 1) hit(matches[0], false);
  }
  const counted = scoped.filter((p) => (counts[p.id] ?? "").trim() !== "");
  const uncounted = scoped.filter((p) => (counts[p.id] ?? "").trim() === "");
  const lines = useMemo(() => {
    const source = uncountedZero ? scoped : counted;
    return source.map((p) => {
      const raw = (counts[p.id] ?? "").trim();
      const countedQty = raw === "" ? 0 : Math.max(0, Math.trunc(Number(raw) || 0));
      const diff = countedQty - p.qty;
      return { p, expected: p.qty, countedQty, diff, valueCents: diff * p.unitCostCents, flag: needsRecount(p.qty, countedQty, p.unitCostCents) };
    });
  }, [scoped, counted, counts, uncountedZero]);
  const diffs = lines.filter((l) => l.diff !== 0).sort((a, b) => Math.abs(b.valueCents) - Math.abs(a.valueCents) || Math.abs(b.diff) - Math.abs(a.diff));
  const unitsOver = diffs.filter((l) => l.diff > 0).reduce((s, l) => s + l.diff, 0);
  const unitsShort = diffs.filter((l) => l.diff < 0).reduce((s, l) => s - l.diff, 0);
  const netCents = diffs.reduce((s, l) => s + l.valueCents, 0);
  const openFlags = diffs.filter((l) => l.flag && !confirmed.has(l.p.id));
  const missingReasons = diffs.filter((l) => !reasons[l.p.id]);
  async function approve() {
    setSaving(true);
    try {
      const r = await approveStockCount({
        data: {
          scope: scopeLabel,
          blind,
          staffName,
          lines: lines.map((l) => ({ productId: l.p.id, counted: l.countedQty, reason: reasons[l.p.id] ?? "" }))
        }
      });
      writeDraft(null);
      setResult(r);
      setStage("done");
      await onDone();
      getCountHistory().then(setHistory).catch(() => void 0);
    } catch {
      toast("Couldn't approve the count. Check your connection and try again. Your counts are still saved here.");
    } finally {
      setSaving(false);
    }
  }
  async function showCount(id) {
    setOpenCount({ id, lines: null });
    try {
      setOpenCount({ id, lines: await getCountLines({ data: { countId: id } }) });
    } catch {
      setOpenCount({ id, lines: [] });
    }
  }
  const steps = [
    { id: "setup", label: "1 · Choose" },
    { id: "count", label: "2 · Count" },
    { id: "review", label: "3 · Review" },
    { id: "done", label: "4 · Approved" }
  ];
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Count & reconcile",
      subtitle: "Count what's really on the shelf, review only what doesn't match, give a reason, then approve. Every count is saved to history.",
      children: [
        stage !== "history" && /* @__PURE__ */ jsx("ol", { className: "list-none m-0 mb-3 p-0 flex gap-1.5 text-[12px] font-semibold", "aria-label": "Steps", children: steps.map((s) => /* @__PURE__ */ jsx(
          "li",
          {
            className: `flex-1 text-center rounded-full py-1 ${stage === s.id ? "bg-action text-white" : "bg-surface text-ink-2"}`,
            "aria-current": stage === s.id ? "step" : void 0,
            children: s.label
          },
          s.id
        )) }),
        stage === "setup" && /* @__PURE__ */ jsxs("div", { className: "grid gap-3 max-h-[58vh] overflow-auto", children: [
          draftFound && /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-gold-tint p-3 text-sm", children: [
            /* @__PURE__ */ jsx("b", { children: "A count is in progress" }),
            " on this device: ",
            Object.values(draftFound.counts).filter((v) => String(v).trim() !== "").length,
            " counted.",
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-2", children: [
              /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm", onClick: () => resume(draftFound), children: "Pick up where you left off" }),
              /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: discardDraft, children: "Start over" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "m-0 mb-1.5 text-sm font-semibold", children: "What are you counting?" }),
            /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: [
              ["all", "Everything"],
              ["category", "A category"],
              ["vendor", "One vendor"],
              ["below", "Below par"],
              ["negatives", "Negative counts"],
              ["pick", "Pick as I go"]
            ].map(([k, label2]) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "chip",
                "aria-pressed": kind === k,
                onClick: () => {
                  setKind(k);
                  setValue(k === "category" ? categories[0] ?? "" : k === "vendor" ? vendors[0] ?? "" : "");
                },
                children: label2
              },
              k
            )) }),
            (kind === "category" || kind === "vendor") && /* @__PURE__ */ jsx("select", { className: "field-input !py-2 mt-2", value, onChange: (e) => setValue(e.target.value), "aria-label": kind, children: (kind === "category" ? categories : vendors).map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }, o)) }),
            /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1.5 text-[12px] text-ink-2", children: [
              kind === "pick" ? "Scan or search each product as you count it." : `${scoped.length} product${scoped.length === 1 ? "" : "s"} to count.`,
              " A shelf at a time is easiest: one category or one vendor per count."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2.5 rounded-xl bg-surface p-3 cursor-pointer", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", className: "mt-1", checked: blind, onChange: (e) => setBlind(e.target.checked) }),
            /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
              /* @__PURE__ */ jsxs("b", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx(EyeOff, { size: 15 }),
                " Blind count (recommended)"
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "Hide what Bintro thinks is there, so staff count what's really on the shelf instead of matching a number." })
            ] })
          ] }),
          history && history.length > 0 && /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-text btn-sm justify-start", onClick: () => setStage("history"), children: [
            /* @__PURE__ */ jsx(History, { size: 15 }),
            " Count history (",
            history.length,
            ")"
          ] })
        ] }),
        stage === "count" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              ref: scanRef,
              value: query,
              onChange: (e) => setQuery(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onScanEnter();
                }
              },
              placeholder: "Scan a barcode (each scan adds 1) or type a name",
              "aria-label": "Scan or search a product",
              className: "field-input"
            }
          ),
          matches.length > 0 && /* @__PURE__ */ jsx("ul", { className: "list-none m-0 mt-1 p-0 border border-line rounded-xl", children: matches.map((p) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", { type: "button", className: "w-full text-left px-3 py-2 border-0 bg-transparent cursor-pointer hover:bg-surface text-sm", onClick: () => hit(p, false), children: [
            /* @__PURE__ */ jsx("b", { children: p.name }),
            " ",
            /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: [p.brand, p.size].filter(Boolean).join(" · ") })
          ] }) }, p.id)) }),
          /* @__PURE__ */ jsxs("p", { className: "m-0 mt-2 text-[13px]", children: [
            /* @__PURE__ */ jsx("b", { children: counted.length }),
            " of ",
            scoped.length,
            " counted · ",
            scopeLabel,
            blind && /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: " · blind" })
          ] }),
          /* @__PURE__ */ jsxs("ul", { className: "list-none m-0 mt-1 p-0 max-h-[44vh] overflow-auto", children: [
            scoped.map((p, i) => {
              const showHeader = i === 0 || (scoped[i - 1].category || "") !== (p.category || "");
              const done = (counts[p.id] ?? "").trim() !== "";
              return /* @__PURE__ */ jsxs("li", { children: [
                showHeader && /* @__PURE__ */ jsx("div", { className: "text-[11px] font-bold uppercase tracking-wider text-ink-2 pt-3 pb-1", children: p.category || "No category" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 py-2 border-b border-line", children: [
                  done ? /* @__PURE__ */ jsx(Check, { size: 16, className: "text-good shrink-0" }) : /* @__PURE__ */ jsx("span", { className: "w-4 shrink-0" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsx("div", { className: "font-semibold leading-snug", children: p.name }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[12px] text-ink-2 truncate", children: [
                      [p.brand, p.size].filter(Boolean).join(" · "),
                      !blind && /* @__PURE__ */ jsxs("span", { children: [
                        " · Bintro shows ",
                        p.qty
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "text-[11px] text-ink-2", children: lastCountedLabel(p) })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: (el) => {
                        inputRefs.current[p.id] = el;
                      },
                      type: "number",
                      min: 0,
                      inputMode: "numeric",
                      "aria-label": `Counted ${p.name}`,
                      placeholder: "#",
                      value: counts[p.id] ?? "",
                      onChange: (e) => setCount(p.id, e.target.value),
                      className: "field-input !w-[72px] shrink-0 text-center !px-1 !py-1.5"
                    }
                  )
                ] })
              ] }, p.id);
            }),
            scoped.length === 0 && /* @__PURE__ */ jsx("li", { className: "text-ink-2 text-sm py-3", children: "Scan or search the first product." })
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage("setup"), children: "Back" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: counted.length === 0, onClick: () => setStage("review"), children: "Review differences" })
          ] })
        ] }),
        stage === "review" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-2 text-center mb-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-good-tint p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "num text-lg font-extrabold text-good", children: lines.length - diffs.length }),
              /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold", children: "Match" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-surface p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "num text-lg font-extrabold", children: unitsOver ? `+${unitsOver}` : 0 }),
              /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold", children: "Over" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-bad-tint p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "num text-lg font-extrabold text-bad", children: unitsShort ? `−${unitsShort}` : 0 }),
              /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold", children: "Short" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: `rounded-xl p-2 ${netCents < 0 ? "bg-bad-tint" : "bg-surface"}`, children: [
              /* @__PURE__ */ jsx("div", { className: `num text-lg font-extrabold ${netCents < 0 ? "text-bad" : ""}`, children: money$1(netCents) }),
              /* @__PURE__ */ jsx("div", { className: "text-[11px] font-semibold", children: "Net value" })
            ] })
          ] }),
          uncounted.length > 0 && kind !== "pick" && /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2 text-[13px] mb-2", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", className: "mt-0.5", checked: uncountedZero, onChange: (e) => setUncountedZero(e.target.checked) }),
            /* @__PURE__ */ jsxs("span", { children: [
              uncounted.length,
              " product",
              uncounted.length === 1 ? "" : "s",
              " not counted. Leave them as they are, or tick to mark them as ",
              /* @__PURE__ */ jsx("b", { children: "none on the shelf (0)" }),
              "."
            ] })
          ] }),
          diffs.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-sm rounded-xl bg-good-tint text-good font-semibold p-3 m-0", children: "Everything you counted matches. Approve to save the count." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 mb-1", children: [
              /* @__PURE__ */ jsxs("p", { className: "m-0 text-[13px]", children: [
                diffs.length,
                " difference",
                diffs.length === 1 ? "" : "s",
                ". Give each a reason",
                openFlags.length > 0 ? " and check the flagged ones" : "",
                "."
              ] }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "chip !py-1 !text-[12px]",
                  value: "",
                  "aria-label": "Set a reason for all",
                  onChange: (e) => {
                    const r = e.target.value;
                    if (r) setReasons((all) => ({ ...all, ...Object.fromEntries(diffs.filter((l) => !all[l.p.id]).map((l) => [l.p.id, r])) }));
                  },
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "", children: "Reason for the rest…" }),
                    COUNT_REASONS.map((r) => /* @__PURE__ */ jsx("option", { value: r, children: r }, r))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 max-h-[38vh] overflow-auto", children: diffs.map((l) => {
              const flagged = l.flag && !confirmed.has(l.p.id);
              return /* @__PURE__ */ jsxs("li", { className: `py-2.5 border-b border-line last:border-b-0 ${flagged ? "bg-warn-tint/60 -mx-2 px-2 rounded-xl" : ""}`, children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsx("div", { className: "font-semibold leading-snug", children: l.p.name }),
                    /* @__PURE__ */ jsxs("div", { className: "text-[12px] text-ink-2", children: [
                      "Bintro ",
                      l.expected,
                      " → counted ",
                      /* @__PURE__ */ jsx("b", { className: "text-ink", children: l.countedQty }),
                      l.p.unitCostCents > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
                        " · ",
                        money$1(l.valueCents)
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("span", { className: `num text-sm font-extrabold rounded-full px-2 py-0.5 ${l.diff > 0 ? "bg-surface" : "bg-bad-tint text-bad"}`, children: [
                    l.diff > 0 ? "+" : "−",
                    Math.abs(l.diff)
                  ] })
                ] }),
                flagged && /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex flex-wrap items-center gap-2 text-[12px]", children: [
                  /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 font-semibold text-warn", children: [
                    /* @__PURE__ */ jsx(AlertTriangle, { size: 14 }),
                    " Big difference. Recount before approving."
                  ] }),
                  recounting.has(l.p.id) ? /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        type: "number",
                        min: 0,
                        inputMode: "numeric",
                        autoFocus: true,
                        "aria-label": `Recount ${l.p.name}`,
                        className: "field-input !w-[72px] text-center !px-1 !py-1",
                        value: counts[l.p.id] ?? "",
                        onChange: (e) => setCount(l.p.id, e.target.value)
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        className: "btn btn-primary btn-sm",
                        onClick: () => setConfirmed((s) => new Set(s).add(l.p.id)),
                        children: "Recounted"
                      }
                    )
                  ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal btn-sm", onClick: () => setRecounting((s) => new Set(s).add(l.p.id)), children: [
                      /* @__PURE__ */ jsx(RotateCcw, { size: 13 }),
                      " Recount"
                    ] }),
                    /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: () => setConfirmed((s) => new Set(s).add(l.p.id)), children: "Count is right" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs(
                  "select",
                  {
                    className: "field-input !py-1.5 mt-1.5 text-sm",
                    value: reasons[l.p.id] ?? "",
                    "aria-label": `Reason for ${l.p.name}`,
                    onChange: (e) => setReasons((r) => ({ ...r, [l.p.id]: e.target.value })),
                    children: [
                      /* @__PURE__ */ jsx("option", { value: "", children: "Why is it different?" }),
                      COUNT_REASONS.map((r) => /* @__PURE__ */ jsx("option", { value: r, children: r }, r))
                    ]
                  }
                )
              ] }, l.p.id);
            }) })
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage("count"), children: "Back to counting" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "btn btn-primary",
                disabled: saving || lines.length === 0 || openFlags.length > 0 || missingReasons.length > 0,
                onClick: approve,
                children: saving ? "Approving…" : openFlags.length > 0 ? `Check ${openFlags.length} flagged` : missingReasons.length > 0 ? `${missingReasons.length} need a reason` : diffs.length ? `Approve ${diffs.length} change${diffs.length === 1 ? "" : "s"}` : "Approve count"
              }
            )
          ] })
        ] }),
        stage === "done" && result && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-good-tint p-4 text-sm", children: [
            /* @__PURE__ */ jsxs("p", { className: "m-0 font-extrabold text-good flex items-center gap-1.5 text-base", children: [
              /* @__PURE__ */ jsx(ClipboardCheck, { size: 18 }),
              " Count #",
              result.id,
              " approved"
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1", children: [
              result.itemsCounted,
              " counted · ",
              result.itemsChanged,
              " adjusted · +",
              result.unitsOver,
              " over · −",
              result.unitsShort,
              " short · net ",
              money$1(result.valueDiffCents)
            ] }),
            /* @__PURE__ */ jsx("p", { className: "m-0 mt-1 text-ink-2", children: "Each change is in Activity with its reason, and the full count is in Count history." })
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage("history"), children: "Count history" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: onClose, children: "Done" })
          ] })
        ] }),
        stage === "history" && /* @__PURE__ */ jsxs(Fragment, { children: [
          !history ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Loading…" }) : history.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "No counts approved yet." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 max-h-[56vh] overflow-auto", children: history.map((c) => /* @__PURE__ */ jsxs("li", { className: "py-2.5 border-b border-line last:border-b-0", children: [
            /* @__PURE__ */ jsxs("button", { type: "button", className: "w-full text-left border-0 bg-transparent p-0 cursor-pointer", onClick: () => openCount?.id === c.id ? setOpenCount(null) : showCount(c.id), children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between gap-2", children: [
                /* @__PURE__ */ jsxs("b", { className: "text-sm", children: [
                  "#",
                  c.id,
                  " · ",
                  c.scope,
                  c.blind && /* @__PURE__ */ jsx("span", { className: "text-ink-2 font-normal", children: " · blind" })
                ] }),
                /* @__PURE__ */ jsx("span", { className: `num text-sm font-bold ${c.valueDiffCents < 0 ? "text-bad" : ""}`, children: money$1(c.valueDiffCents) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-[12px] text-ink-2", children: [
                new Date(c.createdAt).toLocaleString(void 0, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
                c.staffName && ` · ${c.staffName}`,
                " · ",
                c.itemsCounted,
                " counted · ",
                c.itemsChanged,
                " adjusted · +",
                c.unitsOver,
                " / −",
                c.unitsShort
              ] })
            ] }),
            openCount?.id === c.id && /* @__PURE__ */ jsx("div", { className: "mt-2 rounded-xl bg-surface p-2.5 text-[13px]", children: !openCount.lines ? "Loading…" : openCount.lines.filter((l) => l.diff !== 0).length === 0 ? "Everything matched." : openCount.lines.filter((l) => l.diff !== 0).map((l) => /* @__PURE__ */ jsxs("div", { className: "flex justify-between gap-2 py-0.5", children: [
              /* @__PURE__ */ jsxs("span", { className: "truncate", children: [
                l.name,
                " ",
                /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
                  "· ",
                  l.reason || "no reason"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "num whitespace-nowrap", children: [
                l.expected,
                " → ",
                l.counted,
                " (",
                l.diff > 0 ? "+" : "",
                l.diff,
                ")"
              ] })
            ] }, l.productId)) })
          ] }, c.id)) }),
          /* @__PURE__ */ jsx(SheetActions, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage(result ? "done" : "setup"), children: "Back" }) })
        ] }),
        stage === "setup" && /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onClose, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", disabled: (kind === "category" || kind === "vendor") && !value, onClick: start, children: "Start counting" })
        ] })
      ]
    }
  );
}
function InventoryView({
  products,
  stats,
  staffName,
  onProduct,
  onChanged
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [tool, setTool] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const expiringCount = useMemo(() => products.filter((p) => ["soon", "expired"].includes(expiryState(p.expiresOn))).length, [products]);
  const negativeIds = useMemo(() => products.filter((p) => p.qty < 0).map((p) => p.id), [products]);
  const missingCosts = useMemo(() => products.filter((p) => !p.unitCostCents).length, [products]);
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const filtered = products.filter((p) => {
    if (filter === "below" && !isBelowPar(p)) return false;
    if (filter === "out" && stockStatus(p) !== "out") return false;
    if (filter === "expiring" && !["soon", "expired"].includes(expiryState(p.expiresOn))) return false;
    if (category !== "all" && p.category !== category) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const haystack = [p.name, p.brand, p.barcode, ...p.extraBarcodes ?? [], p.vendor, p.category].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  const selectedProducts = products.filter((p) => selected.has(p.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  function toggle(id) {
    setDeleteArmed(false);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function stopSelecting() {
    setSelecting(false);
    setSelected(/* @__PURE__ */ new Set());
    setDeleteArmed(false);
  }
  async function deleteSelected() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setBulkBusy(true);
    try {
      const r = await bulkDeleteProducts({ data: { productIds: [...selected] } });
      toast(`Deleted ${r.deleted} product${r.deleted === 1 ? "" : "s"}`);
      stopSelecting();
      await onChanged();
    } catch {
      toast("Couldn't delete those. Check your connection and try again.");
    } finally {
      setBulkBusy(false);
      setDeleteArmed(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: selecting ? "pb-24" : "", children: [
    /* @__PURE__ */ jsx(
      PageHead,
      {
        title: "Products",
        lead: "Everything on the shelf, and everything Bintro recognizes when you scan.",
        action: /* @__PURE__ */ jsx("button", { className: "btn btn-primary btn-sm", onClick: () => setAdding(true), children: "Add product" })
      }
    ),
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: "Units on hand", value: stats.totalItems }),
      /* @__PURE__ */ jsx(StatTile, { label: "Stock value", value: dollarsShort(stats.totalValueCents) }),
      /* @__PURE__ */ jsx(StatTile, { label: "Below par", value: stats.belowPar, tone: stats.belowPar > 0 ? "warn" : "good" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Out of stock", value: stats.outOfStock, tone: stats.outOfStock > 0 ? "bad" : "good" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-4 overflow-x-auto pb-2 mb-3 -mx-1 px-1", role: "group", "aria-label": "Keep your stock accurate", children: [
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(ClipboardCheck, { size: 24 }), tone: "garnet", label: "Count & reconcile", onClick: () => setTool("count") }),
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Gauge, { size: 24 }), tone: "yellow", label: "Smart par", onClick: () => setTool("smartpar") }),
      negativeIds.length > 0 && /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(CircleMinus, { size: 24 }), tone: "red", label: "Fix negatives", badge: negativeIds.length, onClick: () => setTool("negatives") }),
      missingCosts > 0 && /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Tag, { size: 24 }), tone: "orange", label: "Missing costs", badge: missingCosts, onClick: () => setTool("costs") }),
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Copy, { size: 24 }), tone: "purple", label: "Duplicates", onClick: () => setTool("duplicates") })
    ] }),
    /* @__PURE__ */ jsx(
      CountReconcileSheet,
      {
        open: tool === "count" || tool === "negatives",
        onClose: () => setTool(null),
        products,
        staffName,
        initialScope: tool === "negatives" ? "negatives" : void 0,
        onDone: onChanged
      }
    ),
    /* @__PURE__ */ jsx(SmartParSheet, { open: tool === "smartpar", onClose: () => setTool(null), onDone: onChanged }),
    /* @__PURE__ */ jsx(DuplicatesSheet, { open: tool === "duplicates", onClose: () => setTool(null), onDone: onChanged }),
    /* @__PURE__ */ jsx(FillCostsSheet, { open: tool === "costs", onClose: () => setTool(null), products, onDone: onChanged }),
    /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2.5 bg-surface rounded-full px-4 mb-3.5", children: [
      /* @__PURE__ */ jsx(Search, { size: 20, className: "text-ink-2 shrink-0" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "search",
          value: query,
          onChange: (e) => setQuery(e.target.value),
          placeholder: "Search brand, product, vendor or barcode",
          "aria-label": "Search products",
          className: "flex-1 border-0 bg-transparent py-3.5 text-base outline-none"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 overflow-x-auto pb-1 mb-4 items-center", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: "chip !bg-royal !text-white",
          "aria-pressed": selecting,
          onClick: () => selecting ? stopSelecting() : setSelecting(true),
          children: [
            selecting ? /* @__PURE__ */ jsx(X, { size: 14 }) : /* @__PURE__ */ jsx(CheckSquare, { size: 14 }),
            selecting ? "Done selecting" : "Select"
          ]
        }
      ),
      ["all", "below", "out", "expiring"].filter((f) => f !== "expiring" || expiringCount > 0).map((f) => /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": filter === f, onClick: () => setFilter(f), children: f === "all" ? `All ${stats.skuCount}` : f === "below" ? `Below par${stats.belowPar ? ` ${stats.belowPar}` : ""}` : f === "out" ? `Out of stock${stats.outOfStock ? ` ${stats.outOfStock}` : ""}` : `Expiring ${expiringCount}` }, f)),
      categories.length > 0 && /* @__PURE__ */ jsxs(
        "select",
        {
          value: category,
          onChange: (e) => setCategory(e.target.value),
          "aria-label": "Category",
          className: "chip",
          children: [
            /* @__PURE__ */ jsx("option", { value: "all", children: "All categories" }),
            categories.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
          ]
        }
      )
    ] }),
    filtered.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: products.length === 0 ? "No products yet" : "No products match", children: products.length === 0 ? "Scan a product on the Scan tab and Bintro adds it here." : "Try a brand name, part of the barcode, or a different filter." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: filtered.map((p) => {
      const status = stockStatus(p);
      const out = status === "out";
      const low = status === "low";
      return /* @__PURE__ */ jsxs(
        "li",
        {
          className: `flex items-center gap-3 py-3 border-b border-line last:border-b-0 ${selecting && selected.has(p.id) ? "bg-action-tint/50 -mx-2 px-2 rounded-xl" : ""}`,
          children: [
            selecting && /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked: selected.has(p.id),
                onChange: () => toggle(p.id),
                "aria-label": `Select ${p.name}`,
                className: "w-5 h-5 accent-[var(--color-action)] cursor-pointer shrink-0"
              }
            ),
            /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => selecting ? toggle(p.id) : setEditing(p),
                className: "flex-1 min-w-0 text-left border-0 bg-transparent p-0 cursor-pointer",
                children: [
                  /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: p.name }),
                  /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2 truncate", children: [
                    /* @__PURE__ */ jsx(ExpiryTag, { value: p.expiresOn }),
                    [p.brand, p.size, p.vendor].filter(Boolean).join(", ") || p.barcode,
                    p.retailPriceCents > 0 && /* @__PURE__ */ jsxs("span", { className: "num", children: [
                      " · sells $",
                      centsToDollars(p.retailPriceCents)
                    ] })
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap", children: [
              /* @__PURE__ */ jsxs("div", { className: `num text-lg font-bold leading-tight ${out ? "text-bad" : low ? "text-warn" : ""}`, children: [
                p.qty,
                /* @__PURE__ */ jsx("span", { className: "text-[12px] font-semibold text-ink-2", children: " on hand" })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "num text-[13px] text-ink-2", children: out ? /* @__PURE__ */ jsx("span", { className: "inline-block text-[12px] font-semibold px-2 rounded-full bg-bad-tint text-bad", children: "Out" }) : low ? /* @__PURE__ */ jsxs("span", { className: "inline-block text-[12px] font-semibold px-2 rounded-full bg-warn-tint text-warn", children: [
                "Par ",
                p.reorderThreshold
              ] }) : `$${centsToDollars(p.qty * p.unitCostCents)}` })
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setEditing(p),
                "aria-label": `Edit ${p.name}`,
                className: "w-10 h-10 rounded-full border-0 bg-transparent grid place-items-center text-ink-2 cursor-pointer hover:bg-surface",
                children: /* @__PURE__ */ jsx(Pencil, { size: 18 })
              }
            )
          ]
        },
        p.id
      );
    }) }),
    selecting && /* @__PURE__ */ jsxs("div", { className: "fixed left-0 right-0 bottom-[76px] z-[45] px-3 pointer-events-none", children: [
      /* @__PURE__ */ jsxs("div", { className: "pointer-events-auto max-w-[760px] mx-auto bg-white border border-line rounded-2xl shadow-lift px-3 py-2.5 flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxs("b", { className: "text-sm mr-1", children: [
          selected.size,
          " selected"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "btn btn-text btn-sm",
            onClick: () => {
              setDeleteArmed(false);
              setSelected(allFilteredSelected ? /* @__PURE__ */ new Set() : /* @__PURE__ */ new Set([...selected, ...filtered.map((p) => p.id)]));
            },
            children: allFilteredSelected ? "Clear" : `Select all ${filtered.length}`
          }
        ),
        /* @__PURE__ */ jsx("span", { className: "flex-1" }),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-primary btn-sm", disabled: selected.size === 0 || bulkBusy, onClick: () => setBulkOpen(true), children: [
          /* @__PURE__ */ jsx(Pencil, { size: 15 }),
          "Edit ",
          selected.size || ""
        ] }),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-danger btn-sm", disabled: selected.size === 0 || bulkBusy, onClick: deleteSelected, children: [
          /* @__PURE__ */ jsx(Trash2, { size: 15 }),
          bulkBusy ? "Deleting…" : deleteArmed ? `Tap again to delete ${selected.size}` : "Delete"
        ] })
      ] }),
      deleteArmed && /* @__PURE__ */ jsx("p", { className: "pointer-events-auto max-w-[760px] mx-auto mt-1 text-center text-[12px] text-bad font-semibold bg-white/90 rounded-lg py-1", children: "Deleting removes these products and their scan history for good. Tap again to confirm." })
    ] }),
    /* @__PURE__ */ jsx(
      BulkEditSheet,
      {
        open: bulkOpen,
        products: selectedProducts,
        onClose: () => setBulkOpen(false),
        onDone: async () => {
          await onChanged();
          stopSelecting();
        }
      }
    ),
    /* @__PURE__ */ jsx(
      Sheet,
      {
        open: editing !== null,
        onClose: () => setEditing(null),
        title: "Edit product",
        subtitle: "Changes apply to future scans and orders. Editing the on-hand count is logged as an adjustment.",
        children: editing && /* @__PURE__ */ jsx(
          ProductForm,
          {
            product: editing,
            products,
            saveLabel: "Save",
            onCancel: () => setEditing(null),
            onSave: async ({ barcode, ...values }) => {
              let saved = await updateProduct({ data: { productId: editing.id, ...values, staffName } });
              if (barcode !== editing.barcode) {
                saved = await linkBarcodeToProduct({ data: { productId: editing.id, barcode } });
              }
              if (saved) onProduct?.(saved);
              setEditing(null);
              await onChanged();
              toast(`Saved ${values.name}`);
            },
            onDelete: async () => {
              await deleteProduct({ data: { productId: editing.id } });
              setEditing(null);
              await onChanged();
              toast(`Deleted ${editing.name}`);
            },
            onMerge: async (target) => {
              const r = await mergeProducts({ data: { sourceId: editing.id, targetId: target.id } });
              if (r?.product) onProduct?.(r.product);
              setEditing(null);
              await onChanged();
              toast(`Merged ${editing.name} into ${target.name}`);
            }
          },
          editing.id
        )
      }
    ),
    /* @__PURE__ */ jsx(
      Sheet,
      {
        open: adding,
        onClose: () => setAdding(false),
        title: "Add product",
        subtitle: "Add it by hand, look the barcode up, or scan it from the Scan tab.",
        children: adding && /* @__PURE__ */ jsx(
          ProductForm,
          {
            products,
            qtyLabel: "Starting qty",
            saveLabel: "Add product",
            onCancel: () => setAdding(false),
            onSave: async (values) => {
              const created = await createProduct({ data: values });
              if (created) onProduct?.(created);
              setAdding(false);
              await onChanged();
              toast(`Added ${values.name}`);
            }
          }
        )
      }
    )
  ] });
}
function ExpiryTag({ value }) {
  const state2 = expiryState(value);
  if (state2 !== "soon" && state2 !== "expired") return null;
  const days = daysToExpiry(value) ?? 0;
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: `inline-block mr-1.5 text-[11px] font-bold px-1.5 rounded-full ${state2 === "expired" ? "bg-bad-tint text-bad" : "bg-warn-tint text-warn"}`,
      title: `Expires ${expiryLabel(value)}`,
      children: state2 === "expired" ? "Expired" : days === 0 ? "Expires today" : `Expires in ${days}d`
    }
  );
}
const PERIOD_LABELS = {
  today: "Today",
  week: "This week",
  "7": "Last 7 days",
  all: "All time"
};
function periodStart(period) {
  if (period === "all") return null;
  if (period === "7") return new Date(Date.now() - 7 * 864e5);
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return d;
}
function ActivityView({ recent }) {
  const [period, setPeriod] = useState("week");
  const [kind, setKind] = useState("out");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    const since = periodStart(period);
    getMovementsSince({ data: { since: since ? since.toISOString() : null } }).then((r) => live && setRows(r)).catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [period, recent]);
  const summary = useMemo(() => {
    const all = rows ?? [];
    const used = all.filter((m) => m.type === "out");
    const received = all.filter((m) => m.type === "in" || m.type === "receive");
    const pick = kind === "out" ? used : received;
    const brands = /* @__PURE__ */ new Map();
    for (const m of pick) {
      const brand = m.productBrand.trim() || "No brand";
      const lines = brands.get(brand) ?? /* @__PURE__ */ new Map();
      const line = lines.get(m.productId) ?? {
        key: m.productId,
        name: m.productName,
        size: m.productSize,
        imageUrl: m.productImageUrl,
        brand,
        units: 0,
        cents: 0
      };
      const units = Math.abs(m.delta);
      line.units += units;
      line.cents += units * m.unitCostCents;
      lines.set(m.productId, line);
      brands.set(brand, lines);
    }
    const groups = Array.from(brands, ([brand, lines]) => {
      const items = Array.from(lines.values()).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
      return {
        brand,
        items,
        units: items.reduce((s, l) => s + l.units, 0),
        cents: items.reduce((s, l) => s + l.cents, 0)
      };
    }).sort((a, b) => b.units - a.units || a.brand.localeCompare(b.brand));
    const sum = (list) => list.reduce((s, m) => s + Math.abs(m.delta), 0);
    const cost = (list) => list.reduce((s, m) => s + Math.abs(m.delta) * m.unitCostCents, 0);
    return {
      groups,
      unitsUsed: sum(used),
      usedCents: cost(used),
      unitsReceived: sum(received),
      brandCount: new Set(used.map((m) => m.productBrand.trim() || "No brand")).size,
      staff: Array.from(
        pick.reduce((map, m) => {
          const name = m.staffName || m.staffInitials || "Unnamed";
          return map.set(name, (map.get(name) ?? 0) + Math.abs(m.delta));
        }, /* @__PURE__ */ new Map())
      ).sort((a, b) => b[1] - a[1])
    };
  }, [rows, kind]);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(PageHead, { title: "Activity", lead: "What got used up, what it cost, and what came in." }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-2 overflow-x-auto pb-1 mb-4", role: "group", "aria-label": "Time period", children: Object.keys(PERIOD_LABELS).map((p) => /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": period === p, onClick: () => setPeriod(p), children: PERIOD_LABELS[p] }, p)) }),
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: "Units used", value: rows ? summary.unitsUsed : "–" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Product used", value: rows ? dollarsShort(summary.usedCents) : "–" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Units received", value: rows ? summary.unitsReceived : "–", tone: "good" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Brands used", value: rows ? summary.brandCount : "–" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mb-4", role: "group", "aria-label": "Show", children: [
      /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": kind === "out", onClick: () => setKind("out"), children: "Used" }),
      /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": kind === "in", onClick: () => setKind("in"), children: "Received" })
    ] }),
    rows === null ? /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[40%]" })
    ] }) : summary.groups.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: kind === "out" ? "Nothing used in this period" : "Nothing received in this period", children: "Scan a product on the Scan tab and it shows up here." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      summary.groups.map((g) => /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl px-4 py-1 mb-3.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-baseline gap-3 pt-3 pb-1.5", children: [
          /* @__PURE__ */ jsx("h3", { className: "m-0 text-[17px] font-bold", children: g.brand }),
          /* @__PURE__ */ jsxs("span", { className: "num font-bold text-sm", children: [
            g.units,
            " ",
            kind === "out" ? "used" : "in",
            " · $",
            centsToDollars(g.cents)
          ] })
        ] }),
        /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: g.items.map((l) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-3 border-b border-line last:border-b-0", children: [
          /* @__PURE__ */ jsx(Thumb, { imageUrl: l.imageUrl, label: l.brand }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: l.name }),
            /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [l.size, l.units ? `$${centsToDollars(l.cents / l.units)} each` : ""].filter(Boolean).join(", ") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap", children: [
            /* @__PURE__ */ jsx("b", { className: "num block", children: l.units }),
            /* @__PURE__ */ jsxs("span", { className: "num text-[13px] text-ink-2", children: [
              "$",
              centsToDollars(l.cents)
            ] })
          ] })
        ] }, l.key)) })
      ] }, g.brand)),
      summary.staff.length > 0 && /* @__PURE__ */ jsxs("section", { className: "mt-6", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold mt-0 mb-2.5", children: "By staff" }),
        /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 bg-surface rounded-2xl px-4", children: summary.staff.map(([name, units]) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between py-3 border-b border-line last:border-b-0", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold", children: name }),
          /* @__PURE__ */ jsxs("span", { className: "num text-ink-2", children: [
            units,
            " unit",
            units === 1 ? "" : "s"
          ] })
        ] }, name)) })
      ] })
    ] })
  ] });
}
const saveSentOrder = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    qty: z.number().int().positive().max(MAX_ORDER_QTY)
  })).min(1).max(MAX_IMPORT_LINES),
  staffName: z.string().max(60),
  note: z.string().max(500),
  sentVia: z.enum(["email", "print", "csv"])
})).handler(createSsrRpc("dd1d8a58bbc30e8a725bc36307dceba1dd9bf6b9019d1c90affe42d2e63539e3"));
const getOrders = createServerFn({
  method: "GET"
}).handler(createSsrRpc("f07945f68743a5a7d6c010091d42d30bd9a75215321a513ae562b81c0f674590"));
const cancelSavedOrder = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  orderId: z.number().int().positive()
})).handler(createSsrRpc("b51509cfb38ef861d7d9c37a0e23bafbfd2120e92db5cadd0f0564ea6c62aef1"));
const DeliveryLine = z.object({
  productId: z.number().int().nullable(),
  barcode: z.string().max(60),
  name: z.string().max(200),
  brand: z.string().max(160),
  size: z.string().max(60),
  category: z.string().max(80),
  vendor: z.string().max(120),
  qty: z.number().int().min(0).max(1e6).nullable(),
  unitCostCents: z.number().int().min(0).max(1e7),
  retailPriceCents: z.number().int().min(0).max(1e7)
});
const receiveDeliveryFn = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  orderId: z.number().int().positive().nullable(),
  staffName: z.string().max(60),
  source: z.string().max(160),
  lines: z.array(DeliveryLine).min(1).max(MAX_IMPORT_LINES)
})).handler(createSsrRpc("c14f2e2425a97dd2b7fe28324db104a92512246cd40a47f2918e9adcd6661d1d"));
const MAX_MAILTO_BODY = 1800;
function trimBody(text) {
  if (text.length <= MAX_MAILTO_BODY) return text;
  const lines = text.split("\n");
  const kept = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length + 1 > MAX_MAILTO_BODY - 80) break;
    kept.push(line);
    length += line.length + 1;
  }
  const dropped = lines.length - kept.length;
  return `${kept.join("\n")}

…and ${dropped} more line${dropped === 1 ? "" : "s"}. Download the CSV from Bintro for the full list.`;
}
function mailtoHref(draft) {
  const params = `subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(trimBody(draft.text))}`;
  return `mailto:${encodeURIComponent(draft.to.trim()).replace(/%40/g, "@")}?${params}`;
}
function openMailDraft(draft) {
  window.location.href = mailtoHref(draft);
}
const STATUS_PILL = {
  out: "bg-bad-tint text-bad",
  low: "bg-warn-tint text-warn",
  in: "bg-good-tint text-good"
};
function BelowParView({
  items,
  products,
  staffName,
  onChanged,
  onBuildOrder,
  onOrder = {}
}) {
  const [mail, setMail] = useState({ kind: "idle" });
  const [showInStock, setShowInStock] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const { profile, name: businessName } = useBusiness();
  const sendTo = profile.orderEmail.trim() || profile.email.trim();
  const outOfStock = items.filter((p) => stockStatus(p) === "out");
  const inStock = products.filter((p) => stockStatus(p) === "in");
  const toOrder = (p) => suggestedOrderQty(p, onOrder[p.id] ?? 0);
  const unitsNeeded = items.reduce((sum, p) => sum + toOrder(p), 0);
  const restockCostCents = items.reduce((sum, p) => sum + toOrder(p) * p.unitCostCents, 0);
  function localDraft() {
    return {
      to: sendTo,
      subject: `${businessName} restock list — ${items.length} item${items.length === 1 ? "" : "s"} below par`,
      text: [
        `Products at or below their par level as of ${(/* @__PURE__ */ new Date()).toLocaleString()}.`,
        "",
        ...items.map((p) => {
          const bits = [p.brand, p.size].filter(Boolean).join(" ");
          return `- ${bits ? `${p.name} (${bits})` : p.name} — on hand ${p.qty}, reorder at ${p.reorderThreshold}, order ${toOrder(p)}`;
        }),
        "",
        staffName ? `Sent by ${staffName} from Bintro.` : "Sent from Bintro."
      ].join("\n")
    };
  }
  function handOff(draft, why) {
    openMailDraft(draft);
    setMail({ kind: "drafted", draft, message: `${why} Your mail app opened with the list filled in — tap Send there.` });
  }
  async function handleEmail() {
    setMail({ kind: "sending" });
    try {
      await onChanged();
    } catch {
    }
    try {
      const result = await emailBelowPar({ data: { staffName } });
      if (result.ok) {
        setMail({
          kind: "sent",
          message: `Sent ${result.count} item${result.count === 1 ? "" : "s"} to ${result.to}.`
        });
      } else if (result.draft) {
        handOff(result.draft, result.reason === "send_failed" ? "The email service didn't accept it." : result.message);
      } else {
        setMail({ kind: "error", message: result.message });
      }
    } catch {
      handOff(localDraft(), "Bintro couldn't reach the server.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(PageHead, { title: "Below Par", lead: "Everything at or under its restock level, ready to send off for reordering." }),
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: "Below par", value: items.length, tone: items.length > 0 ? "warn" : "good" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Out of stock", value: outOfStock.length, tone: outOfStock.length > 0 ? "bad" : "good" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Units to reorder", value: unitsNeeded }),
      /* @__PURE__ */ jsx(StatTile, { label: "Est. restock cost", value: dollarsShort(restockCostCents) })
    ] }),
    /* @__PURE__ */ jsxs(ToolRow, { label: "Restock actions", className: "mb-2", children: [
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Gauge, { size: 24 }), tone: "yellow", label: "Smart par", onClick: () => setSmartOpen(true) }),
      onBuildOrder && /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(ClipboardList, { size: 24 }), tone: "garnet", label: "Build order", onClick: onBuildOrder, disabled: items.length === 0 }),
      /* @__PURE__ */ jsx(
        ToolButton,
        {
          icon: /* @__PURE__ */ jsx(Mail, { size: 24 }),
          tone: "royal",
          label: mail.kind === "sending" ? "Sending…" : "Email list",
          onClick: handleEmail,
          busy: mail.kind === "sending",
          disabled: items.length === 0
        }
      ),
      /* @__PURE__ */ jsx(
        ToolButton,
        {
          icon: /* @__PURE__ */ jsx(RefreshCw, { size: 24 }),
          tone: "charcoal",
          label: "Refresh",
          onClick: () => {
            setMail({ kind: "idle" });
            onChanged();
          }
        }
      )
    ] }),
    sendTo && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[12px] text-ink-2", children: [
      "Email list goes to ",
      sendTo,
      "."
    ] }),
    mail.kind === "sent" && /* @__PURE__ */ jsxs("p", { className: "text-good text-sm font-semibold mt-1 mb-3", children: [
      "✓ ",
      mail.message
    ] }),
    mail.kind === "error" && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-1 mb-3 max-w-[560px]", children: mail.message }),
    mail.kind === "drafted" && /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm mt-1 mb-3 max-w-[560px]", children: [
      mail.message,
      " ",
      /* @__PURE__ */ jsx("a", { href: mailtoHref(mail.draft), className: "text-action font-semibold", children: "Open it again" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-4", children: items.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Fully stocked", children: "Nothing is at or below its par level right now." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: items.map((p) => {
      const status = stockStatus(p);
      return /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-3 border-b border-line last:border-b-0", children: [
        /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: p.name }),
          /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [p.brand, p.size, p.category].filter(Boolean).join(", ") || p.barcode })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap text-[13px] text-ink-2", children: [
          /* @__PURE__ */ jsx("span", { className: `inline-block text-[12px] font-semibold px-2 rounded-full ${STATUS_PILL[status]}`, children: STOCK_STATUS_LABEL[status] }),
          /* @__PURE__ */ jsxs("div", { className: "num mt-0.5", children: [
            Math.max(0, onHandQty(p)),
            " on hand · reorder at ",
            p.reorderThreshold,
            orderUpTo(p) > p.reorderThreshold ? ` · up to ${orderUpTo(p)}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-right min-w-14", children: onOrder[p.id] && toOrder(p) === 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { className: "num block text-lg leading-tight text-good", children: onOrder[p.id] }),
          /* @__PURE__ */ jsx("span", { className: "text-[12px] text-good", children: "on order" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { className: "num block text-lg leading-tight", children: toOrder(p) }),
          /* @__PURE__ */ jsxs("span", { className: "text-[12px] text-ink-2", children: [
            casePack(p) > 1 ? `to order (${toOrder(p) / casePack(p)} case${toOrder(p) / casePack(p) === 1 ? "" : "s"})` : "to order",
            onOrder[p.id] ? ` · ${onOrder[p.id]} on order` : ""
          ] })
        ] }) })
      ] }, p.id);
    }) }) }),
    inStock.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
      /* @__PURE__ */ jsxs("button", { className: "btn btn-text btn-sm", onClick: () => setShowInStock((v) => !v), "aria-expanded": showInStock, children: [
        showInStock ? "Hide" : "Show",
        " in-stock items (",
        inStock.length,
        ")"
      ] }),
      showInStock && /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 mt-2", children: inStock.map((p) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-3 border-b border-line last:border-b-0", children: [
        /* @__PURE__ */ jsx(Thumb, { imageUrl: p.imageUrl, label: p.brand || p.name }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: p.name }),
          /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [p.brand, p.size, p.category].filter(Boolean).join(", ") || p.barcode })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap text-[13px] text-ink-2", children: [
          /* @__PURE__ */ jsx("span", { className: `inline-block text-[12px] font-semibold px-2 rounded-full ${STATUS_PILL.in}`, children: STOCK_STATUS_LABEL.in }),
          /* @__PURE__ */ jsxs("div", { className: "num mt-0.5", children: [
            onHandQty(p),
            " on hand",
            p.reorderThreshold > 0 ? ` · par ${p.reorderThreshold}` : ""
          ] })
        ] })
      ] }, p.id)) })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-5 leading-relaxed", children: `Out means none on hand; Low means 1 or more but at or under the product's reorder point. "To order" refills to the product's Order up to level (or its reorder point), minus anything already on order, in full cases. Smart par sets these from how fast you really use things. Products with no reorder point only show here once they run out. The email is sent from the server, so it goes out even if this device has no mail app set up. Build a vendor order from these items in step 2.` }),
    /* @__PURE__ */ jsx(SmartParSheet, { open: smartOpen, onClose: () => setSmartOpen(false), onDone: onChanged })
  ] });
}
const DRAFT_KEY = "shagnoir-po-draft-v2";
const LEGACY_DRAFT_KEY = "shagnoir-po-draft";
function resolveQty(raw) {
  return clampOrderQty(Number(raw));
}
function toLine(product, qty) {
  return {
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    vendor: product.vendor,
    size: product.size,
    category: product.category,
    qty,
    onHand: Math.max(0, onHandQty(product)),
    reorderThreshold: product.reorderThreshold,
    unitCostCents: product.unitCostCents
  };
}
function readDraft() {
  try {
    const current = window.localStorage.getItem(DRAFT_KEY);
    const raw = current ?? window.localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const draft = {};
    for (const [id, row] of Object.entries(parsed)) {
      const productId = Number(id);
      if (!Number.isInteger(productId)) continue;
      const edited = current !== null && row?.qty !== void 0 && row?.qty !== null;
      draft[productId] = {
        selected: row?.selected === true,
        ...edited ? { qty: String(clampOrderQty(Number(row.qty))) } : {}
      };
    }
    return draft;
  } catch {
    return {};
  }
}
function PurchaseOrderView({
  items,
  staffName,
  onChanged,
  onOpenDeliveries,
  onOrder = {}
}) {
  const [draft, setDraft] = useState({});
  const [hydrated, setHydrated] = useState(false);
  const [note, setNote] = useState("");
  const [mail, setMail] = useState({ kind: "idle" });
  const business = useBusiness();
  const [savedKey, setSavedKey] = useState("");
  const [savedNote, setSavedNote] = useState("");
  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const live = new Set(items.map((p) => p.id));
    const pruned = Object.fromEntries(Object.entries(draft).filter(([id]) => live.has(Number(id))));
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(pruned));
  }, [draft, items, hydrated]);
  function qtyFor(product, row = draft[product.id]) {
    return row?.qty ?? String(Math.max(1, suggestedOrderQty(product, onOrder[product.id] ?? 0)));
  }
  function patchRows(productIds, patch) {
    setMail({ kind: "idle" });
    setDraft((current) => {
      const next = { ...current };
      for (const id of productIds) {
        const product = items.find((p) => p.id === id);
        if (!product) continue;
        next[id] = patch(product, current[id] ?? { selected: false });
      }
      return next;
    });
  }
  const allLines = useMemo(
    () => items.map((product) => toLine(product, resolveQty(qtyFor(product)))),
    [items, draft]
  );
  const groups = useMemo(() => groupPurchaseOrderLines(allLines), [allLines]);
  const isSelected = (productId) => draft[productId]?.selected === true;
  const selectedLines = useMemo(
    () => groups.flatMap((group) => group.lines.filter((line) => isSelected(line.productId))),
    [groups, draft]
  );
  const totals = purchaseOrderTotals(selectedLines);
  const leftOut = items.length - selectedLines.length;
  const nothingSelected = selectedLines.length === 0;
  function setSelection(productIds, selected) {
    patchRows(productIds, (_product, row) => ({ ...row, selected }));
  }
  function setQty(product, raw) {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, String(MAX_ORDER_QTY).length);
    patchRows([product.id], (_product, _row) => ({ selected: true, qty: digits }));
  }
  function bumpQty(product, step) {
    patchRows([product.id], (_product, row) => ({
      selected: true,
      qty: String(clampOrderQty(resolveQty(qtyFor(_product, row)) + step * casePack(_product)))
    }));
  }
  function normaliseQty(product) {
    patchRows([product.id], (_product, row) => row.qty === void 0 ? row : { ...row, qty: String(resolveQty(row.qty)) });
  }
  function resetQuantities() {
    patchRows(
      items.map((p) => p.id),
      (_product, row) => ({ selected: row.selected })
    );
  }
  async function saveForDelivery(sentVia) {
    const lines = selectedLines.map((line) => ({ productId: line.productId, qty: clampOrderQty(line.qty) }));
    const key2 = JSON.stringify(lines);
    if (key2 === savedKey) return;
    try {
      const ids = await saveSentOrder({ data: { lines, staffName, note: note.trim(), sentVia } });
      setSavedKey(key2);
      setSavedNote(
        `Saved as ${ids.length} open order${ids.length === 1 ? "" : "s"}. When it arrives, check it in under 3 · Deliveries.`
      );
    } catch {
    }
  }
  function exportCsv() {
    if (nothingSelected) return;
    saveForDelivery("csv");
    const blob = new Blob(["\uFEFF" + buildPurchaseOrderCsv(selectedLines)], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = purchaseOrderFilename(businessSlug(business.name));
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
  function printOrder() {
    if (nothingSelected) return;
    saveForDelivery("print");
    window.print();
  }
  async function emailOrder() {
    if (nothingSelected) return;
    setMail({ kind: "sending" });
    try {
      const result = await emailPurchaseOrder({
        data: {
          lines: selectedLines.map((line) => ({ productId: line.productId, qty: clampOrderQty(line.qty) })),
          staffName,
          note: note.trim() || void 0
        }
      });
      if (result.ok || result.draft) saveForDelivery("email");
      if (result.ok) {
        setMail({
          kind: "sent",
          message: `Order for ${result.count} item${result.count === 1 ? "" : "s"} sent to ${result.to}.`
        });
      } else if (result.draft) {
        handOff(result.draft, result.reason === "send_failed" ? "The email service didn't accept it." : result.message);
      } else {
        setMail({ kind: "error", message: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/plan|upgrade/i.test(message)) setMail({ kind: "error", message });
      else handOff(localDraft(), "Bintro couldn't reach the server.");
    }
  }
  function localDraft() {
    const unitCount = selectedLines.reduce((sum, line) => sum + clampOrderQty(line.qty), 0);
    return {
      to: business.profile.orderEmail.trim() || business.profile.email.trim(),
      subject: `${business.name} purchase order — ${selectedLines.length} item${selectedLines.length === 1 ? "" : "s"}, ${unitCount} unit${unitCount === 1 ? "" : "s"}`,
      text: [
        `Purchase order prepared ${(/* @__PURE__ */ new Date()).toLocaleString()}.`,
        "",
        ...selectedLines.map((line) => {
          const bits = [line.brand, line.size].filter(Boolean).join(" ");
          return `- ${clampOrderQty(line.qty)} x ${bits ? `${line.name} (${bits})` : line.name} — barcode ${line.barcode}, on hand ${line.onHand}`;
        }),
        ...note.trim() ? ["", `Note: ${note.trim()}`] : [],
        "",
        staffName ? `Prepared by ${staffName} in Bintro.` : "Prepared in Bintro."
      ].join("\n")
    };
  }
  function handOff(draft2, why) {
    openMailDraft(draft2);
    setMail({
      kind: "drafted",
      draft: draft2,
      message: `${why} Your mail app opened with the order filled in — tap Send there (use Download CSV to attach the file).`
    });
  }
  const head = /* @__PURE__ */ jsx(
    PageHead,
    {
      title: "Reorder",
      lead: "Pick the items to buy, set the quantities, then export, print or email just that order."
    }
  );
  if (items.length === 0) {
    return /* @__PURE__ */ jsxs("div", { children: [
      head,
      /* @__PURE__ */ jsx(EmptyState, { title: "Nothing to order", children: "No product is at or below its par level, so there's nothing to put on a purchase order yet." })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    head,
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: "Flagged items", value: items.length }),
      /* @__PURE__ */ jsx(StatTile, { label: "On this order", value: totals.itemCount, tone: totals.itemCount > 0 ? "warn" : void 0 }),
      /* @__PURE__ */ jsx(StatTile, { label: "Units to order", value: totals.unitCount }),
      /* @__PURE__ */ jsx(StatTile, { label: "Est. order total", value: `$${centsToDollars(totals.totalCents)}` })
    ] }),
    /* @__PURE__ */ jsxs(ToolRow, { label: "Send the order", className: "mb-3", children: [
      /* @__PURE__ */ jsx(
        ToolButton,
        {
          icon: /* @__PURE__ */ jsx(Mail, { size: 24 }),
          tone: "royal",
          label: mail.kind === "sending" ? "Sending…" : "Email order",
          onClick: emailOrder,
          busy: mail.kind === "sending",
          disabled: nothingSelected
        }
      ),
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Download, { size: 24 }), tone: "teal", label: "Download CSV", onClick: exportCsv, disabled: nothingSelected }),
      /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(Printer, { size: 24 }), tone: "charcoal", label: "Print", onClick: printOrder, disabled: nothingSelected })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 overflow-x-auto pb-1 mb-3", children: [
      /* @__PURE__ */ jsx("button", { className: "chip", onClick: () => setSelection(items.map((p) => p.id), true), children: "Select all" }),
      /* @__PURE__ */ jsx("button", { className: "chip", onClick: () => setSelection(items.map((p) => p.id), false), disabled: nothingSelected, children: "Deselect all" }),
      /* @__PURE__ */ jsx("button", { className: "chip", onClick: resetQuantities, children: "Reset quantities" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "chip",
          onClick: () => {
            setMail({ kind: "idle" });
            onChanged();
          },
          children: "Refresh list"
        }
      )
    ] }),
    savedNote && /* @__PURE__ */ jsxs("p", { className: "text-[13px] bg-good-tint text-good rounded-xl px-3 py-2 mt-0 mb-3 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "flex-1", children: savedNote }),
      onOpenDeliveries && /* @__PURE__ */ jsx("button", { type: "button", className: "border-0 bg-transparent p-0 font-semibold text-good underline cursor-pointer", onClick: onOpenDeliveries, children: "Open Deliveries" })
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        value: note,
        onChange: (e) => setNote(e.target.value.slice(0, 500)),
        placeholder: "Note for the vendor (optional)",
        "aria-label": "Note for the vendor",
        className: "field-input mb-3"
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-0 mb-3 leading-relaxed", children: nothingSelected ? /* @__PURE__ */ jsx(Fragment, { children: "Tick the items you want on this order. The CSV, print sheet and email include only what's ticked." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      "This order covers ",
      /* @__PURE__ */ jsx("b", { className: "text-ink", children: totals.itemCount }),
      " of ",
      items.length,
      " flagged item",
      items.length === 1 ? "" : "s",
      leftOut > 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
        " ",
        "· ",
        /* @__PURE__ */ jsx("b", { className: "text-ink", children: leftOut }),
        " left off stay on this list for a future order"
      ] }) : null,
      "."
    ] }) }),
    mail.kind === "sent" && /* @__PURE__ */ jsxs("p", { className: "text-good text-sm font-semibold mb-3", children: [
      "✓ ",
      mail.message
    ] }),
    mail.kind === "error" && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mb-3 max-w-[560px]", children: mail.message }),
    mail.kind === "drafted" && /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm mb-3 max-w-[560px]", children: [
      mail.message,
      " ",
      /* @__PURE__ */ jsx("a", { href: mailtoHref(mail.draft), className: "text-action font-semibold", children: "Open it again" })
    ] }),
    groups.map((group) => /* @__PURE__ */ jsx(
      VendorGroup,
      {
        group,
        isSelected,
        qtyFor: (productId) => draft[productId]?.qty,
        products: items,
        onOrder,
        onToggleGroup: (selected) => setSelection(group.lines.map((l) => l.productId), selected),
        onToggleLine: (productId, selected) => setSelection([productId], selected),
        onQtyChange: setQty,
        onQtyBump: bumpQty,
        onQtyBlur: normaliseQty
      },
      group.key
    )),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center px-1 py-4 text-lg font-bold", children: [
      /* @__PURE__ */ jsx("span", { children: "Order total" }),
      /* @__PURE__ */ jsxs("span", { className: "num", children: [
        "$",
        centsToDollars(totals.totalCents)
      ] })
    ] }),
    hydrated && createPortal(
      /* @__PURE__ */ jsx(PrintSheet, { lines: selectedLines, staffName, note: note.trim() }),
      document.body
    )
  ] });
}
function VendorGroup({
  group,
  products,
  onOrder,
  isSelected,
  qtyFor,
  onToggleGroup,
  onToggleLine,
  onQtyChange,
  onQtyBump,
  onQtyBlur
}) {
  const selected = group.lines.filter((line) => isSelected(line.productId));
  const allSelected = selected.length === group.lines.length;
  const subtotalCents = selected.reduce((sum, line) => sum + lineTotalCents(line), 0);
  const unitCount = selected.reduce((sum, line) => sum + clampOrderQty(line.qty), 0);
  return /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl px-4 py-1 mb-3.5", children: [
    /* @__PURE__ */ jsxs("header", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 pb-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
        /* @__PURE__ */ jsx("h3", { className: "m-0 text-[17px] font-bold truncate", children: group.vendor }),
        /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2", children: [
          group.brand ? `${group.brand} · ` : "",
          selected.length,
          " of ",
          group.lines.length,
          " selected",
          selected.length > 0 && ` · ${unitCount} unit${unitCount === 1 ? "" : "s"}`
        ] })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "num font-bold", children: [
        "$",
        centsToDollars(subtotalCents)
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm !px-2", onClick: () => onToggleGroup(!allSelected), children: allSelected ? "Deselect all" : "Select all" })
    ] }),
    /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: group.lines.map((line) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      const checked = isSelected(line.productId);
      const out = stockStatus(product) === "out";
      const suggested = Math.max(1, suggestedOrderQty(product, onOrder[product.id] ?? 0));
      const qty = clampOrderQty(line.qty);
      const raw = qtyFor(line.productId);
      const inputId = `po-qty-${line.productId}`;
      return /* @__PURE__ */ jsxs(
        "li",
        {
          className: `flex items-center gap-3 py-3 border-t border-line flex-wrap min-[560px]:flex-nowrap ${checked ? "" : "opacity-60"}`,
          children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                checked,
                onChange: (e) => onToggleLine(line.productId, e.target.checked),
                "aria-label": `Include ${line.name} in this purchase order`,
                className: "w-5 h-5 accent-[var(--color-action)] cursor-pointer shrink-0"
              }
            ),
            /* @__PURE__ */ jsx(Thumb, { imageUrl: product.imageUrl, label: line.brand || line.name }),
            /* @__PURE__ */ jsxs("label", { htmlFor: inputId, className: "flex-1 min-w-[140px] cursor-text", children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: line.name }),
              /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2 truncate", children: [
                /* @__PURE__ */ jsx("span", { className: out ? "text-bad font-semibold" : "text-warn font-semibold", children: out ? "Out" : `Low · ${line.onHand} on hand` }),
                " · par ",
                line.reorderThreshold,
                line.size ? ` · ${line.size}` : "",
                " · $",
                centsToDollars(line.unitCostCents),
                " each"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center ml-auto", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center bg-surface rounded-full", children: [
                /* @__PURE__ */ jsx(StepButton, { label: `Decrease order quantity for ${line.name}`, onClick: () => onQtyBump(product, -1), children: "−" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    id: inputId,
                    type: "text",
                    inputMode: "numeric",
                    value: raw ?? String(suggested),
                    onChange: (e) => onQtyChange(product, e.target.value),
                    onBlur: () => onQtyBlur(product),
                    "aria-label": `Order quantity for ${line.name}`,
                    className: "num w-10 bg-transparent border-0 text-center font-bold outline-none"
                  }
                ),
                /* @__PURE__ */ jsx(StepButton, { label: `Increase order quantity for ${line.name}`, onClick: () => onQtyBump(product, 1), children: "+" })
              ] }),
              qty !== suggested && /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-ink-2 mt-0.5", children: [
                "suggested ",
                suggested
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: `num text-right w-16 ${checked ? "font-semibold" : "text-ink-2"}`, children: [
              "$",
              centsToDollars(qty * line.unitCostCents)
            ] })
          ]
        },
        line.productId
      );
    }) })
  ] });
}
function StepButton({
  children,
  label: label2,
  onClick
}) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick,
      "aria-label": label2,
      className: "w-[34px] h-[34px] rounded-full border-0 bg-transparent text-lg font-semibold cursor-pointer hover:bg-surface-2",
      children
    }
  );
}
function PrintSheet({
  lines,
  staffName,
  note
}) {
  const totals = purchaseOrderTotals(lines);
  const groups = groupPurchaseOrderLines(lines);
  const { name, profile } = useBusiness();
  const contact = [profile.address, profile.phone, profile.email, profile.website].map((v) => v.trim()).filter(Boolean);
  return /* @__PURE__ */ jsxs("div", { className: "po-print-sheet", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxs("h1", { children: [
      name,
      " — Purchase Order"
    ] }),
    contact.length > 0 && /* @__PURE__ */ jsx("p", { className: "po-meta", children: contact.join(" · ") }),
    /* @__PURE__ */ jsxs("p", { className: "po-meta", children: [
      (/* @__PURE__ */ new Date()).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
      staffName.trim() ? ` · prepared by ${staffName.trim()}` : ""
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "po-meta", children: [
      totals.itemCount,
      " item",
      totals.itemCount === 1 ? "" : "s",
      " · ",
      totals.unitCount,
      " unit",
      totals.unitCount === 1 ? "" : "s",
      " · est. total $",
      centsToDollars(totals.totalCents)
    ] }),
    note && /* @__PURE__ */ jsx("p", { className: "po-note", children: note }),
    groups.map((group) => /* @__PURE__ */ jsxs("div", { className: "po-group", children: [
      /* @__PURE__ */ jsxs("h2", { children: [
        group.vendor,
        group.brand ? ` · ${group.brand}` : ""
      ] }),
      /* @__PURE__ */ jsxs("table", { children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Product" }),
          /* @__PURE__ */ jsx("th", { children: "Barcode" }),
          /* @__PURE__ */ jsx("th", { className: "po-num", children: "On hand" }),
          /* @__PURE__ */ jsx("th", { className: "po-num", children: "Par" }),
          /* @__PURE__ */ jsx("th", { className: "po-num", children: "Order qty" }),
          /* @__PURE__ */ jsx("th", { className: "po-num", children: "Unit" }),
          /* @__PURE__ */ jsx("th", { className: "po-num", children: "Line total" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: group.lines.map((line) => {
          const qty = clampOrderQty(line.qty);
          return /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsxs("td", { children: [
              /* @__PURE__ */ jsx("strong", { children: line.name }),
              [line.size, line.category].filter(Boolean).length > 0 && /* @__PURE__ */ jsx("div", { className: "po-sub", children: [line.size, line.category].filter(Boolean).join(" · ") })
            ] }),
            /* @__PURE__ */ jsx("td", { children: line.barcode }),
            /* @__PURE__ */ jsx("td", { className: "po-num", children: line.onHand }),
            /* @__PURE__ */ jsx("td", { className: "po-num", children: line.reorderThreshold }),
            /* @__PURE__ */ jsx("td", { className: "po-num", children: /* @__PURE__ */ jsx("strong", { children: qty }) }),
            /* @__PURE__ */ jsxs("td", { className: "po-num", children: [
              "$",
              centsToDollars(line.unitCostCents)
            ] }),
            /* @__PURE__ */ jsxs("td", { className: "po-num", children: [
              "$",
              centsToDollars(qty * line.unitCostCents)
            ] })
          ] }, line.productId);
        }) })
      ] })
    ] }, group.key)),
    /* @__PURE__ */ jsxs("p", { className: "po-total", children: [
      "Order total: $",
      centsToDollars(totals.totalCents)
    ] }),
    /* @__PURE__ */ jsx("p", { className: "po-meta", children: "Prepared in Bintro." })
  ] });
}
function readAsBase64$1(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function toCents(dollars2) {
  const n = Number(dollars2.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}
function orderRows(order, receivedAsOrdered) {
  return order.lines.map((l) => {
    const left = Math.max(0, l.qtyOrdered - l.qtyReceived);
    return {
      key: `po-${l.id}`,
      productId: l.productId,
      name: l.name,
      brand: l.brand,
      size: l.size,
      barcode: l.barcode,
      category: "",
      ordered: left,
      received: receivedAsOrdered ? String(left) : "0",
      cost: "",
      currentCostCents: l.unitCostCents,
      include: true
    };
  });
}
function ReceiveDeliverySheet({
  open,
  order,
  products,
  staffName,
  onClose,
  onDone
}) {
  const [stage, setStage] = useState({ kind: "start" });
  const [rows, setRows] = useState([]);
  const fileInput = useRef(null);
  const byId = new Map(products.map((p) => [p.id, p]));
  useEffect(() => {
    if (open) {
      setStage({ kind: "start" });
      setRows([]);
    }
  }, [open, order?.id]);
  async function readFile(file) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf && file.size > MAX_IMPORT_BYTES) {
      setStage({ kind: "start", error: "That PDF is over 4 MB. Try a photo of the page instead." });
      return;
    }
    setStage({ kind: "reading", fileName: file.name });
    try {
      const parsed = await parseImport({
        data: isPdf ? { kind: "document", data: await readAsBase64$1(file), mediaType: "application/pdf" } : { kind: "document", data: await shrinkImage(file, 2e3), mediaType: "image/jpeg" }
      });
      if (!parsed.ok) {
        setStage({ kind: "start", error: parsed.message });
        return;
      }
      setRows(mergeDocument(parsed.lines));
      const source = [parsed.vendor || order?.vendor, file.name].filter(Boolean).join(" · ");
      setStage({ kind: "review", source, fromDocument: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStage({
        kind: "start",
        error: /plan|upgrade|feature/i.test(message) ? "Reading invoices is on the Plus plan. You can still check a saved order in by hand." : "Couldn't read that file. Check your connection and try again."
      });
    }
  }
  function mergeDocument(lines) {
    const base = order ? orderRows(order, false) : [];
    const extras = [];
    for (const l of lines) {
      const qty = l.qty ?? 0;
      const docCost = l.costSource === "document" && l.unitCostCents > 0 ? centsToDollars(l.unitCostCents) : "";
      const onOrder = l.productId ? base.find((r) => r.productId === l.productId) : void 0;
      if (onOrder) {
        onOrder.received = String(Number(onOrder.received) + qty);
        if (docCost) onOrder.cost = docCost;
        continue;
      }
      const product = l.productId ? byId.get(l.productId) : void 0;
      extras.push({
        key: `doc-${l.key}`,
        productId: l.productId,
        name: product?.name ?? l.name,
        brand: product?.brand ?? l.brand,
        size: product?.size ?? l.size,
        barcode: l.barcode,
        category: l.category,
        ordered: null,
        received: String(qty),
        cost: docCost,
        currentCostCents: product?.unitCostCents ?? 0,
        include: qty > 0 && Boolean(l.name.trim())
      });
    }
    return [...base, ...extras];
  }
  function byHand(asOrdered) {
    if (!order) return;
    setRows(orderRows(order, asOrdered));
    setStage({ kind: "review", source: `${order.vendor} · checked in by hand`, fromDocument: false });
  }
  function patch(key2, change) {
    setRows((all) => all.map((r) => r.key === key2 ? { ...r, ...change } : r));
  }
  async function confirm() {
    const lines = rows.filter((r) => r.include && Number(r.received) > 0).map((r) => ({
      productId: r.productId,
      barcode: r.barcode,
      name: r.name,
      brand: r.brand,
      size: r.size,
      category: r.category,
      vendor: order?.vendor ?? "",
      qty: Math.max(0, Math.trunc(Number(r.received) || 0)),
      unitCostCents: toCents(r.cost),
      retailPriceCents: 0
    }));
    if (lines.length === 0 && !order) return;
    const source = stage.kind === "review" ? stage.source : "Delivery";
    setStage({ kind: "saving" });
    try {
      const result = await receiveDeliveryFn({
        data: {
          orderId: order?.id ?? null,
          staffName,
          source: `Delivery: ${source}`.slice(0, 160),
          lines: lines.length ? lines : [{ ...emptyLine(), name: "Nothing arrived" }]
        }
      });
      setStage({ kind: "done", result });
      await onDone();
    } catch {
      setStage({ kind: "review", source, fromDocument: false });
      alertLater();
    }
  }
  const [saveError, setSaveError] = useState("");
  function alertLater() {
    setSaveError("Couldn't save the delivery. Check your connection and try again.");
  }
  const units = rows.filter((r) => r.include).reduce((s, r) => s + (Number(r.received) || 0), 0);
  const shortCount = rows.filter((r) => r.ordered !== null && (Number(r.received) || 0) < r.ordered).length;
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: order ? `Check in ${order.vendor}` : "Receive a delivery",
      subtitle: order ? `Order from ${new Date(order.createdAt).toLocaleDateString()} · ${order.lines.length} item${order.lines.length === 1 ? "" : "s"}` : "Snap or upload the invoice or packing slip. Bintro adds the stock and updates your costs.",
      children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInput,
            type: "file",
            accept: "image/*,application/pdf",
            className: "hidden",
            "aria-hidden": "true",
            tabIndex: -1,
            onChange: (e) => {
              readFile(e.target.files?.[0]);
              e.target.value = "";
            }
          }
        ),
        stage.kind === "start" && /* @__PURE__ */ jsxs("div", { className: "grid gap-2.5", children: [
          stage.error && /* @__PURE__ */ jsx("p", { className: "m-0 text-bad text-sm font-semibold", children: stage.error }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-primary justify-start", onClick: () => fileInput.current?.click(), children: [
            /* @__PURE__ */ jsx(FileText, { size: 18 }),
            "Photo or PDF of the invoice / packing slip"
          ] }),
          order && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal justify-start", onClick: () => byHand(true), children: [
              /* @__PURE__ */ jsx(CheckCheck, { size: 18 }),
              "Everything arrived as ordered"
            ] }),
            /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal justify-start", onClick: () => byHand(false), children: [
              /* @__PURE__ */ jsx(PackageCheck, { size: 18 }),
              "Count it in by hand"
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "m-0 text-[13px] text-ink-2", children: "The invoice is matched to your products by barcode and name. You check every line before anything changes." })
        ] }),
        stage.kind === "reading" && /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-sm", children: [
          "Reading ",
          stage.fileName,
          "…"
        ] }),
        stage.kind === "saving" && /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Adding the delivery…" }),
        stage.kind === "review" && /* @__PURE__ */ jsxs(Fragment, { children: [
          rows.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "No lines found on that invoice." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 max-h-[52vh] overflow-auto", children: rows.map((r) => {
            const got = Number(r.received) || 0;
            const costCents = toCents(r.cost);
            const short = r.ordered !== null && got < r.ordered;
            const over = r.ordered !== null && got > r.ordered;
            const priceChange = costCents > 0 && r.currentCostCents > 0 && costCents !== r.currentCostCents;
            return /* @__PURE__ */ jsx("li", { className: `py-3 border-b border-line last:border-b-0 ${r.include ? "" : "opacity-50"}`, children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: r.include,
                  onChange: (e) => patch(r.key, { include: e.target.checked }),
                  "aria-label": `Include ${r.name}`,
                  className: "mt-1"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: r.name }),
                /* @__PURE__ */ jsx("div", { className: "text-[12px] text-ink-2 truncate", children: [r.brand, r.size].filter(Boolean).join(" · ") }),
                /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 mt-1", children: [
                  r.ordered !== null && /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-surface", children: [
                    "Ordered ",
                    r.ordered
                  ] }),
                  r.ordered === null && /* @__PURE__ */ jsx("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gold-tint text-gold-ink", children: "Not on the order" }),
                  !r.productId && /* @__PURE__ */ jsx("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-gold-tint text-gold-ink", children: "New product" }),
                  short && /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-bad-tint text-bad", children: [
                    "Short ",
                    r.ordered - got
                  ] }),
                  over && /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-warn-tint text-warn", children: [
                    got - r.ordered,
                    " extra"
                  ] }),
                  priceChange && /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-semibold rounded-full px-2 py-0.5 bg-warn-tint text-warn", children: [
                    "Cost ",
                    costCents > r.currentCostCents ? "up" : "down",
                    " from $",
                    centsToDollars(r.currentCostCents)
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "text-[11px] text-ink-2 text-center", children: [
                "Arrived",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "number",
                    min: 0,
                    inputMode: "numeric",
                    value: r.received,
                    onChange: (e) => patch(r.key, { received: e.target.value }),
                    className: "field-input w-16 text-center px-1 py-1.5 mt-0.5"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "text-[11px] text-ink-2 text-center", children: [
                "Cost $",
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    inputMode: "decimal",
                    value: r.cost,
                    placeholder: r.currentCostCents ? centsToDollars(r.currentCostCents) : "0.00",
                    onChange: (e) => patch(r.key, { cost: e.target.value }),
                    className: "field-input w-20 text-center px-1 py-1.5 mt-0.5"
                  }
                )
              ] })
            ] }) }, r.key);
          }) }),
          saveError && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-2 mb-0", children: saveError }),
          /* @__PURE__ */ jsxs("p", { className: "text-[13px] text-ink-2 mt-3 mb-0", children: [
            "Adds ",
            /* @__PURE__ */ jsx("b", { className: "text-ink", children: units }),
            " unit",
            units === 1 ? "" : "s",
            shortCount > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
              " ",
              "· ",
              /* @__PURE__ */ jsx("b", { className: "text-bad", children: shortCount }),
              " short (they stay on order)"
            ] }),
            ". A blank cost keeps the product's current cost."
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: () => setStage({ kind: "start" }), children: "Back" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: confirm, disabled: units === 0, children: "Add to inventory" })
          ] })
        ] }),
        stage.kind === "done" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("p", { className: "m-0 font-semibold", children: [
            "Added ",
            stage.result.summary.units,
            " unit",
            stage.result.summary.units === 1 ? "" : "s",
            stage.result.summary.created > 0 && `, ${stage.result.summary.created} new product${stage.result.summary.created === 1 ? "" : "s"}`,
            stage.result.status === "received" && ". Order complete.",
            stage.result.status === "partial" && ". The rest stays on order."
          ] }),
          stage.result.short.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded-xl bg-bad-tint p-3 text-sm", children: [
            /* @__PURE__ */ jsxs("p", { className: "m-0 mb-1 font-semibold text-bad flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(AlertTriangle, { size: 16 }),
              " Short on this delivery"
            ] }),
            stage.result.short.map((s) => /* @__PURE__ */ jsxs("p", { className: "m-0", children: [
              s.name,
              ": ",
              s.received,
              " of ",
              s.ordered
            ] }, s.name))
          ] }),
          stage.result.priceChanges.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 rounded-xl bg-warn-tint p-3 text-sm", children: [
            /* @__PURE__ */ jsx("p", { className: "m-0 mb-1 font-semibold text-warn", children: "Price changes (costs updated)" }),
            stage.result.priceChanges.map((c) => /* @__PURE__ */ jsxs("p", { className: "m-0", children: [
              c.name,
              ": $",
              centsToDollars(c.fromCents),
              " → $",
              centsToDollars(c.toCents)
            ] }, c.name))
          ] }),
          /* @__PURE__ */ jsx(SheetActions, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary", onClick: onClose, children: "Done" }) })
        ] })
      ]
    }
  );
}
function emptyLine() {
  return { productId: null, barcode: "", name: "", brand: "", size: "", category: "", vendor: "", qty: 0, unitCostCents: 0, retailPriceCents: 0 };
}
function orderUnits(o) {
  return o.lines.reduce((s, l) => s + l.qtyOrdered, 0);
}
function orderLeft(o) {
  return o.lines.reduce((s, l) => s + Math.max(0, l.qtyOrdered - l.qtyReceived), 0);
}
function orderCost(o) {
  return o.lines.reduce((s, l) => s + l.qtyOrdered * l.unitCostCents, 0);
}
function DeliveriesView({
  products,
  staffName,
  onChanged,
  autoReceive,
  onAutoReceiveHandled
}) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [receiving, setReceiving] = useState(null);
  const [armedCancel, setArmedCancel] = useState(null);
  const load = useCallback(async () => {
    try {
      setData(await getOrders());
    } catch {
      setData((d) => d ?? { open: [], done: [], onOrder: {}, vendors: [] });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (autoReceive) {
      setReceiving({ order: null });
      onAutoReceiveHandled?.();
    }
  }, [autoReceive, onAutoReceiveHandled]);
  async function cancel(order) {
    if (armedCancel !== order.id) {
      setArmedCancel(order.id);
      return;
    }
    setArmedCancel(null);
    setData(await cancelSavedOrder({ data: { orderId: order.id } }));
    toast(`Canceled the ${order.vendor} order`);
  }
  const open = data?.open ?? [];
  const unitsOnOrder = open.reduce((s, o) => s + orderLeft(o), 0);
  const valueOnOrder = open.reduce((s, o) => s + orderCost(o), 0);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      PageHead,
      {
        title: "Deliveries",
        lead: "Orders you've sent, waiting to arrive. Check each delivery in from the invoice in seconds.",
        action: /* @__PURE__ */ jsx(ToolButton, { icon: /* @__PURE__ */ jsx(PackagePlus, { size: 24 }), tone: "green", label: "Receive delivery", onClick: () => setReceiving({ order: null }) })
      }
    ),
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: "Open orders", value: open.length }),
      /* @__PURE__ */ jsx(StatTile, { label: "Units on order", value: unitsOnOrder }),
      /* @__PURE__ */ jsx(StatTile, { label: "Value on order", value: `$${centsToDollars(valueOnOrder)}` }),
      /* @__PURE__ */ jsx(StatTile, { label: "Vendors scored", value: data?.vendors.length ?? 0 })
    ] }),
    /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold mt-2 mb-2.5", children: "Waiting to arrive" }),
    !data ? /* @__PURE__ */ jsx("div", { className: "bg-surface rounded-2xl p-4", children: /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }) }) : open.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "No open orders", children: "When you email, print or download an order in Build order, it's saved here so you can check the delivery in against it." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 grid gap-2.5", children: open.map((o) => /* @__PURE__ */ jsxs("li", { className: "bg-surface rounded-2xl p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx(Truck, { size: 20, className: "text-action mt-0.5 shrink-0" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: o.vendor }),
          /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2", children: [
            "Ordered ",
            timeAgo(o.createdAt),
            " · ",
            o.lines.length,
            " item",
            o.lines.length === 1 ? "" : "s",
            " · ",
            orderUnits(o),
            " units",
            o.staffName ? ` · by ${o.staffName}` : ""
          ] }),
          o.status === "partial" && /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-warn font-semibold mt-0.5", children: [
            "Part received · ",
            orderLeft(o),
            " unit",
            orderLeft(o) === 1 ? "" : "s",
            " still to come"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-[12px] text-ink-2 mt-1 line-clamp-2", children: o.lines.map((l) => `${l.qtyOrdered - l.qtyReceived}× ${l.name}`).join(" · ") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-primary btn-sm", onClick: () => setReceiving({ order: o }), children: "Check in delivery" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm", onClick: () => cancel(o), children: armedCancel === o.id ? "Tap again to cancel order" : "Cancel order" })
      ] })
    ] }, o.id)) }),
    data && data.vendors.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold mt-6 mb-1", children: "Vendor accuracy" }),
      /* @__PURE__ */ jsx("p", { className: "text-[13px] text-ink-2 mt-0 mb-2.5", children: "From every delivery checked in: how much of what you ordered arrived, price surprises and how long it took." }),
      /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: data.vendors.map((v) => {
        const pct = Math.round(v.fillRate * 100);
        const tone = pct >= 98 ? "text-good" : pct >= 90 ? "text-warn" : "text-bad";
        return /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-3 border-b border-line last:border-b-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: v.vendor }),
            /* @__PURE__ */ jsxs("div", { className: "text-[13px] text-ink-2", children: [
              v.orders,
              " deliver",
              v.orders === 1 ? "y" : "ies",
              v.avgDays !== null && ` · ${v.avgDays} day${v.avgDays === 1 ? "" : "s"} to arrive`,
              v.shortLines > 0 && ` · ${v.shortLines} short line${v.shortLines === 1 ? "" : "s"}`,
              v.priceChanges > 0 && ` · ${v.priceChanges} price change${v.priceChanges === 1 ? "" : "s"}`
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-right", children: [
            /* @__PURE__ */ jsxs("b", { className: `num text-lg ${tone}`, children: [
              pct,
              "%"
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-[11px] text-ink-2", children: "filled" })
          ] })
        ] }, v.vendor);
      }) })
    ] }),
    data && data.done.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold mt-6 mb-2.5", children: "Recently received" }),
      /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: data.done.map((o) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-2.5 border-b border-line last:border-b-0 text-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0 truncate", children: [
          /* @__PURE__ */ jsx("b", { children: o.vendor }),
          " · ",
          o.lines.length,
          " item",
          o.lines.length === 1 ? "" : "s"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: o.receivedAt ? timeAgo(o.receivedAt) : "" })
      ] }, o.id)) })
    ] }),
    /* @__PURE__ */ jsx(
      ReceiveDeliverySheet,
      {
        open: receiving !== null,
        order: receiving?.order ?? null,
        products,
        staffName,
        onClose: () => setReceiving(null),
        onDone: async () => {
          await Promise.all([load(), onChanged()]);
        }
      }
    )
  ] });
}
function PlanGate({ feature, children, compact = false }) {
  const { can } = useBusiness();
  if (can(feature)) return /* @__PURE__ */ jsx(Fragment, { children });
  return /* @__PURE__ */ jsx(UpgradeCard, { feature, compact });
}
function UpgradeCard({ feature, compact = false }) {
  const { openPlans, account } = useBusiness();
  const plan = planFor(feature);
  const info = FEATURE_INFO[feature];
  const paused = account?.status === "paused";
  if (compact) {
    return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 bg-gold-tint rounded-2xl px-4 py-3 text-sm", children: [
      /* @__PURE__ */ jsx(Lock, { size: 18, className: "text-gold-ink shrink-0" }),
      /* @__PURE__ */ jsxs("span", { className: "flex-1", children: [
        /* @__PURE__ */ jsx("b", { children: info.label }),
        " ",
        paused ? "is off while billing is paused." : `comes with ${plan.name}.`
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-gold btn-sm", onClick: openPlans, children: paused ? "Resume" : "Upgrade" })
    ] });
  }
  return /* @__PURE__ */ jsxs("section", { className: "max-w-[560px] mx-auto text-center bg-white border border-line rounded-3xl px-6 py-10 shadow-card", children: [
    /* @__PURE__ */ jsx("span", { className: "brand-tile w-14 h-14 rounded-2xl text-white grid place-items-center mx-auto mb-4", "aria-hidden": "true", children: /* @__PURE__ */ jsx(Lock, { size: 24 }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-[12px] font-bold uppercase tracking-wider text-gold-ink m-0 mb-1", children: [
      "Bintro ",
      plan.name
    ] }),
    /* @__PURE__ */ jsx("h2", { className: "text-[22px] font-extrabold text-royal m-0 mb-2", children: info.label }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 m-0 mb-5", children: info.blurb }),
    paused ? /* @__PURE__ */ jsx("p", { className: "text-sm m-0 mb-5", children: "Your plan is paused, so the account is on Free features until you resume." }) : /* @__PURE__ */ jsxs("p", { className: "text-sm m-0 mb-5", children: [
      plan.name,
      " is ",
      /* @__PURE__ */ jsxs("b", { children: [
        centsLabel(priceFor(plan, "month", account?.founding)),
        "/month"
      ] }),
      " — or ",
      centsLabel(priceFor(plan, "year", account?.founding)),
      "/year."
    ] }),
    /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-gold", onClick: openPlans, children: [
      /* @__PURE__ */ jsx(Sparkles, { size: 18 }),
      paused ? "Resume my plan" : `See ${plan.name}`
    ] })
  ] });
}
function RestockView({
  mode,
  onMode,
  items,
  products,
  staffName,
  onChanged,
  autoReceive,
  onAutoReceiveHandled
}) {
  const [onOrder, setOnOrder] = useState({});
  useEffect(() => {
    getOrders().then((o) => setOnOrder(o.onOrder)).catch(() => {
    });
  }, [mode, items]);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "inline-flex p-1 rounded-full bg-surface mb-4 print:hidden max-w-full overflow-x-auto",
        role: "tablist",
        "aria-label": "Restock step",
        children: [
          { id: "below-par", label: `1 · Below par${items.length ? ` (${items.length})` : ""}` },
          { id: "order", label: "2 · Build order" },
          { id: "deliveries", label: "3 · Deliveries" }
        ].map((t) => /* @__PURE__ */ jsx(
          "button",
          {
            role: "tab",
            "aria-selected": mode === t.id,
            onClick: () => onMode(t.id),
            className: `px-4 py-2 rounded-full border-0 text-sm font-semibold cursor-pointer ${mode === t.id ? "bg-white text-ink shadow-card" : "bg-transparent text-ink-2"}`,
            children: t.label
          },
          t.id
        ))
      }
    ),
    mode === "below-par" ? /* @__PURE__ */ jsx(BelowParView, { items, products, staffName, onChanged, onBuildOrder: () => onMode("order"), onOrder }) : mode === "order" ? /* @__PURE__ */ jsx(PlanGate, { feature: "orders", children: /* @__PURE__ */ jsx(PurchaseOrderView, { items, staffName, onChanged, onOpenDeliveries: () => onMode("deliveries"), onOrder }) }) : /* @__PURE__ */ jsx(PlanGate, { feature: "orders", children: /* @__PURE__ */ jsx(
      DeliveriesView,
      {
        products,
        staffName,
        onChanged,
        autoReceive,
        onAutoReceiveHandled
      }
    ) })
  ] });
}
const EventSchema = z.object({
  title: z.string().trim().min(1).max(140),
  kind: z.enum(["reorder", "delivery", "bill", "tax", "count", "task"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^(\d{2}:\d{2})?$/),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  repeat: z.enum(["none", "weekly", "monthly", "quarterly", "yearly"]),
  notes: z.string().max(2e3),
  staffName: z.string().max(60)
});
const listCalendarEvents = createServerFn({
  method: "GET"
}).handler(createSsrRpc("fb2642136d6b78e714db8653b5c190b16782fb5dee0febafe5407086cd6baadc"));
const addCalendarEvents = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  items: z.array(EventSchema).min(1).max(20)
})).handler(createSsrRpc("d01f692499371e7e595b4b8de4522fd0640e38219158e89b6abb9e16cf52a436"));
const editCalendarEvent = createServerFn({
  method: "POST"
}).inputValidator(EventSchema.partial().extend({
  id: z.number().int()
})).handler(createSsrRpc("3d6c39e18a4a9218d6622b186dcc7152b9c7b750c35ece382031bb9b8abbd6e5"));
const removeCalendarEvent = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  id: z.number().int()
})).handler(createSsrRpc("d8417f701b27e33db653c9f29e66202992c3a531f6ce27af902b7c5611920a07"));
const getCalendarFeedPath = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  reset: z.boolean().optional()
})).handler(createSsrRpc("2b4b237bff79856c01bb15351d679549b72f1cb75bc34ff6ae694c5c4ee39a0b"));
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UPCOMING_DAYS = 45;
function addDays(day, n) {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}
function dayLabel(day, style = "long") {
  const today = toDay(/* @__PURE__ */ new Date());
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  return parseDay(day).toLocaleDateString("en-US", style === "long" ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
}
function nextWeekday(weekday) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return toDay(d);
}
function CalendarView({ belowPar, staffName }) {
  const toast = useToast();
  const { name: businessName } = useBusiness();
  const today = toDay(/* @__PURE__ */ new Date());
  const [events, setEvents] = useState(null);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [syncOpen, setSyncOpen] = useState(false);
  useEffect(() => {
    listCalendarEvents().then((e) => setEvents(e)).catch(() => setEvents([]));
  }, []);
  const grid = useMemo(() => {
    const first = parseDay(`${month}-01`);
    const start = addDays(`${month}-01`, -first.getDay());
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const end = addDays(toDay(last), 6 - last.getDay());
    const days = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return { days, start, end };
  }, [month]);
  const byDay = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    const from = grid.start < today ? grid.start : today;
    const to = addDays(today, UPCOMING_DAYS) > grid.end ? addDays(today, UPCOMING_DAYS) : grid.end;
    for (const event of events ?? []) {
      for (const day of occurrences(event, from, to)) {
        const list = map.get(day) ?? [];
        list.push({ event, day });
        map.set(day, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (a.event.startTime || "00:00").localeCompare(b.event.startTime || "00:00"));
    return map;
  }, [events, grid, today]);
  const upcoming = useMemo(() => {
    const out = [];
    for (let i = 0; i <= UPCOMING_DAYS && out.length < 12; i++) out.push(...byDay.get(addDays(today, i)) ?? []);
    return out.slice(0, 12);
  }, [byDay, today]);
  const selectedItems = byDay.get(selected) ?? [];
  const monthDate = parseDay(`${month}-01`);
  function shiftMonth(n) {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + n, 1);
    setMonth(toDay(d).slice(0, 7));
  }
  async function quickAdd(items, message) {
    try {
      setEvents(await addCalendarEvents({ data: { items } }));
      toast(message);
    } catch {
      toast("Could not add. Try again.");
    }
  }
  const hasTaxDates = (events ?? []).some((e) => e.kind === "tax" && /estimated tax/i.test(e.title));
  const hasCount = (events ?? []).some((e) => e.kind === "count" && e.repeat !== "none");
  const hasPriceCheck = (events ?? []).some((e) => e.kind === "task" && /price check/i.test(e.title));
  const hasReorderDay = (events ?? []).some((e) => e.kind === "reorder" && e.repeat === "weekly");
  const base = { startTime: "", durationMinutes: 60, notes: "", staffName, repeat: "none" };
  const starters = [
    !hasTaxDates && {
      key: "tax",
      Icon: Landmark,
      title: "Estimated tax dates",
      sub: "The four US quarterly due dates, every year",
      run: () => quickAdd(
        estimatedTaxDates().map((t) => ({
          ...base,
          kind: "tax",
          title: t.title,
          date: t.date,
          repeat: "yearly",
          notes: "Federal estimated tax (Form 1040-ES). Check your state’s dates with your accountant."
        })),
        "Added the quarterly tax dates"
      )
    },
    !hasCount && {
      key: "count",
      Icon: ClipboardCheck,
      title: "Monthly stock count",
      sub: "Last day of each month, for your books",
      run: () => {
        const d = /* @__PURE__ */ new Date();
        const last = toDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        quickAdd(
          [{ ...base, kind: "count", title: "Monthly stock count", date: last, repeat: "monthly", startTime: "17:00", notes: "Count on-hand stock in Bintro so month-end inventory value is accurate." }],
          "Monthly stock count added"
        );
      }
    },
    !hasReorderDay && {
      key: "reorder",
      Icon: Repeat,
      title: "Weekly reorder day",
      sub: "Every Monday at 10 AM, check Restock",
      run: () => quickAdd(
        [{ ...base, kind: "reorder", title: "Reorder day", date: nextWeekday(1), repeat: "weekly", startTime: "10:00", durationMinutes: 30, notes: "Open Bintro → Restock and send this week’s order." }],
        "Weekly reorder day added"
      )
    },
    !hasPriceCheck && {
      key: "prices",
      Icon: Tag,
      title: "Quarterly price check",
      sub: "Every 3 months, confirm your costs",
      run: () => quickAdd(
        [{ ...base, kind: "task", title: "Price check", date: nextWeekday(2), repeat: "quarterly", startTime: "10:00", durationMinutes: 30, notes: "Open Bintro → Activity → Sales insights → Prices and check costs online." }],
        "Quarterly price check added"
      )
    }
  ].filter(Boolean);
  function scheduleRestock() {
    const lines = belowPar.slice(0, 25).map((p) => `• ${p.name}${p.brand ? ` (${p.brand})` : ""}: order ${unitsToPar(p) || 1}+`);
    setEditing({
      draft: {
        kind: "reorder",
        title: `Reorder ${belowPar.length} item${belowPar.length === 1 ? "" : "s"}`,
        date: addDays(today, 1),
        startTime: "10:00",
        durationMinutes: 30,
        notes: lines.join("\n") + (belowPar.length > 25 ? `
…and ${belowPar.length - 25} more` : "")
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      PageHead,
      {
        title: "Calendar",
        lead: "Reorders, deliveries, bills and tax dates in one place, synced to Google Calendar and Outlook.",
        action: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal btn-sm", onClick: () => setSyncOpen(true), children: [
            /* @__PURE__ */ jsx(RefreshCw, { size: 16 }),
            "Sync"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => setEditing({ draft: { date: selected >= today ? selected : today } }), children: [
            /* @__PURE__ */ jsx(Plus, { size: 16 }),
            "Add event"
          ] })
        ] })
      }
    ),
    belowPar.length > 0 && /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: scheduleRestock,
        className: "w-full text-left flex items-center gap-3 bg-action-tint rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer",
        children: [
          /* @__PURE__ */ jsx(Truck, { size: 20, className: "text-action shrink-0" }),
          /* @__PURE__ */ jsxs("span", { className: "text-sm flex-1", children: [
            /* @__PURE__ */ jsxs("b", { children: [
              belowPar.length,
              " item",
              belowPar.length === 1 ? " is" : "s are",
              " below par."
            ] }),
            " Put the reorder on the calendar with the list attached."
          ] }),
          /* @__PURE__ */ jsx(CalendarPlus, { size: 18, className: "text-action shrink-0" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-5 items-start", children: [
      /* @__PURE__ */ jsxs("section", { "aria-label": "Month", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsx("button", { className: "btn btn-tonal btn-sm !px-2.5", onClick: () => shiftMonth(-1), "aria-label": "Previous month", children: /* @__PURE__ */ jsx(ChevronLeft, { size: 18 }) }),
          /* @__PURE__ */ jsx("h2", { className: "m-0 text-lg font-bold flex-1 text-center", "aria-live": "polite", children: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }) }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-tonal btn-sm !px-2.5", onClick: () => shiftMonth(1), "aria-label": "Next month", children: /* @__PURE__ */ jsx(ChevronRight, { size: 18 }) }),
          (month !== today.slice(0, 7) || selected !== today) && /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn btn-text btn-sm",
              onClick: () => {
                setMonth(today.slice(0, 7));
                setSelected(today);
              },
              children: "Today"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 text-center text-[12px] font-semibold text-ink-2 mb-1", "aria-hidden": "true", children: WEEKDAYS.map((w) => /* @__PURE__ */ jsx("span", { children: w }, w)) }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-1", role: "grid", "aria-label": "Days", children: grid.days.map((day) => {
          const items = byDay.get(day) ?? [];
          const inMonth = day.startsWith(month);
          const isToday = day === today;
          const isSelected = day === selected;
          return /* @__PURE__ */ jsxs(
            "button",
            {
              role: "gridcell",
              "aria-selected": isSelected,
              "aria-label": `${dayLabel(day)}${items.length ? `, ${items.length} event${items.length === 1 ? "" : "s"}` : ""}`,
              onClick: () => {
                setSelected(day);
                if (!inMonth) setMonth(day.slice(0, 7));
              },
              onDoubleClick: () => setEditing({ draft: { date: day } }),
              className: `relative min-h-[54px] min-[560px]:min-h-[76px] rounded-xl border p-1 text-left flex flex-col cursor-pointer transition-colors ${isSelected ? "border-action bg-action-tint" : "border-transparent bg-surface hover:bg-surface-2"} ${inMonth ? "" : "opacity-45"}`,
              children: [
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: `num text-[13px] font-semibold w-6 h-6 grid place-items-center rounded-full ${isToday ? "bg-action text-white" : ""}`,
                    children: Number(day.slice(8))
                  }
                ),
                /* @__PURE__ */ jsxs("span", { className: "hidden min-[560px]:flex flex-col gap-0.5 mt-0.5 min-w-0 w-full", children: [
                  items.slice(0, 2).map((o) => /* @__PURE__ */ jsx("span", { className: `truncate rounded px-1 text-[11px] font-semibold leading-[16px] ${eventKind(o.event.kind).tint}`, children: o.event.title }, o.event.id)),
                  items.length > 2 && /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-ink-2 px-1", children: [
                    "+",
                    items.length - 2,
                    " more"
                  ] })
                ] }),
                items.length > 0 && /* @__PURE__ */ jsx("span", { className: "min-[560px]:hidden flex gap-0.5 mt-auto mx-auto pb-0.5", children: items.slice(0, 3).map((o) => /* @__PURE__ */ jsx("span", { className: `w-1.5 h-1.5 rounded-full ${eventKind(o.event.kind).dot}` }, o.event.id)) })
              ]
            },
            day
          );
        }) }),
        /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[12px] text-ink-2", children: EVENT_KINDS.map((k) => /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full ${k.dot}` }),
          k.label
        ] }, k.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
        /* @__PURE__ */ jsxs("section", { "aria-label": dayLabel(selected), children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2 mb-2", children: [
            /* @__PURE__ */ jsx("h2", { className: "m-0 text-lg font-bold", children: dayLabel(selected) }),
            /* @__PURE__ */ jsxs("button", { className: "btn btn-text btn-sm", onClick: () => setEditing({ draft: { date: selected } }), children: [
              /* @__PURE__ */ jsx(Plus, { size: 16 }),
              "Add"
            ] })
          ] }),
          events === null ? /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-4", children: [
            /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }),
            /* @__PURE__ */ jsx("div", { className: "skel w-[40%]" })
          ] }) : selectedItems.length === 0 ? /* @__PURE__ */ jsx("p", { className: "m-0 text-sm text-ink-2 bg-surface rounded-2xl px-4 py-4", children: "Nothing planned." }) : /* @__PURE__ */ jsx(EventList, { items: selectedItems, onOpen: setViewing, showDay: false })
        ] }),
        /* @__PURE__ */ jsxs("section", { "aria-label": "Coming up", children: [
          /* @__PURE__ */ jsx("h2", { className: "m-0 mb-2 text-lg font-bold", children: "Coming up" }),
          events === null ? null : upcoming.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "Your calendar is clear", children: "Add deliveries, bill due dates and reorders, or start with one of the suggestions below." }) : /* @__PURE__ */ jsx(EventList, { items: upcoming, onOpen: setViewing, showDay: true })
        ] }),
        events !== null && starters.length > 0 && /* @__PURE__ */ jsxs("section", { "aria-label": "Suggestions", className: "rounded-2xl border border-line p-3.5", children: [
          /* @__PURE__ */ jsx("h2", { className: "m-0 text-[15px] font-bold", children: "Quick start" }),
          /* @__PURE__ */ jsx("p", { className: "m-0 mb-2 text-[13px] text-ink-2", children: "One tap each. Edit or delete them any time." }),
          /* @__PURE__ */ jsx("div", { className: "grid gap-2", children: starters.map(({ key: key2, Icon, title, sub, run }) => /* @__PURE__ */ jsxs("button", { onClick: run, className: "flex items-center gap-3 text-left bg-surface hover:bg-surface-2 rounded-xl px-3 py-2.5 border-0 cursor-pointer", children: [
            /* @__PURE__ */ jsx(Icon, { size: 18, className: "text-action shrink-0" }),
            /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0 text-sm", children: [
              /* @__PURE__ */ jsx("b", { className: "block", children: title }),
              /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[13px]", children: sub })
            ] }),
            /* @__PURE__ */ jsx(Plus, { size: 18, className: "text-ink-2 shrink-0" })
          ] }, key2)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(
      Sheet,
      {
        open: viewing !== null,
        onClose: () => setViewing(null),
        title: viewing?.event.title ?? "",
        subtitle: viewing ? `${dayLabel(viewing.day)} · ${formatTime(viewing.event.startTime)}` : void 0,
        children: viewing && /* @__PURE__ */ jsx(
          EventDetails,
          {
            occurrence: viewing,
            businessName,
            onEdit: () => {
              setEditing({ event: viewing.event });
              setViewing(null);
            },
            onDelete: async () => {
              const gone = viewing.event;
              try {
                setEvents(await removeCalendarEvent({ data: { id: gone.id } }));
                setViewing(null);
                toast(`Deleted ${gone.title}`, async () => {
                  const { id: _id, ...rest } = gone;
                  setEvents(await addCalendarEvents({ data: { items: [rest] } }));
                });
              } catch {
                toast("Could not delete. Try again.");
              }
            }
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(
      Sheet,
      {
        open: editing !== null,
        onClose: () => setEditing(null),
        title: editing?.event ? "Edit event" : "New event",
        subtitle: editing?.event ? void 0 : "It shows here and in any Google or Outlook calendar synced to Bintro.",
        children: editing && /* @__PURE__ */ jsx(
          EventForm,
          {
            event: editing.event,
            draft: editing.draft,
            staffName,
            onCancel: () => setEditing(null),
            onSaved: (next, message, day) => {
              setEvents(next);
              setEditing(null);
              setSelected(day);
              setMonth(day.slice(0, 7));
              toast(message);
            }
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(SyncSheet, { open: syncOpen, onClose: () => setSyncOpen(false), businessName })
  ] });
}
function EventList({ items, onOpen, showDay }) {
  return /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 bg-white border border-line rounded-2xl px-3", children: items.map((o) => {
    const kind = eventKind(o.event.kind);
    return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => onOpen(o),
        className: "w-full flex items-center gap-3 py-2.5 border-0 border-b border-line bg-transparent text-left cursor-pointer text-ink",
        children: [
          /* @__PURE__ */ jsx("span", { className: `w-1 self-stretch rounded-full ${kind.dot}`, "aria-hidden": "true" }),
          /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("span", { className: "block font-semibold truncate", children: o.event.title }),
            /* @__PURE__ */ jsx("span", { className: "block text-[13px] text-ink-2 truncate", children: [showDay && dayLabel(o.day, "short"), formatTime(o.event.startTime), kind.label, o.event.repeat !== "none" && REPEATS.find((r) => r.id === o.event.repeat)?.label].filter(Boolean).join(" · ") })
          ] }),
          /* @__PURE__ */ jsx(ChevronRight, { size: 16, className: "text-ink-2 shrink-0" })
        ]
      }
    ) }, `${o.event.id}-${o.day}`);
  }) });
}
function downloadIcs(event, businessName) {
  const text = buildIcs([event], businessName, window.location.host);
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${businessSlug(event.title)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function EventDetails({
  occurrence,
  businessName,
  onEdit,
  onDelete
}) {
  const { event, day } = occurrence;
  const kind = eventKind(event.kind);
  const [confirm, setConfirm] = useState(false);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 mb-3", children: [
      /* @__PURE__ */ jsx("span", { className: `text-[12px] font-semibold px-2 py-0.5 rounded-full ${kind.tint}`, children: kind.label }),
      event.repeat !== "none" && /* @__PURE__ */ jsxs("span", { className: "text-[12px] font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-2 inline-flex items-center gap-1", children: [
        /* @__PURE__ */ jsx(Repeat, { size: 12 }),
        REPEATS.find((r) => r.id === event.repeat)?.label
      ] }),
      event.staffName && /* @__PURE__ */ jsxs("span", { className: "text-[12px] px-2 py-0.5 rounded-full bg-surface text-ink-2", children: [
        "Added by ",
        event.staffName
      ] })
    ] }),
    event.notes && /* @__PURE__ */ jsx("p", { className: "whitespace-pre-line text-sm bg-surface rounded-2xl p-3 m-0 mb-4", children: event.notes }),
    /* @__PURE__ */ jsx("h3", { className: "text-[13px] font-semibold text-ink-2 m-0 mb-2", children: "Add to your calendar" }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2", children: [
      /* @__PURE__ */ jsxs("a", { className: "btn btn-tonal btn-sm no-underline", href: googleCalendarUrl(event, day), target: "_blank", rel: "noreferrer", children: [
        /* @__PURE__ */ jsx(GoogleMark, {}),
        "Google"
      ] }),
      /* @__PURE__ */ jsxs("a", { className: "btn btn-tonal btn-sm no-underline", href: outlookCalendarUrl(event, false, day), target: "_blank", rel: "noreferrer", children: [
        /* @__PURE__ */ jsx(OutlookMark, {}),
        "Outlook.com"
      ] }),
      /* @__PURE__ */ jsxs("a", { className: "btn btn-tonal btn-sm no-underline", href: outlookCalendarUrl(event, true, day), target: "_blank", rel: "noreferrer", children: [
        /* @__PURE__ */ jsx(OutlookMark, {}),
        "Outlook (work)"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal btn-sm", onClick: () => downloadIcs(event, businessName), children: [
        /* @__PURE__ */ jsx(Download, { size: 16 }),
        "Apple / .ics"
      ] })
    ] }),
    /* @__PURE__ */ jsxs(SheetActions, { children: [
      /* @__PURE__ */ jsxs("button", { className: `btn ${confirm ? "bg-bad text-white" : "bg-bad-tint text-bad"}`, onClick: () => confirm ? onDelete() : setConfirm(true), onBlur: () => setConfirm(false), children: [
        /* @__PURE__ */ jsx(Trash2, { size: 16 }),
        confirm ? event.repeat !== "none" ? "Delete all repeats" : "Tap to confirm" : "Delete"
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: onEdit, children: [
        /* @__PURE__ */ jsx(Pencil, { size: 16 }),
        "Edit"
      ] })
    ] })
  ] });
}
const DURATIONS = [15, 30, 60, 90, 120, 240];
function EventForm({
  event,
  draft,
  staffName,
  onCancel,
  onSaved
}) {
  const init = { ...draft, ...event };
  const [title, setTitle] = useState(init.title ?? "");
  const [kind, setKind] = useState(init.kind ?? "task");
  const [date, setDate] = useState(init.date ?? toDay(/* @__PURE__ */ new Date()));
  const [allDay, setAllDay] = useState(!(init.startTime ?? ""));
  const [time, setTime] = useState(init.startTime || "10:00");
  const [duration, setDuration] = useState(init.durationMinutes ?? 60);
  const [repeat, setRepeat] = useState(init.repeat ?? "none");
  const [notes, setNotes] = useState(init.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const placeholder = {
    reorder: "e.g. Order from SalonCentric",
    delivery: "e.g. Delivery arriving",
    count: "e.g. Backbar count",
    bill: "e.g. Rent due",
    tax: "e.g. Sales tax filing",
    task: "e.g. Clean the color bar"
  }[kind];
  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a date.");
      return;
    }
    setSaving(true);
    setError("");
    const values = {
      title: title.trim(),
      kind,
      date,
      startTime: allDay ? "" : time,
      durationMinutes: duration,
      repeat,
      notes: notes.trim(),
      staffName: event?.staffName || staffName
    };
    try {
      const next = event ? await editCalendarEvent({ data: { id: event.id, ...values } }) : await addCalendarEvents({ data: { items: [values] } });
      onSaved(next, event ? "Event saved" : `Added ${values.title}`, date);
    } catch {
      setError("Could not save. Check your connection and try again.");
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: submit, noValidate: true, children: [
    /* @__PURE__ */ jsx(Field, { label: "Type", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", role: "radiogroup", "aria-label": "Event type", children: EVENT_KINDS.map((k) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        role: "radio",
        "aria-checked": kind === k.id,
        "aria-pressed": kind === k.id,
        className: "chip !px-3 !py-1.5 !text-[13px] inline-flex items-center gap-1.5",
        onClick: () => setKind(k.id),
        children: [
          /* @__PURE__ */ jsx("span", { className: `w-2 h-2 rounded-full ${k.dot}` }),
          k.label
        ]
      },
      k.id
    )) }) }),
    /* @__PURE__ */ jsx(Field, { label: "Title", htmlFor: "ev-title", children: /* @__PURE__ */ jsx("input", { id: "ev-title", className: "field-input", value: title, onChange: (e) => setTitle(e.target.value.slice(0, 140)), placeholder, autoFocus: !event && !draft?.title }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Date", htmlFor: "ev-date", children: /* @__PURE__ */ jsx("input", { id: "ev-date", type: "date", className: "field-input", value: date, onChange: (e) => setDate(e.target.value) }) }),
      /* @__PURE__ */ jsx(Field, { label: allDay ? "Time" : "Starts", htmlFor: "ev-time", children: allDay ? /* @__PURE__ */ jsx("button", { type: "button", id: "ev-time", className: "field-input text-left text-ink-2 cursor-pointer", onClick: () => setAllDay(false), children: "All day · add a time" }) : /* @__PURE__ */ jsx("input", { id: "ev-time", type: "time", className: "field-input", value: time, onChange: (e) => setTime(e.target.value) }) })
    ] }),
    !allDay && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap -mt-1 mb-3", children: [
      /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 overflow-x-auto", role: "group", "aria-label": "Length", children: DURATIONS.map((d) => /* @__PURE__ */ jsx("button", { type: "button", className: "chip !px-2.5 !py-1 !text-[13px]", "aria-pressed": duration === d, onClick: () => setDuration(d), children: d < 60 ? `${d} min` : `${d / 60} hr` }, d)) }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm !py-1", onClick: () => setAllDay(true), children: "Make all day" })
    ] }),
    /* @__PURE__ */ jsx(Field, { label: "Repeats", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", role: "radiogroup", "aria-label": "Repeats", children: REPEATS.map((r) => /* @__PURE__ */ jsx("button", { type: "button", role: "radio", "aria-checked": repeat === r.id, "aria-pressed": repeat === r.id, className: "chip !px-3 !py-1.5 !text-[13px]", onClick: () => setRepeat(r.id), children: r.label }, r.id)) }) }),
    /* @__PURE__ */ jsx(Field, { label: "Notes", htmlFor: "ev-notes", children: /* @__PURE__ */ jsx("textarea", { id: "ev-notes", rows: 4, className: "field-input resize-y", value: notes, onChange: (e) => setNotes(e.target.value.slice(0, 2e3)), placeholder: "Order list, account number, who's handling it…" }) }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-1 mb-0", children: error }),
    /* @__PURE__ */ jsxs(SheetActions, { children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving, children: saving ? "Saving…" : event ? "Save" : "Add event" })
    ] })
  ] });
}
function SyncSheet({ open, onClose, businessName }) {
  const toast = useToast();
  const [feedUrl, setFeedUrl] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    if (!open || feedUrl) return;
    getCalendarFeedPath({ data: {} }).then((r) => setFeedUrl(`${window.location.origin}${r.path}`)).catch(() => toast("Could not load the calendar link. Try again."));
  }, [open, feedUrl, toast]);
  const links = feedUrl ? subscribeUrls(feedUrl, `${businessName} · Bintro`) : null;
  async function reset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    try {
      const r = await getCalendarFeedPath({ data: { reset: true } });
      setFeedUrl(`${window.location.origin}${r.path}`);
      setConfirmReset(false);
      toast("New link made. Calendars using the old one stop updating.");
    } catch {
      toast("Could not reset the link. Try again.");
    }
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Sync with your calendar",
      subtitle: "Subscribe once and every Bintro event shows up in your calendar app, updating on its own. Google refreshes every few hours; Outlook and Apple more often.",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(SyncButton, { href: links?.google, icon: /* @__PURE__ */ jsx(GoogleMark, {}), title: "Google Calendar", sub: "Opens Google Calendar to add it" }),
          /* @__PURE__ */ jsx(SyncButton, { href: links?.outlook, icon: /* @__PURE__ */ jsx(OutlookMark, {}), title: "Outlook.com", sub: "Personal Microsoft accounts" }),
          /* @__PURE__ */ jsx(SyncButton, { href: links?.outlookWork, icon: /* @__PURE__ */ jsx(OutlookMark, {}), title: "Outlook for work or school", sub: "Microsoft 365 accounts" }),
          /* @__PURE__ */ jsx(SyncButton, { href: links?.apple, icon: /* @__PURE__ */ jsx(CalendarDays, { size: 18 }), title: "Apple Calendar", sub: "iPhone, iPad and Mac", external: false })
        ] }),
        /* @__PURE__ */ jsx(Field, { label: "Or paste this link into any calendar app", htmlFor: "feed-url", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("input", { id: "feed-url", readOnly: true, className: "field-input !text-[13px]", value: feedUrl || "Loading…", onFocus: (e) => e.target.select() }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "btn btn-tonal btn-sm shrink-0",
              disabled: !feedUrl,
              onClick: async () => {
                try {
                  await navigator.clipboard.writeText(feedUrl);
                  toast("Calendar link copied");
                } catch {
                  toast("Select the link and copy it");
                }
              },
              children: [
                /* @__PURE__ */ jsx(Copy, { size: 16 }),
                "Copy"
              ]
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxs("p", { className: "text-[13px] text-ink-2 m-0", children: [
          "Anyone with this link can see your Bintro events, so share it only with your team.",
          " ",
          /* @__PURE__ */ jsx("button", { type: "button", className: "border-0 bg-transparent p-0 text-bad font-semibold cursor-pointer", onClick: reset, onBlur: () => setConfirmReset(false), children: confirmReset ? "Tap again to make a new link" : "Reset link" })
        ] }),
        /* @__PURE__ */ jsx(SheetActions, { children: /* @__PURE__ */ jsx("button", { className: "btn btn-tonal", onClick: onClose, children: "Done" }) })
      ]
    }
  );
}
function SyncButton({ href, icon, title, sub, external = true }) {
  return /* @__PURE__ */ jsxs(
    "a",
    {
      href,
      "aria-disabled": !href,
      target: external ? "_blank" : void 0,
      rel: "noreferrer",
      className: `flex items-center gap-3 rounded-2xl bg-surface hover:bg-surface-2 px-4 py-3 no-underline text-ink ${href ? "" : "pointer-events-none opacity-50"}`,
      children: [
        /* @__PURE__ */ jsx("span", { className: "w-9 h-9 rounded-full bg-white grid place-items-center shrink-0", children: icon }),
        /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0 text-sm", children: [
          /* @__PURE__ */ jsx("b", { className: "block", children: title }),
          /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[13px]", children: sub })
        ] }),
        /* @__PURE__ */ jsx(ChevronRight, { size: 16, className: "text-ink-2" })
      ]
    }
  );
}
function GoogleMark() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("path", { fill: "#4285F4", d: "M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" }),
    /* @__PURE__ */ jsx("path", { fill: "#34A853", d: "M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" }),
    /* @__PURE__ */ jsx("path", { fill: "#FBBC05", d: "M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z" }),
    /* @__PURE__ */ jsx("path", { fill: "#EA4335", d: "M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z" })
  ] });
}
function OutlookMark() {
  return /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsx("rect", { x: "2", y: "4", width: "13", height: "16", rx: "2", fill: "#0A64C8" }),
    /* @__PURE__ */ jsx("path", { fill: "#fff", d: "M8.5 8c-2 0-3.2 1.7-3.2 4s1.2 4 3.2 4 3.2-1.7 3.2-4-1.2-4-3.2-4zm0 6.3c-.9 0-1.4-1-1.4-2.3s.5-2.3 1.4-2.3 1.4 1 1.4 2.3-.5 2.3-1.4 2.3z" }),
    /* @__PURE__ */ jsx("path", { fill: "#28A8EA", d: "M15 7h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-6z" })
  ] });
}
const CHART_MONTHS = 6;
function BudgetView({
  staffName,
  recent,
  onOpenSettings
}) {
  const toast = useToast();
  const { type, name: businessName, categories } = useBusiness();
  const thisMonth = monthKey();
  const [month, setMonth] = useState(thisMonth);
  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState(null);
  const [qb, setQb] = useState(null);
  const [editing, setEditing] = useState(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [version, setVersion] = useState(0);
  const months = useMemo(() => recentMonths(month, CHART_MONTHS), [month]);
  useEffect(() => {
    let live = true;
    Promise.all([
      getBudgetOverview({ data: { months: months.map(monthRange) } }),
      listExpenses({ data: { month } })
    ]).then(([o, e]) => {
      if (!live) return;
      setOverview(o);
      setItems(e);
    }).catch(() => {
      if (!live) return;
      setOverview([]);
      setItems([]);
    });
    return () => {
      live = false;
    };
  }, [months, month, recent, version]);
  useEffect(() => {
    getIntegrations().then((s) => setQb(s.find((i) => i.provider === "quickbooks") ?? null)).catch(() => setQb(null));
  }, []);
  const current = overview?.find((m) => m.month === month);
  const taxRollup = useMemo(() => {
    const groups = /* @__PURE__ */ new Map();
    for (const c of current?.stockCategories ?? []) {
      const saved = findCategory(categories, c.category);
      const group = saved ? TAX_GROUPS.find((g) => g.id === saved.taxGroup) ?? null : null;
      const id = group?.id ?? "unfiled";
      const row = groups.get(id) ?? { group, cents: 0, categories: /* @__PURE__ */ new Set() };
      row.cents += c.cents;
      row.categories.add(c.category || "No category");
      groups.set(id, row);
    }
    return Array.from(groups.values()).sort((a, b) => b.cents - a.cents);
  }, [current, categories]);
  const spent = current ? current.inventoryCents + current.expenseCents : 0;
  const budget = current?.budgetCents ?? 0;
  const left = budget - spent;
  const pct = budget > 0 ? Math.round(spent / budget * 100) : null;
  const avg = overview?.length ? Math.round(overview.reduce((s, m) => s + m.inventoryCents + m.expenseCents, 0) / overview.length) : 0;
  const vendorSuggestions = useMemo(
    () => Array.from(/* @__PURE__ */ new Set([...(items ?? []).map((e) => e.vendor), ...(current?.vendors ?? []).map((v) => v.vendor)])).filter(Boolean),
    [items, current]
  );
  function reload() {
    setVersion((v) => v + 1);
  }
  async function pushToQuickBooks() {
    setPushing(true);
    try {
      const r = await quickbooksPushMonth({ data: monthRange(month) });
      if (!r.ok) {
        toast(r.message);
        return;
      }
      const { sentExpenses, sentVendors, monthClosed } = r.result;
      const total = sentExpenses + sentVendors;
      toast(
        total === 0 ? "QuickBooks is already up to date for this month" : `Sent ${total} entr${total === 1 ? "y" : "ies"} to QuickBooks${monthClosed ? "" : ". Stock purchases go once the month ends"}`
      );
      reload();
    } catch {
      toast("Could not reach QuickBooks. Try again.");
    } finally {
      setPushing(false);
    }
  }
  function exportCsv() {
    if (!current || !items) return;
    const cell = (v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [["Date", "Type", "Vendor / payee", "Category", "Tax group", "Tax line", "Description", "Amount"]];
    for (const e of items) rows.push([e.spentOn, "Expense", e.vendor, e.category, "", "", e.note, centsToDollars(e.amountCents)]);
    const last = new Date(new Date(monthRange(month).end).getTime() - 1);
    for (const c of current.stockCategories) {
      const saved = findCategory(categories, c.category);
      const group = saved ? TAX_GROUPS.find((g) => g.id === saved.taxGroup) : void 0;
      rows.push([
        dayKey(last),
        "Inventory received",
        "",
        c.category || "No category",
        group?.label ?? "Not filed",
        group?.taxLine ?? "",
        "Stock scanned in this month",
        centsToDollars(c.cents)
      ]);
    }
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-spending-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  const status = pct === null ? null : pct > 100 ? { tone: "bad", label: `Over budget by ${dollarsShort(-left)}`, Icon: AlertTriangle } : pct >= 85 ? { tone: "warn", label: `${pct}% used — getting close`, Icon: AlertTriangle } : { tone: "good", label: `${pct}% used — on track`, Icon: CheckCircle2 };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx(
      PageHead,
      {
        title: "Budget & Expenses",
        lead: "What the team spends each month on stock and everything else, against your budget.",
        action: /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: () => setEditing("new"), children: [
          /* @__PURE__ */ jsx(Plus, { size: 18 }),
          "Add expense"
        ] })
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-tonal btn-sm !px-2.5",
          onClick: () => setMonth(recentMonths(month, 2)[0]),
          "aria-label": "Previous month",
          children: /* @__PURE__ */ jsx(ChevronLeft, { size: 18 })
        }
      ),
      /* @__PURE__ */ jsx("h2", { className: "m-0 text-lg font-bold min-w-[150px] text-center", children: monthLabel(month) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-tonal btn-sm !px-2.5",
          disabled: month >= thisMonth,
          onClick: () => {
            const [y, m] = month.split("-").map(Number);
            setMonth(monthKey(new Date(y, m, 1)));
          },
          "aria-label": "Next month",
          children: /* @__PURE__ */ jsx(ChevronRight, { size: 18 })
        }
      ),
      month !== thisMonth && /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm", onClick: () => setMonth(thisMonth), children: "This month" })
    ] }),
    /* @__PURE__ */ jsxs(StatGrid, { children: [
      /* @__PURE__ */ jsx(StatTile, { label: current?.hasOverride ? "Budget (this month)" : "Monthly budget", value: overview ? budget ? dollarsShort(budget) : "Not set" : "–" }),
      /* @__PURE__ */ jsx(StatTile, { label: "Spent", value: overview ? dollarsShort(spent) : "–" }),
      /* @__PURE__ */ jsx(
        StatTile,
        {
          label: left < 0 ? "Over budget" : "Left to spend",
          value: overview ? budget ? dollarsShort(Math.abs(left)) : "–" : "–",
          tone: !budget ? void 0 : left < 0 ? "bad" : pct !== null && pct >= 85 ? "warn" : "good"
        }
      ),
      /* @__PURE__ */ jsx(StatTile, { label: `${CHART_MONTHS}-month average`, value: overview ? dollarsShort(avg) : "–" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "bg-surface rounded-2xl p-4 mb-5", children: budget > 0 && pct !== null && status ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "h-3 rounded-full bg-white overflow-hidden mb-2", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Budget used", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: `h-full rounded-full ${status.tone === "bad" ? "bg-bad" : status.tone === "warn" ? "bg-warn" : "bg-good"}`,
          style: { width: `${Math.min(100, pct)}%` }
        }
      ) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap text-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: `flex items-center gap-1.5 font-semibold ${status.tone === "bad" ? "text-bad" : status.tone === "warn" ? "text-warn" : "text-good"}`, children: [
          /* @__PURE__ */ jsx(status.Icon, { size: 16 }),
          status.label
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "btn btn-text btn-sm !p-0", onClick: () => setBudgetOpen(true), children: [
          /* @__PURE__ */ jsx(Pencil, { size: 14 }),
          "Change budget"
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap text-sm", children: [
      /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "Set a monthly budget to see how much is left to spend." }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-tonal btn-sm", onClick: () => setBudgetOpen(true), children: "Set budget" })
    ] }) }),
    overview && overview.length > 0 && /* @__PURE__ */ jsx(SpendChart, { data: overview, selected: month, onSelect: setMonth }),
    /* @__PURE__ */ jsxs("div", { className: "grid min-[760px]:grid-cols-2 gap-3.5 mb-5", children: [
      /* @__PURE__ */ jsx(
        Breakdown,
        {
          title: "Stock received",
          total: current?.inventoryCents ?? 0,
          empty: "Nothing scanned in this month. Scan deliveries in on the Scan tab and they’re counted here.",
          rows: (current?.vendors ?? []).map((v) => ({ label: v.vendor, sub: `${v.units} unit${v.units === 1 ? "" : "s"}`, cents: v.cents }))
        }
      ),
      /* @__PURE__ */ jsx(
        Breakdown,
        {
          title: "Other expenses",
          total: current?.expenseCents ?? 0,
          empty: "No expenses logged. Snap a receipt with Add expense.",
          rows: (current?.categories ?? []).map((c) => ({ label: c.category, cents: c.cents }))
        }
      )
    ] }),
    taxRollup.length > 0 && /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl px-4 py-1 mb-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-baseline gap-3 pt-3 pb-1", children: [
        /* @__PURE__ */ jsx("h3", { className: "m-0 text-[17px] font-bold", children: "Stock by tax line" }),
        /* @__PURE__ */ jsx("span", { className: "text-[12px] text-ink-2", children: "For your accountant" })
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: taxRollup.map((r) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-3 py-2.5 border-b border-line last:border-b-0 text-sm", children: [
        /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold", children: r.group?.label ?? "Not filed under a tax group" }),
          r.group?.cogs && /* @__PURE__ */ jsx("span", { className: "ml-1.5 text-[11px] font-bold text-ink-2", children: "COGS" }),
          /* @__PURE__ */ jsxs("span", { className: "block text-[12px] text-ink-2 truncate", children: [
            r.group ? r.group.taxLine : "Add these categories in Settings → Categories",
            " · ",
            Array.from(r.categories).join(", ")
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "num whitespace-nowrap font-semibold", children: [
          "$",
          centsToDollars(r.cents)
        ] })
      ] }, r.group?.id ?? "unfiled")) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 flex-wrap mb-2.5", children: [
      /* @__PURE__ */ jsxs("h2", { className: "text-lg font-bold m-0", children: [
        "Expenses in ",
        monthLabel(month, "short")
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal btn-sm", onClick: exportCsv, disabled: !current, children: [
          /* @__PURE__ */ jsx(Download, { size: 16 }),
          "CSV"
        ] }),
        qb?.connected ? /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal btn-sm", onClick: pushToQuickBooks, disabled: pushing, children: [
          /* @__PURE__ */ jsx(Send, { size: 16 }),
          pushing ? "Sending…" : "Send to QuickBooks"
        ] }) : /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm", onClick: onOpenSettings, children: "Connect QuickBooks" })
      ] })
    ] }),
    items === null ? /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[40%]" })
    ] }) : items.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { title: "No expenses yet this month", children: "Log rent, supplies or stock bought outside the scanner. A receipt photo fills it in for you." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 bg-white border border-line rounded-2xl px-4", children: items.map((e) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(
      "button",
      {
        className: "w-full flex items-center gap-3 py-3 border-0 border-b border-line bg-transparent text-left cursor-pointer text-ink",
        onClick: () => setEditing(e),
        children: [
          /* @__PURE__ */ jsxs("div", { className: "w-11 text-center shrink-0", children: [
            /* @__PURE__ */ jsx("b", { className: "num block text-lg leading-none", children: Number(e.spentOn.slice(8)) }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] text-ink-2 uppercase", children: monthLabel(e.spentOn.slice(0, 7), "short") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: e.vendor || e.category || "Expense" }),
            /* @__PURE__ */ jsx("div", { className: "text-[13px] text-ink-2 truncate", children: [e.category, e.note, e.staffName && `by ${e.staffName}`].filter(Boolean).join(" · ") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-right whitespace-nowrap", children: [
            /* @__PURE__ */ jsxs("b", { className: "num block", children: [
              "$",
              centsToDollars(e.amountCents)
            ] }),
            e.quickbooksId && /* @__PURE__ */ jsx("span", { className: "text-[11px] font-semibold text-good", children: "In QuickBooks" })
          ] })
        ]
      }
    ) }, e.id)) }),
    /* @__PURE__ */ jsx(
      Sheet,
      {
        open: editing !== null,
        onClose: () => setEditing(null),
        title: editing === "new" ? "Add expense" : "Edit expense",
        subtitle: editing === "new" ? "Snap the receipt and Bintro fills in the total, store and date." : void 0,
        children: editing !== null && /* @__PURE__ */ jsx(
          ExpenseForm,
          {
            expense: editing === "new" ? void 0 : editing,
            defaultDay: month === thisMonth ? dayKey() : `${month}-01`,
            categories: type.expenseCategories,
            vendors: vendorSuggestions,
            staffName,
            onCancel: () => setEditing(null),
            onSaved: (message) => {
              setEditing(null);
              toast(message);
              reload();
            }
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(Sheet, { open: budgetOpen, onClose: () => setBudgetOpen(false), title: `Budget for ${monthLabel(month)}`, children: budgetOpen && /* @__PURE__ */ jsx(
      BudgetForm,
      {
        month,
        current,
        onCancel: () => setBudgetOpen(false),
        onSaved: () => {
          setBudgetOpen(false);
          toast("Budget saved");
          reload();
        }
      }
    ) })
  ] });
}
function SpendChart({ data, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((m) => Math.max(m.inventoryCents + m.expenseCents, m.budgetCents)));
  const H = 160;
  return /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4 mb-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-baseline justify-between gap-3 flex-wrap mb-3", children: [
      /* @__PURE__ */ jsxs("h3", { className: "m-0 text-[17px] font-bold", children: [
        "Last ",
        data.length,
        " months"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3 text-[13px] text-ink-2", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-action" }),
          " Stock"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2.5 h-2.5 rounded-sm bg-gold" }),
          " Other expenses"
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "w-3 border-t-2 border-dashed border-ink" }),
          " Budget"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex items-end gap-2 min-[560px]:gap-4", style: { height: H + 28 }, children: data.map((m) => {
      const total = m.inventoryCents + m.expenseCents;
      const inv = m.inventoryCents / max * H;
      const exp = m.expenseCents / max * H;
      const over = m.budgetCents > 0 && total > m.budgetCents;
      const active = m.month === selected;
      const showTip = hover === m.month;
      return /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => onSelect(m.month),
          onMouseEnter: () => setHover(m.month),
          onMouseLeave: () => setHover(null),
          onFocus: () => setHover(m.month),
          onBlur: () => setHover(null),
          "aria-pressed": active,
          "aria-label": `${monthLabel(m.month)}: ${dollarsShort(total)} spent${m.budgetCents ? ` of ${dollarsShort(m.budgetCents)} budget` : ""}`,
          className: "relative flex-1 h-full flex flex-col justify-end items-center border-0 bg-transparent cursor-pointer p-0",
          children: [
            showTip && /* @__PURE__ */ jsxs("span", { className: "absolute z-10 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-ink text-white text-[12px] rounded-lg px-2.5 py-1.5 whitespace-nowrap text-left shadow-card pointer-events-none", children: [
              /* @__PURE__ */ jsx("b", { className: "block", children: monthLabel(m.month) }),
              "Stock ",
              dollarsShort(m.inventoryCents),
              " · Other ",
              dollarsShort(m.expenseCents),
              m.budgetCents > 0 && /* @__PURE__ */ jsxs("span", { className: "block", children: [
                "Budget ",
                dollarsShort(m.budgetCents)
              ] })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "relative w-full max-w-[44px] flex flex-col justify-end", style: { height: H }, children: [
              m.budgetCents > 0 && /* @__PURE__ */ jsx(
                "span",
                {
                  className: "absolute -left-1 -right-1 border-t-2 border-dashed border-ink",
                  style: { bottom: m.budgetCents / max * H }
                }
              ),
              exp > 0 && /* @__PURE__ */ jsx(
                "span",
                {
                  className: `block w-full bg-gold ${inv > 0 ? "rounded-t-[4px] mb-[2px]" : "rounded-t-[4px]"} ${active ? "" : "opacity-70"}`,
                  style: { height: Math.max(2, exp - (inv > 0 ? 2 : 0)) }
                }
              ),
              inv > 0 && /* @__PURE__ */ jsx(
                "span",
                {
                  className: `block w-full bg-action ${exp > 0 ? "" : "rounded-t-[4px]"} ${active ? "" : "opacity-70"}`,
                  style: { height: Math.max(2, inv) }
                }
              )
            ] }),
            /* @__PURE__ */ jsx("span", { className: `text-[12px] mt-1.5 ${active ? "font-bold text-ink" : "text-ink-2"} ${over ? "underline decoration-bad decoration-2" : ""}`, children: monthLabel(m.month, "short") })
          ]
        },
        m.month
      );
    }) }),
    /* @__PURE__ */ jsxs("table", { className: "sr-only", children: [
      /* @__PURE__ */ jsx("caption", { children: "Monthly spending" }),
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { children: "Month" }),
        /* @__PURE__ */ jsx("th", { children: "Stock" }),
        /* @__PURE__ */ jsx("th", { children: "Other expenses" }),
        /* @__PURE__ */ jsx("th", { children: "Budget" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: data.map((m) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { children: monthLabel(m.month) }),
        /* @__PURE__ */ jsx("td", { children: dollarsShort(m.inventoryCents) }),
        /* @__PURE__ */ jsx("td", { children: dollarsShort(m.expenseCents) }),
        /* @__PURE__ */ jsx("td", { children: m.budgetCents ? dollarsShort(m.budgetCents) : "Not set" })
      ] }, m.month)) })
    ] })
  ] });
}
function Breakdown({
  title,
  total,
  rows,
  empty
}) {
  return /* @__PURE__ */ jsxs("section", { className: "bg-surface rounded-2xl px-4 py-1", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-baseline gap-3 pt-3 pb-1.5", children: [
      /* @__PURE__ */ jsx("h3", { className: "m-0 text-[17px] font-bold", children: title }),
      /* @__PURE__ */ jsxs("span", { className: "num font-bold", children: [
        "$",
        centsToDollars(total)
      ] })
    ] }),
    rows.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm mt-1 mb-3", children: empty }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: rows.map((r) => /* @__PURE__ */ jsxs("li", { className: "flex justify-between gap-3 py-2.5 border-b border-line last:border-b-0 text-sm", children: [
      /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: r.label }),
        r.sub && /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
          " · ",
          r.sub
        ] })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "num whitespace-nowrap", children: [
        "$",
        centsToDollars(r.cents)
      ] })
    ] }, r.label)) })
  ] });
}
function ExpenseForm({
  expense,
  defaultDay,
  categories,
  vendors,
  staffName,
  onCancel,
  onSaved
}) {
  const [amount, setAmount] = useState(expense ? centsToDollars(expense.amountCents) : "");
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? defaultDay);
  const [category, setCategory] = useState(expense?.category ?? "");
  const [vendor, setVendor] = useState(expense?.vendor ?? "");
  const [note, setNote] = useState(expense?.note ?? "");
  const [reading, setReading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  async function onReceipt(file) {
    setReading(true);
    setError("");
    setInfo("");
    try {
      const image = await shrinkImage(file, 1600);
      const r = await readReceiptPhoto({ data: { image, mediaType: "image/jpeg" } });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setAmount(centsToDollars(r.amountCents));
      if (r.vendor) setVendor(r.vendor);
      if (r.spentOn) setSpentOn(r.spentOn);
      if (r.category) setCategory((v) => v || r.category);
      if (r.note) setNote((v) => v || r.note);
      setInfo("Read from your receipt. Check the total before saving.");
      applyReceiptPrices({ data: { data: image, mediaType: "image/jpeg" } }).then((p) => {
        if (p.updated > 0) {
          setInfo(
            `Read from your receipt. Also updated the cost of ${p.updated} product${p.updated === 1 ? "" : "s"} (${p.names.join(", ")}${p.updated > p.names.length ? "…" : ""}).`
          );
        }
      }).catch(() => {
      });
    } catch {
      setError("That photo could not be opened. Try another one.");
    } finally {
      setReading(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    const cents = Math.round((Number(amount) || 0) * 100);
    if (cents <= 0) {
      setError("Enter the amount spent.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
      setError("Pick the date it was spent.");
      return;
    }
    setSaving(true);
    setError("");
    const values = { spentOn, amountCents: cents, category: category.trim(), vendor: vendor.trim(), note: note.trim() };
    try {
      if (expense) {
        await editExpense({ data: { id: expense.id, ...values } });
        onSaved("Expense updated");
      } else {
        await createExpense({ data: { ...values, staffName } });
        onSaved(`$${centsToDollars(cents)} expense added`);
      }
    } catch {
      setError("Could not save. Check your connection and try again.");
      setSaving(false);
    }
  }
  async function onDelete() {
    if (!expense || !window.confirm("Delete this expense?")) return;
    setSaving(true);
    try {
      await removeExpense({ data: { id: expense.id } });
      onSaved("Expense deleted");
    } catch {
      setError("Could not delete. Try again.");
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: submit, noValidate: true, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "btn btn-tonal w-full mb-2",
        disabled: reading,
        onClick: () => {
          if (fileRef.current) fileRef.current.value = "";
          fileRef.current?.click();
        },
        children: [
          /* @__PURE__ */ jsx(Camera, { size: 18 }),
          reading ? "Reading the receipt…" : "Fill in from a receipt photo"
        ]
      }
    ),
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: fileRef,
        type: "file",
        accept: "image/*",
        capture: "environment",
        hidden: true,
        onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) onReceipt(file);
        }
      }
    ),
    /* @__PURE__ */ jsx("p", { className: "text-[13px] text-ink-2 min-h-[18px] mt-0 mb-2", children: info }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Amount", htmlFor: "ex-amount", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2", children: "$" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "ex-amount",
            className: "field-input num !pl-7",
            type: "number",
            inputMode: "decimal",
            step: "0.01",
            min: 0,
            placeholder: "0.00",
            value: amount,
            onChange: (e) => setAmount(e.target.value),
            autoFocus: !expense
          }
        )
      ] }) }),
      /* @__PURE__ */ jsx(Field, { label: "Date", htmlFor: "ex-date", children: /* @__PURE__ */ jsx("input", { id: "ex-date", className: "field-input", type: "date", value: spentOn, onChange: (e) => setSpentOn(e.target.value) }) })
    ] }),
    /* @__PURE__ */ jsx(Field, { label: "Category", htmlFor: "ex-category", children: /* @__PURE__ */ jsx(AutoInput, { id: "ex-category", value: category, onChange: setCategory, suggestions: categories }) }),
    /* @__PURE__ */ jsx(QuickChips, { label: "Categories", options: categories, value: category, onPick: setCategory }),
    /* @__PURE__ */ jsx(Field, { label: "Paid to", htmlFor: "ex-vendor", children: /* @__PURE__ */ jsx(AutoInput, { id: "ex-vendor", value: vendor, onChange: setVendor, suggestions: vendors, placeholder: "Store or supplier" }) }),
    /* @__PURE__ */ jsx(Field, { label: "Note", htmlFor: "ex-note", children: /* @__PURE__ */ jsx("input", { id: "ex-note", className: "field-input", value: note, onChange: (e) => setNote(e.target.value), placeholder: "Optional" }) }),
    expense?.quickbooksId && /* @__PURE__ */ jsx("p", { className: "text-[13px] text-ink-2 m-0", children: "Already sent to QuickBooks — edits here won’t update it there." }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: error }),
    /* @__PURE__ */ jsxs(SheetActions, { children: [
      expense ? /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal !text-bad", onClick: onDelete, disabled: saving, children: "Delete" }) : /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving || reading, children: saving ? "Saving…" : "Save" })
    ] })
  ] });
}
function BudgetForm({
  month,
  current,
  onCancel,
  onSaved
}) {
  const [amount, setAmount] = useState(current?.budgetCents ? String(Math.round(current.budgetCents / 100)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function save(amountCents) {
    setSaving(true);
    setError("");
    try {
      await saveMonthBudget({ data: { month, amountCents } });
      onSaved();
    } catch {
      setError("Could not save. Try again.");
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs(
    "form",
    {
      onSubmit: (e) => {
        e.preventDefault();
        save(Math.max(0, Math.round((Number(amount) || 0) * 100)));
      },
      children: [
        /* @__PURE__ */ jsx(Field, { label: "Budget for stock and expenses", htmlFor: "bf-amount", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2", children: "$" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              id: "bf-amount",
              className: "field-input num !pl-7",
              type: "number",
              inputMode: "decimal",
              min: 0,
              value: amount,
              onChange: (e) => setAmount(e.target.value),
              autoFocus: true
            }
          )
        ] }) }),
        /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-[13px] m-0", children: [
          "Only changes ",
          monthLabel(month),
          ". Your standing monthly budget lives in Settings → Business profile."
        ] }),
        current?.hasOverride && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm !px-0 mt-2", onClick: () => save(null), disabled: saving, children: "Use the standing monthly budget instead" }),
        error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: error }),
        /* @__PURE__ */ jsxs(SheetActions, { children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-tonal", onClick: onCancel, children: "Cancel" }),
          /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary", disabled: saving, children: saving ? "Saving…" : "Save" })
        ] })
      ]
    }
  );
}
const TEMPLATE = "Barcode,Name,Brand,Size,Category,Vendor,Qty,Unit cost,Retail price\n";
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function ImportView({
  products,
  staffName,
  onChanged
}) {
  const toast = useToast();
  const { type } = useBusiness();
  const [step, setStep] = useState({ kind: "pick" });
  const [mode, setMode] = useState("inventory");
  const [lines, setLines] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const run = useRef(0);
  const byId = new Map(products.map((p) => [p.id, p]));
  async function onFile(file) {
    if (!file) return;
    const name = file.name || "Upload";
    const lower = name.toLowerCase();
    if (/\.(xlsx?|numbers|ods)$/.test(lower)) {
      setStep({ kind: "pick", error: "Save the spreadsheet as CSV first (File → Download / Export → CSV), then upload that." });
      return;
    }
    if (file.size > MAX_IMPORT_BYTES && !file.type.startsWith("image/")) {
      setStep({ kind: "pick", error: "That file is over 4 MB. Split it into smaller files or export it as CSV." });
      return;
    }
    const isCsv = /\.(csv|tsv|txt)$/.test(lower) || file.type === "text/csv" || file.type === "text/plain";
    const isPdf = lower.endsWith(".pdf") || file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isCsv && !isPdf && !isImage) {
      setStep({ kind: "pick", error: "Upload a CSV, PDF or photo." });
      return;
    }
    const id = ++run.current;
    setStep({ kind: "reading", fileName: name });
    setPricing(null);
    setPricingError("");
    try {
      const r = isCsv ? await parseImport({ data: { kind: "csv", text: await file.text() } }) : await parseImport({
        data: isPdf ? { kind: "document", data: await readAsBase64(file), mediaType: "application/pdf" } : { kind: "document", data: await shrinkImage(file, 2e3), mediaType: "image/jpeg" }
      });
      if (id !== run.current) return;
      if (!r.ok) {
        setStep({ kind: "pick", error: r.message });
        return;
      }
      setMode(r.mode);
      setLines(r.lines);
      setStep({ kind: "review", fileName: name, vendor: r.vendor, date: r.date });
      if (r.mode !== "prices") estimate(r.lines, id);
    } catch {
      if (id === run.current) setStep({ kind: "pick", error: "Couldn’t read that file. Check your connection and try again." });
    }
  }
  async function estimate(source, id = run.current) {
    const todo = source.filter((l) => l.include && needsPrice(l) && (l.name || l.brand));
    if (todo.length === 0) return;
    setPricingError("");
    setPricing({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += PRICE_BATCH) {
      const batch = todo.slice(i, i + PRICE_BATCH);
      try {
        const r = await estimateImportPrices({
          data: {
            items: batch.map((l) => ({
              name: l.name.slice(0, 200),
              brand: l.brand.slice(0, 160),
              size: l.size.slice(0, 60),
              category: l.category.slice(0, 80)
            }))
          }
        });
        if (id !== run.current) return;
        if (!r.ok) {
          setPricingError(r.message);
          break;
        }
        const est = new Map(batch.map((l, n) => [l.key, r.prices[n]]));
        setLines(
          (prev) => prev.map((l) => {
            const p = est.get(l.key);
            if (!p) return l;
            const next = { ...l };
            if (!next.unitCostCents && p.unitCostCents) {
              next.unitCostCents = p.unitCostCents;
              next.costSource = "ai";
            }
            if (!next.retailPriceCents && p.retailPriceCents) {
              next.retailPriceCents = p.retailPriceCents;
              next.retailSource = "ai";
            }
            return next;
          })
        );
      } catch {
        if (id !== run.current) return;
        setPricingError("Price estimates stopped. Check your connection and try again.");
        break;
      }
      setPricing({ done: Math.min(i + PRICE_BATCH, todo.length), total: todo.length });
    }
    if (id === run.current) setPricing(null);
  }
  function update(key2, patch) {
    setLines((prev) => prev.map((l) => l.key === key2 ? { ...l, ...patch } : l));
  }
  function rematch(line, productId) {
    const p = productId ? byId.get(productId) : void 0;
    const keepCost = line.costSource === "document" || line.costSource === "manual" || line.costSource === "ai";
    const keepRetail = line.retailSource === "document" || line.retailSource === "manual" || line.retailSource === "ai";
    update(line.key, {
      productId,
      ...keepCost ? {} : { unitCostCents: p?.unitCostCents ?? 0, costSource: p?.unitCostCents ? "current" : "none" },
      ...keepRetail ? {} : { retailPriceCents: p?.retailPriceCents ?? 0, retailSource: p?.retailPriceCents ? "current" : "none" }
    });
  }
  async function save() {
    if (step.kind !== "review") return;
    const chosen = lines.filter((l) => l.include && (l.productId || mode !== "prices" && l.name.trim()));
    if (chosen.length === 0) {
      toast(mode === "prices" ? "Match at least one line to a product" : "Tick at least one line to import");
      return;
    }
    setSaving(true);
    try {
      const summary = await applyImport({
        data: {
          mode,
          staffName,
          source: [step.vendor, step.fileName].filter(Boolean).join(" · ").slice(0, 160),
          lines: chosen.map((l) => ({
            productId: l.productId,
            barcode: l.barcode.slice(0, 60),
            name: l.name.slice(0, 200),
            brand: l.brand.slice(0, 160),
            size: l.size.slice(0, 60),
            category: l.category.slice(0, 80),
            vendor: l.vendor.slice(0, 120),
            qty: l.qty,
            unitCostCents: l.unitCostCents,
            retailPriceCents: l.retailPriceCents
          }))
        }
      });
      run.current++;
      setPricing(null);
      await onChanged();
      setStep({ kind: "done", fileName: step.fileName, mode, summary });
    } catch {
      toast("Could not save the import. Try again.");
    } finally {
      setSaving(false);
    }
  }
  function reset() {
    run.current++;
    setLines([]);
    setPricing(null);
    setPricingError("");
    setStep({ kind: "pick" });
  }
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bintro-inventory-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (step.kind === "reading") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-5", role: "status", children: [
      /* @__PURE__ */ jsxs("p", { className: "font-semibold m-0 mb-1", children: [
        "Reading ",
        step.fileName,
        "…"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm m-0 mb-4", children: "Finding each product line and matching it to your inventory. Longer PDFs take up to a minute." }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[70%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[55%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[62%]" })
    ] });
  }
  if (step.kind === "done") {
    const s = step.summary;
    return /* @__PURE__ */ jsxs("div", { className: "bg-good-tint rounded-2xl p-5", children: [
      /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 text-good font-bold text-[17px] m-0 mb-2", children: [
        /* @__PURE__ */ jsx(Check, { size: 20 }),
        " Imported ",
        step.fileName
      ] }),
      /* @__PURE__ */ jsxs("ul", { className: "m-0 mb-4 pl-5 text-sm flex flex-col gap-1", children: [
        /* @__PURE__ */ jsxs("li", { children: [
          s.created,
          " new ",
          s.created === 1 ? "product" : "products",
          " added, ",
          s.updated,
          " updated"
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          s.priced,
          " ",
          s.priced === 1 ? "price" : "prices",
          " set or changed"
        ] }),
        step.mode === "prices" ? /* @__PURE__ */ jsx("li", { children: "Stock counts left unchanged" }) : /* @__PURE__ */ jsxs("li", { children: [
          s.units,
          " ",
          s.units === 1 ? "unit" : "units",
          " ",
          step.mode === "receipt" ? "received into stock" : "adjusted to match your count"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] m-0 mb-4", children: step.mode === "prices" ? "New prices show on the Products tab and in future orders." : `Every change is in the Activity tab${step.mode === "receipt" ? " and counts toward this month on the Budget tab" : ""}.` }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", onClick: reset, children: [
        /* @__PURE__ */ jsx(FileUp, { size: 18 }),
        " Import another file"
      ] })
    ] });
  }
  if (step.kind === "pick") {
    return /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs(
        "label",
        {
          htmlFor: "import-file",
          onDragOver: (e) => {
            e.preventDefault();
            setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop: (e) => {
            e.preventDefault();
            setDragging(false);
            onFile(e.dataTransfer.files[0]);
          },
          className: `flex flex-col items-center text-center gap-2 rounded-2xl border-2 border-dashed px-5 py-8 cursor-pointer transition-colors ${dragging ? "border-action bg-action-tint" : "border-line bg-surface hover:bg-surface-2"}`,
          children: [
            /* @__PURE__ */ jsx(FileUp, { size: 32, className: "text-action" }),
            /* @__PURE__ */ jsx("b", { className: "text-[17px]", children: "Upload a spreadsheet, invoice or receipt" }),
            /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-sm", children: "CSV, PDF or a photo · up to 4 MB" }),
            /* @__PURE__ */ jsx("span", { className: "btn btn-primary btn-sm mt-1", children: "Choose file" })
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "import-file",
          type: "file",
          accept: ".csv,.tsv,.txt,text/csv,application/pdf,image/*,.xlsx,.xls",
          className: "sr-only",
          onChange: (e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }
        }
      ),
      step.error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: step.error }),
      /* @__PURE__ */ jsxs("ul", { className: "text-ink-2 text-sm mt-4 mb-3 pl-5 flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: "Inventory spreadsheet:" }),
          " any column layout works. Bintro works out which column is the name, barcode, count, cost and price."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: "Vendor invoice or receipt:" }),
          " each line is added to stock and its unit cost becomes the product’s new cost."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: "Price list:" }),
          " a file with prices but no quantities updates cost and retail on matching products already in Bintro, without touching stock."
        ] }),
        /* @__PURE__ */ jsx("li", { children: "Missing prices are estimated by AI on every line, and you review everything before it’s saved." })
      ] }),
      /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-text btn-sm !px-0", onClick: downloadTemplate, children: [
        /* @__PURE__ */ jsx(Download, { size: 16 }),
        " Download a CSV template"
      ] })
    ] });
  }
  const pricesOnly = mode === "prices";
  const included = lines.filter((l) => l.include && (!pricesOnly || l.productId));
  const matched = included.filter((l) => l.productId).length;
  const aiPriced = included.filter((l) => l.costSource === "ai" || l.retailSource === "ai").length;
  const stillMissing = included.filter((l) => needsPrice(l)).length;
  const productOptions = [...products].sort((a, b) => a.name.localeCompare(b.name));
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3 mb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "font-bold m-0 truncate", children: step.fileName }),
        /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm m-0", children: [step.vendor, step.date].filter(Boolean).join(" · ") || `${lines.length} line${lines.length === 1 ? "" : "s"} found` })
      ] }),
      /* @__PURE__ */ jsxs("button", { className: "btn btn-text btn-sm shrink-0", onClick: reset, "aria-label": "Cancel import", children: [
        /* @__PURE__ */ jsx(X, { size: 16 }),
        " Cancel"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2 mb-3", role: "radiogroup", "aria-label": "What is this file?", children: [
      { id: "inventory", label: "Stock count", hint: "Set on-hand to these numbers" },
      { id: "receipt", label: "Delivery / receipt", hint: "Add these units to stock" },
      { id: "prices", label: "Price update", hint: "Change prices only" }
    ].map((m) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        role: "radio",
        "aria-checked": mode === m.id,
        "aria-pressed": mode === m.id,
        className: "chip !rounded-xl !py-2.5 text-left flex flex-col items-start",
        onClick: () => setMode(m.id),
        children: [
          /* @__PURE__ */ jsx("b", { children: m.label }),
          /* @__PURE__ */ jsx("span", { className: "text-[12px] font-normal opacity-80", children: m.hint })
        ]
      },
      m.id
    )) }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2 mb-3", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        pricesOnly ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: included.length }),
          " ",
          included.length === 1 ? "product" : "products",
          " to reprice",
          lines.length - included.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · ",
            lines.length - included.length,
            " skipped"
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { className: "text-ink", children: included.length }),
          " to import · ",
          matched,
          " existing · ",
          included.length - matched,
          " new"
        ] }),
        aiPriced > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
          " · ",
          aiPriced,
          " AI-priced"
        ] })
      ] }),
      pricing ? /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5 text-action font-semibold", role: "status", children: [
        /* @__PURE__ */ jsx(Sparkles, { size: 15 }),
        " Estimating prices… ",
        pricing.done,
        "/",
        pricing.total
      ] }) : stillMissing > 0 && /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal btn-sm", onClick: () => estimate(lines), children: [
        /* @__PURE__ */ jsx(RefreshCw, { size: 15 }),
        " AI price check (",
        stillMissing,
        ")"
      ] })
    ] }),
    pricingError && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-0 mb-3", children: pricingError }),
    /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 flex flex-col gap-2.5", children: lines.map((l) => {
      const p = l.productId ? byId.get(l.productId) : void 0;
      const active = l.include && (!pricesOnly || Boolean(l.productId));
      const after = l.qty === null ? null : mode === "receipt" ? (p?.qty ?? 0) + l.qty : l.qty;
      return /* @__PURE__ */ jsx(
        "li",
        {
          className: `border rounded-2xl p-3 ${active ? "border-line bg-white" : "border-line bg-surface opacity-60"}`,
          children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2.5", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                className: "mt-3 w-5 h-5 accent-[var(--color-action)] shrink-0",
                checked: l.include,
                onChange: (e) => update(l.key, { include: e.target.checked }),
                "aria-label": `Import ${l.name || l.barcode}`
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "field-input !py-2 font-semibold",
                  value: l.name,
                  onChange: (e) => update(l.key, { name: e.target.value.slice(0, 200) }),
                  placeholder: "Product name",
                  "aria-label": "Product name"
                }
              ),
              /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[12px] mt-1 mb-2 truncate", children: [l.brand, l.size, l.category, l.barcode && `#${l.barcode}`].filter(Boolean).join(" · ") || "No other details" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  className: "field-input !py-2 text-sm mb-2",
                  value: l.productId ?? "",
                  onChange: (e) => rematch(l, e.target.value ? Number(e.target.value) : null),
                  "aria-label": "Matches product",
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "", children: pricesOnly ? `No match: skipped (pick a ${type.itemNoun} to update)` : `➕ Add as a new ${type.itemNoun}` }),
                    productOptions.map((o) => /* @__PURE__ */ jsxs("option", { value: o.id, children: [
                      "Update: ",
                      [o.brand, o.name, o.size].filter(Boolean).join(" ")
                    ] }, o.id))
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: `grid gap-2 ${pricesOnly ? "grid-cols-2" : "grid-cols-3"}`, children: [
                !pricesOnly && /* @__PURE__ */ jsxs("label", { className: "text-[12px] font-semibold text-ink-2", children: [
                  mode === "receipt" ? "Received" : "Count",
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "number",
                      inputMode: "numeric",
                      min: 0,
                      className: "field-input num !py-2 mt-1",
                      value: l.qty ?? "",
                      placeholder: "—",
                      onChange: (e) => update(l.key, {
                        qty: e.target.value === "" ? null : Math.max(0, Math.min(1e6, Math.round(Number(e.target.value) || 0)))
                      })
                    }
                  ),
                  /* @__PURE__ */ jsx("span", { className: "block font-normal mt-0.5 min-h-[16px]", children: after !== null && p ? `${p.qty} → ${after}` : after !== null ? `Starts at ${after}` : "Stock unchanged" })
                ] }),
                /* @__PURE__ */ jsx(
                  MoneyField,
                  {
                    label: "Cost",
                    cents: l.unitCostCents,
                    source: l.costSource,
                    was: p && p.unitCostCents !== l.unitCostCents ? p.unitCostCents : 0,
                    onCents: (c) => update(l.key, { unitCostCents: c, costSource: c ? "manual" : "none" })
                  }
                ),
                /* @__PURE__ */ jsx(
                  MoneyField,
                  {
                    label: "Retail",
                    cents: l.retailPriceCents,
                    source: l.retailSource,
                    was: p && p.retailPriceCents !== l.retailPriceCents ? p.retailPriceCents : 0,
                    onCents: (c) => update(l.key, { retailPriceCents: c, retailSource: c ? "manual" : "none" })
                  }
                )
              ] })
            ] })
          ] })
        },
        l.key
      );
    }) }),
    /* @__PURE__ */ jsxs("div", { className: "sticky bottom-[calc(76px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-4 mt-4 bg-white/95 backdrop-blur rounded-2xl pt-2", children: [
      !staffName && /* @__PURE__ */ jsx("p", { className: "text-warn text-[13px] m-0 mb-2", children: "Tip: pick your name in the header so this import is logged under you." }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-primary w-full", onClick: save, disabled: saving || included.length === 0, children: saving ? "Saving…" : `${pricesOnly ? "Update prices on" : "Import"} ${included.length} ${pricesOnly ? included.length === 1 ? "product" : "products" : included.length === 1 ? "line" : "lines"}${pricing ? " (prices still estimating)" : ""}` })
    ] })
  ] });
}
const SOURCE_LABEL = {
  document: "From file",
  current: "Current",
  ai: "AI estimate",
  manual: "Edited",
  none: "Missing"
};
function MoneyField({
  label: label2,
  cents,
  source,
  was,
  onCents
}) {
  const [text, setText] = useState(cents ? centsToDollars(cents) : "");
  const parsed = Math.max(0, Math.round((Number(text) || 0) * 100));
  if (parsed !== cents && !(cents === 0 && text === "")) {
    setText(cents ? centsToDollars(cents) : "");
  }
  return /* @__PURE__ */ jsxs("label", { className: "text-[12px] font-semibold text-ink-2", children: [
    label2,
    /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-2 font-normal", children: "$" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "number",
          inputMode: "decimal",
          min: 0,
          step: "0.01",
          className: `field-input num !py-2 !pl-6 ${source === "ai" ? "!border-action !bg-action-tint" : ""}`,
          value: text,
          placeholder: "0.00",
          onChange: (e) => {
            setText(e.target.value);
            onCents(Math.min(1e7, Math.max(0, Math.round((Number(e.target.value) || 0) * 100))));
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(
      "span",
      {
        className: `block font-normal mt-0.5 min-h-[16px] ${source === "ai" ? "text-action" : source === "none" ? "text-warn" : ""}`,
        children: [
          source === "ai" && /* @__PURE__ */ jsx(Sparkles, { size: 11, className: "inline mr-0.5 -mt-0.5" }),
          SOURCE_LABEL[source],
          was > 0 && source !== "current" && /* @__PURE__ */ jsxs(Fragment, { children: [
            " · was $",
            centsToDollars(was)
          ] })
        ]
      }
    )
  ] });
}
const runSetupCheck = createServerFn({
  method: "POST"
}).handler(createSsrRpc("ea9f790698f1189cb2e2cf233b4ddd8e322b014389ba3ee23a7125e6aaaaf206"));
const sendSetupTestEmail = createServerFn({
  method: "POST"
}).handler(createSsrRpc("7822646cdc4c07d7fe54cfea331ae87fad27976b90595edf54479615467c2220"));
function Row$1({ tone, title, children }) {
  const Icon = tone === "good" ? Check : tone === "warn" ? TriangleAlert : X;
  return /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3 py-3 border-b border-line last:border-b-0", children: [
    /* @__PURE__ */ jsx(
      "span",
      {
        className: `shrink-0 w-7 h-7 rounded-full grid place-items-center ${tone === "good" ? "bg-good-tint text-good" : tone === "warn" ? "bg-warn-tint text-warn" : "bg-bad-tint text-bad"}`,
        "aria-hidden": "true",
        children: /* @__PURE__ */ jsx(Icon, { size: 16 })
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 text-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "font-semibold", children: title }),
      children && /* @__PURE__ */ jsx("div", { className: "text-ink-2 mt-0.5", children })
    ] })
  ] });
}
const dollars = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
function SetupCheck() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mail, setMail] = useState({ state: "idle" });
  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(await runSetupCheck());
    } catch {
      setError("Couldn't run the check. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    run();
  }, []);
  async function testEmail() {
    setMail({ state: "sending" });
    try {
      const r = await sendSetupTestEmail();
      setMail({ state: "done", ok: r.ok, text: r.ok ? `Sent to ${r.to}. Check that inbox (and spam).` : r.message });
    } catch {
      setMail({ state: "done", ok: false, text: "Couldn't send. Check your connection and try again." });
    }
  }
  const s = result?.stripe;
  const stripeTone = !s ? "warn" : s.secretKey === "live" || s.secretKey === "restricted" ? "good" : s.secretKey === "test" ? "warn" : "bad";
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 mb-2", children: [
      /* @__PURE__ */ jsx("p", { className: "m-0 text-sm text-ink-2", children: "What this site has set up in Netlify. Keys are never shown here, only whether they work." }),
      /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal btn-sm shrink-0", onClick: run, disabled: busy, children: [
        /* @__PURE__ */ jsx(RefreshCw, { size: 15, className: busy ? "animate-spin" : "" }),
        busy ? "Checking…" : "Check again"
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm font-semibold", children: error }),
    !result && busy && /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm", children: "Testing each connection…" }),
    result && s && /* @__PURE__ */ jsxs("ul", { className: "list-none m-0 p-0 bg-white border border-line rounded-2xl px-4", children: [
      /* @__PURE__ */ jsxs(Row$1, { tone: result.ai.ok ? "good" : "bad", title: result.ai.ok ? "AI is working" : "AI is not working", children: [
        result.ai.ok ? `Price checks, Snap & log, invoice, receipt and sales report reading are all available (via ${result.ai.route}).` : "Every AI connection on this site failed:",
        !result.ai.ok ? /* @__PURE__ */ jsxs("span", { className: "block mt-1", children: [
          result.ai.routes.map((r) => /* @__PURE__ */ jsxs("span", { className: "block", children: [
            r.label,
            ": ",
            /* @__PURE__ */ jsx("b", { className: r.status >= 200 && r.status < 300 ? "text-good" : "text-bad", children: r.note })
          ] }, r.label)),
          result.ai.routes.length === 0 && result.ai.detail
        ] }) : null
      ] }),
      /* @__PURE__ */ jsxs(
        Row$1,
        {
          tone: stripeTone,
          title: s.secretKey === "missing" ? "Payments: not set up (plans change with no charge)" : s.secretKey === "invalid" ? "Payments: the Stripe key was rejected" : `Payments: Stripe ${s.secretKey === "test" ? "test mode" : "live"}${s.account ? ` · ${s.account}` : ""}`,
          children: [
            s.secretKey === "missing" && "Add STRIPE_SECRET_KEY in Netlify.",
            s.secretKey === "invalid" && "Re-copy the secret key from Stripe → Developers → API keys.",
            s.secretKey === "test" && "Test mode: cards are not really charged. Switch to the live key before launch.",
            s.secretKey !== "missing" && !s.webhookSecret && /* @__PURE__ */ jsx("span", { className: "block", children: "Missing STRIPE_WEBHOOK_SECRET, so cancellations and failed payments made in Stripe won't reach the app." })
          ]
        }
      ),
      s.secretKey !== "missing" && s.prices.map((p) => /* @__PURE__ */ jsx(
        Row$1,
        {
          tone: p.status === "ok" ? "good" : p.status === "missing" ? "bad" : "warn",
          title: `${p.plan} ${p.interval === "month" ? "monthly" : "yearly"} · ${dollars(p.expectedCents)}/${p.interval === "month" ? "mo" : "yr"}`,
          children: p.status === "ok" ? "Price found in Stripe and it matches." : p.status === "missing" ? `Add ${p.env} in Netlify.` : p.detail
        },
        p.env
      )),
      /* @__PURE__ */ jsx(
        Row$1,
        {
          tone: result.email.provider ? "good" : "bad",
          title: result.email.provider ? `Email: ${result.email.provider}` : "Email: not set up",
          children: result.email.provider ? /* @__PURE__ */ jsxs(Fragment, { children: [
            result.email.customSender ? "Sending from your own address (RESTOCK_EMAIL_FROM)." : "Sending from Resend's shared address; replies go to your business email.",
            /* @__PURE__ */ jsx("span", { className: "block mt-2", children: /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal btn-sm", onClick: testEmail, disabled: mail.state === "sending", children: [
              /* @__PURE__ */ jsx(Mail, { size: 15 }),
              mail.state === "sending" ? "Sending…" : "Send me a test email"
            ] }) }),
            mail.state === "done" && /* @__PURE__ */ jsx("span", { className: `block mt-1.5 font-semibold ${mail.ok ? "text-good" : "text-bad"}`, children: mail.text })
          ] }) : "Add RESEND_API_KEY in Netlify. Until then, restock lists and orders open in your mail app instead."
        }
      ),
      /* @__PURE__ */ jsx(Row$1, { tone: result.square ? "good" : "warn", title: result.square ? "Square: app keys set" : "Square: app keys missing", children: result.square ? "Connect or check it under Connections." : "Add SQUARE_APPLICATION_ID and SQUARE_APPLICATION_SECRET." }),
      /* @__PURE__ */ jsx(
        Row$1,
        {
          tone: result.quickbooks ? "good" : "warn",
          title: result.quickbooks ? "QuickBooks: app keys set" : "QuickBooks: app keys missing",
          children: result.quickbooks ? "Connect or check it under Connections." : "Add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET."
        }
      ),
      /* @__PURE__ */ jsx(Row$1, { tone: "good", title: result.pilot ? "Pilot site: Premium included for testers" : "Main site: normal plans" })
    ] })
  ] });
}
const BEAUTY = ["salon", "barber", "nails", "brows", "spa", "other"];
const CONNECTION_DIRECTORY = [
  { id: "vagaro", name: "Vagaro", kind: "Booking & POS", status: "soon", types: [...BEAUTY, "tattoo"], blurb: "Retail sales come off the shelf automatically.", website: "https://www.vagaro.com" },
  { id: "boulevard", name: "Boulevard", kind: "Booking & POS", status: "soon", types: ["salon", "spa", "brows", "nails"], blurb: "Sales and services sync, so back bar and retail stay counted.", website: "https://www.joinblvd.com" },
  { id: "mindbody", name: "Mindbody", kind: "Booking & POS", status: "soon", types: ["spa", "salon", "nails", "brows", "other"], blurb: "Retail sales sync from your Mindbody point of sale.", website: "https://www.mindbodyonline.com" },
  { id: "zenoti", name: "Zenoti", kind: "Booking & POS", status: "soon", types: ["salon", "spa", "other"], blurb: "Built for multi-location salons and spas.", website: "https://www.zenoti.com" },
  { id: "phorest", name: "Phorest", kind: "Booking & POS", status: "soon", types: ["salon", "barber", "nails", "brows"], blurb: "Product sales and stock stay in step.", website: "https://www.phorest.com" },
  { id: "meevo", name: "Meevo", kind: "Booking & POS", status: "soon", types: ["salon", "spa"], blurb: "Through the MeevoXchange marketplace.", website: "https://www.meevo.com" },
  { id: "fresha", name: "Fresha", kind: "Booking & POS", status: "upload", types: [...BEAUTY], blurb: "Upload your product sales report and Bintro takes it off the shelf.", website: "https://www.fresha.com" },
  { id: "glossgenius", name: "GlossGenius", kind: "Booking & POS", status: "upload", types: ["salon", "barber", "nails", "brows", "tattoo"], blurb: "Upload your product sales report and Bintro takes it off the shelf.", website: "https://glossgenius.com" },
  { id: "mangomint", name: "Mangomint", kind: "Booking & POS", status: "upload", types: ["salon", "spa", "nails", "brows"], blurb: "Upload your product sales report and Bintro takes it off the shelf.", website: "https://www.mangomint.com" },
  { id: "booksy", name: "Booksy", kind: "Booking & POS", status: "upload", types: ["barber", "salon", "tattoo", "nails"], blurb: "Upload your product sales report and Bintro takes it off the shelf.", website: "https://booksy.com" },
  { id: "toast", name: "Toast", kind: "Bar POS", status: "soon", types: ["bar"], blurb: "Drinks sold come off the bar stock automatically.", website: "https://pos.toasttab.com" },
  { id: "clover", name: "Clover", kind: "Bar POS", status: "soon", types: ["bar", "other"], blurb: "Sales from your Clover register come off the shelf.", website: "https://www.clover.com" },
  { id: "xero", name: "Xero", kind: "Accounting", status: "soon", types: [], blurb: "Purchases and cost of goods go straight to your books.", website: "https://www.xero.com" }
];
function directoryFor(type) {
  return CONNECTION_DIRECTORY.filter((e) => e.types.length === 0 || e.types.includes(type));
}
const getConnectionRequests = createServerFn({
  method: "GET"
}).handler(createSsrRpc("194c5168bd712f8f142a6f6ad5cd46cacabf49dfc5921685e597138fadc45421"));
const requestConnection = createServerFn({
  method: "POST"
}).inputValidator(z.object({
  platform: z.string().min(1).max(40),
  name: z.string().max(80).optional(),
  staffName: z.string().max(60).optional()
})).handler(createSsrRpc("b7e30bce2fc5d1eebff98f88a86621160f723f372d28f56a55320b6f5e113e6b"));
function ConnectionDirectory() {
  const toast = useToast();
  const { profile } = useBusiness();
  const [requested, setRequested] = useState(/* @__PURE__ */ new Set());
  const [other, setOther] = useState("");
  const [sending, setSending] = useState(null);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    getConnectionRequests().then((rows) => setRequested(new Set(rows.map((r) => r.platform === "other" ? `other:${r.name.toLowerCase()}` : r.platform)))).catch(() => void 0);
  }, []);
  const mine = useMemo(() => directoryFor(profile.businessType), [profile.businessType]);
  const list = showAll ? CONNECTION_DIRECTORY : mine;
  const groups = useMemo(() => {
    const out = /* @__PURE__ */ new Map();
    for (const e of list) out.set(e.kind, [...out.get(e.kind) ?? [], e]);
    return [...out.entries()];
  }, [list]);
  async function ask(platform, name = "") {
    setSending(platform);
    try {
      await requestConnection({ data: { platform, name } });
      setRequested((s) => new Set(s).add(platform === "other" ? `other:${name.toLowerCase()}` : platform));
      toast(`Thanks! We've noted that you want ${name || CONNECTION_DIRECTORY.find((e) => e.id === platform)?.name || "this"} connected.`);
      if (platform === "other") setOther("");
    } catch {
      toast("Couldn't send that. Try again.");
    } finally {
      setSending(null);
    }
  }
  return /* @__PURE__ */ jsxs("section", { className: "mt-6", children: [
    /* @__PURE__ */ jsxs("h3", { className: "m-0 text-base font-bold flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsx(Plug, { size: 18 }),
      " More connections"
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 mb-3 text-sm text-ink-2", children: [
      "The apps ",
      showAll ? "shops" : "businesses like yours",
      " use most. Tap ",
      /* @__PURE__ */ jsx("b", { children: "Request" }),
      " on the one you use: the more shops ask, the sooner it's built."
    ] }),
    groups.map(([kind, entries]) => /* @__PURE__ */ jsxs("div", { className: "mb-4", children: [
      /* @__PURE__ */ jsx("p", { className: "m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-2", children: kind }),
      /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 grid gap-2 min-[620px]:grid-cols-2", children: entries.map((e) => {
        const done = requested.has(e.id);
        return /* @__PURE__ */ jsxs("li", { className: "rounded-2xl border border-line bg-white p-3.5 flex flex-col gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "grid place-items-center w-9 h-9 rounded-xl bg-surface font-extrabold text-ink shrink-0", "aria-hidden": "true", children: e.name[0] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "font-bold leading-tight flex items-center gap-2 flex-wrap", children: [
                e.name,
                e.status === "soon" ? /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-tint text-gold-ink", children: "Coming soon" }) : /* @__PURE__ */ jsx("span", { className: "text-[11px] font-bold px-2 py-0.5 rounded-full bg-good-tint text-good", children: "Works today by upload" })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "m-0 mt-0.5 text-[13px] text-ink-2", children: e.blurb })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: `btn btn-sm ${done ? "btn-tonal" : "btn-primary"}`,
                disabled: done || sending === e.id,
                onClick: () => ask(e.id),
                children: done ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Check, { size: 15 }),
                  " Requested"
                ] }) : sending === e.id ? "Sending…" : "Request this connection"
              }
            ),
            e.status === "upload" && /* @__PURE__ */ jsxs("a", { href: "/#scan", className: "btn btn-text btn-sm no-underline", children: [
              /* @__PURE__ */ jsx(FileSpreadsheet, { size: 15 }),
              " Upload sales"
            ] }),
            e.website && /* @__PURE__ */ jsxs("a", { href: e.website, target: "_blank", rel: "noreferrer", className: "btn btn-text btn-sm no-underline ml-auto", children: [
              "Visit ",
              /* @__PURE__ */ jsx(ExternalLink, { size: 13 })
            ] })
          ] })
        ] }, e.id);
      }) })
    ] }, kind)),
    !showAll && mine.length < CONNECTION_DIRECTORY.length && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm mb-3", onClick: () => setShowAll(true), children: "Show apps for other kinds of businesses" }),
    /* @__PURE__ */ jsxs(
      "form",
      {
        className: "rounded-2xl bg-surface p-3.5",
        onSubmit: (ev) => {
          ev.preventDefault();
          if (other.trim()) ask("other", other.trim());
        },
        children: [
          /* @__PURE__ */ jsx("label", { className: "block text-sm font-semibold", htmlFor: "conn-other", children: "Don't see yours? Tell us which app you use" }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 mt-1.5", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "conn-other",
                className: "field-input !py-2 flex-1",
                placeholder: "e.g. your booking or accounting app",
                value: other,
                maxLength: 80,
                onChange: (e) => setOther(e.target.value)
              }
            ),
            /* @__PURE__ */ jsxs("button", { type: "submit", className: "btn btn-primary btn-sm shrink-0", disabled: !other.trim() || sending === "other", children: [
              /* @__PURE__ */ jsx(Send, { size: 15 }),
              " Send"
            ] })
          ] })
        ]
      }
    )
  ] });
}
const PALETTE_FAMILIES = [
  { id: "warm", label: "Warm", blurb: "Burgundy, olive, terracotta and rose gold" },
  { id: "cool", label: "Cool", blurb: "Royal blue, ocean teal and lavender" },
  { id: "earthy", label: "Earthy", blurb: "Sage, olive, walnut and sand" },
  { id: "mono", label: "Black & grey", blurb: "Charcoal, graphite and silver" }
];
const PALETTES = [
  {
    id: "burgundy-olive",
    family: "warm",
    label: "Burgundy, olive & cream",
    colors: {
      page: "#fdf9f1",
      surface: "#f6efe2",
      "surface-2": "#ece3d2",
      ink: "#2a1719",
      "ink-2": "#6a5853",
      line: "#e8dfcd",
      action: "#7a1f35",
      "action-press": "#5f1729",
      "action-tint": "#f5e6e8",
      royal: "#3f0e1b",
      "royal-2": "#9a2d47",
      gold: "#7d8a3a",
      "gold-bright": "#b9c46e",
      "gold-ink": "#4d571b",
      "gold-tint": "#f1f1dc"
    }
  },
  {
    id: "terracotta",
    family: "warm",
    label: "Terracotta & honey",
    colors: {
      page: "#ffffff",
      surface: "#faf5f2",
      "surface-2": "#f1e8e2",
      ink: "#2b1a14",
      "ink-2": "#6e5a52",
      line: "#eee3dc",
      action: "#b8461f",
      "action-press": "#96381a",
      "action-tint": "#fbeae3",
      royal: "#4a1d10",
      "royal-2": "#d2602f",
      gold: "#d9a03a",
      "gold-bright": "#f3c96b",
      "gold-ink": "#845406",
      "gold-tint": "#fdf5e4"
    }
  },
  {
    id: "rose",
    family: "warm",
    label: "Burgundy & rose gold",
    colors: {
      page: "#ffffff",
      surface: "#fbf4f6",
      "surface-2": "#f2e6ea",
      ink: "#2c141c",
      "ink-2": "#6f5860",
      line: "#efe2e7",
      action: "#9c1d4a",
      "action-press": "#7f173c",
      "action-tint": "#fbe8ef",
      royal: "#45081f",
      "royal-2": "#c0325f",
      gold: "#c48b74",
      "gold-bright": "#ebbfa9",
      "gold-ink": "#8a4b33",
      "gold-tint": "#fcf1ec"
    }
  },
  {
    id: "royal",
    family: "cool",
    label: "Royal blue & gold",
    colors: {
      page: "#ffffff",
      surface: "#f3f5fa",
      "surface-2": "#e7eaf3",
      ink: "#121a36",
      "ink-2": "#545c78",
      line: "#e1e5ef",
      action: "#1f3fb8",
      "action-press": "#16308f",
      "action-tint": "#e8edfc",
      royal: "#0d1b52",
      "royal-2": "#2a4fd6",
      gold: "#c99a2e",
      "gold-bright": "#f0c75e",
      "gold-ink": "#7f5c05",
      "gold-tint": "#fcf6e6"
    }
  },
  {
    id: "ocean",
    family: "cool",
    label: "Ocean teal & sky",
    colors: {
      page: "#ffffff",
      surface: "#f2f6f7",
      "surface-2": "#e4ecee",
      ink: "#10262c",
      "ink-2": "#4f6469",
      line: "#dde7e9",
      action: "#0f6e7a",
      "action-press": "#0b5761",
      "action-tint": "#e3f3f4",
      royal: "#0b2f3a",
      "royal-2": "#138a96",
      gold: "#4c9ac0",
      "gold-bright": "#8fd0ec",
      "gold-ink": "#1e5f80",
      "gold-tint": "#eaf5fb"
    }
  },
  {
    id: "lavender",
    family: "cool",
    label: "Violet & lilac",
    colors: {
      page: "#ffffff",
      surface: "#f5f4fa",
      "surface-2": "#eae7f3",
      ink: "#1d1833",
      "ink-2": "#5d5873",
      line: "#e6e3ef",
      action: "#5b3fb8",
      "action-press": "#47309a",
      "action-tint": "#eeeafb",
      royal: "#2a1b5c",
      "royal-2": "#7154d6",
      gold: "#b48fd8",
      "gold-bright": "#dcc4f5",
      "gold-ink": "#6a3fa0",
      "gold-tint": "#f6f0fc"
    }
  },
  {
    id: "sage",
    family: "earthy",
    label: "Sage & brass",
    colors: {
      page: "#ffffff",
      surface: "#f5f4ee",
      "surface-2": "#ebe9df",
      ink: "#1f2219",
      "ink-2": "#5d6052",
      line: "#e5e3d8",
      action: "#4f6b3a",
      "action-press": "#3f572e",
      "action-tint": "#edf2e6",
      royal: "#26331c",
      "royal-2": "#6a8a50",
      gold: "#b5874a",
      "gold-bright": "#dcb57a",
      "gold-ink": "#74501d",
      "gold-tint": "#f8f1e5"
    }
  },
  {
    id: "walnut",
    family: "earthy",
    label: "Walnut & sand",
    colors: {
      page: "#ffffff",
      surface: "#f7f3ee",
      "surface-2": "#ede6dd",
      ink: "#261c14",
      "ink-2": "#64584d",
      line: "#e8e0d6",
      action: "#8a5a35",
      "action-press": "#6f4729",
      "action-tint": "#f5ece4",
      royal: "#3a2617",
      "royal-2": "#a8744a",
      gold: "#b09a5b",
      "gold-bright": "#d9c58a",
      "gold-ink": "#6b5a22",
      "gold-tint": "#f7f3e6"
    }
  },
  {
    id: "charcoal",
    family: "mono",
    label: "Charcoal & silver",
    colors: {
      page: "#ffffff",
      surface: "#f4f4f4",
      "surface-2": "#e8e8e8",
      ink: "#151515",
      "ink-2": "#5c5c5c",
      line: "#e2e2e2",
      action: "#2b2b2b",
      "action-press": "#141414",
      "action-tint": "#ececec",
      royal: "#111111",
      "royal-2": "#4a4a4a",
      gold: "#8c8c8c",
      "gold-bright": "#c7c7c7",
      "gold-ink": "#4d4d4d",
      "gold-tint": "#f3f3f3"
    }
  },
  {
    id: "graphite",
    family: "mono",
    label: "Graphite & slate",
    colors: {
      page: "#ffffff",
      surface: "#f3f4f6",
      "surface-2": "#e6e9ec",
      ink: "#171b20",
      "ink-2": "#59616b",
      line: "#e0e3e7",
      action: "#3d4752",
      "action-press": "#2c343c",
      "action-tint": "#e9ecef",
      royal: "#1b2026",
      "royal-2": "#5a6672",
      gold: "#9aa3ad",
      "gold-bright": "#d0d5db",
      "gold-ink": "#4f5864",
      "gold-tint": "#f2f4f6"
    }
  }
];
const DEFAULT_PALETTE_ID = "burgundy-olive";
function paletteById(id) {
  return PALETTES.find((p) => p.id === id) ?? PALETTES.find((p) => p.id === DEFAULT_PALETTE_ID);
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}`;
}
function paletteStyle(id) {
  const { colors } = paletteById(id);
  const vars = {};
  for (const [key2, value] of Object.entries(colors)) vars[`--color-${key2}`] = value;
  const deep = rgb(colors.royal);
  vars["--shadow-card"] = `0 1px 2px rgba(${deep}, 0.06), 0 4px 16px rgba(${deep}, 0.07)`;
  vars["--shadow-lift"] = `0 2px 6px rgba(${deep}, 0.08), 0 18px 40px -12px rgba(${deep}, 0.28)`;
  return vars;
}
const TIP_CATEGORIES = [
  { id: "save", label: "Save money", short: "Save" },
  { id: "plan", label: "Plan ahead", short: "Plan" },
  { id: "green", label: "Sustainability", short: "Green" },
  { id: "stock", label: "Smarter stock", short: "Stock" }
];
const TIPS = [
  // Save money
  {
    id: "save-bulk-fast-movers",
    category: "save",
    title: "Buy bulk only on fast movers",
    body: "Case discounts pay off on items you go through every week. For slow sellers, the cash tied up on the shelf usually costs more than the discount saves.",
    tabs: ["restock", "activity"],
    action: { label: "See what moves fastest", tab: "activity" }
  },
  {
    id: "save-combine-orders",
    category: "save",
    title: "Combine orders to clear free-shipping minimums",
    body: "Build one order per vendor instead of topping up item by item. Fewer, fuller orders mean fewer shipping fees and less time on the phone.",
    tabs: ["restock"],
    action: { label: "Build a vendor order", tab: "restock" }
  },
  {
    id: "save-price-check",
    category: "save",
    title: "Re-check costs twice a year",
    body: "Supplier prices creep up quietly. Compare your saved unit costs against the latest invoice — importing it as a price update takes a minute.",
    tabs: ["products", "settings"],
    action: { label: "Import an invoice", tab: "settings", section: "import" }
  },
  {
    id: "save-web-price",
    category: "save",
    title: "Keep your prices current",
    body: "Old costs make order predictions wrong. Open Insights → Prices, tap Check online and Bintro compares the manufacturer, authorized distributors and Amazon — skipping third-party resellers.",
    tabs: ["products", "restock", "activity"],
    action: { label: "See sales insights", tab: "activity" }
  },
  {
    id: "save-dead-stock",
    category: "save",
    title: "Turn dead stock back into cash",
    body: "Anything that hasn't moved in 90 days is costing you shelf space. Bundle it, run it as a promo, or ask the vendor about a return or credit.",
    tabs: ["products", "activity"]
  },
  {
    id: "save-budget-line",
    category: "save",
    title: "Give every month a spending line",
    body: "A monthly budget makes overspending obvious by the second week, not after the bank statement arrives. Tap a month to set its own amount.",
    tabs: ["budget"],
    action: { label: "Open Budget", tab: "budget" }
  },
  {
    id: "save-receipts",
    category: "save",
    title: "Snap receipts the day you spend",
    body: "Small cash buys are the easiest deductions to lose. Photograph the receipt straight into Budget so it lands under the right tax line.",
    tabs: ["budget"]
  },
  {
    id: "save-early-pay",
    category: "save",
    title: "Ask vendors about early-pay discounts",
    body: 'Terms like "2/10 net 30" take 2% off if you pay within 10 days. On regular orders that adds up to real money over a year.',
    tabs: ["restock", "budget"]
  },
  {
    id: "save-backbar-portions",
    category: "save",
    title: "Measure back-bar product per service",
    body: "Scales and pumps for color, lightener and treatments stop over-mixing. Even a few grams saved per service shows up in your monthly supply spend.",
    audience: "beauty",
    tabs: ["scan", "budget"]
  },
  {
    id: "save-pour-cost",
    category: "save",
    title: "Watch pour cost, not just sales",
    body: "Jiggers and regular counts keep over-pours in check. If a bottle empties faster than the sales say it should, that's where the money is going.",
    audience: "bar",
    tabs: ["scan", "activity"]
  },
  // Plan ahead
  {
    id: "plan-lead-time",
    category: "plan",
    title: "Set par to cover the delivery wait",
    body: "Par should hold enough for the days it takes an order to arrive, plus a small buffer. If you run out before deliveries land, raise that item's par by a few.",
    tabs: ["restock", "products"]
  },
  {
    id: "plan-seasonal",
    category: "plan",
    title: "Stock up before your busy season",
    body: "Holidays, prom and wedding season (or game nights and patio season) spike demand. Order two to three weeks early so you are not paying rush prices.",
    tabs: ["calendar", "restock"],
    action: { label: "Add a reorder date", tab: "calendar" }
  },
  {
    id: "plan-reorder-day",
    category: "plan",
    title: "Pick one reorder day a week",
    body: "A regular order day turns restocking into a habit instead of an emergency. Add it to the calendar as a weekly event so it shows up on your phone.",
    tabs: ["calendar", "restock"],
    action: { label: "Open Calendar", tab: "calendar" }
  },
  {
    id: "plan-tax-set-aside",
    category: "plan",
    title: "Set aside for quarterly taxes",
    body: "Moving a fixed share of each week's takings into a separate account makes estimated-tax dates painless. The calendar can add those dates for you.",
    tabs: ["calendar", "budget"]
  },
  {
    id: "plan-equipment-fund",
    category: "plan",
    title: "Start a small replacement fund",
    body: "Dryers, chairs, clippers and fridges all wear out. A little set aside each month means a breakdown is an inconvenience, not a crisis.",
    tabs: ["budget"]
  },
  {
    id: "plan-price-rise",
    category: "plan",
    title: "Heard a price rise is coming? Buy one cycle ahead",
    body: "When a vendor announces an increase, one extra order at the old price on your steady sellers is usually worth it. Just don't overbuy slow movers.",
    tabs: ["restock"]
  },
  {
    id: "plan-monthly-count",
    category: "plan",
    title: "Count once a month",
    body: "A quick monthly count catches drift between the app and the shelf before it snowballs. Schedule it as a repeating count event.",
    tabs: ["calendar", "products"],
    action: { label: "Schedule a count", tab: "calendar" }
  },
  // Sustainability
  {
    id: "green-fifo",
    category: "green",
    title: "First in, first out",
    body: "Put new deliveries behind older stock. Less product expires on the shelf, which is better for the planet and your margins.",
    tabs: ["scan", "restock"]
  },
  {
    id: "green-fewer-deliveries",
    category: "green",
    title: "Fewer, fuller deliveries",
    body: "One consolidated weekly order means fewer trucks, less packaging and fewer boxes to break down.",
    tabs: ["restock"]
  },
  {
    id: "green-refill",
    category: "green",
    title: "Ask for refills and backbar sizes",
    body: "Liter and gallon sizes, or brands with refill programs, cut plastic and usually cost less per ounce.",
    audience: "beauty",
    tabs: ["restock", "products"]
  },
  {
    id: "green-salon-recycling",
    category: "green",
    title: "Recycle the hard stuff",
    body: "Color tubes, foils and hair can be recycled through salon recycling programs. Many clients choose salons that take this seriously.",
    audience: "beauty"
  },
  {
    id: "green-bar-returns",
    category: "green",
    title: "Return kegs and crates promptly",
    body: "Returnable kegs, crates and bottles earn deposits back and stay out of the waste stream. Keep a spot by the door for pickups.",
    audience: "bar"
  },
  {
    id: "green-bar-garnish",
    category: "green",
    title: "Prep garnish to the forecast",
    body: "Cut fruit and herbs for the night you expect, not the night you hope for. Leftover peels make great syrups and cordials.",
    audience: "bar"
  },
  {
    id: "green-paperless",
    category: "green",
    title: "Go paperless with orders",
    body: "Email vendor orders and keep receipts as photos. It saves paper, and nothing gets lost in the back office.",
    tabs: ["restock", "budget"]
  },
  {
    id: "green-energy",
    category: "green",
    title: "Switch off standby equipment",
    body: "Dryers, heaters, glass washers and displays draw power all night. A smart plug or a closing checklist trims the energy bill.",
    tabs: ["budget"]
  },
  // Smarter stock
  {
    id: "stock-scan-every-use",
    category: "stock",
    title: "Scan it out when you open it",
    body: "Scanning at the moment a product is opened keeps counts honest and makes below-par alerts arrive right on time.",
    tabs: ["scan"]
  },
  {
    id: "stock-scan-deliveries",
    category: "stock",
    title: "Scan deliveries in as they arrive",
    body: "Receiving stock straight away keeps your budget accurate and catches short shipments while the driver is still there.",
    tabs: ["scan", "budget"],
    action: { label: "Go to Scan", tab: "scan" }
  },
  {
    id: "stock-costs-in",
    category: "stock",
    title: "Add unit costs to every product",
    body: "Costs power your spend chart, stock value and order totals. Tap a product to add one — or let AI suggest a price when you're unsure.",
    tabs: ["products", "budget"],
    action: { label: "Open Products", tab: "products" }
  },
  {
    id: "stock-par-review",
    category: "stock",
    title: "Review par levels each season",
    body: "Demand shifts over the year. Lower par on things that slowed down and raise it on the new favourites so cash sits where it earns.",
    tabs: ["products", "restock"]
  },
  {
    id: "stock-retail-vs-backbar",
    category: "stock",
    title: "Track retail and back-bar separately",
    body: "Products for resale and products used on clients are filed under different tax lines. Separate categories keep your accountant happy.",
    audience: "beauty",
    tabs: ["products", "settings"],
    action: { label: "Review categories", tab: "settings", section: "categories" }
  },
  {
    id: "stock-staff-names",
    category: "stock",
    title: "Everyone scans under their own name",
    body: "Named scans show who used what, which makes training easier and unexplained shrinkage much easier to spot.",
    tabs: ["activity", "scan"]
  }
];
const BEAUTY_TYPES = /* @__PURE__ */ new Set(["salon", "barber", "nails", "brows", "tattoo", "spa", "other"]);
function audienceFor(businessType) {
  if (businessType === "bar") return "bar";
  return BEAUTY_TYPES.has(businessType) ? "beauty" : null;
}
function tipsFor(businessType, tab, category, day = dayNumber()) {
  const audience = audienceFor(businessType);
  const fits = TIPS.filter((t) => (!t.audience || t.audience === audience) && (!category || t.category === category));
  const rotate = (list) => {
    if (!list.length) return list;
    const start = day % list.length;
    return [...list.slice(start), ...list.slice(0, start)];
  };
  const here = fits.filter((t) => t.tabs?.includes(tab));
  const rest = fits.filter((t) => !t.tabs?.includes(tab));
  return [...rotate(here), ...rotate(rest)];
}
function dayNumber(date = /* @__PURE__ */ new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 6e4) / 864e5);
}
const LAST_SHOWN_KEY = "bintro-tips-last-shown";
const SHOWN_COUNT_KEY = "bintro-tips-shown-count";
const AUTO_KEY = "bintro-tips-auto";
const PREFS_EVENT = "bintro-tips-prefs";
const TIP_INTERVAL_MINUTES = 10;
const TIP_INTERVAL_MS = TIP_INTERVAL_MINUTES * 6e4;
const CATEGORY_ICON = {
  save: PiggyBank,
  plan: CalendarClock,
  green: Leaf,
  stock: Boxes
};
function categoryLabel(id) {
  return TIP_CATEGORIES.find((c) => c.id === id)?.label ?? "";
}
function readStorage$1(key2) {
  try {
    return window.localStorage.getItem(key2);
  } catch {
    return null;
  }
}
function writeStorage$1(key2, value) {
  try {
    window.localStorage.setItem(key2, value);
  } catch {
  }
}
function lastShown() {
  return Number(readStorage$1(LAST_SHOWN_KEY)) || 0;
}
function getTipPopups() {
  return readStorage$1(AUTO_KEY) !== "0";
}
function setTipPopups(on) {
  writeStorage$1(AUTO_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event(PREFS_EVENT));
}
function useTipPopups() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const sync = () => setOn(getTipPopups());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    return () => window.removeEventListener(PREFS_EVENT, sync);
  }, []);
  return on;
}
function useFreshTip() {
  const popups = useTipPopups();
  const [due, setDue] = useState(false);
  useEffect(() => {
    const check = () => setDue(Date.now() - lastShown() >= TIP_INTERVAL_MS);
    check();
    const timer = setInterval(check, 3e4);
    return () => clearInterval(timer);
  }, []);
  const markSeen = useCallback(() => {
    writeStorage$1(LAST_SHOWN_KEY, String(Date.now()));
    setDue(false);
  }, []);
  return { fresh: due && popups, markSeen };
}
function TipBulb({ onClick, fresh }) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      "data-fresh": fresh,
      className: "tip-bulb relative w-10 h-10",
      "aria-label": fresh ? "Tips: today's tip is ready" : "Tips for saving money, planning ahead and wasting less",
      children: [
        /* @__PURE__ */ jsx(Lightbulb, { size: 20, strokeWidth: 2.2 }),
        fresh && /* @__PURE__ */ jsx("span", { className: "absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-action ring-2 ring-white", "aria-hidden": "true" })
      ]
    }
  );
}
function CategoryBadge({ category }) {
  const Icon = CATEGORY_ICON[category];
  return /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-royal text-white text-[12px] font-semibold pl-2 pr-2.5 py-1", children: [
    /* @__PURE__ */ jsx(Icon, { size: 13, className: "text-gold-bright" }),
    categoryLabel(category)
  ] });
}
function TipSheet({
  open,
  onClose,
  tab,
  onNavigate
}) {
  const { profile } = useBusiness();
  const [category, setCategory] = useState(null);
  const [index, setIndex] = useState(0);
  const auto = useTipPopups();
  const tips = useMemo(() => tipsFor(profile.businessType, tab, category ?? void 0), [profile.businessType, tab, category]);
  const tip = tips[Math.min(index, tips.length - 1)];
  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open, tab]);
  useEffect(() => {
    if (!open || tips.length < 2) return;
    function onKey(e) {
      const target = e.target;
      if (target?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % tips.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + tips.length) % tips.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, tips.length]);
  function pick(next) {
    setCategory(next);
    setIndex(0);
  }
  function toggleAuto(next) {
    setTipPopups(next);
  }
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Tips",
      subtitle: "Small habits that save money, prepare for the next order and cut waste.",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4 [scrollbar-width:none]", role: "group", "aria-label": "Tip themes", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "chip", "aria-pressed": category === null, onClick: () => pick(null), children: "All" }),
          TIP_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c.id];
            return /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                className: "chip flex items-center gap-1.5",
                "aria-pressed": category === c.id,
                onClick: () => pick(c.id),
                children: [
                  /* @__PURE__ */ jsx(Icon, { size: 15 }),
                  c.label
                ]
              },
              c.id
            );
          })
        ] }),
        tip ? /* @__PURE__ */ jsxs("article", { className: "tip-card tip-swap p-5 min-h-[220px] flex flex-col", "aria-live": "polite", children: [
          /* @__PURE__ */ jsx(
            Lightbulb,
            {
              size: 128,
              strokeWidth: 1.2,
              className: "absolute -right-6 -top-4 text-gold opacity-[0.16] pointer-events-none",
              "aria-hidden": "true"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 mb-3 relative", children: [
            /* @__PURE__ */ jsx(CategoryBadge, { category: tip.category }),
            /* @__PURE__ */ jsxs("span", { className: "num text-[12px] font-semibold text-gold-ink", children: [
              Math.min(index, tips.length - 1) + 1,
              " / ",
              tips.length
            ] })
          ] }),
          /* @__PURE__ */ jsx("h3", { className: "relative text-[20px] leading-snug font-bold tracking-tight m-0 mb-2 text-royal", children: tip.title }),
          /* @__PURE__ */ jsx("p", { className: "relative text-[15px] text-ink m-0", children: tip.body }),
          tip.action && /* @__PURE__ */ jsx("div", { className: "relative mt-auto pt-4", children: /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "btn btn-primary btn-sm",
              onClick: () => {
                onClose();
                onNavigate(tip.action.tab, tip.action.section);
              },
              children: [
                tip.action.label,
                /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
              ]
            }
          ) })
        ] }, tip.id) : /* @__PURE__ */ jsx("p", { className: "text-ink-2", children: "No tips in this theme for your business type yet." }),
        tips.length > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 mt-4", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-tonal !px-4",
              onClick: () => setIndex((i) => (i - 1 + tips.length) % tips.length),
              "aria-label": "Previous tip",
              children: /* @__PURE__ */ jsx(ChevronLeft, { size: 18 })
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "flex-1 flex justify-center gap-1.5", "aria-hidden": "true", children: tips.length <= 12 && tips.map((t, i) => /* @__PURE__ */ jsx(
            "span",
            {
              className: `h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-gold" : "w-1.5 bg-line"}`
            },
            t.id
          )) }),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-gold", onClick: () => setIndex((i) => (i + 1) % tips.length), children: [
            "Next tip",
            /* @__PURE__ */ jsx(ChevronRight, { size: 18 })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-center justify-between gap-3 mt-5 pt-4 border-t border-line cursor-pointer", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
            /* @__PURE__ */ jsx("b", { className: "block", children: "Tip pop-ups" }),
            /* @__PURE__ */ jsxs("span", { className: "text-ink-2 text-[13px]", children: [
              "A short business tip every ",
              TIP_INTERVAL_MINUTES,
              " minutes, matched to the tab you're on. Also in Settings → Look & feel."
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              checked: auto,
              onChange: (e) => toggleAuto(e.target.checked),
              className: "w-5 h-5 accent-[var(--color-action)] shrink-0"
            }
          )
        ] })
      ]
    }
  );
}
function TipNudge({
  tab,
  enabled,
  onSeen,
  onOpenAll,
  onNavigate
}) {
  const { profile } = useBusiness();
  const [tip, setTip] = useState(null);
  const [offset, setOffset] = useState(0);
  const popups = useTipPopups();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!popups) setTip(null);
    if (!enabled || !popups || tip || tab === "settings") return;
    const wait = Math.max(3500, lastShown() + TIP_INTERVAL_MS - Date.now());
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        setRetry((r) => r + 1);
        return;
      }
      const list = tipsFor(profile.businessType, tab);
      if (list.length === 0) return;
      const count = Number(readStorage$1(SHOWN_COUNT_KEY)) || 0;
      writeStorage$1(SHOWN_COUNT_KEY, String(count + 1));
      const i = count % list.length;
      setTip(list[i]);
      setOffset(i);
      onSeen();
    }, wait);
    return () => clearTimeout(timer);
  }, [enabled, popups, tab, tip, retry, profile.businessType, onSeen]);
  if (!tip) return null;
  function next() {
    const list = tipsFor(profile.businessType, tab);
    const i = (offset + 1) % list.length;
    setOffset(i);
    setTip(list[i]);
  }
  return /* @__PURE__ */ jsx(
    "aside",
    {
      role: "status",
      "aria-label": "Business tip",
      className: "tip-nudge print:hidden fixed z-40 right-4 left-4 min-[560px]:left-auto min-[560px]:w-[380px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6",
      children: /* @__PURE__ */ jsxs("div", { className: "tip-card p-4 pr-3", style: { boxShadow: "var(--shadow-lift), inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 35%, transparent)" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "w-10 h-10 rounded-full brand-tile grid place-items-center shrink-0 text-gold-bright", "aria-hidden": "true", children: /* @__PURE__ */ jsx(Lightbulb, { size: 20, strokeWidth: 2.2 }) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("p", { className: "m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-ink", children: [
              "Business tip · ",
              categoryLabel(tip.category)
            ] }),
            /* @__PURE__ */ jsx("b", { className: "block text-[16px] leading-snug text-royal mt-0.5", children: tip.title }),
            /* @__PURE__ */ jsx("p", { className: "m-0 mt-1 text-[14px] text-ink leading-snug", children: tip.body })
          ] }, tip.id),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setTip(null),
              "aria-label": "Dismiss tip",
              className: "w-8 h-8 -mt-1 rounded-full border-0 bg-transparent text-ink-2 grid place-items-center cursor-pointer hover:bg-white/70 shrink-0",
              children: /* @__PURE__ */ jsx(X, { size: 17 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 mt-3 pl-[52px] flex-wrap", children: [
          tip.action && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary btn-sm",
              onClick: () => {
                setTip(null);
                onNavigate(tip.action.tab, tip.action.section);
              },
              children: tip.action.label
            }
          ),
          /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: next, children: "Next" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-text btn-sm !text-gold-ink",
              onClick: () => {
                setTip(null);
                onOpenAll();
              },
              children: "All tips"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              className: "btn btn-text btn-sm !text-ink-2 ml-auto",
              onClick: () => {
                setTip(null);
                setTipPopups(false);
              },
              children: "Don't show again"
            }
          )
        ] })
      ] })
    }
  );
}
function AppearanceSettings({
  profile,
  onProfile
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const current = paletteById(profile.palette).id;
  async function choose(p) {
    if (p.id === current || saving) return;
    const before = profile;
    onProfile({ ...profile, palette: p.id });
    setSaving(true);
    try {
      onProfile(await updateBusinessProfile({ data: { palette: p.id } }));
      toast(`${p.label} palette applied`);
    } catch {
      onProfile(before);
      toast("Couldn't save the palette. Try again.");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("h2", { className: "text-[18px] font-bold text-royal m-0 mb-1 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Palette, { size: 18, className: "text-gold-ink" }),
      " Color palette"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-0 mb-4", children: "Pick the colors closest to your brand. Buttons, the scan circle, tabs and accents change on every device; stock alerts stay green, amber and red so they read the same." }),
    PALETTE_FAMILIES.map((family) => /* @__PURE__ */ jsxs("section", { className: "mb-5", "aria-labelledby": `palette-${family.id}`, children: [
      /* @__PURE__ */ jsx("h3", { id: `palette-${family.id}`, className: "text-[15px] font-bold m-0", children: family.label }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] m-0 mb-2", children: family.blurb }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 min-[480px]:grid-cols-2 gap-2.5", role: "radiogroup", "aria-label": `${family.label} palettes`, children: PALETTES.filter((p) => p.family === family.id).map((p) => /* @__PURE__ */ jsx(PaletteCard, { palette: p, selected: p.id === current, onSelect: () => choose(p) }, p.id)) })
    ] }, family.id)),
    /* @__PURE__ */ jsx(TipSettings, {})
  ] });
}
function TipSettings() {
  const popups = useTipPopups();
  return /* @__PURE__ */ jsxs("section", { className: "mt-8 pt-6 border-t border-line", "aria-labelledby": "tips-title", children: [
    /* @__PURE__ */ jsxs("h2", { id: "tips-title", className: "text-[18px] font-bold text-royal m-0 mb-1 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Lightbulb, { size: 18, className: "text-gold-ink" }),
      " Business tips"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-0 mb-3", children: "Short tips on saving money, planning orders and cutting waste. This setting is for this device. The light bulb in the header always opens every tip." }),
    /* @__PURE__ */ jsxs("label", { className: "flex items-start justify-between gap-3 cursor-pointer border border-line rounded-2xl p-3.5", children: [
      /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
        /* @__PURE__ */ jsxs("b", { className: "block", children: [
          "Pop up a tip every ",
          TIP_INTERVAL_MINUTES,
          " minutes"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[13px]", children: popups ? "On. Turn off to hide tip pop-ups permanently." : "Hidden permanently. Turn on to see them again." })
      ] }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "checkbox",
          checked: popups,
          onChange: (e) => setTipPopups(e.target.checked),
          className: "w-5 h-5 mt-0.5 accent-[var(--color-action)] shrink-0"
        }
      )
    ] })
  ] });
}
function PaletteCard({ palette, selected, onSelect }) {
  const c = palette.colors;
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      role: "radio",
      "aria-checked": selected,
      onClick: onSelect,
      className: "text-left rounded-2xl p-3 cursor-pointer border-2 bg-white transition-colors",
      style: { borderColor: selected ? c.action : "var(--color-line)" },
      children: [
        /* @__PURE__ */ jsxs("span", { className: "block rounded-xl overflow-hidden mb-2.5", style: { background: c.surface }, children: [
          /* @__PURE__ */ jsx("span", { className: "block h-[3px]", style: { background: `linear-gradient(90deg, ${c.action}, ${c["royal-2"]} 45%, ${c.gold} 80%, ${c["gold-bright"]})` } }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2 px-2.5 py-2.5", children: [
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "w-7 h-7 rounded-lg shrink-0",
                style: { background: `linear-gradient(160deg, ${c["royal-2"]}, ${c.royal})`, boxShadow: `inset 0 0 0 1.5px ${c["gold-bright"]}` }
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("span", { className: "block h-2 rounded w-[70%]", style: { background: c.ink } }),
              /* @__PURE__ */ jsx("span", { className: "block h-1.5 rounded w-[45%] mt-1", style: { background: c["ink-2"], opacity: 0.6 } })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "rounded-full px-2.5 py-1 text-[11px] font-bold text-white", style: { background: c.action }, children: "Scan" }),
            /* @__PURE__ */ jsx("span", { className: "w-5 h-5 rounded-full", style: { background: c.gold } })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-ink", children: palette.label }),
          selected ? /* @__PURE__ */ jsx("span", { className: "w-6 h-6 rounded-full grid place-items-center text-white", style: { background: c.action }, children: /* @__PURE__ */ jsx(Check, { size: 14, strokeWidth: 3 }) }) : /* @__PURE__ */ jsx("span", { className: "flex gap-1", "aria-hidden": "true", children: [c.royal, c.action, c.gold, c["gold-tint"]].map((hex) => /* @__PURE__ */ jsx("span", { className: "w-4 h-4 rounded-full border border-line", style: { background: hex } }, hex)) })
        ] })
      ]
    }
  );
}
const PAIRING_STEPS = [
  {
    device: "iPhone or iPad",
    steps: [
      'Turn the scanner on and put it in pairing mode (usually hold the trigger, or scan the "Bluetooth HID" code in its manual).',
      "Open Settings → Bluetooth and turn Bluetooth on.",
      "Tap the scanner under Other Devices. If it asks for a PIN, scan the digits from the manual, then its Enter code.",
      "Come back to Bintro. Tip: double-press the scanner trigger to show the on-screen keyboard again, if your model supports it."
    ]
  },
  {
    device: "Android phone or tablet",
    steps: [
      "Put the scanner in pairing mode (keyboard / HID mode).",
      "Open Settings → Connected devices → Pair new device.",
      "Tap the scanner’s name and confirm.",
      "Back in Bintro, scan a barcode on the Scan tab."
    ]
  },
  {
    device: "Windows computer",
    steps: [
      "Put the scanner in pairing mode.",
      "Open Settings → Bluetooth & devices → Add device → Bluetooth.",
      "Pick the scanner and wait for “Connected”."
    ]
  },
  {
    device: "Mac",
    steps: [
      "Put the scanner in pairing mode.",
      "Open System Settings → Bluetooth.",
      "Click Connect next to the scanner. If a keyboard setup window opens, close it."
    ]
  }
];
function ScannerSettings() {
  const [bt, setBt] = useState({ supported: false, status: "idle", deviceName: "", error: "" });
  const [savedName, setSavedName] = useState("");
  const [askMode, setAskMode] = useState("every");
  const [test, setTest] = useState("");
  const [lastCode, setLastCode] = useState(null);
  useEffect(() => {
    setSavedName(savedBluetoothScannerName());
    setAskMode(getStaffAskMode());
    const offState = onBluetoothScannerState((s) => {
      setBt(s);
      setSavedName(savedBluetoothScannerName());
    });
    const offCode = onBluetoothCode((code) => setLastCode({ code, via: "Bluetooth (direct)" }));
    return () => {
      offState();
      offCode();
    };
  }, []);
  function chooseAsk(mode) {
    setAskMode(mode);
    setStaffAskMode(mode);
  }
  const connected = bt.status === "connected";
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
    /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4", "aria-labelledby": "bt-title", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3 mb-1", children: [
        /* @__PURE__ */ jsxs("h2", { id: "bt-title", className: "m-0 text-[17px] font-bold flex items-center gap-2", children: [
          connected ? /* @__PURE__ */ jsx(BluetoothConnected, { size: 18, className: "text-action" }) : /* @__PURE__ */ jsx(Bluetooth, { size: 18, className: "text-ink-2" }),
          "Bluetooth scanner"
        ] }),
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `text-[12px] font-bold rounded-full px-2.5 py-1 ${connected ? "bg-good-tint text-good" : bt.status === "connecting" ? "bg-warn-tint text-warn" : "bg-surface text-ink-2"}`,
            children: connected ? "Connected" : bt.status === "connecting" ? "Connecting…" : "Not connected"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm mt-0 mb-3", children: "Most scanners pair as a keyboard in your device’s Bluetooth settings (steps below) and then work anywhere on the Scan tab. Scanners with a BLE serial mode can also connect straight to Bintro here." }),
      connected ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm m-0 mb-3", children: [
          /* @__PURE__ */ jsx("b", { children: bt.deviceName }),
          " is connected. Scans go to the Scan tab."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx("button", { className: "btn btn-tonal btn-sm", onClick: () => disconnectBluetoothScanner(), children: "Disconnect" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm !text-bad", onClick: () => disconnectBluetoothScanner(true), children: "Forget scanner" })
        ] })
      ] }) : bt.supported ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("button", { className: "btn btn-primary btn-sm", disabled: bt.status === "connecting", onClick: () => pairBluetoothScanner(), children: [
          /* @__PURE__ */ jsx(Bluetooth, { size: 16 }),
          savedName ? `Reconnect ${savedName}` : "Pair a Bluetooth scanner"
        ] }),
        savedName && /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm ml-1", onClick: () => pairBluetoothScanner(), children: "Pair a different one" })
      ] }) : /* @__PURE__ */ jsx("p", { className: "text-sm bg-surface rounded-xl px-3.5 py-2.5 m-0", children: "This browser can’t connect to Bluetooth directly (Safari and iPhone/iPad browsers can’t). Pair the scanner in your device’s Bluetooth settings using the steps below — it works the same once paired." }),
      bt.error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: bt.error }),
      /* @__PURE__ */ jsx("h3", { className: "text-[15px] font-bold mt-5 mb-2", children: "Pair in your device’s Bluetooth settings" }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2", children: PAIRING_STEPS.map((p) => /* @__PURE__ */ jsxs("details", { className: "bg-surface rounded-xl px-3.5 py-2.5 text-sm", children: [
        /* @__PURE__ */ jsx("summary", { className: "cursor-pointer font-semibold", children: p.device }),
        /* @__PURE__ */ jsx("ol", { className: "pl-5 mt-2 mb-1 flex flex-col gap-1.5", children: p.steps.map((step) => /* @__PURE__ */ jsx("li", { children: step }, step)) })
      ] }, p.device)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4", "aria-labelledby": "test-title", children: [
      /* @__PURE__ */ jsxs("h2", { id: "test-title", className: "m-0 mb-1 text-[17px] font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ScanBarcode, { size: 18, className: "text-ink-2" }),
        " Test your scanner"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm mt-0 mb-3", children: "Tap the box, then scan any barcode. Nothing is saved." }),
      /* @__PURE__ */ jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            if (test.trim()) setLastCode({ code: test.trim(), via: "Keyboard / paired scanner" });
            setTest("");
          },
          children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "scanner-test", className: "sr-only", children: "Scanner test" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                id: "scanner-test",
                className: "field-input text-center text-lg tracking-[0.1em]",
                value: test,
                onChange: (e) => setTest(e.target.value),
                placeholder: "Scan here",
                autoComplete: "off",
                inputMode: "none"
              }
            )
          ]
        }
      ),
      lastCode && /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 text-sm bg-good-tint text-good rounded-xl px-3.5 py-2.5 mt-3 mb-0", role: "status", children: [
        /* @__PURE__ */ jsx(Check, { size: 16, className: "shrink-0" }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Read ",
          /* @__PURE__ */ jsx("b", { className: "num", children: lastCode.code }),
          " · ",
          lastCode.via,
          ". Your scanner is working."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4", "aria-labelledby": "ask-title", children: [
      /* @__PURE__ */ jsxs("h2", { id: "ask-title", className: "m-0 mb-1 text-[17px] font-bold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Users, { size: 18, className: "text-ink-2" }),
        " Ask who’s scanning"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm mt-0 mb-3", children: "A name picker pops up in the middle of the screen so every scan is logged under the right person. This setting is for this device." }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-2", role: "radiogroup", "aria-label": "When to ask who's scanning", children: [
        { id: "every", title: "Before every scan", body: "Best for shared devices at the front desk or bar." },
        {
          id: "idle",
          title: `After ${STAFF_IDLE_MINUTES} minutes without a scan`,
          body: "Best when one person scans a whole delivery in a row."
        }
      ].map((o) => /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-3 cursor-pointer bg-surface rounded-xl px-3.5 py-3", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "radio",
            name: "ask-staff",
            checked: askMode === o.id,
            onChange: () => chooseAsk(o.id),
            className: "w-5 h-5 mt-0.5 accent-[var(--color-action)] shrink-0"
          }
        ),
        /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
          /* @__PURE__ */ jsx("b", { className: "block", children: o.title }),
          /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[13px]", children: o.body })
        ] })
      ] }, o.id)) })
    ] })
  ] });
}
const DAY_MS = 24 * 60 * 60 * 1e3;
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" });
}
function daysUntil(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS));
}
function AccountView({ panel, onPanel }) {
  const { account, onAccount } = useBusiness();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  async function run(key2, call) {
    setBusy(key2);
    try {
      const r = await call();
      if (!r.ok) {
        toast(r.message);
        return false;
      }
      onAccount(r.result.account);
      if (r.result.redirect) {
        window.location.href = r.result.redirect;
        return true;
      }
      toast(r.result.message);
      return true;
    } catch {
      toast("Something went wrong. Try again.");
      return false;
    } finally {
      setBusy("");
    }
  }
  if (!account) {
    return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[40%]" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    !account.pilotPremium && /* @__PURE__ */ jsx("div", { className: "inline-flex p-1 rounded-full bg-surface mb-4", role: "tablist", "aria-label": "Account or billing", children: [
      { id: "account", label: "Account" },
      { id: "billing", label: "Billing" }
    ].map((t) => /* @__PURE__ */ jsx(
      "button",
      {
        role: "tab",
        "aria-selected": panel === t.id,
        onClick: () => onPanel(t.id),
        className: `px-5 py-2 rounded-full border-0 text-sm font-semibold cursor-pointer ${panel === t.id ? "bg-white text-ink shadow-card" : "bg-transparent text-ink-2"}`,
        children: t.label
      },
      t.id
    )) }),
    /* @__PURE__ */ jsx(PlanSummary, { account, onBilling: () => onPanel("billing"), busy, run }),
    account.pilotPremium ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(FoundingOffer, { account, busy, run }),
      /* @__PURE__ */ jsx(Usage, { account }),
      /* @__PURE__ */ jsx(IncludedFeatures, { account }),
      /* @__PURE__ */ jsx(AccountDetails, { account })
    ] }) : panel === "account" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Usage, { account }),
      /* @__PURE__ */ jsx(IncludedFeatures, { account }),
      /* @__PURE__ */ jsx(PlanPicker, { account, busy, run }),
      /* @__PURE__ */ jsx(AccountDetails, { account })
    ] }) : /* @__PURE__ */ jsx(Billing, { account, busy, run })
  ] });
}
function statusLine(account) {
  const plan = planById(account.plan);
  if (account.pilotPremium) {
    if (!account.pilotEndsAt) {
      return {
        tone: "good",
        label: "Pilot · included",
        detail: "Thanks for testing Bintro. Every Premium feature, including everything in Plus, is free for 18 months. Your clock starts with your first Scan In."
      };
    }
    const left = daysUntil(account.pilotEndsAt);
    return {
      tone: left <= 30 ? "warn" : "good",
      label: left <= 30 ? `Pilot · ${left} day${left === 1 ? "" : "s"} left` : "Pilot · included",
      detail: account.lockedIn ? `Thanks for testing Bintro. Every Premium feature is free until ${fmtDate(account.pilotEndsAt)}. Then your founding rate for ${planById(account.lockedIn.plan).name} starts.` : `Thanks for testing Bintro. Every Premium feature, including everything in Plus, is free until ${fmtDate(account.pilotEndsAt)}, 18 months after your first Scan In. Lock in your founding rate below to keep them, or you'll move to Free.`
    };
  }
  if (account.status === "trialing") {
    const left = daysUntil(account.trialEndsAt);
    return {
      tone: left <= 5 ? "warn" : "good",
      label: `Trial · ${left} day${left === 1 ? "" : "s"} left`,
      detail: `Every ${plan.name} feature is on until ${fmtDate(account.trialEndsAt)}. Pick a plan to keep them, or you'll move to Free.`
    };
  }
  if (account.status === "paused") {
    return {
      tone: "warn",
      label: `Paused until ${fmtDate(account.pausedUntil)}`,
      detail: `No charges while paused. Your data is safe, and you're on Free features until ${plan.name} resumes.`
    };
  }
  if (account.cancelAtPeriodEnd) {
    return {
      tone: "bad",
      label: `Ends ${fmtDate(account.currentPeriodEnd)}`,
      detail: `${plan.name} stays on until then, then the account moves to Free. Nothing is deleted.`
    };
  }
  if (account.plan === "free") {
    return { tone: "plain", label: "Free forever", detail: "Upgrade any time for ordering, planning, AI help and more." };
  }
  return {
    tone: "good",
    label: "Active",
    detail: `Renews ${fmtDate(account.currentPeriodEnd)} for ${centsLabel(priceFor(plan, account.interval, account.founding))}/${account.interval}.`
  };
}
const TONE = {
  good: "bg-good-tint text-good",
  warn: "bg-warn-tint text-warn",
  bad: "bg-bad-tint text-bad",
  plain: "bg-white/15 text-white"
};
function PlanSummary({
  account,
  onBilling,
  busy,
  run
}) {
  const { name } = useBusiness();
  const plan = planById(account.plan);
  const status = statusLine(account);
  const canResume = account.status === "paused" || account.cancelAtPeriodEnd;
  return /* @__PURE__ */ jsxs("section", { className: "brand-tile rounded-3xl text-white p-5 mb-6 shadow-lift", "aria-labelledby": "plan-title", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "m-0 text-[12px] font-bold uppercase tracking-wider text-gold-bright", children: name }),
        /* @__PURE__ */ jsxs("h2", { id: "plan-title", className: "m-0 text-[26px] font-extrabold flex items-center gap-2", children: [
          account.plan === "premium" && /* @__PURE__ */ jsx(Crown, { size: 22, className: "text-gold-bright" }),
          "Bintro ",
          plan.name
        ] })
      ] }),
      /* @__PURE__ */ jsx("span", { className: `text-[12px] font-bold rounded-full px-2.5 py-1 shrink-0 ${TONE[status.tone]}`, children: status.label })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "m-0 mt-2 text-[14px] text-white/85", children: status.detail }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 mt-4", children: [
      canResume && /* @__PURE__ */ jsxs(
        "button",
        {
          className: "btn btn-gold btn-sm",
          disabled: !!busy,
          onClick: () => run("resume", () => resumePlan()),
          children: [
            /* @__PURE__ */ jsx(PlayCircle, { size: 16 }),
            busy === "resume" ? "Working…" : account.status === "paused" ? "Resume now" : `Keep ${plan.name}`
          ]
        }
      ),
      !account.pilotPremium && /* @__PURE__ */ jsxs("button", { className: "btn btn-sm bg-white/15 text-white border-0 hover:bg-white/25", onClick: onBilling, children: [
        /* @__PURE__ */ jsx(CreditCard, { size: 16 }),
        "Billing, pause & cancel"
      ] })
    ] })
  ] });
}
function Meter({ Icon, label: label2, used, limit }) {
  const pct = limit ? Math.min(100, Math.round(used / limit * 100)) : 0;
  const full = limit !== null && used >= limit;
  return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-3.5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm mb-2", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2 font-semibold", children: [
        /* @__PURE__ */ jsx(Icon, { size: 16, className: "text-ink-2" }),
        label2
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "num", children: [
        /* @__PURE__ */ jsx("b", { children: used }),
        /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
          " / ",
          limit === null ? "Unlimited" : limit
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-2 rounded-full bg-surface-2 overflow-hidden", "aria-hidden": "true", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: `h-full rounded-full ${full ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-action"}`,
        style: { width: limit === null ? "100%" : `${Math.max(pct, used ? 4 : 0)}%`, opacity: limit === null ? 0.25 : 1 }
      }
    ) }),
    full && /* @__PURE__ */ jsx("p", { className: "text-bad text-[12px] font-semibold m-0 mt-1.5", children: "Limit reached. Upgrade to add more." })
  ] });
}
function Usage({ account }) {
  const plan = planById(account.effectivePlan);
  return /* @__PURE__ */ jsxs("section", { className: "mb-6", "aria-labelledby": "usage-title", children: [
    /* @__PURE__ */ jsx("h3", { id: "usage-title", className: "text-[17px] font-bold text-royal m-0 mb-2", children: "Usage" }),
    /* @__PURE__ */ jsxs("div", { className: "grid min-[520px]:grid-cols-2 gap-2.5", children: [
      /* @__PURE__ */ jsx(Meter, { Icon: Boxes, label: "Products", used: account.usage.products, limit: plan.productLimit }),
      /* @__PURE__ */ jsx(Meter, { Icon: Users, label: "Team members", used: account.usage.team, limit: plan.teamLimit })
    ] })
  ] });
}
function IncludedFeatures({ account }) {
  const plan = planById(account.effectivePlan);
  const all = Object.keys(FEATURE_INFO);
  return /* @__PURE__ */ jsxs("section", { className: "mb-6", "aria-labelledby": "features-title", children: [
    /* @__PURE__ */ jsx("h3", { id: "features-title", className: "text-[17px] font-bold text-royal m-0 mb-2", children: "What's on right now" }),
    /* @__PURE__ */ jsxs("ul", { className: "list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line", children: [
      /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 px-3.5 py-2.5 text-sm", children: [
        /* @__PURE__ */ jsx(Check, { size: 17, className: "text-good shrink-0" }),
        /* @__PURE__ */ jsx("span", { className: "flex-1", children: "Scanning, products, below-par list and activity" }),
        /* @__PURE__ */ jsx("span", { className: "text-[12px] text-ink-2", children: "Every plan" })
      ] }),
      all.map((f) => {
        const on = plan.features.includes(f);
        const needs = PLANS.find((p) => p.features.includes(f));
        return /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 px-3.5 py-2.5 text-sm", children: [
          on ? /* @__PURE__ */ jsx(Check, { size: 17, className: "text-good shrink-0" }) : /* @__PURE__ */ jsx(Lock, { size: 16, className: "text-ink-2 shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: `flex-1 ${on ? "" : "text-ink-2"}`, children: FEATURE_INFO[f].label }),
          /* @__PURE__ */ jsx("span", { className: `text-[12px] font-semibold ${on ? "text-good" : "text-gold-ink"}`, children: on ? "Included" : needs?.name })
        ] }, f);
      })
    ] })
  ] });
}
function PlanPicker({ account, busy, run }) {
  const [interval, setBillingInterval] = useState(account.plan === "free" ? "month" : account.interval);
  const [confirm, setConfirm] = useState(null);
  const current = planById(account.plan);
  function action(target) {
    const trial = account.status === "trialing";
    const same = target.id === account.plan && (target.id === "free" || interval === account.interval);
    if (same && !trial && account.status !== "paused" && !account.cancelAtPeriodEnd) {
      return { label: "Current plan", disabled: true, tone: "btn-tonal" };
    }
    if (trial) return { label: target.id === "free" ? "Switch to Free" : `Choose ${target.name}`, disabled: false, tone: target.id === "free" ? "btn-tonal" : "btn-primary" };
    if (target.id === account.plan) {
      if (account.status === "paused" || account.cancelAtPeriodEnd) return { label: `Keep ${target.name}`, disabled: false, tone: "btn-primary" };
      return { label: `Switch to ${interval}ly`, disabled: false, tone: "btn-tonal" };
    }
    return planRank(target.id) > planRank(account.plan) ? { label: `Upgrade to ${target.name}`, disabled: false, tone: target.id === "premium" ? "btn-gold" : "btn-primary" } : { label: `Downgrade to ${target.name}`, disabled: false, tone: "btn-tonal" };
  }
  function choose(target) {
    if (account.status !== "trialing" && planRank(target.id) < planRank(account.plan)) setConfirm(target);
    else if (target.id === account.plan && (account.status === "paused" || account.cancelAtPeriodEnd))
      run("resume", () => resumePlan());
    else commit(target.id);
  }
  function commit(plan) {
    setConfirm(null);
    run(`plan-${plan}`, () => selectPlan({ data: { plan, interval } }));
  }
  const losing = confirm ? current.features.filter((f) => !confirm.features.includes(f)) : [];
  return /* @__PURE__ */ jsxs("section", { className: "mb-6", "aria-labelledby": "plans-title", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between gap-3 mb-3 flex-wrap", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { id: "plans-title", className: "text-[17px] font-bold text-royal m-0", children: "Plans" }),
        /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] m-0", children: "Change or cancel any time. Your data always stays." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "inline-flex p-1 rounded-full bg-surface", role: "radiogroup", "aria-label": "Billing period", children: ["month", "year"].map((i) => /* @__PURE__ */ jsx(
        "button",
        {
          role: "radio",
          "aria-checked": interval === i,
          onClick: () => setBillingInterval(i),
          className: `px-3.5 py-1.5 rounded-full border-0 text-[13px] font-semibold cursor-pointer ${interval === i ? "bg-white text-ink shadow-card" : "bg-transparent text-ink-2"}`,
          children: i === "month" ? "Monthly" : "Yearly · 2 months free"
        },
        i
      )) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid min-[640px]:grid-cols-3 gap-3", children: PLANS.map((p) => {
      const a = action(p);
      const isCurrent = p.id === account.plan;
      const price = priceFor(p, interval, account.founding);
      return /* @__PURE__ */ jsxs(
        "article",
        {
          className: `relative flex flex-col rounded-2xl p-4 border ${p.id === "premium" ? "border-gold bg-gold-tint/60" : isCurrent ? "border-action bg-action-tint/40" : "border-line bg-white"}`,
          children: [
            p.id === "plus" && !isCurrent && /* @__PURE__ */ jsx("span", { className: "absolute -top-2.5 left-4 text-[11px] font-bold uppercase tracking-wider bg-action text-white rounded-full px-2 py-0.5", children: "Most popular" }),
            isCurrent && /* @__PURE__ */ jsx("span", { className: "absolute -top-2.5 left-4 text-[11px] font-bold uppercase tracking-wider bg-royal text-white rounded-full px-2 py-0.5", children: account.status === "trialing" ? "Trying now" : "Your plan" }),
            /* @__PURE__ */ jsxs("h4", { className: "m-0 text-[18px] font-extrabold flex items-center gap-1.5", children: [
              p.id === "premium" && /* @__PURE__ */ jsx(Crown, { size: 17, className: "text-gold-ink" }),
              p.name
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 mb-3", children: [
              /* @__PURE__ */ jsx("span", { className: "num text-[28px] font-extrabold text-royal", children: centsLabel(price) }),
              price > 0 && /* @__PURE__ */ jsxs("span", { className: "text-ink-2 text-sm", children: [
                "/",
                interval
              ] }),
              price > 0 && interval === "year" && /* @__PURE__ */ jsxs("span", { className: "block text-[12px] text-good font-semibold", children: [
                centsLabel(Math.round(price / 12)),
                "/mo, saves ",
                centsLabel(priceFor(p, "month", account.founding) * 12 - price)
              ] })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] m-0 mb-3", children: p.tagline }),
            /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 mb-4 flex flex-col gap-1.5 text-[13px] flex-1", children: p.highlights.map((h) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Check, { size: 15, className: "text-good shrink-0 mt-0.5" }),
              h
            ] }, h)) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: `btn btn-sm w-full ${a.tone}`,
                disabled: a.disabled || !!busy,
                onClick: () => choose(p),
                children: busy === `plan-${p.id}` ? "Working…" : a.label
              }
            )
          ]
        },
        p.id
      );
    }) }),
    !account.billingLive && /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[12px] mt-2 mb-0", children: "Pilot mode: payments aren't turned on for this site, so plan changes apply right away with no charge." }),
    /* @__PURE__ */ jsxs(
      Sheet,
      {
        open: confirm !== null,
        onClose: () => setConfirm(null),
        title: `Move to ${confirm?.name ?? ""}?`,
        subtitle: confirm?.id === "free" ? `${current.name} stays on until ${fmtDate(account.currentPeriodEnd)}, then these switch off:` : "These switch off after the change:",
        children: [
          /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 flex flex-col gap-2 text-sm", children: losing.map((f) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx(XCircle, { size: 17, className: "text-bad shrink-0" }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("b", { children: FEATURE_INFO[f].label }),
              " — ",
              /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: FEATURE_INFO[f].blurb })
            ] })
          ] }, f)) }),
          confirm && confirm.productLimit !== null && account.usage.products > confirm.productLimit && /* @__PURE__ */ jsxs("p", { className: "text-warn text-sm mt-3 mb-0", children: [
            "You have ",
            account.usage.products,
            " products. ",
            confirm.name,
            " holds ",
            confirm.productLimit,
            "; existing ones are kept but you can't add more."
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-3 mb-0", children: "Nothing is deleted. Upgrade again any time to switch them back on." }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal", onClick: () => setConfirm(null), children: [
              "Keep ",
              current.name
            ] }),
            /* @__PURE__ */ jsxs("button", { className: "btn btn-danger", disabled: !!busy, onClick: () => confirm && commit(confirm.id), children: [
              "Move to ",
              confirm?.name
            ] })
          ] })
        ]
      }
    )
  ] });
}
function AccountDetails({ account }) {
  const { profile, onAccount } = useBusiness();
  const toast = useToast();
  const [ownerName, setOwnerName] = useState(account.ownerName);
  const [billingEmail, setBillingEmail] = useState(account.billingEmail);
  const [saving, setSaving] = useState(false);
  const dirty = ownerName !== account.ownerName || billingEmail !== account.billingEmail;
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      onAccount(await saveAccountDetails({ data: { ownerName, billingEmail } }));
      toast("Account details saved");
    } catch {
      toast("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: save, className: "pt-6 border-t border-line", "aria-labelledby": "details-title", children: [
    /* @__PURE__ */ jsx("h3", { id: "details-title", className: "text-[17px] font-bold text-royal m-0 mb-3", children: "Account details" }),
    /* @__PURE__ */ jsxs("div", { className: "grid min-[560px]:grid-cols-2 gap-x-2.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Account owner", htmlFor: "acct-owner", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "acct-owner",
          className: "field-input",
          value: ownerName,
          onChange: (e) => setOwnerName(e.target.value.slice(0, 120)),
          placeholder: "Who pays for Bintro",
          autoComplete: "name"
        }
      ) }),
      /* @__PURE__ */ jsx(Field, { label: "Billing email", htmlFor: "acct-email", children: /* @__PURE__ */ jsx(
        "input",
        {
          id: "acct-email",
          type: "email",
          className: "field-input",
          value: billingEmail,
          onChange: (e) => setBillingEmail(e.target.value.slice(0, 200)),
          placeholder: profile.email || "Where receipts go",
          autoComplete: "email"
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-2 gap-2.5 text-sm m-0 mb-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-xl px-3.5 py-2.5", children: [
        /* @__PURE__ */ jsx("dt", { className: "text-ink-2 text-[12px]", children: "Member since" }),
        /* @__PURE__ */ jsx("dd", { className: "m-0 font-semibold", children: fmtDate(account.memberSince) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-xl px-3.5 py-2.5", children: [
        /* @__PURE__ */ jsx("dt", { className: "text-ink-2 text-[12px]", children: "Billing" }),
        /* @__PURE__ */ jsx("dd", { className: "m-0 font-semibold", children: account.plan === "free" ? "None" : `${account.interval === "year" ? "Yearly" : "Monthly"}` })
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary w-full", disabled: saving || !dirty, children: saving ? "Saving…" : "Save account details" })
  ] });
}
function Billing({ account, busy, run }) {
  const toast = useToast();
  const [history, setHistory] = useState(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [portalBusy, setPortalBusy] = useState(false);
  const plan = planById(account.plan);
  const paid = account.plan !== "free";
  const trial = account.status === "trialing";
  useEffect(() => {
    getBillingHistory().then((h) => setHistory(h)).catch(() => setHistory([]));
  }, [account]);
  async function openPortal() {
    setPortalBusy(true);
    try {
      const r = await openPaymentPortal();
      if (r.ok) window.location.href = r.result;
      else toast(r.message);
    } catch {
      toast("Couldn't open the payment page. Try again.");
    } finally {
      setPortalBusy(false);
    }
  }
  async function pause() {
    if (await run("pause", () => pausePlan({ data: { months } }))) setPauseOpen(false);
  }
  async function cancel() {
    const why = [reason, note.trim()].filter(Boolean).join(": ");
    if (await run("cancel", () => cancelSubscription({ data: { reason: why } }))) {
      setCancelOpen(false);
      setReason("");
      setNote("");
    }
  }
  const resumeDate = /* @__PURE__ */ new Date();
  resumeDate.setMonth(resumeDate.getMonth() + months);
  const nextCharge = paid && account.status === "active" && !account.cancelAtPeriodEnd ? { amount: priceFor(plan, account.interval, account.founding), on: account.currentPeriodEnd } : trial && account.paymentMethod ? { amount: priceFor(plan, account.interval, account.founding), on: account.trialEndsAt } : null;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6", children: [
    !account.billingLive && /* @__PURE__ */ jsxs("details", { className: "bg-gold-tint rounded-2xl px-4 py-3 text-sm", children: [
      /* @__PURE__ */ jsx("summary", { className: "cursor-pointer font-semibold text-gold-ink", children: "Pilot mode — no card is charged. How to turn on payments" }),
      /* @__PURE__ */ jsxs("ol", { className: "pl-5 mt-2 mb-1 flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "In",
          " ",
          /* @__PURE__ */ jsxs("a", { href: "https://dashboard.stripe.com/products", target: "_blank", rel: "noreferrer", className: "text-action font-semibold", children: [
            "Stripe ",
            /* @__PURE__ */ jsx(ExternalLink, { size: 12, className: "inline" })
          ] }),
          ", create Plus and Premium products, each with a monthly and a yearly price."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "In Netlify → Project configuration → Environment variables, add ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_SECRET_KEY" }),
          ",",
          " ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_PRICE_PLUS_MONTHLY" }),
          ", ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_PRICE_PLUS_YEARLY" }),
          ",",
          " ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_PRICE_PREMIUM_MONTHLY" }),
          " and ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_PRICE_PREMIUM_YEARLY" }),
          "."
        ] }),
        /* @__PURE__ */ jsxs("li", { children: [
          "Add a webhook endpoint for ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px] break-all", children: "/api/billing/webhook" }),
          " (subscription and invoice events) and save its signing secret as ",
          /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "STRIPE_WEBHOOK_SECRET" }),
          "."
        ] }),
        /* @__PURE__ */ jsx("li", { children: "Turn on the Stripe customer portal so owners can update their card, then redeploy." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "pm-title", children: [
      /* @__PURE__ */ jsx("h3", { id: "pm-title", className: "text-[17px] font-bold text-royal m-0 mb-2", children: "Payment method" }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 border border-line rounded-2xl p-4", children: [
        /* @__PURE__ */ jsx("span", { className: "w-12 h-9 rounded-lg bg-surface grid place-items-center shrink-0", children: /* @__PURE__ */ jsx(CreditCard, { size: 20, className: "text-ink-2" }) }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 text-sm", children: account.paymentMethod ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { className: "capitalize", children: account.paymentMethod.brand }),
          " •••• ",
          account.paymentMethod.last4,
          /* @__PURE__ */ jsxs("span", { className: "block text-ink-2 text-[13px]", children: [
            "Expires ",
            String(account.paymentMethod.expMonth).padStart(2, "0"),
            "/",
            account.paymentMethod.expYear
          ] })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("b", { children: "No card on file" }),
          /* @__PURE__ */ jsx("span", { className: "block text-ink-2 text-[13px]", children: account.billingLive ? "You'll add one securely at checkout when you pick a paid plan." : "Not needed in pilot mode." })
        ] }) }),
        account.billingLive && account.paymentMethod && /* @__PURE__ */ jsx("button", { className: "btn btn-tonal btn-sm shrink-0", disabled: portalBusy, onClick: openPortal, children: portalBusy ? "Opening…" : "Update" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2.5 mt-2.5 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-xl px-3.5 py-2.5", children: [
          /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[12px] m-0", children: "Next payment" }),
          /* @__PURE__ */ jsx("p", { className: "m-0 font-semibold", children: nextCharge ? `${centsLabel(nextCharge.amount)} on ${fmtDate(nextCharge.on)}` : "None scheduled" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-xl px-3.5 py-2.5", children: [
          /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[12px] m-0", children: "Plan" }),
          /* @__PURE__ */ jsxs("p", { className: "m-0 font-semibold", children: [
            plan.name,
            paid && ` · ${centsLabel(priceFor(plan, account.interval, account.founding))}/${account.interval}`
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "manage-title", children: [
      /* @__PURE__ */ jsx("h3", { id: "manage-title", className: "text-[17px] font-bold text-royal m-0 mb-2", children: "Pause or cancel" }),
      !paid ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm bg-surface rounded-2xl px-4 py-4 m-0", children: "You're on Free, so there's nothing to pause or cancel. Your data stays as long as you like." }) : /* @__PURE__ */ jsxs("div", { className: "grid min-[520px]:grid-cols-2 gap-2.5", children: [
        account.status === "paused" ? /* @__PURE__ */ jsxs(
          "button",
          {
            className: "flex items-start gap-3 text-left border border-good bg-good-tint rounded-2xl p-4 cursor-pointer",
            disabled: !!busy,
            onClick: () => run("resume", () => resumePlan()),
            children: [
              /* @__PURE__ */ jsx(PlayCircle, { size: 24, className: "text-good shrink-0" }),
              /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                /* @__PURE__ */ jsx("b", { className: "block text-[15px]", children: busy === "resume" ? "Resuming…" : "Resume now" }),
                /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
                  "Paused until ",
                  fmtDate(account.pausedUntil),
                  ". Switch everything back on today."
                ] })
              ] })
            ]
          }
        ) : /* @__PURE__ */ jsxs(
          "button",
          {
            className: "flex items-start gap-3 text-left border border-line bg-white rounded-2xl p-4 cursor-pointer hover:border-warn disabled:opacity-50 disabled:cursor-not-allowed",
            disabled: trial || !!busy,
            onClick: () => setPauseOpen(true),
            children: [
              /* @__PURE__ */ jsx(PauseCircle, { size: 24, className: "text-warn shrink-0" }),
              /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                /* @__PURE__ */ jsx("b", { className: "block text-[15px]", children: "Pause billing" }),
                /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: trial ? "Available once you’re on a paid plan." : "Take 1–3 months off. No charges, data kept, restarts on its own." })
              ] })
            ]
          }
        ),
        account.cancelAtPeriodEnd ? /* @__PURE__ */ jsxs(
          "button",
          {
            className: "flex items-start gap-3 text-left border border-good bg-good-tint rounded-2xl p-4 cursor-pointer",
            disabled: !!busy,
            onClick: () => run("resume", () => resumePlan()),
            children: [
              /* @__PURE__ */ jsx(PlayCircle, { size: 24, className: "text-good shrink-0" }),
              /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                /* @__PURE__ */ jsxs("b", { className: "block text-[15px]", children: [
                  "Keep ",
                  plan.name
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
                  "Cancellation is set for ",
                  fmtDate(account.currentPeriodEnd),
                  ". Undo it."
                ] })
              ] })
            ]
          }
        ) : /* @__PURE__ */ jsxs(
          "button",
          {
            className: "flex items-start gap-3 text-left border border-line bg-white rounded-2xl p-4 cursor-pointer hover:border-bad",
            disabled: !!busy,
            onClick: () => setCancelOpen(true),
            children: [
              /* @__PURE__ */ jsx(XCircle, { size: 24, className: "text-bad shrink-0" }),
              /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                /* @__PURE__ */ jsx("b", { className: "block text-[15px]", children: trial ? "End trial" : `Cancel ${plan.name}` }),
                /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: trial ? "Move to Free now. No charge." : `Keeps working until ${fmtDate(account.currentPeriodEnd)}, then moves to Free.` })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "history-title", children: [
      /* @__PURE__ */ jsxs("h3", { id: "history-title", className: "text-[17px] font-bold text-royal m-0 mb-2 flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Receipt, { size: 17, className: "text-ink-2" }),
        "Billing history"
      ] }),
      history === null ? /* @__PURE__ */ jsx("div", { className: "bg-surface rounded-2xl p-4", children: /* @__PURE__ */ jsx("div", { className: "skel w-[70%]" }) }) : history.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm bg-surface rounded-2xl px-4 py-4 m-0", children: "No billing activity yet." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line", children: history.map((h) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 px-3.5 py-2.5 text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[12px] w-[88px] shrink-0", children: fmtDate(h.createdAt) }),
        /* @__PURE__ */ jsx("span", { className: "flex-1 min-w-0", children: h.detail }),
        h.amountCents > 0 && /* @__PURE__ */ jsx("b", { className: "num shrink-0", children: centsLabel(h.amountCents) }),
        h.url && /* @__PURE__ */ jsx("a", { href: h.url, target: "_blank", rel: "noreferrer", className: "text-action shrink-0", "aria-label": "View invoice", children: /* @__PURE__ */ jsx(ExternalLink, { size: 15 }) })
      ] }, h.id)) })
    ] }),
    /* @__PURE__ */ jsxs(
      Sheet,
      {
        open: pauseOpen,
        onClose: () => setPauseOpen(false),
        title: "Pause billing",
        subtitle: "Great for slow seasons, renovations or time off.",
        children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2 mb-4", role: "radiogroup", "aria-label": "Pause length", children: PAUSE_OPTIONS.map((m) => /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              role: "radio",
              "aria-checked": months === m,
              "aria-pressed": months === m,
              className: "chip !rounded-xl !py-3 justify-center",
              onClick: () => setMonths(m),
              children: [
                m,
                " month",
                m === 1 ? "" : "s"
              ]
            },
            m
          )) }),
          /* @__PURE__ */ jsxs("ul", { className: "list-none m-0 p-0 flex flex-col gap-2 text-sm", children: [
            /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Check, { size: 16, className: "text-good shrink-0 mt-0.5" }),
              " No charges until",
              " ",
              /* @__PURE__ */ jsx("b", { children: resumeDate.toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }) })
            ] }),
            /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Check, { size: 16, className: "text-good shrink-0 mt-0.5" }),
              " Products, history and settings are all kept"
            ] }),
            /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Check, { size: 16, className: "text-good shrink-0 mt-0.5" }),
              " Scanning keeps working on Free features"
            ] }),
            /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(Check, { size: 16, className: "text-good shrink-0 mt-0.5" }),
              " ",
              plan.name,
              " restarts on its own, or resume any time"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-tonal", onClick: () => setPauseOpen(false), children: "Never mind" }),
            /* @__PURE__ */ jsxs("button", { className: "btn btn-primary", disabled: !!busy, onClick: pause, children: [
              /* @__PURE__ */ jsx(PauseCircle, { size: 18 }),
              busy === "pause" ? "Pausing…" : `Pause ${months} month${months === 1 ? "" : "s"}`
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs(
      Sheet,
      {
        open: cancelOpen,
        onClose: () => setCancelOpen(false),
        title: trial ? "End your trial?" : `Cancel ${plan.name}?`,
        subtitle: trial ? "You move to Free right away. Nothing is charged and nothing is deleted." : `${plan.name} stays on until ${fmtDate(account.currentPeriodEnd)}. After that you move to Free — nothing is deleted.`,
        children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold m-0 mb-2", children: "What's the main reason? (optional)" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2 mb-3", role: "group", "aria-label": "Reason", children: CANCEL_REASONS.map((r) => /* @__PURE__ */ jsx("button", { type: "button", className: "chip", "aria-pressed": reason === r, onClick: () => setReason(reason === r ? "" : r), children: r }, r)) }),
          /* @__PURE__ */ jsx(Field, { label: "Anything we could do better?", htmlFor: "cancel-note", children: /* @__PURE__ */ jsx(
            "textarea",
            {
              id: "cancel-note",
              rows: 2,
              className: "field-input resize-none",
              value: note,
              onChange: (e) => setNote(e.target.value.slice(0, 400))
            }
          ) }),
          !trial && account.status !== "paused" && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              className: "w-full flex items-center gap-3 text-left bg-gold-tint rounded-2xl px-4 py-3 border-0 cursor-pointer mb-1",
              onClick: () => {
                setCancelOpen(false);
                setPauseOpen(true);
              },
              children: [
                /* @__PURE__ */ jsx(Sparkles, { size: 18, className: "text-gold-ink shrink-0" }),
                /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
                  /* @__PURE__ */ jsx("b", { children: "Just need a break?" }),
                  " Pause for up to 3 months instead and keep everything ready to go."
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(SheetActions, { children: [
            /* @__PURE__ */ jsxs("button", { className: "btn btn-tonal", onClick: () => setCancelOpen(false), children: [
              "Keep ",
              plan.name
            ] }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-danger", disabled: !!busy, onClick: cancel, children: busy === "cancel" ? "Canceling…" : trial ? "End trial" : "Cancel plan" })
          ] })
        ]
      }
    )
  ] });
}
function FoundingOffer({ account, busy, run }) {
  const [interval, setInterval2] = useState("month");
  const left = account.pilotEndsAt ? daysUntil(account.pilotEndsAt) : null;
  const urgent = left !== null && left <= 30;
  const paid = PLANS.filter((p) => p.id !== "free");
  if (account.lockedIn) {
    const plan = planById(account.lockedIn.plan);
    return /* @__PURE__ */ jsxs("section", { className: "rounded-2xl border border-good bg-good-tint/60 p-4 mb-6", children: [
      /* @__PURE__ */ jsxs("h3", { className: "m-0 text-[16px] font-extrabold flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Check, { size: 18, className: "text-good" }),
        " Founding rate locked in"
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-sm", children: [
        "Bintro ",
        plan.name,
        " at ",
        /* @__PURE__ */ jsxs("b", { children: [
          centsLabel(priceFor(plan, account.lockedIn.interval, true)),
          "/",
          account.lockedIn.interval
        ] }),
        ", yours for life. Nothing is charged until ",
        fmtDate(account.lockedIn.startsAt),
        "."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [
        paid.filter((p) => p.id !== account.lockedIn.plan).map((p) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "btn btn-tonal btn-sm",
            disabled: !!busy,
            onClick: () => run(`lock-${p.id}`, () => lockInFounding({ data: { plan: p.id, interval: account.lockedIn.interval } })),
            children: [
              "Switch to ",
              p.name,
              " (",
              centsLabel(priceFor(p, account.lockedIn.interval, true)),
              "/",
              account.lockedIn.interval,
              ")"
            ]
          },
          p.id
        )),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "btn btn-text btn-sm",
            disabled: !!busy,
            onClick: () => run("unlock", () => cancelSubscription({ data: { reason: "Undo founding rate lock-in" } })),
            children: busy === "unlock" ? "Working…" : "Undo lock-in"
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("section", { className: `rounded-2xl border p-4 mb-6 ${urgent ? "border-gold bg-gold-tint" : "border-line bg-white"}`, children: [
    /* @__PURE__ */ jsx("p", { className: "m-0 text-[12px] font-bold uppercase tracking-wider text-gold-ink", children: "Pilot tester founding rate" }),
    /* @__PURE__ */ jsx("h3", { className: "m-0 mt-0.5 text-[18px] font-extrabold", children: urgent ? `Your free pilot ends ${fmtDate(account.pilotEndsAt)}. Keep your tools.` : "Lock in your founding rate, for life" }),
    /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-sm text-ink-2", children: [
      "As a pilot tester you keep these prices as long as you stay subscribed. Everyone else pays the standard ",
      centsLabel(planById("plus").monthlyCents),
      " and",
      " ",
      centsLabel(planById("premium").monthlyCents),
      " a month.",
      account.pilotEndsAt ? ` Lock in now and nothing is charged until ${fmtDate(account.pilotEndsAt)}.` : " Your 18 free months start with your first Scan In."
    ] }),
    /* @__PURE__ */ jsx("div", { className: "inline-flex p-1 rounded-full bg-surface mt-3", role: "group", "aria-label": "Billing interval", children: ["month", "year"].map((i) => /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-pressed": interval === i,
        onClick: () => setInterval2(i),
        className: `px-4 py-1.5 rounded-full border-0 text-sm font-semibold cursor-pointer ${interval === i ? "bg-white text-ink shadow-card" : "bg-transparent text-ink-2"}`,
        children: i === "month" ? "Monthly" : "Yearly"
      },
      i
    )) }),
    /* @__PURE__ */ jsx("div", { className: "grid min-[520px]:grid-cols-2 gap-3 mt-3", children: paid.map((p) => {
      const price = priceFor(p, interval, true);
      const standard = priceFor(p, interval);
      return /* @__PURE__ */ jsxs("div", { className: `rounded-xl border p-3 ${p.id === "premium" ? "border-gold bg-white" : "border-line bg-white"}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "font-extrabold flex items-center gap-1.5", children: [
          p.id === "premium" && /* @__PURE__ */ jsx(Crown, { size: 16, className: "text-gold-ink" }),
          p.name
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1", children: [
          /* @__PURE__ */ jsx("span", { className: "num text-[24px] font-extrabold text-royal", children: centsLabel(price) }),
          /* @__PURE__ */ jsxs("span", { className: "text-ink-2 text-sm", children: [
            "/",
            interval
          ] }),
          /* @__PURE__ */ jsx("span", { className: "ml-2 text-[13px] text-ink-2 line-through", children: centsLabel(standard) })
        ] }),
        account.billingLive && account.pilotEndsAt && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: `btn btn-sm mt-2 w-full ${p.id === "premium" ? "btn-gold" : "btn-primary"}`,
            disabled: !!busy,
            onClick: () => run(`lock-${p.id}`, () => lockInFounding({ data: { plan: p.id, interval } })),
            children: busy === `lock-${p.id}` ? "Opening checkout…" : `Lock in ${p.name}`
          }
        )
      ] }, p.id);
    }) }),
    !account.billingLive && /* @__PURE__ */ jsx("p", { className: "m-0 mt-3 text-[13px] text-ink-2", children: "The lock-in button opens here before your pilot ends." })
  ] });
}
const SECTIONS = [
  { id: "profile", label: "Business profile" },
  { id: "appearance", label: "Look & feel" },
  { id: "account", label: "Account & billing" },
  { id: "categories", label: "Categories" },
  { id: "team", label: "Team" },
  { id: "scanner", label: "Scanner & Bluetooth" },
  { id: "import", label: "Import inventory" },
  { id: "integrations", label: "Connections" },
  { id: "setup", label: "Setup check" }
];
function SettingsView({
  section,
  onSection,
  accountPanel,
  onAccountPanel,
  profile,
  onProfile,
  team,
  onTeam,
  products,
  staffName,
  onStaffName,
  notice,
  onDismissNotice,
  onChanged
}) {
  return /* @__PURE__ */ jsxs("div", { className: "max-w-[680px]", children: [
    /* @__PURE__ */ jsx(PageHead, { title: "Settings", lead: "Make Bintro fit your business. Changes are shared with every device." }),
    notice && /* @__PURE__ */ jsxs(
      "div",
      {
        role: "status",
        className: `flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 text-sm ${notice.tone === "good" ? "bg-good-tint text-good" : "bg-bad-tint text-bad"}`,
        children: [
          notice.tone === "good" ? /* @__PURE__ */ jsx(Check, { size: 18, className: "shrink-0 mt-0.5" }) : /* @__PURE__ */ jsx(X, { size: 18, className: "shrink-0 mt-0.5" }),
          /* @__PURE__ */ jsx("span", { className: "flex-1 font-semibold", children: notice.text }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm !p-0", onClick: onDismissNotice, "aria-label": "Dismiss", children: /* @__PURE__ */ jsx(X, { size: 16 }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "flex gap-2 overflow-x-auto pb-1 mb-5", role: "group", "aria-label": "Settings section", children: SECTIONS.map((s) => /* @__PURE__ */ jsx("button", { className: "chip", "aria-pressed": section === s.id, onClick: () => onSection(s.id), children: s.label }, s.id)) }),
    section === "profile" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(ProfileForm, { profile, onProfile, productCategories: products.map((p) => p.category) }),
      /* @__PURE__ */ jsx(ReportSettings, { profile, onProfile })
    ] }),
    section === "appearance" && /* @__PURE__ */ jsx(AppearanceSettings, { profile, onProfile }),
    section === "scanner" && /* @__PURE__ */ jsx(ScannerSettings, {}),
    section === "setup" && /* @__PURE__ */ jsx(SetupCheck, {}),
    section === "account" && /* @__PURE__ */ jsx(AccountView, { panel: accountPanel, onPanel: onAccountPanel }),
    section === "categories" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(CategoryCleanup, { onChanged }),
      /* @__PURE__ */ jsx(CategoryList, { onChanged }),
      /* @__PURE__ */ jsx(CategoryManager, { productCategories: products.map((p) => p.category) })
    ] }),
    section === "team" && /* @__PURE__ */ jsx(TeamManager, { team, onTeam, staffName, onStaffName }),
    section === "import" && /* @__PURE__ */ jsx(PlanGate, { feature: "import", children: /* @__PURE__ */ jsx(ImportView, { products, staffName, onChanged }) }),
    section === "integrations" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Integrations, { onChanged }),
      /* @__PURE__ */ jsx(ConnectionDirectory, {})
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "mt-10 pt-4 border-t border-line flex flex-wrap gap-x-4 gap-y-1 text-[13px]", "aria-label": "Legal", children: LINKS.map((l) => /* @__PURE__ */ jsx("a", { href: l.href, target: "_blank", rel: "noreferrer", className: "text-ink-2 font-semibold no-underline", children: l.label }, l.href)) })
  ] });
}
const REPORTS = [
  {
    key: "weeklyReportEmail",
    kind: "weekly",
    title: "Weekly best sellers",
    body: "Mondays: what sold very well last week, with trends and anything to stock deeper on."
  },
  {
    key: "monthlyReportEmail",
    kind: "monthly",
    title: "Monthly slow movers & prices",
    body: "On the 1st: color, retail and other stock that barely moved, the cash tied up, and prices due for an update."
  },
  {
    key: "fastMoverAlertEmail",
    kind: "fast",
    title: "Fast-mover alerts",
    body: "Within a few hours of an item selling out fast: how much to buy in bulk and the predicted cost at your latest prices."
  }
];
function ReportSettings({ profile, onProfile }) {
  const toast = useToast();
  const { can } = useBusiness();
  const [sending, setSending] = useState(null);
  const recipient = profile.email || profile.orderEmail;
  async function toggle(key2, value) {
    onProfile({ ...profile, [key2]: value });
    try {
      onProfile(await updateBusinessProfile({ data: { [key2]: value } }));
    } catch {
      onProfile({ ...profile, [key2]: !value });
      toast("Couldn't save that setting");
    }
  }
  async function sendNow(kind) {
    setSending(kind);
    try {
      const r = await sendInsightReportNow({ data: { kind } });
      toast(r.message);
    } catch {
      toast("Couldn't send the report. Try again.");
    } finally {
      setSending(null);
    }
  }
  return /* @__PURE__ */ jsxs("section", { className: "mt-8 pt-6 border-t border-line", "aria-labelledby": "reports-title", children: [
    /* @__PURE__ */ jsxs("h2", { id: "reports-title", className: "text-[18px] font-bold text-royal m-0 mb-1 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Mail, { size: 18, className: "text-gold-ink" }),
      " Reports & alerts"
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-[13px] mt-0 mb-3", children: [
      "AI-written summaries of your sales, emailed to ",
      recipient ? /* @__PURE__ */ jsx("b", { className: "text-ink", children: recipient }) : "the email above",
      ". The same insights pop up in the app."
    ] }),
    !can("insights") ? /* @__PURE__ */ jsx(UpgradeCard, { feature: "insights", compact: true }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 border border-line rounded-2xl divide-y divide-line", children: REPORTS.map((r) => /* @__PURE__ */ jsxs("li", { className: "p-3.5", children: [
      /* @__PURE__ */ jsxs("label", { className: "flex items-start justify-between gap-3 cursor-pointer", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
          /* @__PURE__ */ jsx("b", { className: "block", children: r.title }),
          /* @__PURE__ */ jsx("span", { className: "text-ink-2 text-[13px]", children: r.body })
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: profile[r.key],
            onChange: (e) => toggle(r.key, e.target.checked),
            className: "w-5 h-5 mt-0.5 accent-[var(--color-action)] shrink-0"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "btn btn-text btn-sm !px-0 mt-1",
          disabled: sending !== null,
          onClick: () => sendNow(r.kind),
          children: sending === r.kind ? "Sending…" : "Send one now"
        }
      )
    ] }, r.key)) })
  ] });
}
function ProfileForm({
  profile,
  onProfile,
  productCategories
}) {
  const toast = useToast();
  const { categories } = useBusiness();
  const [setupOpen, setSetupOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [budget, setBudget] = useState(profile.monthlyBudgetCents ? centsToDollars(profile.monthlyBudgetCents) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key2) => (e) => setDraft((d) => ({ ...d, [key2]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Add your business name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await updateBusinessProfile({
        data: {
          name: draft.name,
          businessType: draft.businessType,
          email: draft.email,
          phone: draft.phone,
          address: draft.address,
          website: draft.website,
          orderEmail: draft.orderEmail,
          monthlyBudgetCents: Math.max(0, Math.round((Number(budget) || 0) * 100))
        }
      });
      const typeChanged = saved.businessType !== profile.businessType;
      onProfile(saved);
      setDraft(saved);
      toast("Business profile saved");
      if (typeChanged || categories.length === 0) setTimeout(() => setSetupOpen(true), 300);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  return /* @__PURE__ */ jsxs("form", { onSubmit: save, noValidate: true, children: [
    /* @__PURE__ */ jsx(Field, { label: "Business name", htmlFor: "bp-name", children: /* @__PURE__ */ jsx(
      "input",
      {
        id: "bp-name",
        className: "field-input",
        value: draft.name,
        onChange: set("name"),
        placeholder: "e.g. Main Street Salon",
        autoComplete: "organization"
      }
    ) }),
    /* @__PURE__ */ jsx(Field, { label: "What kind of business?", children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 min-[560px]:grid-cols-3 gap-2", role: "radiogroup", "aria-label": "Business type", children: selectableBusinessTypes(profile.businessType).map((t) => {
      const on = draft.businessType === t.id;
      return /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": on,
          className: "chip !rounded-xl !py-2.5 text-left !whitespace-normal",
          "aria-pressed": on,
          onClick: () => setDraft((d) => ({ ...d, businessType: t.id })),
          children: [
            /* @__PURE__ */ jsx("span", { className: "block", children: t.label }),
            /* @__PURE__ */ jsx("span", { className: `block text-[12px] font-normal ${on ? "text-white/75" : "text-ink-2"}`, children: t.legacy ? "No longer offered" : t.blurb })
          ]
        },
        t.id
      );
    }) }) }),
    /* @__PURE__ */ jsxs("p", { className: "text-ink-2 text-[13px] -mt-1 mb-4", children: [
      "Tunes AI label reading, price estimates, sizes and the",
      " ",
      /* @__PURE__ */ jsxs("button", { type: "button", className: "border-0 bg-transparent p-0 text-action font-semibold cursor-pointer", onClick: () => setSetupOpen(true), children: [
        "category suggestions for a ",
        businessTypeById(profile.businessType).label.toLowerCase()
      ] }),
      "."
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid min-[560px]:grid-cols-2 gap-x-2.5", children: [
      /* @__PURE__ */ jsx(Field, { label: "Email", htmlFor: "bp-email", children: /* @__PURE__ */ jsx("input", { id: "bp-email", type: "email", className: "field-input", value: draft.email, onChange: set("email"), autoComplete: "email" }) }),
      /* @__PURE__ */ jsx(Field, { label: "Phone", htmlFor: "bp-phone", children: /* @__PURE__ */ jsx("input", { id: "bp-phone", type: "tel", className: "field-input", value: draft.phone, onChange: set("phone"), autoComplete: "tel" }) })
    ] }),
    /* @__PURE__ */ jsx(Field, { label: "Address", htmlFor: "bp-address", children: /* @__PURE__ */ jsx(
      "textarea",
      {
        id: "bp-address",
        rows: 2,
        className: "field-input resize-none",
        value: draft.address,
        onChange: set("address"),
        autoComplete: "street-address"
      }
    ) }),
    /* @__PURE__ */ jsx(Field, { label: "Website", htmlFor: "bp-website", children: /* @__PURE__ */ jsx(
      "input",
      {
        id: "bp-website",
        type: "url",
        inputMode: "url",
        className: "field-input",
        value: draft.website,
        onChange: set("website"),
        placeholder: "https://",
        autoComplete: "url"
      }
    ) }),
    /* @__PURE__ */ jsx(Field, { label: "Send restock lists and orders to", htmlFor: "bp-order-email", children: /* @__PURE__ */ jsx(
      "input",
      {
        id: "bp-order-email",
        type: "email",
        className: "field-input",
        value: draft.orderEmail,
        onChange: set("orderEmail"),
        placeholder: draft.email || "Same as the email above"
      }
    ) }),
    /* @__PURE__ */ jsx(Field, { label: "Monthly budget for stock and supplies", htmlFor: "bp-budget", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2", children: "$" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "bp-budget",
          type: "number",
          inputMode: "decimal",
          min: 0,
          step: "1",
          className: "field-input num !pl-7",
          value: budget,
          onChange: (e) => setBudget(e.target.value),
          placeholder: "0"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] -mt-1 mb-0", children: "Used every month unless you set a different amount on the Budget tab." }),
    error && /* @__PURE__ */ jsx("p", { className: "text-bad text-sm mt-3 mb-0", children: error }),
    /* @__PURE__ */ jsx("button", { type: "submit", className: "btn btn-primary w-full mt-5", disabled: saving, children: saving ? "Saving…" : "Save profile" }),
    /* @__PURE__ */ jsx(CategorySetupSheet, { open: setupOpen, onClose: () => setSetupOpen(false), productCategories })
  ] });
}
function TeamManager({
  team,
  onTeam,
  staffName,
  onStaffName
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    const next = name.trim();
    if (!next) return;
    setBusy(true);
    try {
      onTeam(await addTeamMember({ data: { name: next } }));
      setName("");
      toast(`${next} added to the team`);
    } catch (err) {
      toast(err instanceof Error && err.message.includes("plan") ? err.message : "Could not add. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(member) {
    try {
      onTeam(await removeTeamMember({ data: { id: member.id } }));
      if (member.name === staffName) onStaffName("");
      toast(`${member.name} removed`, async () => {
        onTeam(await addTeamMember({ data: { name: member.name } }));
      });
    } catch {
      toast("Could not remove. Try again.");
    }
  }
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("form", { onSubmit: add, className: "flex gap-2 mb-4", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "team-name", className: "sr-only", children: "Team member name" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "team-name",
          className: "field-input",
          value: name,
          onChange: (e) => setName(e.target.value.slice(0, 60)),
          placeholder: "Add a team member",
          autoComplete: "off"
        }
      ),
      /* @__PURE__ */ jsxs("button", { type: "submit", className: "btn btn-primary shrink-0", disabled: busy || !name.trim(), children: [
        /* @__PURE__ */ jsx(UserPlus, { size: 18 }),
        "Add"
      ] })
    ] }),
    team.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2 bg-surface rounded-2xl px-4 py-5 text-center m-0", children: "No one saved yet. Add your team so everyone can pick their name with one tap." }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 bg-surface rounded-2xl px-4", children: team.map((m) => /* @__PURE__ */ jsxs("li", { className: "flex items-center gap-3 py-2.5 border-b border-line last:border-b-0", children: [
      /* @__PURE__ */ jsx("span", { className: "w-9 h-9 rounded-full bg-action text-white text-[13px] font-bold grid place-items-center shrink-0", children: deriveInitials(m.name) }),
      /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0 font-semibold truncate", children: [
        m.name,
        m.name === staffName && /* @__PURE__ */ jsx("span", { className: "ml-2 text-[12px] font-semibold text-good", children: "Working now" })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: "btn btn-text btn-sm !text-bad",
          onClick: () => remove(m),
          "aria-label": `Remove ${m.name}`,
          children: [
            /* @__PURE__ */ jsx(Trash2, { size: 16 }),
            "Remove"
          ]
        }
      )
    ] }, m.id)) }),
    /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-[13px] mt-3 mb-0", children: "Removing someone keeps their past scans and expenses in the history." })
  ] });
}
const PROVIDER_INFO = {
  square: {
    name: "Square POS",
    blurb: "Do inventory once, in Bintro. Deliveries, counts and products used in services update Square automatically, and Square sales come off Bintro’s counts every 15 minutes.",
    envVars: ["SQUARE_APPLICATION_ID", "SQUARE_APPLICATION_SECRET"],
    envName: "SQUARE_ENVIRONMENT",
    dashboard: "https://developer.squareup.com/apps",
    dashboardLabel: "Square Developer dashboard"
  },
  quickbooks: {
    name: "QuickBooks Online",
    blurb: "Send expenses and each month’s stock purchases to QuickBooks so your books match the Budget tab.",
    envVars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"],
    envName: "QUICKBOOKS_ENVIRONMENT",
    dashboard: "https://developer.intuit.com/app/developer/dashboard",
    dashboardLabel: "Intuit Developer dashboard"
  }
};
function SquareRetailPicker() {
  const toast = useToast();
  const [categories, setCategories] = useState(null);
  const [chosen, setChosen] = useState(false);
  const [picked, setPicked] = useState(/* @__PURE__ */ new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function apply(r) {
    setCategories(r.categories);
    setChosen(r.chosen);
    setPicked(new Set(r.categories.filter((c) => c.retail).map((c) => c.id)));
  }
  useEffect(() => {
    getSquareRetailCategories().then((r) => r.ok ? apply(r.result) : setError(r.message)).catch(() => setError("Could not load your Square categories."));
  }, []);
  const dirty = categories !== null && (!chosen || categories.some((c) => c.retail !== picked.has(c.id)));
  async function save() {
    setSaving(true);
    try {
      const r = await setSquareRetailCategories({ data: { ids: [...picked] } });
      if (r.ok) {
        apply(r.result);
        toast(`${picked.size} retail categor${picked.size === 1 ? "y" : "ies"} saved`);
      } else toast(r.message);
    } catch {
      toast("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }
  if (error) return /* @__PURE__ */ jsx("p", { className: "text-sm text-bad m-0 mb-3", children: error });
  if (categories === null) return /* @__PURE__ */ jsx("div", { className: "skel w-[50%] mb-3" });
  return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-xl px-3.5 py-3 mb-3", children: [
    /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold m-0", children: "Which Square categories are retail?" }),
    /* @__PURE__ */ jsx("p", { className: "text-[12px] text-ink-2 m-0 mt-0.5 mb-2", children: "Only items in these categories come into Bintro and stay in step. Services and everything else stay in Square untouched, and Bintro never adds items to Square." }),
    categories.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-[13px] text-ink-2 m-0", children: "No categories in Square yet. Add a Retail category to your items in Square first." }) : /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: categories.map((c) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        className: "chip !px-2.5 !py-1 !text-[13px]",
        "aria-pressed": picked.has(c.id),
        onClick: () => setPicked((prev) => {
          const next = new Set(prev);
          if (next.has(c.id)) next.delete(c.id);
          else next.add(c.id);
          return next;
        }),
        children: [
          picked.has(c.id) && /* @__PURE__ */ jsx(Check, { size: 13 }),
          c.name
        ]
      },
      c.id
    )) }),
    dirty && categories.length > 0 && /* @__PURE__ */ jsx("button", { className: "btn btn-primary btn-sm", disabled: saving, onClick: save, children: saving ? "Saving…" : chosen ? "Save retail categories" : "Confirm retail categories" })
  ] });
}
function Integrations({ onChanged }) {
  const toast = useToast();
  const { can } = useBusiness();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
    getIntegrations().then((s) => setStatus(s)).catch(() => setStatus([]));
  }, []);
  async function run(key2, fn, done) {
    setBusy(key2);
    try {
      const r = await fn();
      if (r.ok) {
        toast(done(r.result));
        await onChanged();
        setStatus(await getIntegrations());
      } else {
        toast(r.message);
      }
    } catch {
      toast("Something went wrong. Try again.");
    } finally {
      setBusy("");
    }
  }
  async function onDisconnect(provider) {
    if (!window.confirm(`Disconnect ${PROVIDER_INFO[provider].name}? Nothing already imported is removed.`)) return;
    setStatus(await disconnect({ data: { provider } }));
    toast(`${PROVIDER_INFO[provider].name} disconnected`);
  }
  if (status === null) {
    return /* @__PURE__ */ jsxs("div", { className: "bg-surface rounded-2xl p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "skel w-[60%]" }),
      /* @__PURE__ */ jsx("div", { className: "skel w-[40%]" })
    ] });
  }
  return /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-3.5", children: status.map((s) => {
    const info = PROVIDER_INFO[s.provider];
    return /* @__PURE__ */ jsxs("section", { className: "bg-white border border-line rounded-2xl p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3 mb-1", children: [
        /* @__PURE__ */ jsxs("h3", { className: "m-0 text-[17px] font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Plug, { size: 18, className: "text-ink-2" }),
          info.name
        ] }),
        /* @__PURE__ */ jsx(
          "span",
          {
            className: `text-[12px] font-bold rounded-full px-2.5 py-1 ${s.connected ? "bg-good-tint text-good" : "bg-surface text-ink-2"}`,
            children: s.connected ? "Connected" : s.expired ? "Reconnect needed" : s.configured ? "Not connected" : "Needs setup"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-ink-2 text-sm mt-0 mb-3", children: info.blurb }),
      !can(s.provider) ? /* @__PURE__ */ jsx(UpgradeCard, { feature: s.provider, compact: true }) : s.connected ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("p", { className: "text-sm m-0 mb-3", children: [
          s.accountName ? /* @__PURE__ */ jsx("b", { children: s.accountName }) : "Account linked",
          s.sandbox && /* @__PURE__ */ jsx("span", { className: "text-warn", children: " · sandbox" }),
          s.lastSyncAt && /* @__PURE__ */ jsxs("span", { className: "text-ink-2", children: [
            " · last sync ",
            timeAgo(s.lastSyncAt)
          ] })
        ] }),
        s.inventory?.needsReconnect ? /* @__PURE__ */ jsxs("div", { className: "bg-warn-tint rounded-xl px-3.5 py-2.5 text-sm mb-3", children: [
          /* @__PURE__ */ jsx("b", { children: "Reconnect to keep Square’s stock in step." }),
          " This connection was made before Bintro could update Square’s inventory. Tap Disconnect, then Connect again and allow the new permission."
        ] }) : s.inventory ? /* @__PURE__ */ jsxs("p", { className: "text-sm m-0 mb-3 text-ink-2", children: [
          s.inventory.pending > 0 ? `${s.inventory.pending} stock change${s.inventory.pending === 1 ? "" : "s"} waiting to reach Square` : "Square’s stock is up to date with Bintro",
          s.inventory.failed > 0 && /* @__PURE__ */ jsxs("span", { className: "text-bad", children: [
            " ",
            "· ",
            s.inventory.failed,
            " rejected by Square",
            s.inventory.lastError ? `: ${s.inventory.lastError}` : ""
          ] })
        ] }) : null,
        s.provider === "square" && !s.inventory?.needsReconnect && /* @__PURE__ */ jsx(SquareRetailPicker, {}),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          s.provider === "square" ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-tonal btn-sm",
                disabled: !!busy,
                onClick: () => run(
                  "import",
                  () => squareImportCatalog(),
                  (r) => `Imported ${r.created} new retail item${r.created === 1 ? "" : "s"}, linked ${r.updated}${r.skipped ? ` · left ${r.skipped} non-retail item${r.skipped === 1 ? "" : "s"} in Square` : ""}${r.countsSent ? ` · sent ${r.countsSent} count${r.countsSent === 1 ? "" : "s"} to Square` : ""}`
                ),
                children: busy === "import" ? "Importing…" : "Import item library"
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "btn btn-tonal btn-sm",
                disabled: !!busy,
                onClick: () => run(
                  "sales",
                  () => squareSyncSales(),
                  (r) => `${r.sales} sale${r.sales === 1 ? "" : "s"}, ${r.units} unit${r.units === 1 ? "" : "s"} counted out${r.skipped ? ` (${r.skipped} unmatched line${r.skipped === 1 ? "" : "s"})` : ""}`
                ),
                children: [
                  /* @__PURE__ */ jsx(RefreshCw, { size: 15 }),
                  busy === "sales" ? "Syncing…" : "Sync sales now"
                ]
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "btn btn-tonal btn-sm",
                disabled: !!busy || !!s.inventory?.needsReconnect,
                onClick: () => {
                  if (!window.confirm("Set every linked item’s count in Square to match Bintro? Bintro’s counts replace Square’s.")) return;
                  run(
                    "counts",
                    () => squareSendCounts(),
                    (r) => r.queued === 0 ? "No linked items yet. Import the item library first." : `Sent ${r.sent} count${r.sent === 1 ? "" : "s"} to Square${r.failed ? ` · ${r.failed} rejected` : ""}`
                  );
                },
                children: [
                  /* @__PURE__ */ jsx(ArrowUpFromLine, { size: 15 }),
                  busy === "counts" ? "Sending…" : "Send counts to Square"
                ]
              }
            )
          ] }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-ink-2 m-0 self-center", children: "Send a month from the Budget tab." }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-text btn-sm !text-bad ml-auto", onClick: () => onDisconnect(s.provider), children: "Disconnect" })
        ] })
      ] }) : s.configured ? /* @__PURE__ */ jsxs(Fragment, { children: [
        s.expired && /* @__PURE__ */ jsxs("div", { className: "bg-warn-tint rounded-xl px-3.5 py-2.5 text-sm mb-3", children: [
          /* @__PURE__ */ jsxs("b", { children: [
            info.name,
            " signed Bintro out."
          ] }),
          " The connection expired or was removed on ",
          info.name,
          "’s side. Tap Reconnect and sign in again; nothing already sent will be sent twice."
        ] }),
        /* @__PURE__ */ jsxs("a", { className: "btn btn-primary btn-sm no-underline", href: `/api/integrations/${s.provider}/connect`, children: [
          s.expired ? "Reconnect" : "Connect",
          " ",
          info.name
        ] })
      ] }) : /* @__PURE__ */ jsxs("details", { className: "bg-surface rounded-xl px-3.5 py-2.5 text-sm", children: [
        /* @__PURE__ */ jsx("summary", { className: "cursor-pointer font-semibold", children: "How to set it up (about 10 minutes, one time)" }),
        /* @__PURE__ */ jsxs("ol", { className: "pl-5 mt-2 mb-1 flex flex-col gap-1.5", children: [
          /* @__PURE__ */ jsxs("li", { children: [
            "Create an app in the",
            " ",
            /* @__PURE__ */ jsxs("a", { href: info.dashboard, target: "_blank", rel: "noreferrer", className: "text-action font-semibold", children: [
              info.dashboardLabel,
              " ",
              /* @__PURE__ */ jsx(ExternalLink, { size: 12, className: "inline" })
            ] }),
            "."
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            "Add this redirect URL to the app:",
            /* @__PURE__ */ jsxs("code", { className: "block mt-1 bg-white border border-line rounded-lg px-2 py-1.5 text-[12px] break-all", children: [
              origin,
              "/api/integrations/",
              s.provider,
              "/callback"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("li", { children: [
            "In Netlify, under Project configuration → Environment variables, add",
            " ",
            info.envVars.map((v, i) => /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: v }),
              i < info.envVars.length - 1 ? " and " : ""
            ] }, v)),
            " ",
            "from the app. Set ",
            /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: info.envName }),
            " to",
            " ",
            /* @__PURE__ */ jsx("code", { className: "text-[12px]", children: "sandbox" }),
            " while testing."
          ] }),
          /* @__PURE__ */ jsx("li", { children: "Redeploy, then come back here and tap Connect." })
        ] })
      ] })
    ] }, s.provider);
  }) });
}
const SEGMENTS = [
  { id: "fast", label: "Moving fast" },
  { id: "best", label: "Sold & used" },
  { id: "slow", label: "Slow movers" },
  { id: "prices", label: "Prices" }
];
const SEEN_KEYS = {
  fast: "bintro-insights-fast-seen",
  weekly: "bintro-insights-week-seen",
  monthly: "bintro-insights-month-seen"
};
function readStorage(key2) {
  try {
    return window.localStorage.getItem(key2);
  } catch {
    return null;
  }
}
function writeStorage(key2, value) {
  try {
    window.localStorage.setItem(key2, value);
  } catch {
  }
}
function label(i) {
  return [i.brand, i.size].filter(Boolean).join(" · ");
}
function money(cents) {
  return `$${centsToDollars(cents)}`;
}
function signedShort(cents) {
  return cents < 0 ? `−${dollarsShort(-cents)}` : dollarsShort(cents);
}
function weekMoney(b) {
  if (b.useKind === "used") return b.costCents ? `${dollarsShort(b.costCents)} of product` : "Used in services";
  if (b.profitCents === null) return b.revenueCents ? `${dollarsShort(b.revenueCents)} sales` : "Add price & cost";
  return `${signedShort(b.profitCents)} profit`;
}
function WeekTotals({ insights, compact = false }) {
  const w = insights.week;
  if (!w.soldUnits && !w.usedUnits) return null;
  return /* @__PURE__ */ jsxs("div", { className: `grid gap-1 ${compact ? "mb-2 text-[13px]" : "mb-3 text-[14px] rounded-2xl border border-line p-3"}`, children: [
    w.soldUnits > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0", children: [
      /* @__PURE__ */ jsx("b", { children: w.soldUnits }),
      " sold to clients ·",
      " ",
      /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "expected profit" }),
      " ",
      /* @__PURE__ */ jsx("b", { className: w.soldProfitCents < 0 ? "text-bad" : "text-good", children: signedShort(w.soldProfitCents) }),
      w.soldUnpriced > 0 && /* @__PURE__ */ jsxs("span", { className: "text-warn text-[12px] font-semibold", children: [
        " ",
        "· ",
        w.soldUnpriced,
        " item",
        w.soldUnpriced === 1 ? "" : "s",
        " missing price or cost"
      ] })
    ] }),
    w.usedUnits > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0", children: [
      /* @__PURE__ */ jsx("b", { children: w.usedUnits }),
      " used in services ",
      /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "(not sold)" }),
      w.usedCostCents > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        " ",
        "· ",
        /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "product cost" }),
        " ",
        /* @__PURE__ */ jsx("b", { className: "text-royal", children: dollarsShort(w.usedCostCents) })
      ] })
    ] })
  ] });
}
function fastSignature(insights) {
  return insights.fastMovers.map((f) => f.productId).sort((a, b) => a - b).join(",");
}
function Summary({ text }) {
  if (!text) return null;
  return /* @__PURE__ */ jsxs("div", { className: "tip-card p-4 mb-4", children: [
    /* @__PURE__ */ jsxs("p", { className: "m-0 mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-gold-ink flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsx(Sparkles, { size: 13 }),
      " AI summary"
    ] }),
    /* @__PURE__ */ jsx("p", { className: "m-0 text-[14px] text-ink whitespace-pre-line", children: text })
  ] });
}
function PriceCheck({
  productId,
  unitCostCents,
  retailPriceCents,
  onChanged,
  compact = false
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  async function check() {
    setBusy("check");
    try {
      setResult(await checkWebPrice({ data: { productId } }));
    } catch {
      setResult({ ok: false, message: "Couldn't check prices right now. Try again in a minute." });
    } finally {
      setBusy(null);
    }
  }
  async function apply() {
    if (!result?.ok) return;
    setBusy("apply");
    try {
      await applyWebPrice({ data: { productId, checkId: result.checkId || void 0, unitCostCents: result.unitCostCents || void 0, retailPriceCents: result.retailPriceCents || void 0 } });
      toast("Prices updated");
      setResult(null);
      onChanged();
    } catch {
      toast("Couldn't save the prices");
    } finally {
      setBusy(null);
    }
  }
  async function confirm() {
    setBusy("confirm");
    try {
      await confirmPrices({ data: { productId } });
      toast("Marked as up to date");
      onChanged();
    } catch {
      toast("Couldn't save that");
    } finally {
      setBusy(null);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: compact ? "mt-2" : "mt-2.5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
      /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-tonal btn-sm", onClick: check, disabled: busy !== null, children: [
        /* @__PURE__ */ jsx(Globe, { size: 15 }),
        busy === "check" ? "Checking sites…" : result ? "Check again" : "Check online"
      ] }),
      !result?.ok && /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: confirm, disabled: busy !== null, children: busy === "confirm" ? "Saving…" : "Price still right" })
    ] }),
    busy === "check" && /* @__PURE__ */ jsx("p", { className: "m-0 mt-1.5 text-[12px] text-ink-2", children: "Searching manufacturer, distributor and Amazon listings — this can take up to a minute." }),
    result && !result.ok && /* @__PURE__ */ jsx("p", { className: "m-0 mt-2 text-[13px] text-bad", children: result.message }),
    result?.ok && /* @__PURE__ */ jsxs("div", { className: "mt-2 rounded-xl border border-gold/40 bg-gold-tint p-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-x-5 gap-y-1 text-[14px]", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Cost ",
          /* @__PURE__ */ jsx("b", { className: "num", children: result.unitCostCents ? money(result.unitCostCents) : "—" }),
          unitCostCents > 0 && result.unitCostCents > 0 && result.unitCostCents !== unitCostCents && /* @__PURE__ */ jsxs("span", { className: "text-ink-2 text-[12px]", children: [
            " (was ",
            money(unitCostCents),
            ")"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Retail ",
          /* @__PURE__ */ jsx("b", { className: "num", children: result.retailPriceCents ? money(result.retailPriceCents) : "—" }),
          retailPriceCents > 0 && result.retailPriceCents > 0 && result.retailPriceCents !== retailPriceCents && /* @__PURE__ */ jsxs("span", { className: "text-ink-2 text-[12px]", children: [
            " (was ",
            money(retailPriceCents),
            ")"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-[12px] text-gold-ink font-semibold", children: [
        WEB_PRICE_SOURCE_LABELS[result.sourceType],
        result.sourceName && result.sourceType !== "estimate" ? ` · ${result.sourceName}` : ""
      ] }),
      result.sourceUrl && /* @__PURE__ */ jsxs(
        "a",
        {
          href: result.sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "inline-flex items-center gap-1 text-[13px] text-action font-medium break-all",
          children: [
            "View listing ",
            /* @__PURE__ */ jsx(ExternalLink, { size: 13 })
          ]
        }
      ),
      result.note && /* @__PURE__ */ jsx("p", { className: "m-0 mt-1 text-[13px] text-ink-2", children: result.note }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-1.5 mt-2", children: [
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-primary btn-sm", onClick: apply, disabled: busy !== null, children: busy === "apply" ? "Saving…" : "Use these prices" }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "btn btn-text btn-sm", onClick: confirm, disabled: busy !== null, children: "Keep mine" })
      ] })
    ] })
  ] });
}
function Row({ children }) {
  return /* @__PURE__ */ jsx("li", { className: "py-3 border-b border-line last:border-0", children });
}
function ItemHead({
  item,
  right
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
    /* @__PURE__ */ jsx(Thumb, { imageUrl: item.imageUrl, label: item.brand || item.name }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsx("b", { className: "block truncate", children: item.name }),
      /* @__PURE__ */ jsx("span", { className: "block text-[13px] text-ink-2 truncate", children: label(item) || "—" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "text-right shrink-0", children: right })
  ] });
}
function InsightsSheet({
  open,
  onClose,
  insights,
  segment,
  onSegment,
  onChanged,
  onOpenRestock
}) {
  const [slowGroup, setSlowGroup] = useState("all");
  const counts = {
    fast: insights?.fastMovers.length ?? 0,
    best: insights?.bestSellers.length ?? 0,
    slow: insights?.slowMovers.length ?? 0,
    prices: insights?.priceReminders.length ?? 0
  };
  return /* @__PURE__ */ jsxs(
    Sheet,
    {
      open,
      onClose,
      title: "Sales insights",
      subtitle: "What's selling, what's sitting, and prices to keep current. Updated with every scan.",
      wide: true,
      children: [
        /* @__PURE__ */ jsx("div", { className: "flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-4 [scrollbar-width:none]", role: "group", "aria-label": "Insight type", children: SEGMENTS.map((s) => /* @__PURE__ */ jsxs("button", { type: "button", className: "chip whitespace-nowrap", "aria-pressed": segment === s.id, onClick: () => onSegment(s.id), children: [
          s.label,
          counts[s.id] > 0 && /* @__PURE__ */ jsx("span", { className: "num ml-1.5 opacity-75", children: counts[s.id] })
        ] }, s.id)) }),
        !insights && /* @__PURE__ */ jsxs("div", { "aria-busy": "true", children: [
          /* @__PURE__ */ jsx("div", { className: "skel" }),
          /* @__PURE__ */ jsx("div", { className: "skel w-2/3" }),
          /* @__PURE__ */ jsx("div", { className: "skel w-1/2" })
        ] }),
        insights && segment === "fast" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Summary, { text: insights.summaries.fast }),
          insights.fastMovers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2", children: "Nothing is selling out unusually fast right now. Bintro checks every few hours and emails you if that changes." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-royal text-white p-4 mb-3 flex items-center gap-3 flex-wrap", children: [
              /* @__PURE__ */ jsx(Flame, { size: 22, className: "text-gold-bright shrink-0" }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-[180px]", children: [
                /* @__PURE__ */ jsxs("b", { className: "block text-[17px]", children: [
                  "Predicted bulk order: ",
                  dollarsShort(insights.fastOrderTotalCents)
                ] }),
                /* @__PURE__ */ jsxs("span", { className: "text-[13px] text-white/80", children: [
                  "Covers ",
                  BULK_COVER_DAYS,
                  " days of sales or service use plus par, at your most recent costs."
                ] })
              ] }),
              /* @__PURE__ */ jsxs("button", { type: "button", className: "btn btn-gold btn-sm", onClick: onOpenRestock, children: [
                "Open Restock ",
                /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
              ] })
            ] }),
            /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: insights.fastMovers.map((f) => /* @__PURE__ */ jsxs(Row, { children: [
              /* @__PURE__ */ jsx(
                ItemHead,
                {
                  item: f,
                  right: /* @__PURE__ */ jsxs(Fragment, { children: [
                    /* @__PURE__ */ jsxs("b", { className: "num block", children: [
                      "Order ",
                      f.orderQty
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "num text-[13px] text-ink-2", children: f.unitCostCents ? `≈ ${money(f.orderCostCents)}` : "Add a cost" })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1.5 text-[13px] text-ink-2 pl-14", children: [
                /* @__PURE__ */ jsx("b", { className: "text-ink", children: f.weekUnits }),
                " ",
                f.useKind === "sold" ? "sold" : "used in services",
                " in 7 days · ",
                f.qty,
                " on hand ·",
                " ",
                /* @__PURE__ */ jsx("b", { className: f.daysLeft <= 7 ? "text-bad" : "text-warn", children: f.qty <= 0 ? "out now" : `runs out in ${daysLabel(f.daysLeft)}` }),
                f.surge && /* @__PURE__ */ jsx("span", { className: "text-gold-ink font-semibold", children: " · selling above usual" })
              ] }),
              f.priceStale && /* @__PURE__ */ jsxs("div", { className: "pl-14", children: [
                /* @__PURE__ */ jsx("p", { className: "m-0 mt-1 text-[12px] text-warn font-semibold", children: f.unitCostCents ? `Cost last updated ${f.priceUpdatedAt ? `${daysBetween(f.priceUpdatedAt)} days ago` : "never"} — check it before ordering.` : "No cost saved yet." }),
                /* @__PURE__ */ jsx(PriceCheck, { productId: f.productId, unitCostCents: f.unitCostCents, retailPriceCents: f.retailPriceCents, onChanged, compact: true })
              ] })
            ] }, f.productId)) })
          ] })
        ] }),
        insights && segment === "best" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Summary, { text: insights.summaries.weekly }),
          /* @__PURE__ */ jsx(WeekTotals, { insights }),
          insights.bestSellers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-ink-2", children: "No sales or usage scanned in the last 7 days yet." }) : /* @__PURE__ */ jsx("ol", { className: "list-none m-0 p-0", children: insights.bestSellers.map((b, i) => /* @__PURE__ */ jsx(Row, { children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: `num w-6 text-center font-bold ${i < 3 ? "text-gold-ink" : "text-ink-2"}`, children: i + 1 }),
            /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0", children: /* @__PURE__ */ jsx(
              ItemHead,
              {
                item: b,
                right: /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsxs("b", { className: "num block", children: [
                    b.weekUnits,
                    " ",
                    outVerb(b.useKind)
                  ] }),
                  /* @__PURE__ */ jsx("span", { className: `num text-[13px] block ${b.useKind === "sold" && b.profitCents !== null ? b.profitCents < 0 ? "text-bad" : "text-good" : "text-ink-2"}`, children: weekMoney(b) }),
                  /* @__PURE__ */ jsx(
                    "span",
                    {
                      className: `num text-[13px] inline-flex items-center gap-1 ${b.trendPct === null ? "text-gold-ink" : b.trendPct >= 0 ? "text-good" : "text-bad"}`,
                      children: b.trendPct === null ? "New" : /* @__PURE__ */ jsxs(Fragment, { children: [
                        b.trendPct >= 0 ? /* @__PURE__ */ jsx(TrendingUp, { size: 13 }) : /* @__PURE__ */ jsx(TrendingDown, { size: 13 }),
                        b.trendPct > 0 ? "+" : "",
                        b.trendPct,
                        "%"
                      ] })
                    }
                  )
                ] })
              }
            ) })
          ] }) }, b.productId)) }),
          /* @__PURE__ */ jsx("p", { className: "text-[12px] text-ink-2 mt-3 mb-0", children: "Last 7 days vs the week before. Retail items count as sold with profit at your retail price minus cost; backbar and other service supplies count as used, not sold. This follows each product's category (Settings → Categories). Emailed every Monday." })
        ] }),
        insights && segment === "slow" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Summary, { text: insights.summaries.monthly }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-2 flex-wrap mb-3", role: "group", "aria-label": "Slow mover group", children: ["all", "color", "retail", "other"].map((g) => /* @__PURE__ */ jsx("button", { type: "button", className: "chip !py-1.5 !px-3 !text-[13px]", "aria-pressed": slowGroup === g, onClick: () => setSlowGroup(g), children: g === "all" ? "All" : SLOW_GROUP_LABELS[g] }, g)) }),
          (() => {
            const items = insights.slowMovers.filter((m) => slowGroup === "all" || m.group === slowGroup);
            if (!items.length) return /* @__PURE__ */ jsxs("p", { className: "text-ink-2", children: [
              "Nothing in stock has gone unused for ",
              SLOW_WINDOW_DAYS,
              " days. 🎉"
            ] });
            const tied = items.reduce((s, m) => s + m.tiedUpCents, 0);
            return /* @__PURE__ */ jsxs(Fragment, { children: [
              tied > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[14px]", children: [
                /* @__PURE__ */ jsx("b", { className: "text-royal", children: dollarsShort(tied) }),
                " ",
                /* @__PURE__ */ jsx("span", { className: "text-ink-2", children: "of cash is sitting on the shelf. Try a promo or bundle, return unopened stock, or lower par." })
              ] }),
              /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: items.map((m) => /* @__PURE__ */ jsxs(Row, { children: [
                /* @__PURE__ */ jsx(
                  ItemHead,
                  {
                    item: m,
                    right: /* @__PURE__ */ jsxs(Fragment, { children: [
                      /* @__PURE__ */ jsxs("b", { className: "num block", children: [
                        m.qty,
                        " on hand"
                      ] }),
                      /* @__PURE__ */ jsx("span", { className: "num text-[13px] text-ink-2", children: m.tiedUpCents ? dollarsShort(m.tiedUpCents) : "" })
                    ] })
                  }
                ),
                /* @__PURE__ */ jsxs("p", { className: "m-0 mt-1 text-[13px] text-ink-2 pl-14", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-gold-ink font-semibold", children: SLOW_GROUP_LABELS[m.group] }),
                  " · used ",
                  m.monthUnits,
                  "× in",
                  " ",
                  SLOW_WINDOW_DAYS,
                  " days · last used ",
                  m.daysSinceUsed === null ? "never" : `${m.daysSinceUsed}d ago`
                ] })
              ] }, m.productId)) })
            ] });
          })(),
          /* @__PURE__ */ jsx("p", { className: "text-[12px] text-ink-2 mt-3 mb-0", children: "Emailed on the 1st of each month." })
        ] }),
        insights && segment === "prices" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "tip-card p-4 mb-3 flex gap-3 items-start", children: [
            /* @__PURE__ */ jsx(Tag, { size: 20, className: "text-gold-ink shrink-0 mt-0.5" }),
            /* @__PURE__ */ jsxs("p", { className: "m-0 text-[14px]", children: [
              "Costs change quietly. Bintro reminds you when a price is over ",
              PRICE_STALE_DAYS,
              " days old. ",
              /* @__PURE__ */ jsx("b", { children: "Check online" }),
              " looks at the manufacturer's site, authorized distributors and Amazon — never third-party resellers."
            ] })
          ] }),
          insights.priceReminders.length === 0 ? /* @__PURE__ */ jsxs("p", { className: "text-ink-2", children: [
            "Every price has been updated in the last ",
            PRICE_STALE_DAYS,
            " days. Nice work."
          ] }) : /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0", children: insights.priceReminders.map((r) => /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(
              ItemHead,
              {
                item: r,
                right: /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("b", { className: "num block", children: r.unitCostCents ? money(r.unitCostCents) : "No cost" }),
                  /* @__PURE__ */ jsx("span", { className: "text-[13px] text-ink-2", children: r.priceUpdatedAt ? `${r.daysOld}d ago` : "Never updated" })
                ] })
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "pl-14", children: /* @__PURE__ */ jsx(PriceCheck, { productId: r.productId, unitCostCents: r.unitCostCents, retailPriceCents: r.retailPriceCents, onChanged }) })
          ] }, r.productId)) })
        ] })
      ]
    }
  );
}
function InsightsBanner({ insights, onOpen }) {
  if (!insights) return null;
  const fast = insights.fastMovers.length;
  const top = insights.bestSellers.find((b) => b.useKind === "sold") ?? insights.bestSellers[0];
  const topLabel = top?.useKind === "used" ? "Most used this week" : "Top seller this week";
  const slow = insights.slowMovers.length;
  const prices = insights.priceReminders.length;
  if (!fast && !top && !slow && !prices) return null;
  const first = fast ? "fast" : top ? "best" : slow ? "slow" : "prices";
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => onOpen(first),
      className: "w-full text-left rounded-2xl p-4 mb-4 border-0 cursor-pointer bg-gradient-to-br from-royal to-royal-2 text-white shadow-card flex items-center gap-3",
      children: [
        /* @__PURE__ */ jsx("span", { className: "w-10 h-10 rounded-full bg-white/12 grid place-items-center shrink-0 text-gold-bright", children: fast ? /* @__PURE__ */ jsx(Flame, { size: 20 }) : /* @__PURE__ */ jsx(Sparkles, { size: 20 }) }),
        /* @__PURE__ */ jsxs("span", { className: "flex-1 min-w-0 text-[14px] leading-snug", children: [
          /* @__PURE__ */ jsx("b", { className: "block text-[15px]", children: fast ? `${fast} item${fast === 1 ? " is" : "s are"} running out fast · ≈ ${dollarsShort(insights.fastOrderTotalCents)} to restock` : top ? `${topLabel}: ${top.name}` : "Sales insights" }),
          /* @__PURE__ */ jsx("span", { className: "text-white/80", children: [top && fast ? `${top.useKind === "used" ? "Most used" : "Top seller"}: ${top.name}` : "", slow ? `${slow} slow mover${slow === 1 ? "" : "s"}` : "", prices ? `${prices} price${prices === 1 ? "" : "s"} to update` : ""].filter(Boolean).join(" · ") || "See best sellers and trends" })
        ] }),
        /* @__PURE__ */ jsx(ArrowRight, { size: 18, className: "text-gold-bright shrink-0" })
      ]
    }
  );
}
function InsightPopup({
  insights,
  onOpen,
  onVisible
}) {
  const [popup, setPopup] = useState(null);
  const [summary, setSummary] = useState("");
  useEffect(() => {
    if (!insights || popup) return;
    const fastSig = fastSignature(insights);
    const seenFast = readStorage(SEEN_KEYS.fast) ?? "";
    const seenFastIds = new Set(seenFast.split(",").filter(Boolean));
    const newFast = insights.fastMovers.some((f) => !seenFastIds.has(String(f.productId)));
    let next = null;
    if (newFast) next = { kind: "fast", mark: () => writeStorage(SEEN_KEYS.fast, fastSig) };
    else if (insights.bestSellers.length && readStorage(SEEN_KEYS.weekly) !== insights.weekKey)
      next = { kind: "weekly", mark: () => writeStorage(SEEN_KEYS.weekly, insights.weekKey) };
    else if ((insights.slowMovers.length || insights.priceReminders.length) && readStorage(SEEN_KEYS.monthly) !== insights.monthKey)
      next = { kind: "monthly", mark: () => writeStorage(SEEN_KEYS.monthly, insights.monthKey) };
    if (!next) return;
    const chosen = next;
    const timer = setTimeout(() => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      chosen.mark();
      setSummary(insights.summaries[chosen.kind]);
      setPopup(chosen);
      onVisible(true);
      if (!insights.summaries[chosen.kind]) {
        getInsightSummary({ data: { kind: chosen.kind } }).then((r) => setSummary(r.summary)).catch(() => {
        });
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [insights, popup, onVisible]);
  if (!popup || !insights) return null;
  function close() {
    setPopup(null);
    setSummary("");
    onVisible(false);
  }
  const segment = popup.kind === "fast" ? "fast" : popup.kind === "weekly" ? "best" : insights.slowMovers.length ? "slow" : "prices";
  const title = popup.kind === "fast" ? "Moving fast — buy in higher volume" : popup.kind === "weekly" ? insights.week.soldUnits && insights.week.usedUnits ? "This week: sold & used" : insights.week.soldUnits ? "Selling very well this week" : "Used most in services this week" : "Monthly check: slow movers & prices";
  const Icon = popup.kind === "fast" ? Flame : popup.kind === "weekly" ? TrendingUp : TrendingDown;
  const lines = popup.kind === "fast" ? insights.fastMovers.slice(0, 3).map((f) => ({
    id: f.productId,
    name: f.name,
    detail: `${f.qty <= 0 ? "Out now" : `Out in ${daysLabel(f.daysLeft)}`} · order ${f.orderQty}${f.unitCostCents ? ` ≈ ${dollarsShort(f.orderCostCents)}` : ""}`
  })) : popup.kind === "weekly" ? insights.bestSellers.slice(0, 3).map((b) => ({
    id: b.productId,
    name: b.name,
    detail: `${b.weekUnits} ${b.useKind === "sold" ? "sold" : "used in services"} · ${weekMoney(b)}`
  })) : insights.slowMovers.slice(0, 3).map((m) => ({
    id: m.productId,
    name: m.name,
    detail: `${SLOW_GROUP_LABELS[m.group]} · ${m.qty} on hand${m.tiedUpCents ? ` · ${dollarsShort(m.tiedUpCents)}` : ""}`
  }));
  return /* @__PURE__ */ jsx(
    "aside",
    {
      role: "status",
      "aria-label": title,
      className: "tip-nudge print:hidden fixed z-40 right-4 left-4 min-[560px]:left-auto min-[560px]:w-[400px] bottom-[calc(92px+env(safe-area-inset-bottom,0px))] min-[1060px]:bottom-6 min-[1060px]:right-6",
      children: /* @__PURE__ */ jsxs("div", { className: "rounded-[20px] bg-white overflow-hidden", style: { boxShadow: "var(--shadow-lift), inset 0 0 0 1px color-mix(in srgb, var(--color-gold) 35%, transparent)" }, children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-gradient-to-br from-royal to-royal-2 text-white px-4 py-3 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "w-9 h-9 rounded-full bg-white/12 grid place-items-center shrink-0 text-gold-bright", "aria-hidden": "true", children: /* @__PURE__ */ jsx(Icon, { size: 18 }) }),
          /* @__PURE__ */ jsx("b", { className: "flex-1 text-[15px] leading-snug", children: title }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: close,
              "aria-label": "Dismiss",
              className: "w-8 h-8 rounded-full border-0 bg-transparent text-white/80 grid place-items-center cursor-pointer hover:bg-white/10 shrink-0",
              children: /* @__PURE__ */ jsx(X, { size: 17 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 pt-3", children: [
          lines.length > 0 && /* @__PURE__ */ jsx("ul", { className: "list-none m-0 p-0 mb-2", children: lines.map((l) => /* @__PURE__ */ jsxs("li", { className: "flex items-baseline justify-between gap-3 py-1 text-[14px]", children: [
            /* @__PURE__ */ jsx("span", { className: "truncate font-semibold", children: l.name }),
            /* @__PURE__ */ jsx("span", { className: "num text-[13px] text-ink-2 shrink-0", children: l.detail })
          ] }, l.id)) }),
          popup.kind === "weekly" && /* @__PURE__ */ jsx(WeekTotals, { insights, compact: true }),
          popup.kind === "fast" && insights.fastOrderTotalCents > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[13px]", children: [
            "Predicted cost at latest prices: ",
            /* @__PURE__ */ jsx("b", { className: "text-royal", children: dollarsShort(insights.fastOrderTotalCents) })
          ] }),
          popup.kind === "monthly" && insights.priceReminders.length > 0 && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[13px] text-warn font-semibold", children: [
            insights.priceReminders.length,
            " price",
            insights.priceReminders.length === 1 ? "" : "s",
            " need updating."
          ] }),
          summary && /* @__PURE__ */ jsxs("p", { className: "m-0 mb-2 text-[13px] text-ink bg-gold-tint rounded-xl px-3 py-2", children: [
            /* @__PURE__ */ jsx(Sparkles, { size: 12, className: "inline text-gold-ink mr-1 -mt-0.5" }),
            summary
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1 flex-wrap", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "btn btn-primary btn-sm",
                onClick: () => {
                  close();
                  onOpen(segment);
                },
                children: "See details"
              }
            ),
            popup.kind === "monthly" && insights.priceReminders.length > 0 && segment !== "prices" && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                className: "btn btn-text btn-sm !text-gold-ink",
                onClick: () => {
                  close();
                  onOpen("prices");
                },
                children: "Update prices"
              }
            )
          ] })
        ] })
      ] })
    }
  );
}
const STAFF_NAME_KEY = "shagnoir-staff-name";
const LEGACY_INITIALS_KEY = "shagnoir-staff-initials";
const TABS = [{
  id: "scan",
  label: "Scan",
  Icon: ScanBarcode
}, {
  id: "products",
  label: "Products",
  Icon: Boxes
}, {
  id: "restock",
  label: "Restock",
  Icon: Truck
}, {
  id: "calendar",
  label: "Calendar",
  Icon: CalendarDays,
  feature: "calendar"
}, {
  id: "budget",
  label: "Budget",
  Icon: Wallet,
  feature: "budget"
}, {
  id: "activity",
  label: "Activity",
  Icon: Activity
}];
const TAB_IDS = /* @__PURE__ */ new Set([...TABS.map((t) => t.id), "settings"]);
function tabFromHash(hash) {
  const id = hash.replace(/^#/, "");
  if (id === "below-par") return {
    tab: "restock",
    restock: "below-par"
  };
  if (id === "reorder") return {
    tab: "restock",
    restock: "order"
  };
  if (id === "deliveries") return {
    tab: "restock",
    restock: "deliveries"
  };
  return TAB_IDS.has(id) ? {
    tab: id
  } : null;
}
function Home() {
  const initial = Route.useLoaderData();
  const [tab, setTab] = useState("scan");
  const [products, setProducts] = useState(initial.products);
  const [recent, setRecent] = useState(initial.recent);
  const belowPar = useMemo(() => selectBelowPar(products), [products]);
  const stats = useMemo(() => stockStats(products), [products]);
  const refreshSeq = useRef(0);
  const [staffName, setStaffName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [staffPrompt, setStaffPrompt] = useState(null);
  const staffResolver = useRef(null);
  const [profile, setProfile] = useState(initial.profile);
  const [team, setTeam] = useState(initial.team);
  const [categories, setCategories] = useState(initial.categories);
  const [restockMode, setRestockMode] = useState("below-par");
  const [autoReceive, setAutoReceive] = useState(false);
  const [settingsSection, setSettingsSection] = useState("profile");
  const [accountPanel, setAccountPanel] = useState("account");
  const [account, setAccount] = useState(initial.account);
  const insightsOn = planHas(account.effectivePlan, "insights");
  const [notice, setNotice] = useState(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightSegment, setInsightSegment] = useState("fast");
  const [insightPopupShowing, setInsightPopupShowing] = useState(false);
  const {
    fresh: freshTip,
    markSeen: markTipSeen
  } = useFreshTip();
  const businessName = displayBusinessName(profile);
  useEffect(() => {
    const saved = window.localStorage.getItem(STAFF_NAME_KEY) ?? window.localStorage.getItem(LEGACY_INITIALS_KEY);
    if (saved) setStaffName(saved);
    setHydrated(true);
    const fromHash = tabFromHash(window.location.hash);
    if (fromHash) {
      setTab(fromHash.tab);
      if (fromHash.restock) setRestockMode(fromHash.restock);
    }
    const onHash = () => {
      const next = tabFromHash(window.location.hash);
      if (next) setTab(next.tab);
    };
    window.addEventListener("hashchange", onHash);
    reconnectSavedBluetoothScanner().catch(() => {
    });
    const params = new URLSearchParams(window.location.search);
    const section = params.get("settings");
    if (section) {
      setTab("settings");
      setSettingsSection(section === "integrations" || section === "categories" || section === "team" || section === "import" || section === "account" || section === "appearance" || section === "scanner" || section === "setup" ? section : "profile");
      const connected = params.get("connected");
      const error = params.get("error");
      const billing = params.get("billing");
      const label2 = (p) => p.startsWith("square") ? "Square" : "QuickBooks";
      if (billing === "subscribed") setNotice({
        tone: "good",
        text: `Welcome to Bintro ${params.get("plan") || "Plus"}. Your plan is active.`
      });
      else if (billing === "canceled") setNotice({
        tone: "bad",
        text: "Checkout was cancelled. Your plan hasn’t changed."
      });
      else if (billing === "failed") setNotice({
        tone: "bad",
        text: "We couldn't confirm the payment. Check Billing or try again."
      });
      else if (error?.endsWith("upgrade")) setNotice({
        tone: "bad",
        text: `${label2(error)} comes with ${error.startsWith("square") ? "Plus" : "Premium"}. Pick a plan below.`
      });
      else if (connected) setNotice({
        tone: "good",
        text: `${label2(connected)} is connected.`
      });
      else if (error?.endsWith("not-configured")) setNotice({
        tone: "bad",
        text: `${label2(error)} isn't set up on this site yet. See the steps below.`
      });
      else if (error?.endsWith("expired")) setNotice({
        tone: "bad",
        text: `That ${label2(error)} link expired or didn’t come from this page. Tap Connect to start again.`
      });
      else if (error?.endsWith("declined")) setNotice({
        tone: "bad",
        text: `${label2(error)} connection was cancelled.`
      });
      else if (error) setNotice({
        tone: "bad",
        text: `${label2(error)} couldn't connect. Try again.`
      });
      window.history.replaceState(null, "", `${window.location.pathname}#settings`);
    }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.title = `Bintro — ${businessName}`;
  }, [businessName]);
  const palette = paletteStyle(profile.palette);
  useEffect(() => {
    const root = document.documentElement;
    for (const [key2, value] of Object.entries(palette)) root.style.setProperty(key2, value);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", palette["--color-page"]);
  }, [profile.palette]);
  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STAFF_NAME_KEY, staffName);
  }, [staffName, hydrated]);
  const loadInsights = useCallback(() => {
    if (!insightsOn) {
      setInsights(null);
      return;
    }
    getInsights().then((i) => setInsights(i)).catch(() => {
    });
  }, [insightsOn]);
  useEffect(() => {
    loadInsights();
  }, [loadInsights]);
  function openInsights(segment) {
    setInsightSegment(segment);
    setInsightsOpen(true);
  }
  const applyProduct = useCallback((next) => {
    if (!next) return;
    setProducts((current) => {
      const found = current.some((p) => p.id === next.id);
      const merged = found ? current.map((p) => p.id === next.id ? next : p) : [...current, next];
      return found ? merged : merged.sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);
  const refresh = useCallback(async ({
    quiet = false
  } = {}) => {
    const seq = ++refreshSeq.current;
    if (!quiet) loadInsights();
    const [p, r] = await Promise.allSettled([listProducts(), getRecentMovements({
      data: {
        limit: 25
      }
    })]);
    if (seq !== refreshSeq.current) return;
    if (p.status === "fulfilled") setProducts(p.value);
    if (r.status === "fulfilled") setRecent(r.value);
    if (quiet) return;
    getAccount().then((acct) => setAccount(acct)).catch(() => {
    });
  }, [loadInsights]);
  useEffect(() => {
    const catchUp = () => {
      if (document.visibilityState === "visible") refresh({
        quiet: true
      }).catch(() => {
      });
    };
    const timer = window.setInterval(catchUp, 3e4);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
    };
  }, [refresh]);
  useEffect(() => {
    if (tab === "restock") refresh({
      quiet: true
    }).catch(() => {
    });
  }, [tab, refresh]);
  const askStaff = useCallback((prompt = {}) => {
    staffResolver.current?.(null);
    setStaffPrompt(prompt);
    return new Promise((resolve) => {
      staffResolver.current = resolve;
    });
  }, []);
  function closeStaff(picked) {
    setStaffPrompt(null);
    const resolve = staffResolver.current;
    staffResolver.current = null;
    resolve?.(picked);
  }
  async function pickStaff(member) {
    const existing = team.find((m) => m.name.toLowerCase() === member.toLowerCase());
    const next = existing?.name ?? member;
    setStaffName(next);
    closeStaff(next);
    if (!existing) {
      try {
        setTeam(await addTeamMember({
          data: {
            name: next
          }
        }));
      } catch {
      }
    }
  }
  function openStaff() {
    askStaff();
  }
  function openPlans() {
    setAccountPanel("account");
    openSettings("account");
  }
  function openSettings(section = "profile") {
    setSettingsSection(section);
    closeStaff(null);
    selectTab("settings");
  }
  function selectTab(next) {
    setTab(next);
    window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    window.scrollTo({
      top: 0
    });
  }
  function openTips() {
    setTipsOpen(true);
    markTipSeen();
  }
  const navigateFromTip = (next, section) => {
    if (next === "settings") openSettings(section ?? "profile");
    else selectTab(next);
  };
  const name = staffName.trim();
  const tabButtons = (layout) => TABS.map(({
    id,
    label: label2,
    Icon,
    feature
  }) => {
    const active = tab === id;
    const locked = feature ? !planHas(account.effectivePlan, feature) : false;
    const badge = id === "restock" && belowPar.length > 0 ? belowPar.length : null;
    return /* @__PURE__ */ jsxs("button", { onClick: () => selectTab(id), "aria-current": active ? "page" : void 0, className: layout === "bar" ? `relative flex-1 flex flex-col items-center gap-1 pt-2 pb-1.5 px-0.5 border-0 bg-transparent cursor-pointer text-[11px] font-semibold whitespace-nowrap min-w-0 ${active ? "text-action" : "text-ink-2"}` : `relative flex items-center gap-2 px-3.5 py-2 rounded-full border-0 cursor-pointer text-sm font-semibold ${active ? "bg-action-tint text-action" : "bg-transparent text-ink-2 hover:bg-surface"}`, children: [
      /* @__PURE__ */ jsxs("span", { className: layout === "bar" ? `relative grid place-items-center w-12 h-8 rounded-full transition-colors ${active ? "bg-action-tint" : ""}` : "relative grid place-items-center", children: [
        /* @__PURE__ */ jsx(Icon, { size: layout === "bar" ? 22 : 18, strokeWidth: active ? 2.4 : 2 }),
        locked && /* @__PURE__ */ jsxs("span", { className: "absolute -top-1 -right-1.5 w-[16px] h-[16px] rounded-full bg-gold text-white grid place-items-center", children: [
          /* @__PURE__ */ jsx(Lock, { size: 9, strokeWidth: 3 }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: " (upgrade)" })
        ] }),
        badge !== null && /* @__PURE__ */ jsx("span", { className: "num absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[11px] leading-[18px] font-bold text-center", children: badge })
      ] }),
      label2,
      active && layout === "bar" && /* @__PURE__ */ jsx("span", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full bg-gold", "aria-hidden": "true" })
    ] }, id);
  });
  return /* @__PURE__ */ jsx(BusinessProvider, { profile, categories, onCategories: setCategories, account, onAccount: setAccount, openPlans, children: /* @__PURE__ */ jsx(ToastProvider, { children: /* @__PURE__ */ jsxs("div", { className: "min-h-dvh bg-page text-ink", style: palette, children: [
    /* @__PURE__ */ jsxs("header", { className: "sticky top-0 z-30 bg-page/95 backdrop-blur pt-[env(safe-area-inset-top)]", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-[1100px] mx-auto px-4 h-16 flex items-center gap-2 min-[420px]:gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 mr-auto", children: [
          /* @__PURE__ */ jsx("span", { className: "brand-tile w-9 h-9 rounded-[11px] text-white grid place-items-center", "aria-hidden": "true", children: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M4 7h16" }),
            /* @__PURE__ */ jsx("path", { d: "M9 7V4.5h6V7" }),
            /* @__PURE__ */ jsx("path", { d: "M6 7l1 13h10l1-13" }),
            /* @__PURE__ */ jsx("path", { d: "M10 11v5M14 11v5" })
          ] }) }),
          /* @__PURE__ */ jsxs("span", { className: "text-[22px] font-extrabold tracking-tight text-royal max-[389px]:hidden", children: [
            "Bintro",
            /* @__PURE__ */ jsx("span", { className: "text-gold", children: "." })
          ] })
        ] }),
        /* @__PURE__ */ jsx("nav", { className: "hidden min-[1060px]:flex items-center gap-1", "aria-label": "Sections", children: tabButtons("inline") }),
        /* @__PURE__ */ jsx(TipBulb, { onClick: openTips, fresh: freshTip }),
        /* @__PURE__ */ jsx("button", { onClick: () => openSettings("profile"), className: `w-10 h-10 rounded-full grid place-items-center border-0 cursor-pointer shrink-0 ${tab === "settings" ? "bg-action-tint text-action" : "bg-surface text-ink-2 hover:bg-surface-2"}`, "aria-label": "Settings: business profile, team, inventory import and connections", "aria-current": tab === "settings" ? "page" : void 0, children: /* @__PURE__ */ jsx(Settings, { size: 20 }) }),
        /* @__PURE__ */ jsxs("button", { onClick: openStaff, className: "flex items-center gap-2 bg-surface rounded-full pl-1 pr-3.5 py-1 border-0 cursor-pointer max-w-[210px] min-w-0", "aria-label": name ? `Working as ${name}. Change` : "Set who's working", children: [
          /* @__PURE__ */ jsx("span", { className: "brand-tile w-8 h-8 rounded-full text-white text-[13px] font-bold grid place-items-center shrink-0", children: deriveInitials(name || businessName) || "B" }),
          /* @__PURE__ */ jsxs("span", { className: "flex flex-col items-start leading-tight min-w-0", children: [
            /* @__PURE__ */ jsx("span", { className: "text-[13px] font-semibold truncate max-w-[150px]", children: name || businessName }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] text-ink-2 truncate max-w-[150px]", children: name ? businessName : "Tap to add your name" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "royal-rule opacity-80", "aria-hidden": "true" })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "max-w-[1100px] mx-auto px-4 pt-4 pb-[calc(96px+env(safe-area-inset-bottom))] min-[1060px]:pb-12", children: [
      !profile.name.trim() && tab !== "settings" && /* @__PURE__ */ jsxs("button", { onClick: () => openSettings("profile"), className: "w-full text-left flex items-center gap-3 bg-action-tint text-action rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer", children: [
        /* @__PURE__ */ jsx(Store, { size: 20, className: "shrink-0" }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm text-ink", children: [
          /* @__PURE__ */ jsx("b", { children: "Make Bintro yours." }),
          " Add your business name, type and contact details — it takes a minute."
        ] })
      ] }),
      hydrated && !name && tab !== "settings" && /* @__PURE__ */ jsxs("button", { onClick: openStaff, className: "w-full text-left flex items-center gap-3 bg-warn-tint text-warn rounded-2xl px-4 py-3 mb-4 border-0 cursor-pointer", children: [
        /* @__PURE__ */ jsx(TriangleAlert, { size: 20, className: "shrink-0" }),
        /* @__PURE__ */ jsxs("span", { className: "text-sm", children: [
          /* @__PURE__ */ jsx("b", { children: "Who's working?" }),
          " Add your name so scans, edits and emails are logged under you."
        ] })
      ] }),
      tab === "scan" && /* @__PURE__ */ jsx(ScanView, { staffName, askStaff, recent, products, belowParCount: belowPar.length, onProduct: applyProduct, onChanged: refresh, onOpenRestock: () => {
        setRestockMode("below-par");
        selectTab("restock");
      }, onReceiveDelivery: () => {
        setRestockMode("deliveries");
        setAutoReceive(true);
        selectTab("restock");
      } }),
      tab === "products" && /* @__PURE__ */ jsx(InventoryView, { products, stats, staffName, onProduct: applyProduct, onChanged: refresh }),
      tab === "activity" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(InsightsBanner, { insights, onOpen: openInsights }),
        /* @__PURE__ */ jsx(ActivityView, { recent })
      ] }),
      tab === "budget" && /* @__PURE__ */ jsx(PlanGate, { feature: "budget", children: /* @__PURE__ */ jsx(BudgetView, { staffName, recent, onOpenSettings: () => openSettings("integrations") }) }),
      tab === "settings" && /* @__PURE__ */ jsx(SettingsView, { section: settingsSection, onSection: setSettingsSection, accountPanel, onAccountPanel: setAccountPanel, profile, onProfile: setProfile, team, onTeam: setTeam, products, staffName, onStaffName: setStaffName, notice, onDismissNotice: () => setNotice(null), onChanged: refresh }),
      tab === "restock" && /* @__PURE__ */ jsx(InsightsBanner, { insights, onOpen: openInsights }),
      tab === "restock" && /* @__PURE__ */ jsx(RestockView, { mode: restockMode, onMode: setRestockMode, items: belowPar, products, staffName, onChanged: refresh, autoReceive, onAutoReceiveHandled: () => setAutoReceive(false) }),
      tab === "calendar" && /* @__PURE__ */ jsx(PlanGate, { feature: "calendar", children: /* @__PURE__ */ jsx(CalendarView, { belowPar, staffName }) })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "min-[1060px]:hidden fixed bottom-0 inset-x-0 z-30 bg-page/95 backdrop-blur border-t border-line flex pb-[env(safe-area-inset-bottom)] print:hidden shadow-[0_-6px_20px_-12px_color-mix(in_srgb,var(--color-royal)_25%,transparent)]", "aria-label": "Sections", children: tabButtons("bar") }),
    /* @__PURE__ */ jsx(TipNudge, { tab, enabled: !insightPopupShowing, onSeen: markTipSeen, onOpenAll: () => setTipsOpen(true), onNavigate: navigateFromTip }),
    /* @__PURE__ */ jsx(InsightPopup, { insights, onOpen: openInsights, onVisible: setInsightPopupShowing }),
    /* @__PURE__ */ jsx(InsightsSheet, { open: insightsOpen, onClose: () => setInsightsOpen(false), insights, segment: insightSegment, onSegment: setInsightSegment, onChanged: refresh, onOpenRestock: () => {
      setInsightsOpen(false);
      setRestockMode("order");
      selectTab("restock");
    } }),
    /* @__PURE__ */ jsx(TipSheet, { open: tipsOpen, onClose: () => setTipsOpen(false), tab, onNavigate: navigateFromTip }),
    /* @__PURE__ */ jsx(StaffPicker, { open: staffPrompt !== null, prompt: staffPrompt ?? {}, team, current: name, onPick: pickStaff, onClose: () => closeStaff(null), onManageTeam: () => openSettings("team") })
  ] }) }) });
}
export {
  Home as component
};
