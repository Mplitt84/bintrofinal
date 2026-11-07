/** An email ready to hand to the device's mail app when the server can't send it. */
export type MailDraft = { to: string; subject: string; text: string };

/** Some mail apps drop mailto: links much past ~2,000 characters, so long lists are trimmed. */
const MAX_MAILTO_BODY = 1800;

function trimBody(text: string) {
  if (text.length <= MAX_MAILTO_BODY) return text;
  const lines = text.split("\n");
  const kept: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (length + line.length + 1 > MAX_MAILTO_BODY - 80) break;
    kept.push(line);
    length += line.length + 1;
  }
  const dropped = lines.length - kept.length;
  return `${kept.join("\n")}\n\n…and ${dropped} more line${dropped === 1 ? "" : "s"}. Download the CSV from Bintro for the full list.`;
}

export function mailtoHref(draft: MailDraft) {
  const params = `subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(trimBody(draft.text))}`;
  return `mailto:${encodeURIComponent(draft.to.trim()).replace(/%40/g, "@")}?${params}`;
}

/** Opens the device's mail app with the draft filled in. */
export function openMailDraft(draft: MailDraft) {
  window.location.href = mailtoHref(draft);
}
