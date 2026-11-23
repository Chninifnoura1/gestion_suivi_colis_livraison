
import { useState } from "react";
import {
  Copy,
  SearchX,
  WifiOff,
  ShieldCheck,
  Phone,
  MapPin,
  ArrowLeft,
} from "lucide-react";

import PublicLayout from "../../layouts/PublicLayout";
import Timeline, { STATUS_ICON } from "../../components/domain/Timeline";
import RouteLine from "../../components/domain/RouteLine";
import { StatusBadge, PriorityBadge } from "../../components/domain/StatusBadge";
import {
  Card,
  CardHeader,
  InfoList,
  EmptyState,
  SearchInput,
  Skeleton,
} from "../../components/ui";
import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import { useParams, useNavigate } from "../../lib/router";
import { useToast } from "../../context/ToastContext";
import { getTracking } from "../../services/api";
import { PUBLIC_MESSAGE, STATUS } from "../../lib/constants";
import { fmtDate, fmtLongDate } from "../../lib/format";

function Loading() {
  return (
    <div
      className="stack"
      aria-busy="true"
      aria-label="Recherche du colis en cours"
    >
      <Card>
        <Skeleton w="30%" h={14} />
        <Skeleton w="45%" h={32} style={{ margin: "12px 0 20px" }} />
        <Skeleton h={50} r={12} />
      </Card>

      <div className="grid-main">
        <Card>
          <Skeleton w="40%" h={16} style={{ marginBottom: 20 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={44} style={{ marginBottom: 14 }} />
          ))}
        </Card>

        <Card>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={14} style={{ marginBottom: 18 }} />
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function TrackResult() {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: t, loading, error, reload } = useAsync(
    () => getTracking(code),
    [code]
  );

  const [q, setQ] = useState("");

  const again = (e) => {
    e.preventDefault();

    if (q.trim()) {
      navigate(`/suivi/${encodeURIComponent(q.trim().toUpperCase())}`);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié", "Vous pouvez le partager.");
    } catch {
      toast.error(
        "Copie impossible",
        "Copiez l'adresse depuis la barre du navigateur."
      );
    }
  };

  return (
    <PublicLayout>
      <div className="track-wrap">
        <div className="row row-between">
          <Button to="/" variant="ghost" size="sm" icon={ArrowLeft}>
            Nouveau suivi
          </Button>

          <form
            onSubmit={again}
            className="track-search"
            style={{ flex: "1 1 280px", maxWidth: 420 }}
          >
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Suivre un autre colis"
            />
          </form>
        </div>

        {loading && <Loading />}

        {error?.code === "NOT_FOUND" && (
          <Card>
            <EmptyState
              icon={SearchX}
              title="Numéro de suivi introuvable"
              description={`Aucun colis ne correspond à « ${code} ». Vérifiez le numéro indiqué sur votre bordereau et réessayez.`}
              action={
                <Button to="/" variant="primary">
                  Saisir un autre numéro
                </Button>
              }
            />
          </Card>
        )}

        {error && error.code !== "NOT_FOUND" && (
          <Card>
            <EmptyState
              icon={WifiOff}
              title="Connexion impossible"
              description="Nous n'avons pas pu récupérer les informations de votre colis. Vérifiez votre connexion internet puis réessayez."
              action={
                <Button variant="primary" onClick={() => reload()}>
                  Réessayer
                </Button>
              }
            />
          </Card>
        )}

        {t &&
          (() => {
            const s = STATUS[t.status] || STATUS.pending;
            const msg = PUBLIC_MESSAGE[t.status] || PUBLIC_MESSAGE.pending;
            const I = STATUS_ICON[t.status] || STATUS_ICON.pending;

            const agency = t.agency;
            const showEta = Boolean(t.eta) && t.status !== "delivered";

            const deliveryDate =
              t.status === "delivered"
                ? t.deliveredAt
                : showEta
                  ? t.eta
                  : null;

            return (
              <>
                <Card>
                  <div className="track-code">
                    <div>
                      <small>Numéro de suivi</small>
                      <h1>{t.id}</h1>
                    </div>

                    <div className="row">
                      <StatusBadge status={t.status} />

                      {t.priority === "express" && (
                        <PriorityBadge priority="express" />
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Copy}
                        onClick={copy}
                      >
                        Copier le lien
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`status-banner tone-${s.tone}`}
                    style={{ margin: "20px 0" }}
                  >
                    <I size={24} />

                    <div>
                      <h2>{msg.title}</h2>

                      <p>
                        {t.status === "delivered"
                          ? `Livré le ${fmtLongDate(t.deliveredAt)}.`
                          : t.status === "arrived"
                            ? `Arrivé à ${agency?.name || `l'agence de ${t.toCity}`}. ${msg.text}`
                            : msg.text}

                        {showEta &&
                          ` Livraison estimée le ${fmtLongDate(t.eta)}.`}
                      </p>
                    </div>
                  </div>

                  <RouteLine
                    from={t.fromCity}
                    to={t.toCity}
                    status={t.status}
                  />
                </Card>

                <div className="grid-main">
                  <Card>
                    <CardHeader
                      title="Historique du suivi"
                      subtitle="Du plus ancien au plus récent"
                    />

                    <Timeline
                      events={t.events}
                      status={t.status}
                      hideStatuses={["assigned", "out_for_delivery"]}
                    />
                  </Card>

                  <div className="stack">
                    <Card>
                      <CardHeader title="Informations du colis" />

                      <InfoList
                        items={[
                          ["Ville de départ", t.fromCity],
                          ["Ville d'arrivée", t.toCity],
                          ["Date d'expédition", fmtDate(t.shipDate)],
                          ...(deliveryDate
                            ? [
                                [
                                  t.status === "delivered"
                                    ? "Livré le"
                                    : "Livraison estimée",
                                  fmtDate(deliveryDate),
                                ],
                              ]
                            : []),
                          ["Mode", "Livraison à domicile"],
                        ]}
                      />

                      <p className="privacy-note">
                        <ShieldCheck
                          size={18}
                          color="var(--success)"
                          style={{ flexShrink: 0 }}
                        />
                        Pour votre confidentialité, les noms, numéros de
                        téléphone et adresses personnelles ne sont jamais
                        affichés ici.
                      </p>
                    </Card>

                    <Card>
                      <CardHeader
                        title="Une question ?"
                        subtitle="Contactez l'agence où se trouve actuellement votre colis"
                      />

                      {agency ? (
                        <div className="stack-sm">
                          {agency.name && <strong>{agency.name}</strong>}

                          {agency.address && (
                            <span
                              className="muted row"
                              style={{ gap: 8, flexWrap: "nowrap" }}
                            >
                              <MapPin size={15} />
                              {agency.address}
                            </span>
                          )}

                          {agency.phone && (
                            <a
                              className="row"
                              style={{ gap: 8 }}
                              href={`tel:${agency.phone.replace(/\s/g, "")}`}
                            >
                              <Phone size={15} />
                              {agency.phone}
                            </a>
                          )}

                          {!agency.address && !agency.phone && (
                            <span className="muted">
                              Les coordonnées de l'agence ne sont pas
                              disponibles.
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="muted">
                          Les coordonnées de l'agence de destination ne sont
                          pas disponibles pour le moment.
                        </p>
                      )}
                    </Card>
                  </div>
                </div>
              </>
            );
          })()}
      </div>
    </PublicLayout>
  );
}
