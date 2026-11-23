import { STATUS, FLOW } from "./constants";

const TONE_COLOR = { warning: "var(--warning)", info: "var(--blue)", violet: "var(--violet)", teal: "var(--teal)", orange: "var(--orange)", success: "var(--success)", danger: "var(--danger)", neutral: "var(--neutral)" };
export const toneColor = (t) => TONE_COLOR[t];
export function statusMix(byStatus) {
  return [...FLOW, "failed", "cancelled"].filter((s) => byStatus[s]).map((s) => ({ label: STATUS[s].label, value: byStatus[s], color: TONE_COLOR[STATUS[s].tone] }));
}
export const SERIES = [
  { key: "created", label: "Colis enregistrés", color: "var(--blue)" },
  { key: "delivered", label: "Colis livrés", color: "var(--success)" },
];
