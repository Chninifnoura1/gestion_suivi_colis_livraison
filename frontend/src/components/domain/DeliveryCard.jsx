import { MapPin, Phone, Navigation, Clock } from "lucide-react";
import { DeliveryBadge, PriorityBadge } from "./StatusBadge";
import Button from "../ui/Button";
import { fmtDate, phoneLink, mapsLink } from "../../lib/format";

/* Carte de livraison — grandes zones tactiles (44 px minimum). */
export default function DeliveryCard({ d }) {
  const r = d.parcel.recipient, address = `${r.address}, ${r.city}`;
  return (
    <article className={`dcard${d.parcel.priority === "express" ? " express" : ""}`}>
      <div className="dcard-top"><strong>{d.parcelId}</strong><div className="row" style={{ gap: 6 }}>{d.parcel.priority === "express" && <PriorityBadge priority="express" />}<DeliveryBadge status={d.status} /></div></div>
      <div className="dcard-addr"><strong style={{ fontWeight: 600 }}>{r.name}</strong><span><MapPin size={14} />{address}</span><span><Clock size={14} />Affectée le {fmtDate(d.assignedAt)}</span></div>
      <div className="dcard-actions">
        <Button to={`/livreur/livraisons/${d.parcelId}`} variant={["assigned", "out_for_delivery"].includes(d.status) ? "primary" : "secondary"}>Voir les détails</Button>
        <Button variant="secondary" href={mapsLink(address)} target="_blank" rel="noreferrer" icon={Navigation} aria-label="Ouvrir l'itinéraire" />
        <Button variant="secondary" href={phoneLink(r.phone)} icon={Phone} aria-label={`Appeler ${r.name}`} />
      </div>
    </article>
  );
}
