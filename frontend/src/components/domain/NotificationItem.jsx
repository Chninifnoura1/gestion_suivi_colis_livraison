import { Package, Truck, AlertTriangle, UserCheck, Info } from "lucide-react";
import { fromNow } from "../../lib/format";

export const NOTIF_CATEGORIES = {
  Colis: { icon: Package, tone: "info" },
  Livraison: { icon: Truck, tone: "teal" },
  Incident: { icon: AlertTriangle, tone: "danger" },
  Affectation: { icon: UserCheck, tone: "violet" },
  Système: { icon: Info, tone: "neutral" },
};

export default function NotificationItem({ n, onClick, actions }) {
  const c = NOTIF_CATEGORIES[n.category] || NOTIF_CATEGORIES.Système, I = c.icon;
  return (
    <div className={`notif${n.read ? "" : " unread"}`}>
      <button className="notif-main" onClick={onClick}>
        <span className={`notif-ic tone-${c.tone}`}><I size={16} /></span>
        <span className="notif-txt"><strong>{n.title}</strong><span>{n.message}</span><small>{n.category} · {fromNow(n.at)}</small></span>
        {!n.read && <i className="notif-dot" aria-label="Non lue" />}
      </button>
      {actions}
    </div>
  );
}
