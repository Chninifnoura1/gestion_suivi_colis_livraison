import { ArrowRight } from "lucide-react";
import { Link } from "../../lib/router";
import { STATUS } from "../../lib/constants";
import { STATUS_ICON } from "./Timeline";
import { fromNow } from "../../lib/format";

export const CodeLink = ({ id, to }) => <Link to={to} className="code-link" onClick={(e) => e.stopPropagation()}>{id}</Link>;
export const RouteCell = ({ from, to }) => <span className="cell-route">{from}<ArrowRight size={14} aria-hidden />{to}</span>;
export const Rate = ({ value }) => (
  <div className="rate"><span className="rate-bar"><i style={{ width: `${value}%`, background: value >= 85 ? "var(--success)" : value >= 70 ? "var(--warning)" : "var(--danger)" }} /></span><b>{Math.round(value)} %</b></div>
);
export function ActivityList({ items, linkBase }) {
  return (
    <div>
      {items.map((h) => {
        const s = STATUS[h.to], I = STATUS_ICON[h.to];
        return (
          <div className="activity-item" key={h.id}>
            <span className={`activity-ic tone-${s.tone}`}><I size={15} /></span>
            <div className="activity-txt"><span style={{ color: "var(--text)", fontSize: "var(--fs-sm)" }}><strong>{h.parcelId}</strong> · {s.event}</span><span>{h.by} · {fromNow(h.at)}</span></div>
          </div>
        );
      })}
    </div>
  );
}
