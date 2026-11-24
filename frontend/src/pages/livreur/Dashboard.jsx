
import { useState } from "react";
import { Phone, Navigation, MapPin, ArrowRight, CalendarCheck, Clock, Truck, CheckCircle2, PartyPopper } from "lucide-react";
import { PageHeader, Card, CardHeader, KpiStrip, Switch, PageSkeleton, ErrorState, EmptyState } from "../../components/ui";
import Button from "../../components/ui/Button";
import { AvailabilityBadge, DeliveryBadge } from "../../components/domain/StatusBadge";
import { ActivityList } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getDashboard, setAvailability } from "../../services/api";
import { fmtLongDate, greeting, phoneLink, mapsLink } from "../../lib/format";

export default function CourierDashboard() {
  const { user, token } = useAuth(), toast = useToast();
  const { data: d, error, reload } = useAsync(
    () => getDashboard(user, token),
    []
  );
  const [avail, setAvail] = useState(null);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;

  const available = avail ?? d.available;
  const n = d.next;
  const r = n?.parcel.recipient;
  const address = n && `${r.address}, ${r.city}`;
  const pct = d.today ? d.done / d.today : 0;
  const C = 2 * Math.PI * 38;

  const change = async (v) => {
    if (d.hasActiveRoute) return;

    try {
      await setAvailability(user, v, token);
      setAvail(v);
      toast.success(v ? "Vous êtes disponible" : "Vous êtes indisponible");
    } catch (error) {
      toast.error(error.message || "Impossible de modifier votre disponibilité");
    }
  };

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description={`${fmtLongDate(new Date())} — voici vos missions de la semaine.`}
        actions={
          <div className="card row" style={{ padding: "8px 14px", gap: 12 }}>
            <AvailabilityBadge available={available} />
            <Switch
              label="Disponibilité"
              checked={available}
              onChange={change}
              disabled={d.hasActiveRoute}
            />
          </div>
        }
      />

      <div className="stack">
        <KpiStrip
          items={[
            { label: "Livraisons cette semaine", value: d.today, icon: CalendarCheck, tone: "info" },
            { label: "En attente", value: d.waiting, icon: Clock, tone: "warning" },
            { label: "En cours", value: d.ongoing, icon: Truck, tone: "orange" },
            { label: "Terminées cette semaine", value: d.done, icon: CheckCircle2, tone: "success" },
          ]}
        />

        <div className="grid-main">
          {n ? (
            <section className="next-card rise" aria-label="Prochaine livraison">
              <div className="row row-between">
                <small>Prochaine livraison</small>
                <DeliveryBadge status={n.status} />
              </div>

              <h2 style={{ marginTop: 6 }}>{n.parcelId}</h2>

              <p style={{ color: "#dbe5f5", marginTop: 4, fontWeight: 600 }}>
                {r.name}
              </p>

              <div className="addr">
                <MapPin size={18} />
                <span>{address}</span>
              </div>

              <div className="next-actions">
                <Button
                  variant="glass"
                  size="lg"
                  icon={Phone}
                  href={phoneLink(r.phone)}
                >
                  Appeler
                </Button>

                <Button
                  variant="glass"
                  size="lg"
                  icon={Navigation}
                  href={mapsLink(address)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Itinéraire
                </Button>

              <Button
                variant="accent"
                size="lg"
                iconRight={ArrowRight}
                to="/livreur/trajets"
              >
                {n.status === "assigned" ? "Commencer" : "Continuer"}
              </Button>
              </div>
            </section>
          ) : (
            <Card>
              <EmptyState
                icon={PartyPopper}
                title="Aucune livraison en attente"
                description="Vous avez terminé votre tournée. Les nouvelles affectations apparaîtront ici."
                action={
                  <Button to="/livreur/livraisons" variant="secondary">
                    Voir l'historique
                  </Button>
                }
              />
            </Card>
          )}

          <Card className="rise" style={{ "--i": 1 }}>
            <CardHeader title="Progression de la semaine" />

            <div className="day-ring">
              <svg
                viewBox="0 0 90 90"
                role="img"
                aria-label={`${d.done} livraison(s) terminée(s) cette semaine sur ${d.today}`}
              >
                <circle className="t" cx="45" cy="45" r="38" />
                <circle
                  className="v"
                  cx="45"
                  cy="45"
                  r="38"
                  transform="rotate(-90 45 45)"
                  strokeDasharray={`${pct * C} ${C}`}
                />
              </svg>

              <div>
                <strong className="tabular">{d.done}/{d.today}</strong>
                <span className="muted">livraisons terminées</span>
              </div>
            </div>

            <hr className="divider" />

            <div className="mini-row" style={{ padding: 0 }}>
              <span className="muted">Total depuis le début</span>
              <strong className="tabular">{d.totals.total}</strong>
            </div>

            <div className="mini-row" style={{ paddingBottom: 0 }}>
              <span className="muted">Taux de réussite</span>
              <strong className="tabular">{Math.round(d.totals.rate)} %</strong>
            </div>
          </Card>
        </div>

        <Card className="rise" style={{ "--i": 2 }}>
          <CardHeader
            title="Activité récente"
            action={
            <Button to="/livreur/trajets" variant="ghost" size="sm">
              Mes trajets
            </Button>
            }
          />

          {d.activity.length ? (
            <ActivityList items={d.activity} />
          ) : (
            <p className="muted">Aucune activité récente.</p>
          )}
        </Card>
      </div>
    </>
  );
}
