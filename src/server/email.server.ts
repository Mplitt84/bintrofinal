import { clampOrderQty, unitsToPar } from "../lib/inventory-defaults.js";
import { businessSlug, displayBusinessName, type BusinessProfile } from "../lib/business-types.js";
import type { Product } from "./inventory.server.js";
import {
  buildPurchaseOrderCsv,
  groupPurchaseOrderLines,
  purchaseOrderFilename,
  purchaseOrderTotals,
  type PurchaseOrderLine,
} from "../lib/purchase-order.js";

import type { MailDraft } from "../lib/mail-draft.js";

export type SendResult =
  | { ok: true; to: string; count: number }
  | {
      ok: false;
      reason: "not_configured" | "empty" | "send_failed";
      message: string;
      /** The same email as plain text, so the device's mail app can send it instead. */
      draft?: MailDraft;
    };

/** Used when no sender is configured; Resend delivers from it without domain setup (to the account owner only). */
const FALLBACK_FROM_ADDRESS = "onboarding@resend.dev";

/** Restock lists go to the env override, else the profile's order email, else its main email. */
function recipient(profile: BusinessProfile) {
  return process.env.RESTOCK_EMAIL_TO?.trim() || profile.orderEmail.trim() || profile.email.trim();
}

/** Purchase orders can go somewhere else (a manager, a vendor rep) if configured. */
function orderRecipient(profile: BusinessProfile) {
  return process.env.PURCHASE_ORDER_EMAIL_TO?.trim() || recipient(profile);
}

/**
 * Providers only send from addresses they've verified. Resend's shared address always
 * works, so it's the default there; replies still reach the business via Reply-To.
 * SendGrid has no shared address, so it uses the business email (its verified sender).
 */
function sender(profile: BusinessProfile, provider: "resend" | "sendgrid") {
  const configured = process.env.RESTOCK_EMAIL_FROM?.trim();
  if (configured) return configured;
  const name = displayBusinessName(profile).replace(/[<>"]/g, "");
  const address = provider === "sendgrid" ? profile.email.trim() || FALLBACK_FROM_ADDRESS : FALLBACK_FROM_ADDRESS;
  return `Bintro · ${name} <${address}>`;
}

function formatDate() {
  return new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: process.env.BUSINESS_TIMEZONE?.trim() || process.env.SALON_TIMEZONE?.trim() || "America/New_York",
  });
}

function buildSubject(items: Product[], businessName: string) {
  return `${businessName} restock list — ${items.length} item${items.length === 1 ? "" : "s"} below par`;
}

function buildText(items: Product[], staffName: string) {
  const lines = items.map((p) => {
    const bits = [p.brand, p.size].filter(Boolean).join(" ");
    const label = bits ? `${p.name} (${bits})` : p.name;
    return `- ${label} — on hand ${p.qty}, par ${p.reorderThreshold}, order ${unitsToPar(p) || 1}+`;
  });

  return [
    `Products at or below their par level as of ${formatDate()}.`,
    "",
    ...lines,
    "",
    staffName ? `Sent by ${staffName} from Bintro.` : "Sent from Bintro.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(items: Product[], staffName: string) {
  const rows = items
    .map((p) => {
      const outOfStock = p.qty <= 0;
      const qtyColor = outOfStock ? "#c0392b" : "#b9791a";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(p.name)}</strong>
          <div style="color:#777;font-size:12px;">${escapeHtml([p.brand, p.size, p.category].filter(Boolean).join(" · "))}</div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;font-size:12px;">${escapeHtml(p.barcode)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:${qtyColor};font-weight:bold;">${p.qty}${outOfStock ? " (out)" : ""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#555;">${p.reorderThreshold}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${unitsToPar(p) || 1}+</td>
      </tr>`;
    })
    .join("");

  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#222;max-width:680px;">
    <h2 style="margin:0 0 4px;">Restock list — ${items.length} item${items.length === 1 ? "" : "s"} below par</h2>
    <p style="margin:0 0 16px;color:#777;font-size:13px;">As of ${escapeHtml(formatDate())}${staffName ? ` · sent by ${escapeHtml(staffName)}` : ""}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#f6f4f1;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">
          <th style="padding:8px 12px;">Product</th>
          <th style="padding:8px 12px;">Barcode</th>
          <th style="padding:8px 12px;text-align:right;">On hand</th>
          <th style="padding:8px 12px;text-align:right;">Par</th>
          <th style="padding:8px 12px;text-align:right;">Order</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:16px 0 0;color:#999;font-size:12px;">Sent automatically from Bintro.</p>
  </div>`;
}

type Attachment = { filename: string; content: string; type: string };

type MailPayload = {
  profile: BusinessProfile;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Attachment[];
};

function replyTo(profile: BusinessProfile) {
  return profile.email.trim() || profile.orderEmail.trim();
}

async function sendWithResend(apiKey: string, payload: MailPayload, from: string) {
  const reply = replyTo(payload.profile);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      ...(reply ? { reply_to: reply } : {}),
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((file) => ({
              filename: file.filename,
              content: file.content,
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}

async function sendWithSendGrid(apiKey: string, payload: MailPayload) {
  const from = sender(payload.profile, "sendgrid");
  const reply = replyTo(payload.profile);
  const match = from.match(/^(.*)<(.+)>$/);
  const fromEmail = match ? match[2]!.trim() : from;
  const fromName = match ? match[1]!.trim().replace(/^"|"$/g, "") : undefined;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: fromName ? { email: fromEmail, name: fromName } : { email: fromEmail },
      ...(reply && reply !== fromEmail ? { reply_to: { email: reply } } : {}),
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html", value: payload.html },
      ],
      ...(payload.attachments?.length
        ? {
            attachments: payload.attachments.map((file) => ({
              content: file.content,
              filename: file.filename,
              type: file.type,
              disposition: "attachment",
            })),
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`SendGrid responded ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}

/** Which provider is configured, if any. */
function providerKeys() {
  return {
    resendKey: process.env.RESEND_API_KEY?.trim(),
    sendGridKey: process.env.SENDGRID_API_KEY?.trim(),
  };
}

const NO_RECIPIENT: Extract<SendResult, { ok: false }> = {
  ok: false,
  reason: "not_configured",
  message: "Add an email address in Settings → Business profile so Bintro knows where to send this.",
};

const NOT_CONFIGURED: Extract<SendResult, { ok: false }> = {
  ok: false,
  reason: "not_configured",
  message:
    "Automatic email isn't set up on this site yet (it needs a RESEND_API_KEY or SENDGRID_API_KEY in Netlify).",
};

/**
 * Sends through whichever provider is configured and normalises the outcome. Every
 * failure carries a plain-text draft so the app can hand the email to the device's
 * mail app instead, which means the list can always go out.
 */
async function deliver(payload: MailPayload, count: number): Promise<SendResult> {
  const draft: MailDraft = { to: payload.to, subject: payload.subject, text: payload.text };
  const { resendKey, sendGridKey } = providerKeys();
  if (!resendKey && !sendGridKey) return { ...NOT_CONFIGURED, draft };
  if (!payload.to) return { ...NO_RECIPIENT, draft };

  try {
    if (resendKey) {
      const from = sender(payload.profile, "resend");
      try {
        await sendWithResend(resendKey, payload, from);
      } catch (error) {
        // A custom sender on an unverified domain is the usual cause; Resend's shared
        // address still delivers, so try once more with it.
        const fallback = `Bintro · ${displayBusinessName(payload.profile).replace(/[<>"]/g, "")} <${FALLBACK_FROM_ADDRESS}>`;
        if (from === fallback) throw error;
        console.warn("Resend rejected the sender, retrying with the shared address", error);
        await sendWithResend(resendKey, payload, fallback);
      }
    } else {
      await sendWithSendGrid(sendGridKey!, payload);
    }
    return { ok: true, to: payload.to, count };
  } catch (error) {
    console.error("Email send failed", error);
    return {
      ok: false,
      reason: "send_failed",
      message: error instanceof Error ? error.message : "The email provider rejected the request.",
      draft,
    };
  }
}

/**
 * Emails the below-par list to the business. Uses Resend when RESEND_API_KEY is set,
 * otherwise SendGrid when SENDGRID_API_KEY is set.
 */
export async function sendRestockEmail(
  items: Product[],
  staffName: string,
  profile: BusinessProfile,
): Promise<SendResult> {
  if (items.length === 0) {
    return { ok: false, reason: "empty", message: "Nothing is below par right now — no email sent." };
  }

  return deliver(
    {
      profile,
      to: recipient(profile),
      subject: buildSubject(items, displayBusinessName(profile)),
      text: buildText(items, staffName),
      html: buildHtml(items, staffName),
    },
    items.length,
  );
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildOrderSubject(lines: PurchaseOrderLine[], businessName: string) {
  const totals = purchaseOrderTotals(lines);
  return `${businessName} purchase order — ${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}, ${totals.unitCount} unit${totals.unitCount === 1 ? "" : "s"}`;
}

function buildOrderText(lines: PurchaseOrderLine[], staffName: string, note: string) {
  const totals = purchaseOrderTotals(lines);
  const blocks = groupPurchaseOrderLines(lines).map((group) => {
    const heading = group.brand ? `${group.vendor} — ${group.brand}` : group.vendor;
    const rows = group.lines.map((line) => {
      const bits = [line.size, line.category].filter(Boolean).join(" · ");
      const label = bits ? `${line.name} (${bits})` : line.name;
      return `  - ${clampOrderQty(line.qty)} x ${label} — barcode ${line.barcode}, on hand ${line.onHand}, par ${line.reorderThreshold}`;
    });
    return [heading, ...rows].join("\n");
  });

  const parts = [
    `Purchase order prepared ${formatDate()}.`,
    "",
    ...blocks.flatMap((block) => [block, ""]),
    `Totals: ${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}, ${totals.unitCount} unit${totals.unitCount === 1 ? "" : "s"}, est. ${money(totals.totalCents)}.`,
  ];
  if (note) parts.push(`Note: ${note}`);
  parts.push(
    staffName ? `Prepared by ${staffName} in Bintro.` : "Prepared in Bintro.",
    "Only the items selected by staff are included — anything left unselected stays on the restock list.",
  );
  return parts.join("\n");
}

function buildOrderHtml(lines: PurchaseOrderLine[], staffName: string, note: string) {
  const totals = purchaseOrderTotals(lines);

  const blocks = groupPurchaseOrderLines(lines)
    .map((group) => {
      const subtotal = group.lines.reduce((sum, line) => sum + clampOrderQty(line.qty) * line.unitCostCents, 0);
      const rows = group.lines
        .map((line) => {
          const qty = clampOrderQty(line.qty);
          return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">
          <strong>${escapeHtml(line.name)}</strong>
          <div style="color:#777;font-size:12px;">${escapeHtml([line.size, line.category].filter(Boolean).join(" · "))}</div>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;font-size:12px;">${escapeHtml(line.barcode)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#555;">${line.onHand}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#555;">${money(line.unitCostCents)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${money(qty * line.unitCostCents)}</td>
      </tr>`;
        })
        .join("");

      return `<h3 style="margin:22px 0 6px;font-size:15px;">${escapeHtml(group.vendor)}${
        group.brand ? ` <span style="color:#888;font-weight:normal;">· ${escapeHtml(group.brand)}</span>` : ""
      }</h3>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead>
        <tr style="background:#f6f4f1;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">
          <th style="padding:8px 12px;">Product</th>
          <th style="padding:8px 12px;">Barcode</th>
          <th style="padding:8px 12px;text-align:right;">On hand</th>
          <th style="padding:8px 12px;text-align:right;">Order qty</th>
          <th style="padding:8px 12px;text-align:right;">Unit</th>
          <th style="padding:8px 12px;text-align:right;">Line total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="padding:8px 12px;text-align:right;color:#777;font-size:12px;">Subtotal</td>
          <td style="padding:8px 12px;text-align:right;font-weight:bold;">${money(subtotal)}</td>
        </tr>
      </tfoot>
    </table>`;
    })
    .join("");

  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#222;max-width:680px;">
    <h2 style="margin:0 0 4px;">Purchase order — ${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}</h2>
    <p style="margin:0 0 4px;color:#777;font-size:13px;">Prepared ${escapeHtml(formatDate())}${staffName ? ` · by ${escapeHtml(staffName)}` : ""}</p>
    <p style="margin:0;color:#777;font-size:13px;">${totals.unitCount} unit${totals.unitCount === 1 ? "" : "s"} · est. total ${money(totals.totalCents)}</p>
    ${note ? `<p style="margin:12px 0 0;padding:10px 12px;background:#f6f4f1;font-size:13px;">${escapeHtml(note)}</p>` : ""}
    ${blocks}
    <p style="margin:20px 0 0;color:#999;font-size:12px;">
      Only the items selected by staff are included. Anything left unselected stays on the restock list for a future order.
      A CSV of this order is attached.
    </p>
  </div>`;
}

/**
 * Emails a hand-picked purchase order — only the ticked lines, at their edited
 * quantities — with the same order attached as a CSV for the vendor's system.
 */
export async function sendPurchaseOrderEmail(
  lines: PurchaseOrderLine[],
  staffName: string,
  note: string,
  profile: BusinessProfile,
): Promise<SendResult> {
  if (lines.length === 0) {
    return { ok: false, reason: "empty", message: "Select at least one item before emailing the order." };
  }

  const csv = buildPurchaseOrderCsv(lines);

  return deliver(
    {
      profile,
      to: orderRecipient(profile),
      subject: buildOrderSubject(lines, displayBusinessName(profile)),
      text: buildOrderText(lines, staffName, note),
      html: buildOrderHtml(lines, staffName, note),
      attachments: [
        {
          filename: purchaseOrderFilename(businessSlug(displayBusinessName(profile))),
          content: Buffer.from(csv, "utf8").toString("base64"),
          type: "text/csv",
        },
      ],
    },
    lines.length,
  );
}

// --- Insight reports ---------------------------------------------------------

export type ReportSection = {
  title: string;
  /** One short line under the section title. */
  lead?: string;
  columns: { label: string; align?: "left" | "right" }[];
  rows: string[][];
  /** Bold line under the table, e.g. a predicted total. */
  total?: string;
};

/** Reports go to the owner: env override, then the main email, then the order email. */
function reportRecipient(profile: BusinessProfile) {
  return process.env.INSIGHTS_EMAIL_TO?.trim() || profile.email.trim() || profile.orderEmail.trim();
}

function buildReportHtml(heading: string, summary: string, sections: ReportSection[], footer: string) {
  const tables = sections
    .map((section) => {
      const head = section.columns
        .map((c) => `<th style="padding:8px 12px;text-align:${c.align ?? "left"};">${escapeHtml(c.label)}</th>`)
        .join("");
      const body = section.rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell, i) =>
                  `<td style="padding:8px 12px;border-bottom:1px solid #e1e5ef;text-align:${section.columns[i]?.align ?? "left"};${
                    i === 0 ? "font-weight:bold;" : "color:#545c78;"
                  }">${escapeHtml(cell)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("");
      return `<h3 style="margin:24px 0 4px;font-size:16px;color:#0d1b52;">${escapeHtml(section.title)}</h3>
    ${section.lead ? `<p style="margin:0 0 8px;color:#545c78;font-size:13px;">${escapeHtml(section.lead)}</p>` : ""}
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      <thead><tr style="background:#f3f5fa;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#545c78;">${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${section.total ? `<p style="margin:8px 0 0;text-align:right;font-weight:bold;color:#0d1b52;">${escapeHtml(section.total)}</p>` : ""}`;
    })
    .join("");

  return `<div style="font-family:Helvetica,Arial,sans-serif;color:#121a36;max-width:680px;">
    <div style="height:3px;background:linear-gradient(90deg,#1f3fb8,#c99a2e);margin-bottom:16px;"></div>
    <h2 style="margin:0 0 4px;color:#0d1b52;">${escapeHtml(heading)}</h2>
    <p style="margin:0 0 12px;color:#545c78;font-size:13px;">${escapeHtml(formatDate())}</p>
    ${
      summary
        ? `<div style="background:#fcf6e6;border:1px solid #ecd9a5;border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.5;">
      <strong style="color:#7f5c05;">💡 AI summary</strong><br />${escapeHtml(summary)}</div>`
        : ""
    }
    ${tables}
    <p style="margin:20px 0 0;color:#8a90a6;font-size:12px;">${escapeHtml(footer)}</p>
  </div>`;
}

function buildReportText(heading: string, summary: string, sections: ReportSection[], footer: string) {
  const parts = [heading, formatDate(), ""];
  if (summary) parts.push(`AI summary: ${summary}`, "");
  for (const section of sections) {
    parts.push(section.title);
    if (section.lead) parts.push(section.lead);
    for (const row of section.rows) {
      parts.push(`- ${row[0]}: ${section.columns.slice(1).map((c, i) => `${c.label} ${row[i + 1]}`).join(", ")}`);
    }
    if (section.total) parts.push(section.total);
    parts.push("");
  }
  parts.push(footer);
  return parts.join("\n");
}

/** Weekly best sellers, monthly slow movers and fast-mover alerts all go out through here. */
export async function sendInsightReportEmail(
  profile: BusinessProfile,
  report: { subject: string; heading: string; summary: string; sections: ReportSection[] },
): Promise<SendResult> {
  const count = report.sections.reduce((n, s) => n + s.rows.length, 0);
  if (count === 0) return { ok: false, reason: "empty", message: "Nothing to report yet — no email sent." };
  const footer = "Sent automatically by Bintro. Turn these emails on or off in Settings → Business profile → Reports & alerts.";
  return deliver(
    {
      profile,
      to: reportRecipient(profile),
      subject: `${displayBusinessName(profile)} · ${report.subject}`,
      text: buildReportText(report.heading, report.summary, report.sections, footer),
      html: buildReportHtml(report.heading, report.summary, report.sections, footer),
    },
    count,
  );
}
