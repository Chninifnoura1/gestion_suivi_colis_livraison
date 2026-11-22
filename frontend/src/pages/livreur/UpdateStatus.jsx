
import { useState } from "react";
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  AlertTriangle,
  Truck,
  UserCheck,
  PackageCheck,
  X,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Alert,
  PageSkeleton,
  ErrorState,
} from "../../components/ui";
import Button from "../../components/ui/Button";
import { DeliveryBadge } from "../../components/domain/StatusBadge";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useParams, Link } from "../../lib/router";
import {
  getDelivery,
  startDelivery,
  arriveAtAgency,
} from "../../services/api";

const STEPS = [
  ["Affectée", UserCheck],
  ["En cours", Truck],
  ["Terminée", PackageCheck],
];

export default function UpdateStatus() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data: d, error, reload } = useAsync(
    () => getDelivery(user, id, token),
    [id, token]
  );

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  const isTransport = d.missionType === "TRANSPORT_INTER_AGENCES";
  const isLocalDelivery = d.missionType === "LIVRAISON_CLIENT";

  const isAssigned = d.missionStatus === "EN_ATTENTE";
  const isInTransit = d.missionStatus === "EN_TRANSIT";
  const isArrived = d.missionStatus === "ARRIVEE_A_L_AGENCE";
  const isDelivered = d.missionStatus === "LIVREE";

  const state = (i) => {
    const at = isAssigned ? 0 : isInTransit ? 1 : 3;
    if (i === 2 && isArrived && isTransport) return "done";
    if (i === 2 && isDelivered && isLocalDelivery) return "done";
    return i < at ? "done" : i === at ? "now" : "";
  };

  const start = async () => {
    setBusy(true);
    try {
      await startDelivery(user, id, token);
      toast.success(
        isTransport ? "Transport démarré" : "Livraison démarrée",
        "Bonne route !"
      );
      await reload(true);
    } catch (e) {
      toast.error("Action impossible", e.message);
    } finally {
      setBusy(false);
    }
  };

  const arrive = async () => {
    setBusy(true);
    try {
      await arriveAtAgency(user, id, token);
      toast.success(
        "Arrivée enregistrée",
        "Le colis est arrivé à l'agence de destination."
      );
      await reload(true);
    } catch (e) {
      toast.error("Action impossible", e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        back={
          <Link
            to={`/livreur/livraisons/${id}`}
            className="back-link"
          >
            <ArrowLeft size={15} />
            Détails de la livraison
          </Link>
        }
        title="Mise à jour du statut"
        description={`${id} · ${d.parcel.recipient.name}`}
        meta={<DeliveryBadge status={d.status} />}
      />

      <Card style={{ maxWidth: 640 }}>
        <div className="step-flow" aria-label="Progression de la mission">
          {STEPS.map(([label, Icon], i) => {
            const s = state(i);
            return (
              <div key={label} className={`sf ${s}`}>
                <span className="sf-dot">
                  {s === "done" ? (
                    <CheckCircle2 size={20} />
                  ) : s === "bad" ? (
                    <X size={20} />
                  ) : (
                    <Icon size={19} />
                  )}
                </span>
                {label}
              </div>
            );
          })}
        </div>

        {isAssigned && (
          <div className="action-bar">
            <p className="muted">
              {isTransport
                ? "Vous êtes prêt à transporter les colis vers l'agence de destination ? Démarrez le transport."
                : "Vous êtes prêt à livrer le colis au client ? Démarrez la livraison."}
            </p>
            <Button
              size="lg"
              icon={Play}
              loading={busy}
              onClick={start}
            >
              {isTransport
                ? "Commencer le transport"
                : "Commencer la livraison"}
            </Button>
          </div>
        )}

        {isTransport && isInTransit && (
          <div className="action-bar">
            <p className="muted">
              Une fois arrivé à l'agence de destination, confirmez l'arrivée
              des colis transportés.
            </p>
            <Button
              size="lg"
              variant="success"
              icon={CheckCircle2}
              loading={busy}
              onClick={arrive}
            >
              Confirmer l'arrivée à l'agence
            </Button>
          </div>
        )}

        {isLocalDelivery && isInTransit && (
          <div className="action-bar">
            <p className="muted">
              Une fois chez le destinataire, confirmez la remise du colis
              ou signalez un problème.
            </p>
            <Button
              size="lg"
              variant="success"
              icon={CheckCircle2}
              to={`/livreur/livraisons/${id}/confirmation`}
            >
              Confirmer la livraison
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={AlertTriangle}
              to={`/livreur/livraisons/${id}/probleme`}
            >
              Signaler un problème
            </Button>
          </div>
        )}

        {isTransport && isArrived && (
          <Alert tone="success" title="Arrivée à l'agence confirmée">
            Le colis est arrivé à l'agence de destination. L'administrateur
            doit maintenant confirmer sa réception.
          </Alert>
        )}

        {isLocalDelivery && isDelivered && (
          <Alert tone="success" title="Livraison terminée">
            Ce colis a été remis au destinataire. Aucune autre action n'est
            possible.
          </Alert>
        )}
      </Card>
    </>
  );
}
