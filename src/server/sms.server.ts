/**
 * Text messages to the site owner through Twilio, for pilot questions, app errors and
 * outages. Off until these Netlify environment variables are set:
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (a Twilio number, +1…) and
 * BINTRO_OWNER_PHONE (where texts go, +1…). Never throws.
 */
export function smsReady() {
  const e = process.env;
  return Boolean(e.TWILIO_ACCOUNT_SID?.trim() && e.TWILIO_AUTH_TOKEN?.trim() && e.TWILIO_FROM?.trim() && e.BINTRO_OWNER_PHONE?.trim());
}

/** Texts the owner. True when Twilio accepted it. */
export async function textOwner(body: string): Promise<boolean> {
  if (!smsReady()) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
  const token = process.env.TWILIO_AUTH_TOKEN!.trim();
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: process.env.TWILIO_FROM!.trim(),
        To: process.env.BINTRO_OWNER_PHONE!.trim(),
        // One SMS segment is 160 characters; keep alerts to about two.
        Body: body.slice(0, 300),
      }),
    });
    if (!res.ok) console.error("Owner text failed", res.status, (await res.text().catch(() => "")).slice(0, 200));
    return res.ok;
  } catch (error) {
    console.error("Owner text failed", error);
    return false;
  }
}
