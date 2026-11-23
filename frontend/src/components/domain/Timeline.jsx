import { PackagePlus, Send, Route, Warehouse, UserCheck, Truck, PackageCheck, XCircle, Ban, Circle } from "lucide-react";
import { buildTimeline } from "../../lib/timeline";
import { fmtDate, fmtTime } from "../../lib/format";

export const STATUS_ICON = { pending: PackagePlus, shipped: Send, in_transit: Route, arrived: Warehouse, assigned: UserCheck, out_for_delivery: Truck, delivered: PackageCheck, failed: XCircle, cancelled: Ban };

/* showBy : affiche l'auteur de l'opération (espaces internes uniquement — jamais sur le portail public). */
export default function Timeline({
  events,
  status,
  showBy,
  compact,
  hideStatuses = [],
}) {
  const steps = buildTimeline(events, status).filter(
    (step) => !hideStatuses.includes(step.status)
  );
  return (
    <ol className={`timeline${compact ? " timeline-compact" : ""}`}>
      {steps.map((s, i) => {
        const Ic = s.state === "upcoming" ? Circle : (STATUS_ICON[s.status] || Circle);
        return (
          <li key={s.key} className={`tl-item tl-${s.state}${s.status === "failed" ? " tl-danger" : ""}`} style={{ "--i": i }}>
            <span className="tl-node"><Ic size={compact ? 13 : 15} aria-hidden /></span>
            <div className="tl-body">
              <strong>{s.label}</strong>
              {s.at ? <span className="tl-meta tabular">{fmtDate(s.at)} à {fmtTime(s.at)}{s.city ? ` · ${s.city}` : ""}</span> : <span className="tl-meta">À venir</span>}
              {showBy && s.by && <span className="tl-by">Par {s.by}</span>}
              {showBy && s.note && <span className="tl-note">{s.note}</span>}
            </div>
            {s.state === "current" && <span className="tl-now">Étape actuelle</span>}
          </li>
        );
      })}
    </ol>
  );
}
