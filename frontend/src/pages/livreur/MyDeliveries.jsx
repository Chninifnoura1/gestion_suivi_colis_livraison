import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { PageHeader, Tabs, SearchInput, EmptyState, Skeleton, ErrorState } from "../../components/ui";
import DeliveryCard from "../../components/domain/DeliveryCard";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { listDeliveries } from "../../services/api";

const GROUPS = [["all", "Toutes"], ["assigned", "En attente"], ["out_for_delivery", "En cours"], ["delivered", "Terminées"], ["failed", "Échouées"]];

export default function MyDeliveries() {
  const { user, token } = useAuth(), [tab, setTab] = useState("all"), [q, setQ] = useState("");
  const { data, loading, error, reload } = useAsync(() => listDeliveries(user, token), [user, token]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const all = data || [], count = (g) => (g === "all" ? all.length : all.filter((d) => d.status === g).length);
  const rank = { out_for_delivery: 0, assigned: 1, failed: 2, delivered: 3 };
  const list = all.filter((d) => (tab === "all" || d.status === tab) && `${d.parcelId} ${d.parcel.recipient.name} ${d.parcel.recipient.address}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => rank[a.status] - rank[b.status] || b.assignedAt.localeCompare(a.assignedAt));
  return (
    <>
      <PageHeader title="Mes livraisons" description="Les colis qui vous sont affectés, des plus urgents aux plus anciens." />
      <div className="stack">
        <Tabs label="Filtrer par statut" value={tab} onChange={setTab} items={GROUPS.map(([id, label]) => ({ id, label, count: loading ? undefined : count(id) }))} />
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un colis, un destinataire, une adresse…" className="dt-search" />
        {loading ? <div className="cards-grid">{[0, 1, 2].map((i) => <Skeleton key={i} h={168} r={14} />)}</div>
          : !list.length ? <EmptyState icon={PackageSearch} title="Aucune livraison" description={q || tab !== "all" ? "Aucune livraison ne correspond à ce filtre." : "Vous n'avez aucune livraison pour le moment."} />
          : <div className="cards-grid">{list.slice(0, 40).map((d) => <DeliveryCard key={d.id} d={d} />)}</div>}
      </div>
    </>
  );
}
