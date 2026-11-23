import { UserPlus, Eye, Pencil, Power } from "lucide-react";
import { PageHeader, Person } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import { AvailabilityBadge, ActiveBadge } from "../../components/domain/StatusBadge";
import { Rate } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useNavigate } from "../../lib/router";
import { listCouriers, toggleCourierActive } from "../../services/api";

export default function Couriers() {
  const { user, token } = useAuth(), toast = useToast(), confirm = useConfirm(), navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(
  () => listCouriers(user, token),
  [user?.id, token]
);
  const toggle = async (c) => {
    const ok = await confirm({ title: c.active ? `Désactiver ${c.name} ?` : `Réactiver ${c.name} ?`, message: c.active ? "Ce livreur ne pourra plus se connecter ni recevoir d'affectation." : "Ce livreur pourra de nouveau se connecter et recevoir des affectations.", confirmLabel: c.active ? "Désactiver" : "Réactiver", tone: c.active ? "danger" : "info" });
    if (!ok) return; await toggleCourierActive(user, c.id); toast.success(c.active ? "Compte désactivé" : "Compte réactivé", c.name); reload(true);
  };
  return (
    <>
      <PageHeader title="Livreurs" description="L'équipe de livraison à domicile de votre agence." actions={<Button to="/admin/livreurs/nouveau" icon={UserPlus}>Ajouter un livreur</Button>} />
      <DataTable rows={data} loading={loading} error={error} onRetry={reload} caption="Liste des livreurs" searchPlaceholder="Rechercher un livreur, un matricule…" searchText={(c) =>
  `${c.name} ${c.matricule} ${c.email} ${c.phone} ${c.villeActuelle}`
} onRowClick={(c) => navigate(`/admin/livreurs/${c.id}`)}
        filters={[{ id: "av", label: "Toutes les disponibilités", options: [{ value: "true", label: "Disponibles" }, { value: "false", label: "Indisponibles" }], get: (c) => c.available }, { id: "ac", label: "Tous les statuts", options: [{ value: "true", label: "Actifs" }, { value: "false", label: "Inactifs" }], get: (c) => c.active }]}
        columns={[
          { key: "name", header: "Livreur", primary: true, sort: (c) => c.name, render: (c) => <Person name={c.name} sub={c.email} /> },
          { key: "matricule", header: "Matricule", sort: (c) => c.matricule, hideMobile: true }, { key: "phone", header: "Téléphone", hideMobile: true },
          {
  key: "villeActuelle",
  header: "Ville actuelle",
  sort: (c) => c.villeActuelle,
  render: (c) => c.villeActuelle || "Non renseignée",
},
{
  key: "transport",
  header: "Transport inter-agences",
  render: (c) => c.peutTransport ? "Autorisé" : "Non autorisé",
  hideMobile: true,
},
{
  key: "livraisonClient",
  header: "Livraison client",
  render: (c) => c.peutLivrerClient ? "Autorisée" : "Non autorisée",
  hideMobile: true,
},
          { key: "available", header: "Disponibilité", render: (c) => <AvailabilityBadge available={c.available} /> },
          { key: "ongoing", header: "En cours", sort: (c) => c.ongoing, align: "right" }, { key: "total", header: "Livraisons", sort: (c) => c.total, align: "right" },
          { key: "rate", header: "Réussite", sort: (c) => c.rate, render: (c) => <Rate value={c.rate} />, hideMobile: true },
          { key: "active", header: "Compte", render: (c) => <ActiveBadge active={c.active} /> },
        ]}
        actions={(c) => [{ label: "Voir le profil", icon: Eye, onClick: () => navigate(`/admin/livreurs/${c.id}`) }, { label: "Modifier", icon: Pencil, onClick: () => navigate(`/admin/livreurs/${c.id}/modifier`) }, { separator: true }, { label: c.active ? "Désactiver" : "Réactiver", icon: Power, tone: c.active ? "danger" : undefined, onClick: () => toggle(c) }]} />
    </>
  );
}
