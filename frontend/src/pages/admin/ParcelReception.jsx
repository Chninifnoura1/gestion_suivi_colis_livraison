import { useState } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  Truck,
  Clock,
  Phone,
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
  getParcelReceptionData,
  confirmRouteStageReception,
} from "../../services/api";

export default function ParcelReception() {
  const { user, token } = useAuth();
  const toast = useToast();

  const { data, loading, error, reload } = useAsync(
    () => getParcelReceptionData(user, token),
    [user, token]
  );

  const [busyId, setBusyId] = useState("");

  const routes = data || [];

  const confirm = async (route) => {
    if (!route?.livraison_id || !route?.etape?.agence_id) {
      toast.error("Réception impossible", "Informations du trajet invalides.");
      return;
    }

    setBusyId(route.livraison_id);

    try {
      await confirmRouteStageReception(
        user,
        route.livraison_id,
        route.etape.agence_id,
        token
      );

      toast.success(
        "Réception confirmée",
        "Les colis ont été réceptionnés. L'étape suivante peut être activée."
      );

      await reload(true);
    } catch (e) {
      toast.error("Confirmation impossible", e.message);
    } finally {
      setBusyId("");
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <>
      <PageHeader
        title="Réception des colis"
        description="Consultez les colis arrivés à votre agence et confirmez leur réception pour poursuivre le trajet inter-agences."
      />

      <Card>
        <CardHeader
          title="Trajets arrivés à votre agence"
          subtitle="Les trajets apparaissent ici après la déclaration d'arrivée du livreur."
        />

        <div className="pick-list" style={{ marginTop: 14 }}>
          {loading ? (
            [0, 1].map((i) => (
              <Skeleton key={i} h={180} r={14} />
            ))
          ) : (
            routes.map((route) => {
              const parcels = route.colis || [];
              const busy = busyId === route.livraison_id;

              return (
                <div className="pick" key={route.livraison_id}>
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
                          {route.ville_depart} <ArrowRight size={14} />{" "}
                          {route.ville_arrivee}
                        </strong>

                        <small>
                          <MapPin
                            size={13}
                            style={{
                              display: "inline",
                              verticalAlign: "middle",
                            }}
                          />{" "}
                          {route.etape?.nom_agence} —{" "}
                          {route.etape?.ville}
                        </small>

                        <small>
                          <CheckCircle2
                            size={13}
                            style={{
                              display: "inline",
                              verticalAlign: "middle",
                            }}
                          />{" "}
                          Arrivée déclarée par le livreur
                        </small>
                      </div>
                    </div>

                    <span className="muted">
                      {parcels.length} colis
                    </span>
                  </div>

                  {route.etape?.date_arrivee_reelle && (
                    <p className="muted" style={{ marginTop: 12 }}>
                      <Clock
                        size={14}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                        }}
                      />{" "}
                      Arrivée :{" "}
                      {new Date(
                        route.etape.date_arrivee_reelle
                      ).toLocaleString("fr-FR")}
                    </p>
                  )}

                  <div
                    className="pick-list"
                    style={{ marginTop: 14 }}
                  >
                    {parcels.map((parcel) => (
                      <div
                        className="pick"
                        key={parcel.id}
                        style={{ cursor: "default" }}
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
                              <PackageCheck size={18} />
                            </div>

                            <div className="person-txt">
                              <strong>{parcel.numero_suivi}</strong>

                              <small>
                                {parcel.description || "Sans description"}
                              </small>

                              {parcel.poids != null && (
                                <small>
                                  Poids : {parcel.poids} kg
                                </small>
                              )}

                              <small>
                                Destinataire :{" "}
                                {parcel.destinataire_nom || "Non renseigné"}
                              </small>

                              {parcel.destinataire_telephone && (
                                <small>
                                  <Phone
                                    size={12}
                                    style={{
                                      display: "inline",
                                      verticalAlign: "middle",
                                    }}
                                  />{" "}
                                  {parcel.destinataire_telephone}
                                </small>
                              )}

                              {parcel.destinataire_adresse && (
                                <small>
                                  Adresse : {parcel.destinataire_adresse}
                                </small>
                              )}

                              {parcel.destinataire_ville && (
                                <small>
                                  Ville : {parcel.destinataire_ville}
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {parcels.length === 0 && (
                      <p className="muted">
                        Aucun colis associé à cette étape.
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Button
                      variant="accent"
                      size="lg"
                      icon={CheckCircle2}
                      block
                      disabled={busyId !== "" && !busy}
                      loading={busy}
                      onClick={() => confirm(route)}
                    >
                      Confirmer la réception
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {!loading && routes.length === 0 && (
            <p className="muted">
              Aucun trajet n'est arrivé à votre agence pour le moment.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}