
import { useEffect, useState } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  Truck,
} from "lucide-react";

import {
  PageHeader,
  Card,
  CardHeader,
  Skeleton,
  ErrorState,
} from "../../components/ui";

import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import {
  getParcelLoadingData,
  addParcelsToRoute,
} from "../../services/api";

export default function ParcelLoading() {
  const { user, token } = useAuth();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => getParcelLoadingData(user, token),
    [user, token]
  );

  const [routeId, setRouteId] = useState("");
  const [selectedParcelIds, setSelectedParcelIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const routes = data?.routes || [];
  const parcels = data?.parcels || [];

  useEffect(() => {
    if (!routes.length) {
      setRouteId("");
      return;
    }

    setRouteId((current) =>
      routes.some((route) => route.livraison_id === current)
        ? current
        : routes[0].livraison_id
    );
  }, [routes]);

  useEffect(() => {
    setSelectedParcelIds([]);
  }, [routeId]);

  const selectedRoute = routes.find(
    (route) => route.livraison_id === routeId
  );

  const orderedSteps = [...(selectedRoute?.etapes || [])].sort(
    (a, b) => a.ordre - b.ordre
  );

  const currentStep = orderedSteps.find(
    (step) => step.est_agence_admin
  );

  const laterSteps = currentStep
    ? orderedSteps.filter(
        (step) => step.ordre > currentStep.ordre
      )
    : [];

  const eligibleParcels = parcels.filter((parcel) =>
    laterSteps.some(
      (step) =>
        String(step.agence_id) ===
        String(parcel.agence_destination_id)
    )
  );

  const toggleParcel = (parcelId) => {
    setSelectedParcelIds((current) =>
      current.includes(parcelId)
        ? current.filter((id) => id !== parcelId)
        : [...current, parcelId]
    );
  };

  const toggleAll = () => {
    const allSelected =
      eligibleParcels.length > 0 &&
      selectedParcelIds.length === eligibleParcels.length;

    setSelectedParcelIds(
      allSelected
        ? []
        : eligibleParcels.map((parcel) => parcel.id)
    );
  };

  const confirm = async () => {
    if (!selectedRoute || selectedParcelIds.length === 0) {
      toast.error(
        "Sélection incomplète",
        "Choisissez un trajet et au moins un colis."
      );
      return;
    }

    setBusy(true);

    try {
      const result = await addParcelsToRoute(
        user,
        selectedRoute.livraison_id,
        selectedParcelIds,
        token
      );

      toast.success(
        "Chargement effectué",
        `${result.nombre_colis} colis ajouté(s) au trajet.`
      );

      setSelectedParcelIds([]);
      await reload(true);
    } catch (e) {
      toast.error("Chargement impossible", e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <>
      <PageHeader
        title="Chargement des colis"
        description="Sélectionnez un trajet actif puis choisissez les colis à transporter vers les agences suivantes."
      />

      <Card>
        <CardHeader
          title="1. Choisir un trajet"
          subtitle="Les trajets affichés passent par votre agence."
        />

        <div className="pick-list" style={{ marginTop: 14 }}>
          {loading ? (
            [0, 1].map((i) => (
              <Skeleton key={i} h={90} r={14} />
            ))
          ) : (
            routes.map((route) => {
              const selected =
                routeId === route.livraison_id;

              const steps = [...(route.etapes || [])].sort(
                (a, b) => a.ordre - b.ordre
              );

              return (
                <button
                  key={route.livraison_id}
                  type="button"
                  aria-pressed={selected}
                  className={`pick${selected ? " sel" : ""}`}
                  onClick={() =>
                    setRouteId(route.livraison_id)
                  }
                >
                  <div className="pick-top">
                    <div className="person">
                      <div
                        className="avatar"
                        style={{
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Truck size={18} />
                      </div>

                      <div className="person-txt">
                        <strong>
                          {route.ville_depart} → {route.ville_arrivee}
                        </strong>
                        <small>
                          {route.etat_livraison === "EN_ATTENTE"
                            ? "En attente"
                            : "En transit"}
                        </small>
                      </div>
                    </div>

                    <span className="muted">
                      {selected ? "Sélectionné" : "Choisir"}
                    </span>
                  </div>

                  <div
                    className="row"
                    style={{
                      marginTop: 12,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {steps.map((step, index) => (
                      <span
                        key={step.etape_id}
                        className="muted"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <MapPin size={13} />
                        {step.ville}
                        {step.est_agence_admin &&
                          " (Votre agence)"}
                        {index < steps.length - 1 && (
                          <ArrowRight size={13} />
                        )}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}

          {!loading && routes.length === 0 && (
            <p className="muted">
              Aucun trajet actif ne passe actuellement par votre agence.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. Étapes du trajet"
          subtitle="Votre agence est le point de chargement. Les colis doivent être destinés à une étape suivante."
        />

        <div className="pick-list" style={{ marginTop: 14 }}>
          {orderedSteps.map((step, index) => (
            <div
              className={`pick${step.est_agence_admin ? " sel" : ""}`}
              key={step.etape_id}
            >
              <div className="pick-top">
                <div className="person">
                  <strong style={{ minWidth: 24 }}>
                    {index + 1}.
                  </strong>

                  <div className="person-txt">
                    <strong>{step.nom_agence}</strong>
                    <small>{step.ville}</small>
                  </div>
                </div>

                <span className="muted">
                  {step.est_agence_admin
                    ? "Votre agence"
                    : step.ordre < (currentStep?.ordre ?? -1)
                      ? "Étape précédente"
                      : "Destination possible"}
                </span>
              </div>
            </div>
          ))}

          {selectedRoute && !currentStep && (
            <p className="muted">
              Votre agence ne figure pas parmi les étapes de ce trajet.
            </p>
          )}

          {!selectedRoute && !loading && (
            <p className="muted">
              Choisissez un trajet pour afficher ses étapes.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="3. Sélectionner les colis"
          subtitle="Seuls les colis de votre agence destinés à une étape ultérieure sont affichés."
        />

        {eligibleParcels.length > 0 && (
          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <label
              className="row"
              style={{ gap: 8, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={
                  selectedParcelIds.length ===
                  eligibleParcels.length
                }
                onChange={toggleAll}
              />
              <strong>Tout sélectionner</strong>
            </label>
          </div>
        )}

        <div className="pick-list" style={{ marginTop: 14 }}>
          {loading ? (
            [0, 1, 2].map((i) => (
              <Skeleton key={i} h={85} r={14} />
            ))
          ) : (
            eligibleParcels.map((parcel) => (
              <label
                key={parcel.id}
                className={`pick${
                  selectedParcelIds.includes(parcel.id)
                    ? " sel"
                    : ""
                }`}
                style={{ cursor: "pointer" }}
              >
                <div className="pick-top">
                  <div className="person">
                    <input
                      type="checkbox"
                      checked={selectedParcelIds.includes(
                        parcel.id
                      )}
                      onChange={() =>
                        toggleParcel(parcel.id)
                      }
                    />

                    <div className="person-txt">
                      <strong>{parcel.numero_suivi}</strong>

                      <small>
                        {parcel.description || "Sans description"}
                      </small>

                      <small>
                        Destination : {parcel.agence_destination}
                        {parcel.ville_destination
                          ? ` (${parcel.ville_destination})`
                          : ""}
                      </small>

                      {parcel.poids != null && (
                        <small>
                          Poids : {parcel.poids} kg
                        </small>
                      )}
                    </div>
                  </div>

                  <PackageCheck size={20} />
                </div>
              </label>
            ))
          )}

          {!loading &&
            selectedRoute &&
            eligibleParcels.length === 0 && (
              <p className="muted">
                Aucun colis éligible pour ce trajet depuis votre agence.
              </p>
            )}

          {!loading && !selectedRoute && routes.length === 0 && (
            <p className="muted">
              Aucun trajet disponible pour le chargement.
            </p>
          )}
        </div>
      </Card>

      <div className="assign-bar" aria-live="polite">
        <div className="sum">
          {selectedParcelIds.length > 0 ? (
            <>
              <strong>
                {selectedParcelIds.length} colis sélectionné(s)
              </strong>
              <ArrowRight size={16} />
              <strong>{selectedRoute?.ville_arrivee}</strong>
            </>
          ) : (
            <span className="muted">
              Sélectionnez les colis à charger.
            </span>
          )}
        </div>

        <Button
          variant="accent"
          size="lg"
          icon={CheckCircle2}
          disabled={
            loading ||
            busy ||
            !selectedRoute ||
            selectedParcelIds.length === 0
          }
          loading={busy}
          onClick={confirm}
        >
          Ajouter au trajet
        </Button>
      </div>
    </>
  );
}
