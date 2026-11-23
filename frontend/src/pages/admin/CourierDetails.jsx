import { ArrowLeft, Pencil, Truck, CheckCircle2, XCircle, Activity, Phone, Mail, MapPin } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, KpiStrip, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import { AvailabilityBadge, ActiveBadge, DeliveryBadge } from "../../components/domain/StatusBadge";
import { ActivityList, Rate, CodeLink } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useParams, useNavigate, Link } from "../../lib/router";
import { getCourier } from "../../services/api";
import { fmtDate, phoneLink } from "../../lib/format";

export default function CourierDetails() {
  const { id } = useParams(), { user, token } = useAuth(), navigate = useNavigate();
  const { data: c, error, reload } = useAsync(
  () => getCourier(user, id, token),
  [id, token]
);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!c) return <PageSkeleton />;
  return (
    <>
      <PageHeader back={<Link to="/admin/livreurs" className="back-link"><ArrowLeft size={15} />Livreurs</Link>} title={c.name} description={`${c.matricule} · livreur depuis le ${fmtDate(c.since)}`} meta={<><AvailabilityBadge available={c.available} /><ActiveBadge active={c.active} /></>}
        actions={<Button variant="secondary" to={`/admin/livreurs/${c.id}/modifier`} icon={Pencil}>Modifier</Button>} />
      <div className="stack">
        <KpiStrip items={[{ label: "Total des livraisons", value: c.total, icon: Truck, tone: "info" }, { label: "Terminées", value: c.done, icon: CheckCircle2, tone: "success" }, { label: "Échouées", value: c.failed, icon: XCircle, tone: "danger" }, { label: "En cours", value: c.ongoing, icon: Activity, tone: "orange" }]} />
        <div className="grid-main">
          <div><h3 style={{ marginBottom: 12 }}>Livraisons</h3>
            <DataTable rows={c.deliveries} rowKey="id" pageSize={6} dense caption="Livraisons du livreur" searchPlaceholder="Rechercher une livraison…" searchText={(d) => `${d.id} ${d.parcelId} ${d.parcel.recipient.name}`} onRowClick={(d) => navigate(`/admin/livraisons/${d.id}`)}
              columns={[{ key: "id", header: "N°", primary: true, render: (d) => <CodeLink id={d.id} to={`/admin/livraisons/${d.id}`} /> }, { key: "parcelId", header: "Colis" }, { key: "to", header: "Destinataire", render: (d) => d.parcel.recipient.name, hideMobile: true }, { key: "at", header: "Affectée le", sort: (d) => d.assignedAt, render: (d) => fmtDate(d.assignedAt) }, { key: "status", header: "Statut", render: (d) => <DeliveryBadge status={d.status} /> }]} /></div>
          <div className="stack">
            <Card>
  <CardHeader title="Informations" />
  <InfoList items={[
    ["Téléphone", c.phone || "Non renseigné"],
    ["E-mail", c.email || "Non renseigné"],
    ["Agence", c.agency || "Non renseignée"],
    ["Ville actuelle", c.villeActuelle || "Non renseignée"],
    ["Transport inter-agences", c.peutTransport ? "Autorisé" : "Non autorisé"],
    ["Livraison chez les clients", c.peutLivrerClient ? "Autorisée" : "Non autorisée"],
    ["Taux de réussite", <Rate value={c.rate} />],
  ]} />
</Card>
            <Card><CardHeader title="Activité récente" />{c.activity.length ? <ActivityList items={c.activity} linkBase="/admin/colis" /> : <p className="muted">Aucune activité.</p>}</Card>
          </div>
        </div>
      </div>
    </>
  );
}
