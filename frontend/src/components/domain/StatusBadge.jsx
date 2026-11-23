import { Badge } from "../ui";
import { STATUS, DELIVERY_STATUS } from "../../lib/constants";

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, tone: "neutral" };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}
export function DeliveryBadge({ status }) {
  const s = DELIVERY_STATUS[status] || { label: status, tone: "neutral" };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}
export const PriorityBadge = ({ priority }) => priority === "express" ? <Badge tone="orange">Express</Badge> : <Badge tone="neutral">Standard</Badge>;
export const AvailabilityBadge = ({ available }) => <Badge tone={available ? "success" : "neutral"} dot>{available ? "Disponible" : "Indisponible"}</Badge>;
export const ActiveBadge = ({ active }) => <Badge tone={active ? "success" : "neutral"} dot>{active ? "Actif" : "Inactif"}</Badge>;
