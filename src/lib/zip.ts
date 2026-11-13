/**
 * A small ZIP writer (client-safe).
 *
 * The data export is a folder of spreadsheets, and one file is far easier for a
 * business to keep than nine. Files are stored, not compressed: CSV zips well but
 * compression would mean shipping a library, and a stored archive opens in every
 * operating system's built-in unzip.
 */

export type ZipEntry = { name: string; text: string };

const encoder = new TextEncoder();

/** CRC-32, the checksum every ZIP entry carries. */
export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time, which is how ZIP has always stored timestamps. */
function dosDateTime(date: Date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day =
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function u16(v: number) {
  return [v & 0xff, (v >>> 8) & 0xff];
}

function u32(v: number) {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

/** Builds the archive. The result is ready to hand to a download. */
export function zipFiles(entries: ZipEntry[], now = new Date()): Uint8Array {
  const { time, day } = dosDateTime(now);
  const chunks: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const body = encoder.encode(entry.text);
    const sum = crc32(body);

    const local = [
      ...u32(0x04034b50), // local file header
      ...u16(20), // version needed
      ...u16(0x0800), // UTF-8 names
      ...u16(0), // stored, no compression
      ...u16(time),
      ...u16(day),
      ...u32(sum),
      ...u32(body.length),
      ...u32(body.length),
      ...u16(name.length),
      ...u16(0),
      ...name,
      ...body,
    ];
    chunks.push(...local);

    central.push(
      ...u32(0x02014b50), // central directory header
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0x0800),
      ...u16(0),
      ...u16(time),
      ...u16(day),
      ...u32(sum),
      ...u32(body.length),
      ...u32(body.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name,
    );
    offset += local.length;
  }

  const end = [
    ...u32(0x06054b50), // end of central directory
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(offset),
    ...u16(0),
  ];

  return Uint8Array.from([...chunks, ...central, ...end]);
}

/** Hands the archive to the browser as a download. */
export function downloadZip(entries: ZipEntry[], filename: string) {
  const blob = new Blob([zipFiles(entries) as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before letting the blob go.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
