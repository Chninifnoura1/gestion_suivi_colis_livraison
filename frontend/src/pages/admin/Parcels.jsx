import { useMemo, useState } from "react";
import { Plus, Eye, Pencil, UserCheck, XCircle, Search, ArrowRight } from "lucide-react";
import { PageHeader, Drawer, InfoList } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import { StatusBadge, PriorityBadge } from "../../components/domain/StatusBadge";
import { CodeLink, RouteCell } from "../../components/domain/Cells";
import RouteLine from "../../components/domain/RouteLine";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNavigate, useQuery } from "../../lib/router";
import { listParcels, cancelParcel } from "../../services/api";
import { STATUS, CANCELLABLE } from "../../lib/constants";
import { fmtDate } from "../../lib/format";

export function ParcelPreview({ p, onClose }) {
  return (
    <Drawer open={!!p} onClose={onClose} title={p?.trackingNumber || p?.id} description={p && `Créé le ${fmtDate(p.createdAt)}`}
      footer={p && <><Button variant="secondary" onClick={onClose}>Fermer</Button><Button to={`/admin/colis/${p.id}`} iconRight={ArrowRight} onClick={onClose}>Voir tous les détails</Button></>}>
      {p && (
        <div className="drawer-parcel">
          <div className="row row-between"><StatusBadge status={p.status} /><PriorityBadge priority={p.priority} /></div>
          <RouteLine from={p.fromCity} to={p.toCity} status={p.status} />
          <InfoList cols={2} items={[["Expéditeur", p.sender.name], ["Destinataire", p.recipient.name], ["Contenu", p.content], ["Poids", `${p.weight} kg`], ["Livraison estimée", fmtDate(p.eta)], ["Livreur", p.courierName || "Non affecté"]]} />
        </div>
      )}
    </Drawer>
  );
}

export default function Parcels() {
  const { user, token } = useAuth(), toast = useToast(), confirm = useConfirm(), navigate = useNavigate(), { q } = useQuery();
  const { data, loading, error, reload } = useAsync(
  () => listParcels(user, token),
  [user, token]
);
  const [preview, setPreview] = useState(null);
  const rows = data || [];
  const cities = useMemo(() => [...new Set(rows.map((p) => p.toCity))].sort(), [rows]);
  const couriers = useMemo(() => [...new Set(rows.map((p) => p.courierName).filter(Boolean))].sort(), [rows]);
  const cancel = async (p) => {
    const ok = await confirm({ title: `Annuler le colis ${p.id} ?`, message: "Le colis passera au statut « Annulé » et ne pourra plus être expédié. Cette action est enregistrée dans l'historique.", confirmLabel: "Annuler le colis", cancelLabel: "Conserver", tone: "danger" });
    if (!ok) return; await cancelParcel(user, p.id); toast.success("Colis annulé", p.id); reload(true);
  };
  const cols = [
    { key: "trackingNumber", header: "N° de suivi", primary: true, sort: (p) => p.trackingNumber, render: (p) => <CodeLink id={p.trackingNumber || p.id} to={`/admin/colis/${p.id}`} /> },
    { key: "sender", header: "Expéditeur", render: (p) => p.sender.name, sort: (p) => p.sender.name, hideMobile: true },
    { key: "recipient", header: "Destinataire", render: (p) => p.recipient.name, sort: (p) => p.recipient.name },
    { key: "route", header: "Trajet", render: (p) => <RouteCell from={p.fromCity} to={p.toCity} /> },
    { key: "createdAt", header: "Créé le", sort: (p) => p.createdAt, render: (p) => fmtDate(p.createdAt) },
    { key: "status", header: "Statut", sort: (p) => STATUS[p.status].step, render: (p) => <StatusBadge status={p.status} /> },
  ];
  return (
    <>
      <PageHeader title="Gestion des colis" description="Recherchez, filtrez et suivez tous les colis de votre agence." actions={<Button to="/admin/colis/nouveau" icon={Plus}>Ajouter un colis</Button>} />
      <DataTable columns={cols} rows={data} loading={loading} error={error} onRetry={reload} rowKey="id" caption="Liste des colis" pageSize={10}
        searchPlaceholder="Rechercher par n° de suivi, nom, ville…" initialQuery={q || ""} defaultSort={{ key: "id", dir: "desc" }}
        searchText={(p) => `${p.trackingNumber || p.id} ${p.sender.name} ${p.recipient.name} ${p.fromCity} ${p.toCity} ${p.content}`}
        filters={[
          { id: "status", label: "Tous les statuts", options: Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label })), get: (p) => p.status },
          { id: "city", label: "Toutes les villes", options: cities.map((c) => ({ value: c, label: `Arrivée : ${c}` })), get: (p) => p.toCity },
          { id: "courier", label: "Tous les livreurs", options: couriers.map((c) => ({ value: c, label: c })), get: (p) => p.courierName },
        ]}
        dates={{ label: "Date de création", get: (p) => p.createdAt }} onRowClick={(p) => navigate(`/admin/colis/${p.id}`)}
        empty={undefined}
        actions={(p) => [
          { label: "Aperçu rapide", icon: Eye, onClick: () => setPreview(p) },
          { label: "Voir les détails", icon: Search, onClick: () => navigate(`/admin/colis/${p.id}`) },

          p.canModify && !["delivered", "cancelled"].includes(p.status) && {
            label: "Modifier",
            icon: Pencil,
            onClick: () => navigate(`/admin/colis/${p.id}/modifier`),
          },

          p.canModify && CANCELLABLE.includes(p.status) && { separator: true },

          p.canModify && CANCELLABLE.includes(p.status) && {
            label: "Annuler le colis",
            icon: XCircle,
            tone: "danger",
            onClick: () => cancel(p),
          },
        ]} />
      <ParcelPreview p={preview} onClose={() => setPreview(null)} />
    </>
  );
}
