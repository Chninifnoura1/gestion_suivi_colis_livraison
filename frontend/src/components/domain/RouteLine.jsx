import { Package } from "lucide-react";
import { routeProgress } from "../../lib/timeline";

/* Motif d'identité : un itinéraire pointillé, la portion parcourue en orange, le colis qui avance. */
export default function RouteLine({ from, to, status, fromLabel = "Départ", toLabel = "Arrivée" }) {
  const p = routeProgress(status);
  return (
    <div className="route" style={{ "--p": p }} role="img" aria-label={`${from} vers ${to}, ${Math.round(p * 100)} % du trajet parcouru`}>
      <div className="route-end"><small>{fromLabel}</small><strong>{from}</strong></div>
      <div className="route-track">
        <i className="route-fill" />
        <span className="route-pin route-pin-a" />
        <span className="route-pin route-pin-b" />
        <span className="route-parcel"><Package size={14} /></span>
      </div>
      <div className="route-end route-end-right"><small>{toLabel}</small><strong>{to}</strong></div>
    </div>
  );
}
