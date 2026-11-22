import { ArrowLeft, Phone, Navigation, MapPin, Box, Inbox, ClipboardCheck, AlertTriangle } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, PageSkeleton, ErrorState, Alert } from "../../components/ui";
import Button from "../../components/ui/Button";
import Timeline from "../../components/domain/Timeline";
import { DeliveryBadge, PriorityBadge } from "../../components/domain/StatusBadge";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useParams, Link } from "../../lib/router";
import { getDelivery } from "../../services/api";
import { fmtDate, fmtDateTime, phoneLink, mapsLink } from "../../lib/format";

export default function CourierDeliveryDetails() {
  const { id } = useParams(), { user, token } = useAuth();
  const { data: d, error, reload } = useAsync(
  () => getDelivery(user, id, token),
  [id, token]
  );
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const p = d.parcel, r = p.recipient, address = `${r.address}, ${r.city}`, open = ["assigned", "out_for_delivery"].includes(d.status);
  return (
    <>
      <PageHeader back={<Link to="/livreur/livraisons" className="back-link"><ArrowLeft size={15} />Mes livraisons</Link>} title={p.id} description={`Livraison ${d.id} · affectée le ${fmtDate(d.assignedAt)}`} meta={<><DeliveryBadge status={d.status} />{p.priority === "express" && <PriorityBadge priority="express" />}</>} />
      <div className="stack">
        {d.failure && <Alert tone="danger" title={`Échec signalé : ${d.failure.reason}`}>{d.failure.comment}</Alert>}
        {open && (
          <div className="action-bar">
            <Button size="lg" to={`/livreur/livraisons/${p.id}/statut`} icon={ClipboardCheck}>{d.status === "assigned" ? "Commencer la livraison" : "Mettre à jour le statut"}</Button>
            <div className="grid-2" style={{ gap: 10 }}><Button size="lg" variant="secondary" href={phoneLink(r.phone)} icon={Phone}>Appeler</Button><Button size="lg" variant="secondary" href={mapsLink(address)} target="_blank" rel="noreferrer" icon={Navigation}>Itinéraire</Button></div>
            {d.status === "out_for_delivery" && <Button size="lg" variant="ghost" to={`/livreur/livraisons/${p.id}/probleme`} icon={AlertTriangle}>Signaler un problème</Button>}
          </div>
        )}
        <div className="grid-even">
          <Card><CardHeader icon={Inbox} title="Destinataire" /><InfoList items={[["Nom", r.name], ["Téléphone", <a href={phoneLink(r.phone)}>{r.phone}</a>], ["Adresse de livraison", <span className="row" style={{ gap: 6, flexWrap: "nowrap", alignItems: "flex-start" }}><MapPin size={15} style={{ marginTop: 3, flexShrink: 0 }} />{address}</span>]]} />
            <Button className="mt" variant="secondary" size="sm" href={mapsLink(address)} target="_blank" rel="noreferrer" icon={Navigation}>Ouvrir dans Maps</Button></Card>
<Card>
  <CardHeader icon={Box} title="Colis" />
  <InfoList
    cols={2}
    items={[
      ["Contenu", p.content],
      ["Poids", `${p.weight} kg`],
      ["Départ", p.fromCity],
      ["Destination", p.toCity],
      ["Livraison estimée", p.eta ? fmtDate(p.eta) : "Non définie"],
    ]}
  />
</Card>
        </div>
        <Card><CardHeader title="Suivi du colis" subtitle={d.completedAt ? `Terminée le ${fmtDateTime(d.completedAt)}` : undefined} /><Timeline events={p.events} status={p.status} compact /></Card>
      </div>
    </>
  );
}
