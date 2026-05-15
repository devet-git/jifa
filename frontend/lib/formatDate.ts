const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function fmt(d: Date, pattern: string): string {
  const yyyy = d.getFullYear().toString();
  const yy = yyyy.slice(2);
  const m = d.getMonth() + 1;
  const mm = m.toString().padStart(2, "0");
  const mmm = MONTHS[m - 1];
  const mmmm = MONTHS_FULL[m - 1];
  const dd = d.getDate().toString().padStart(2, "0");
  const ddd = d.getDate().toString();

  return pattern
    .replace("YYYY", yyyy)
    .replace("YY", yy)
    .replace("MMMM", mmmm)
    .replace("MMM", mmm)
    .replace("MM", mm)
    .replace("DD", dd)
    .replace("D", ddd);
}

type TimeUnit = "h" | "hh" | "mm" | "ss" | "A" | "z";

export function fmtTime(d: Date, pattern: string): string {
  const hours = d.getHours();
  const h12 = hours % 12 || 12;
  const h12s = h12.toString();
  const h12d = h12s.padStart(2, "0");
  const h24s = hours.toString();
  const h24d = hours.toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  const sec = d.getSeconds().toString().padStart(2, "0");
  const ampm = hours < 12 ? "AM" : "PM";

  let tz = "";
  try {
    tz = d.toLocaleTimeString(undefined, { timeZoneName: "short" }).split(" ").pop() ?? "";
  } catch { /* ignore */ }

  return pattern
    .replace("hh", h12d)
    .replace("h", h12s)
    .replace("HH", h24d)
    .replace("H", h24s)
    .replace("mm", min)
    .replace("ss", sec)
    .replace("A", ampm)
    .replace("z", tz);
}

export const DATE_FORMATS = [
  { value: "MMM DD, YYYY", label: "Jan 15, 2025" },
  { value: "MMMM DD, YYYY", label: "January 15, 2025" },
  { value: "DD/MM/YYYY", label: "15/01/2025" },
  { value: "MM/DD/YYYY", label: "01/15/2025" },
  { value: "YYYY-MM-DD", label: "2025-01-15" },
  { value: "DD MMM YYYY", label: "15 Jan 2025" },
];

export const TIME_FORMATS = [
  { value: "h:mm A", label: "2:30 PM" },
  { value: "h:mm A z", label: "2:30 PM GMT+7" },
  { value: "HH:mm", label: "14:30" },
  { value: "HH:mm:ss", label: "14:30:00" },
];

export function formatDate(
  raw: string | undefined | null,
  dateFmt: string | undefined | null,
  timeFmt: string | undefined | null,
): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  if (dateFmt && timeFmt) {
    return `${fmt(d, dateFmt)} ${fmtTime(d, timeFmt)}`;
  }
  if (timeFmt) {
    return fmtTime(d, timeFmt);
  }
  return fmt(d, dateFmt || "MMM DD, YYYY");
}
