
import { Clock, Activity, CheckCircle2 } from "lucide-react";
import { PageHeader, KpiStrip, Person } from "../../components/ui";
import DataTable from "../../components/data/DataTable";
import { DeliveryBadge } from "../../components/domain/StatusBadge";
import { CodeLink } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { listDeliveries, confirmReception } from "../../services/api";
import { fmtDate } from "../../lib/format";

const STATUS_MAP = {
  EN_ATTENTE: "assigned",
  EN_TRANSIT: "out_for_delivery",
  ARRIVEE_A_L_AGENCE: "arrived",
  LIVREE: "delivered",
};

const STATUS_LABELS = {
  assigned: "En attente",
  out_for_delivery: "En cours",
  arrived: "Arrivée à l'agence",
  delivered: "Terminée",
};

export default function Deliveries() {
  const { user, token } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const { data, loading, error, reload } = useAsync(
    () => listDeliveries(user, token),
    [user, token]
  );

  const rows = data || [];
  const n = (status) =>
    rows.filter((d) => d.etat_livraison === status).length;

  const couriers = [
    ...new Set(rows.map((d) => d.livreur_email || d.livreur_id)),
  ].sort();

  const handleConfirmReception = async (mission) => {
    const ok = await confirm({
      title: "Confirmer la réception ?",
      message:
        "Les colis de cette mission seront transférés vers votre agence.",
      confirmLabel: "Confirmer la réception",
      cancelLabel: "Annuler",
      tone: "info",
    });

    if (!ok) return;

    try {
      const result = await confirmReception(user, mission.id, token);

      toast.success(
        "Réception confirmée",
        `${result.colis_deplaces ?? "Les"} colis reçus par votre agence.`
      );

      reload(true);
    } catch (e) {
      toast.error("Confirmation impossible", e.message);
    }
  };

  return (
    <>
      <PageHeader
      
        title="Livraisons"
        description="Suivi des missions de transport entre les agences."
      />

      <div className="stack">
        <KpiStrip
          items={[
            {
              label: "En attente",
              value: n("EN_ATTENTE"),
              icon: Clock,
              tone: "warning",
            },
            {
              label: "En cours",
              value: n("EN_TRANSIT"),
              icon: Activity,
              tone: "orange",
            },
            {
              label: "Arrivées à l'agence",
              value: n("ARRIVEE_A_L_AGENCE"),
              icon: CheckCircle2,
              tone: "success",
            },
            {
              label: "Terminées",
              value: n("LIVREE"),
              icon: CheckCircle2,
              tone: "success",
            },
          ]}
        />

        <DataTable
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          caption="Missions de transport inter-agences"
          pageSize={10}
          defaultSort={{ key: "created_at", dir: "desc" }}
          searchPlaceholder="Rechercher par mission, livreur ou ville…"
          searchText={(d) =>
            `${d.id} ${d.livreur_email || ""} ${d.nom || ""} ${
              d.prenom || ""
            } ${d.ville_depart} ${d.ville_arrivee}`
          }
          filters={[
            {
              id: "st",
              label: "Tous les statuts",
              options: Object.entries(STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
              get: (d) => STATUS_MAP[d.etat_livraison] || d.etat_livraison,
            },
            {
              id: "co",
              label: "Tous les livreurs",
              options: couriers.map((c) => ({ value: c, label: c })),
              get: (d) => d.livreur_email || d.livreur_id,
            },
          ]}
          dates={{
            label: "Date de création",
            get: (d) => d.created_at,
          }}
          actions={(d) => [
            d.type_mission === "TRANSPORT_INTER_AGENCES" &&
            d.etat_livraison === "ARRIVEE_A_L_AGENCE" &&
            String(d.agence_arrivee_id) === String(user?.agenceId || user?.agency?.id)
              ? {
                  label: "Confirmer la réception",
                  icon: CheckCircle2,
                  onClick: () => handleConfirmReception(d),
                }
              : null,
          ]}
          columns={[
            {
              key: "id",
              header: "N° mission",
              primary: true,
              sort: (d) => d.id,
              render: (d) => (
  <CodeLink
                  id={d.id}
                  to={`/admin/livraisons/${d.id}`}
                />
              ),
            },
            {
              key: "courier",
              header: "Livreur",
              sort: (d) => d.livreur_email || "",
              render: (d) => (
                <Person
                  name={
                    [d.prenom, d.nom].filter(Boolean).join(" ") ||
                    d.livreur_email ||
                    d.livreur_id
                  }
                  size="sm"
                />
              ),
            },
            {
              key: "departure",
              header: "Agence de départ",
              sort: (d) => d.ville_depart,
              render: (d) => d.ville_depart,
            },
            {
              key: "arrival",
              header: "Agence d'arrivée",
              sort: (d) => d.ville_arrivee,
              render: (d) => d.ville_arrivee,
            },
            {
              key: "at",
              header: "Créée le",
              sort: (d) => d.created_at,
              render: (d) => fmtDate(d.created_at),
            },
            {
              key: "status",
              header: "Statut",
              render: (d) => (
                <DeliveryBadge
                  status={STATUS_MAP[d.etat_livraison] || d.etat_livraison}
                />
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
