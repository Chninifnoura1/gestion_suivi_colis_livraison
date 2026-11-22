
import { useEffect, useState } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  Route,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";

import {
  PageHeader,
  Card,
  CardHeader,
  Avatar,
  Skeleton,
  ErrorState,
} from "../../components/ui";

import Button from "../../components/ui/Button";
import { AvailabilityBadge } from "../../components/domain/StatusBadge";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

import {
  getRouteAssignmentData,
  createMultiStageRoute,
} from "../../services/api";

export default function RouteAssignment() {
  const { user, token } = useAuth();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => getRouteAssignmentData(user, token),
    [user, token]
  );

  const [agencyIds, setAgencyIds] = useState(
    user?.agencyId ? [user.agencyId] : []
  );
  const [courierId, setCourierId] = useState(null);
  const [busy, setBusy] = useState(false);

  const agencies = data?.agencies || [];
  const couriersData = data?.couriers || [];

  const firstAgency = agencies.find(
    (agency) => agency.id === user?.agencyId
  );

  useEffect(() => {
    if (!data || !user?.agencyId) return;

    setAgencyIds((current) => {
      const validIds = current.filter((id) =>
        agencies.some((agency) => agency.id === id)
      );

      return [
        user.agencyId,
        ...validIds.filter((id) => id !== user.agencyId),
      ];
    });
  }, [data, user?.agencyId]);

  const selectedAgencies = agencyIds
    .map((id) => agencies.find((agency) => agency.id === id))
    .filter(Boolean);

  const eligibleCouriers = couriersData.filter(
    (courier) =>
      courier.available &&
      courier.active !== false &&
      firstAgency &&
      courier.ville_actuelle?.toLowerCase().trim() ===
        firstAgency.city?.toLowerCase().trim()
  );

  const selectedCourier = eligibleCouriers.find(
    (courier) => courier.id === courierId
  );

  const toggleAgency = (agency) => {
    if (agency.id === user?.agencyId) return;

    setAgencyIds((current) => {
      if (current.includes(agency.id)) {
        return current.filter((id) => id !== agency.id);
      }

      return [...current, agency.id];
    });
  };

  const moveAgency = (index, direction) => {
    const target = index + direction;

    if (index <= 0 || target <= 0 || target >= agencyIds.length) {
      return;
    }

    setAgencyIds((current) => {
      const updated = [...current];
      [updated[index], updated[target]] = [
        updated[target],
        updated[index],
      ];
      return updated;
    });
  };

  const removeAgency = (id) => {
    if (id === user?.agencyId) return;

    setAgencyIds((current) =>
      current.filter((agencyId) => agencyId !== id)
    );
  };

  const confirm = async () => {
    if (
      agencyIds.length < 2 ||
      agencyIds[0] !== user?.agencyId ||
      !selectedCourier
    ) {
      toast.error(
        "Informations incomplètes",
        "Choisissez au moins deux agences et un transporteur disponible."
      );
      return;
    }

    setBusy(true);

    try {
      await createMultiStageRoute(
        user,
        {
          courierId,
          agencyIds,
        },
        token
      );

      toast.success(
        "Trajet créé",
        `Le trajet de ${selectedAgencies.length} agences a été affecté à ${selectedCourier.name}.`
      );

      setAgencyIds([user.agencyId]);
      setCourierId(null);

      await reload(true);
    } catch (e) {
      toast.error("Création impossible", e.message);
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
        title="Trajets inter-agences"
        description="Créez un itinéraire avec plusieurs étapes et affectez-le à un transporteur."
      />

      <div className="assign">
        <Card>
          <CardHeader
            title="1. Choisir les agences"
            subtitle="Sélectionnez les agences dans l'ordre du trajet."
          />

          <div className="pick-list" style={{ marginTop: 14 }}>
            {loading ? (
              [0, 1, 2].map((i) => (
                <Skeleton key={i} h={85} r={14} />
              ))
            ) : (
              agencies.map((agency) => {
                const selected = agencyIds.includes(agency.id);
                const isFirst = agency.id === user?.agencyId;

                return (
                  <button
                    key={agency.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={isFirst}
                    className={`pick${selected ? " sel" : ""}`}
                    onClick={() => toggleAgency(agency)}
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
                          <MapPin size={18} />
                        </div>

                        <div className="person-txt">
                          <strong>{agency.name}</strong>
                          <small>{agency.city}</small>
                        </div>
                      </div>

                      <span className="muted">
                        {isFirst
                          ? "Départ obligatoire"
                          : selected
                            ? "Sélectionnée"
                            : "Ajouter"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}

            {!loading && agencies.length === 0 && (
              <p className="muted">
                Aucune agence active disponible.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="2. Ordre des étapes"
            subtitle="La première étape correspond toujours à votre agence."
          />

          <div className="pick-list" style={{ marginTop: 14 }}>
            {selectedAgencies.map((agency, index) => (
              <div className="pick sel" key={agency.id}>
                <div className="pick-top">
                  <div className="person">
                    <strong
                      className="tabular"
                      style={{ minWidth: 24 }}
                    >
                      {index + 1}.
                    </strong>

                    <div className="person-txt">
                      <strong>{agency.name}</strong>
                      <small>{agency.city}</small>
                    </div>
                  </div>

                  <div className="row" style={{ gap: 4 }}>
                    {index > 1 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Monter cette étape"
                        onClick={() => moveAgency(index, -1)}
                      >
                        <ChevronUp size={17} />
                      </button>
                    )}

                    {index > 0 && index < agencyIds.length - 1 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Descendre cette étape"
                        onClick={() => moveAgency(index, 1)}
                      >
                        <ChevronDown size={17} />
                      </button>
                    )}

                    {index > 0 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Retirer cette étape"
                        onClick={() => removeAgency(agency.id)}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!loading && selectedAgencies.length < 2 && (
              <p className="muted">
                Ajoutez au moins une autre agence pour créer le trajet.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="3. Choisir le transporteur"
          subtitle={
            firstAgency
              ? `Transporteurs disponibles au départ de ${firstAgency.city}`
              : "Agence de départ introuvable."
          }
        />

        <div
          className="pick-list"
          role="radiogroup"
          aria-label="Transporteur"
          style={{ marginTop: 14 }}
        >
          {loading ? (
            [0, 1].map((i) => (
              <Skeleton key={i} h={85} r={14} />
            ))
          ) : (
            eligibleCouriers.map((courier) => (
              <button
                key={courier.id}
                type="button"
                role="radio"
                aria-checked={courierId === courier.id}
                className={`pick${courierId === courier.id ? " sel" : ""}`}
                onClick={() => setCourierId(courier.id)}
              >
                <div className="pick-top">
                  <div className="person">
                    <Avatar name={courier.name} />

                    <div className="person-txt">
                      <strong>{courier.name}</strong>
                      <small>
                        {courier.telephone || courier.email}
                      </small>
                      <small>
                        Ville actuelle : {courier.ville_actuelle}
                      </small>
                    </div>
                  </div>

                  <AvailabilityBadge available={courier.available} />
                </div>
              </button>
            ))
          )}

          {!loading && eligibleCouriers.length === 0 && (
            <p className="muted">
              Aucun transporteur disponible dans la ville de l'agence de départ.
            </p>
          )}
        </div>
      </Card>

      <div className="assign-bar" aria-live="polite">
        <div className="sum">
          {selectedCourier && selectedAgencies.length >= 2 ? (
            <>
              <strong>{selectedAgencies.length} étapes</strong>
              <ArrowRight size={16} />
              <strong>{selectedCourier.name}</strong>
            </>
          ) : (
            <span className="muted">
              Sélectionnez au moins deux agences et un transporteur.
            </span>
          )}
        </div>

        <Button
          variant="accent"
          size="lg"
          icon={CheckCircle2}
          disabled={
            loading ||
            agencyIds.length < 2 ||
            agencyIds[0] !== user?.agencyId ||
            !selectedCourier
          }
          loading={busy}
          onClick={confirm}
        >
          Créer le trajet
        </Button>
      </div>
    </>
  );
}
