import { DEMO_NOW } from "../data/seed";

const d = (v) => (v instanceof Date ? v : new Date(v));
const pad = (n) => String(n).padStart(2, "0");

export const fmtDate = (v) => { if (!v) return "—"; const x = d(v); return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()}`; };
export const fmtTime = (v) => { const x = d(v); return `${pad(x.getHours())}:${pad(x.getMinutes())}`; };
export const fmtDateTime = (v) => (v ? `${fmtDate(v)} · ${fmtTime(v)}` : "—");
export const fmtLongDate = (v) => d(v).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const fmtShort = (v) => d(v).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
export const toInputDate = (v) => { const x = d(v); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const sameDay = (a, b) => toInputDate(a) === toInputDate(b);
export const fmtPct = (n) => `${Math.round(n)} %`;

/* « il y a 3 h » — calculé par rapport à l'horloge de démonstration. À remplacer par Date.now() avec l'API réelle. */
export function fromNow(v, ref = DEMO_NOW) {
  const diff = (ref.getTime() - d(v).getTime()) / 60000;
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${Math.round(diff)} min`;
  if (diff < 1440) return `il y a ${Math.round(diff / 60)} h`;
  if (diff < 1440 * 7) return `il y a ${Math.round(diff / 1440)} j`;
  return fmtDate(v);
}

export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const plural = (n, one, many) => `${n} ${n > 1 ? many || one + "s" : one}`;
export const greeting = (ref = DEMO_NOW) => { const h = ref.getHours(); return h < 6 ? "Bonsoir" : h < 18 ? "Bonjour" : "Bonsoir"; };
export const phoneLink = (p) => `tel:${String(p).replace(/\s/g, "")}`;
export const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
