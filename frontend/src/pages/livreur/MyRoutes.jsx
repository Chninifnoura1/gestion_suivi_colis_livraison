
import { useState } from "react";
import {
  Route,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  Navigation,
  Weight,
} from "lucide-react";

import {
  PageHeader,
  EmptyState,
  Skeleton,
  ErrorState,
  Card,
} from "../../components/ui";

import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  listMyRoutes,
  declareRouteArrival,
  startRoute,
} from "../../services/api";

function formatDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseignée";

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStageStatus(etat) {
  switch (etat) {
    case "EN_COURS":
      return {
        label: "Étape actuelle",
        icon: Navigation,
        color: "current",
      };
    case "ARRIVEE":
      return {
        label: "En attente de confirmation",
        icon: Clock3,
        color: "waiting",
      };
    case "CONFIRMEE":
    case "TERMINEE":
      return {
        label: "Réception confirmée",
        icon: CheckCircle2,
        color: "done",
      };
    default:
      return {
        label: "À venir",
        icon: Clock3,
        color: "pending",
      };
  }
}

function ParcelItem({ colis }) {
  return (
    <div className="myroute-parcel">
      <div className="myroute-parcel-icon">
        <Package size={19} />
      </div>

      <div className="myroute-parcel-info">
        <strong>{colis.numero_suivi || "Colis"}</strong>
        <span>{colis.description || "Sans description"}</span>
        <span>
          Destinataire : {colis.destinataire_nom || "Non renseigné"}
        </span>
        {colis.destinataire_ville && (
          <span>Destination : {colis.destinataire_ville}</span>
        )}
      </div>

      {colis.poids != null && (
        <div className="myroute-parcel-weight">
          <Weight size={14} />
          {colis.poids} kg
        </div>
      )}
    </div>
  );
}

function RouteStage({ etape, trajet, onArrival, busy }) {
  const status = getStageStatus(etape.etat);
  const StatusIcon = status.icon;

  return (
    <div className={`myroute-stage ${status.color}`}>
      <div className="myroute-stage-rail">
        <div className={`myroute-stage-marker ${status.color}`}>
          <StatusIcon size={17} />
        </div>
      </div>

      <div className="myroute-stage-body">
        <div className="myroute-stage-heading">
          <div className="myroute-stage-place">
            <strong>{etape.nom_agence || "Agence"}</strong>
            <span>
              <MapPin size={14} />
              {etape.ville || "Ville non renseignée"}
            </span>
          </div>

          <span className={`myroute-stage-badge ${status.color}`}>
            {status.label}
          </span>
        </div>

        {etape.date_arrivee_reelle && (
          <p className="myroute-stage-date">
            <Clock3 size={14} />
            Arrivée déclarée : {formatDate(etape.date_arrivee_reelle)}
          </p>
        )}

        {etape.date_confirmation && (
          <p className="myroute-stage-date">
            <CheckCircle2 size={14} />
            Réception confirmée : {formatDate(etape.date_confirmation)}
          </p>
        )}

        <div className="myroute-stage-parcels">
          <div className="myroute-parcels-title">
            <Package size={16} />
            <strong>Colis à décharger</strong>
            <span>{etape.colis?.length || 0}</span>
          </div>

          {etape.colis?.length ? (
            etape.colis.map((colis) => (
              <ParcelItem key={colis.id} colis={colis} />
            ))
          ) : (
            <p className="myroute-empty-parcels">
              Aucun colis destiné à cette agence.
            </p>
          )}
        </div>

        {etape.etat === "EN_COURS" && (
          <Button
            onClick={() => onArrival(trajet.id, etape.agence_id)}
            disabled={busy}
          >
            <MapPin size={16} />
            Déclarer mon arrivée
          </Button>
        )}

        {etape.etat === "ARRIVEE" && (
          <div className="myroute-confirmation">
            <Clock3 size={16} />
            En attente de confirmation par l'administrateur
          </div>
        )}
      </div>
    </div>
  );
}

function RouteCard({ trajet, onArrival, onStart, busy }) {
  const etapes = [...(trajet.etapes || [])].sort(
    (a, b) => a.ordre - b.ordre
  );

  const currentStage = etapes.find((e) => e.etat === "EN_COURS");
  const waitingStage = etapes.find((e) => e.etat === "ARRIVEE");

  return (
    <Card className="myroute-card">
      <div className="myroute-card-header">
        <div className="myroute-card-title">
          <div className="myroute-route-icon">
            <Route size={21} />
          </div>
          <div>
            <span className="myroute-eyebrow">MISSION DE TRANSPORT</span>
            <h3>Trajet {String(trajet.id).slice(0, 8)}</h3>
          </div>
        </div>

        <span className="myroute-mission-status">
          {trajet.etat_livraison || "En cours"}
        </span>
      </div>

      <div className="myroute-journey">
        <div className="myroute-journey-point">
          <span className="myroute-point-dot departure" />
          <div>
            <small>VILLE DE DÉPART</small>
            <strong>{trajet.ville_depart || "Non renseignée"}</strong>
          </div>
        </div>

        <div className="myroute-journey-line">
          <span><Truck size={17} /></span>
        </div>

        <div className="myroute-journey-point">
          <span className="myroute-point-dot arrival" />
          <div>
            <small>VILLE D'ARRIVÉE</small>
            <strong>{trajet.ville_arrivee || "Non renseignée"}</strong>
          </div>
        </div>
      </div>

      <div className="myroute-dates">
        <div>
          <Clock3 size={16} />
          <span>
            Départ : <strong>{formatDate(trajet.date_depart)}</strong>
          </span>
        </div>
        <div>
          <Navigation size={16} />
          <span>
            Arrivée prévue :{" "}
            <strong>{formatDate(trajet.date_arrivee_prevue)}</strong>
          </span>
        </div>
      </div>

      {currentStage && (
        <div className="myroute-current">
          <div className="myroute-current-icon">
            <Truck size={20} />
          </div>
          <div>
            <small>PROCHAINE ÉTAPE À ATTEINDRE</small>
            <strong>
              {currentStage.nom_agence} — {currentStage.ville}
            </strong>
          </div>
        </div>
      )}

      {waitingStage && (
        <div className="myroute-alert">
          <Clock3 size={18} />
          <span>
            Votre arrivée à {waitingStage.ville} est déclarée.
            L'administrateur de cette agence doit confirmer la réception des colis.
          </span>
        </div>
      )}
    {trajet.etat_livraison === "EN_ATTENTE" &&
    etapes.some((e) => e.ordre === 0 && e.etat === "EN_COURS") && (
        <Button onClick={() => onStart(trajet.id)} disabled={busy}>
        <Truck size={16} />
        Démarrer le trajet
        </Button>
    )}
      <div className="myroute-stages-section">
        <div className="myroute-section-heading">
          <div>
            <h4>Étapes du trajet</h4>
            <p>Suivez la progression de votre mission</p>
          </div>
          <span className="myroute-stage-count">
            {etapes.length} étape(s)
          </span>
        </div>

        {etapes.length ? (
          <div className="myroute-stages">
            {etapes.map((etape) => (
              <RouteStage
                key={etape.id}
                etape={etape}
                trajet={trajet}
                onArrival={onArrival}
                busy={busy}
              />
            ))}
          </div>
        ) : (
          <p className="myroute-empty-parcels">
            Aucune étape disponible pour ce trajet.
          </p>
        )}
      </div>
    </Card>
  );
}

export default function MyRoutes() {
  const { token } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => listMyRoutes(token),
    [token]
  );
const handleStart = async (livraisonId) => {
  if (busy) return;

  setBusy(true);

  try {
    await startRoute(livraisonId, token);
    toast.success("Trajet démarré avec succès.");
    await reload();
  } catch (err) {
    toast.error(err.message || "Impossible de démarrer le trajet.");
  } finally {
    setBusy(false);
  }
};
  const handleArrival = async (livraisonId, agenceId) => {
    if (busy) return;

    setBusy(true);

    try {
      await declareRouteArrival(livraisonId, agenceId, token);
      toast.success(
        "Arrivée déclarée. En attente de confirmation de l'agence."
      );
      await reload();
    } catch (err) {
      toast.error(err.message || "Impossible de déclarer votre arrivée.");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  const trajets = data || [];

  return (
    <>
      <PageHeader
        title="Mes trajets"
        description="Consultez vos missions de transport, suivez les étapes et gérez vos arrivées entre les agences."
      />

      <div className="stack myroute-page">
        {loading ? (
          <div className="cards-grid">
            {[0, 1].map((i) => (
              <Skeleton key={i} h={420} r={14} />
            ))}
          </div>
        ) : !trajets.length ? (
          <EmptyState
            icon={Route}
            title="Aucun trajet actif"
            description="Vos missions de transport entre les agences apparaîtront ici dès qu'elles vous seront affectées."
          />
        ) : (
          <div className="cards-grid">
            {trajets.map((trajet) => (
            <RouteCard
                key={trajet.id}
                trajet={trajet}
                onArrival={handleArrival}
                onStart={handleStart}
                busy={busy}
            />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
