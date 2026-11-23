import { useState } from "react";
import { Package, PackagePlus, Clock, Route, CheckCircle2, AlertTriangle, Truck, Activity, Percent, UserCheck, ListChecks } from "lucide-react";
import { PageHeader, Card, CardHeader, Tabs, KpiStrip, PageSkeleton, ErrorState, Avatar } from "../../components/ui";
import Button from "../../components/ui/Button";
import { AreaChart, Donut, BarList, Legend } from "../../components/charts/Charts";
import { StatusBadge, DeliveryBadge } from "../../components/domain/StatusBadge";
import { ActivityList, RouteCell, CodeLink } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { getDashboard, getAgencyOfUser } from "../../services/api";
import { PERIODS } from "../../lib/constants";
import { statusMix, SERIES } from "../../lib/charts";
import { greeting, fmtDate } from "../../lib/format";
import { Link } from "../../lib/router";

export default function AdminDashboard() {
  const { user, token } = useAuth(), agency = getAgencyOfUser(user), [days, setDays] = useState(30);
  const { data: d, loading, error, reload } = useAsync(() => getDashboard(user, token, days), [token, days]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const s = d.stats;
  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`} description={`Activité de ${agency.name} — colis, livraisons et livreurs.`}
        actions={<><Tabs variant="pills" label="Période" value={days} onChange={setDays} items={PERIODS.map((p) => ({ id: p.id, label: p.label }))} /><Button to="/admin/colis/nouveau" icon={PackagePlus}>Ajouter un colis</Button></>} />
      <div className="stack" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
        <KpiStrip items={[
          { label: "Total des colis", value: s.total, icon: Package, tone: "info" },
          { label: "Enregistrés aujourd'hui", value: s.today, icon: PackagePlus, tone: "orange" },
          { label: "En attente", value: s.pending, icon: Clock, tone: "warning" },
          { label: "En transit", value: s.inTransit, icon: Route, tone: "info" },
          { label: "Livrés", value: s.delivered, icon: CheckCircle2, tone: "success" },
          { label: "En anomalie", value: s.anomalies, icon: AlertTriangle, tone: "danger", sub: `${s.failed} échecs · ${s.late} retards` },
        ]} />
        <KpiStrip items={[
          { label: "Livreurs", value: d.availability.total, icon: Truck, tone: "teal", sub: `${d.availability.available} disponible(s)` },
          { label: "Livraisons en cours", value: s.ongoing, icon: Activity, tone: "orange" },
          { label: "Colis à affecter", value: s.arrived, icon: UserCheck, tone: "violet", sub: s.arrived ? "Arrivés, en attente de livreur" : "Tout est affecté" },
          { label: "Taux de réussite", value: Math.round(s.successRate), suffix: " %", icon: Percent, tone: "success" },
        ]} />
        <div className="grid-main">
          <Card className="rise" style={{ "--i": 1 }}><CardHeader title="Colis par période" subtitle="Enregistrés et livrés" action={<Legend items={SERIES} />} /><AreaChart data={d.series} series={SERIES} /></Card>
          <Card className="rise" style={{ "--i": 2 }}><CardHeader title="Répartition des statuts" /><Donut data={statusMix(s.byStatus)} centerValue={s.total} centerLabel="colis" /></Card>
        </div>
        <div className="grid-even">
          <Card className="rise" style={{ "--i": 3 }}>
            <CardHeader title="Performance des livreurs" subtitle="Livraisons réussies" action={<Button to="/admin/livreurs" variant="ghost" size="sm">Voir tout</Button>} />
            <BarList items={[...d.couriers].sort((a, b) => b.done - a.done).map((c) => ({ label: c.name, value: c.done, display: `${c.done} livrés`, meta: `${Math.round(c.rate)} % de réussite · ${c.ongoing} en cours`, color: "var(--teal)" }))} />
          </Card>
          <Card className="rise" style={{ "--i": 4 }}><CardHeader title="Activité récente" subtitle="Dernières opérations de l'agence" action={<Button to="/admin/historique" variant="ghost" size="sm">Historique</Button>} /><ActivityList items={d.activity} linkBase="/admin/colis" /></Card>
        </div>
        <div className="grid-even">
          <Card className="rise" style={{ "--i": 5 }}>
            <CardHeader title="Derniers colis enregistrés" action={<Button to="/admin/colis" variant="ghost" size="sm">Tous les colis</Button>} />
            <div className="mini-list">{d.latestParcels.map((p) => <div className="mini-row" key={p.id}><div><strong>{p.id}</strong><small><RouteCell from={p.fromCity} to={p.toCity} /> · {fmtDate(p.createdAt)}</small></div><StatusBadge status={p.status} /></div>)}</div>
          </Card>
<Card className="rise" style={{ "--i": 6 }}>
  <CardHeader
    icon={Route}
    title="Derniers trajets"
  />

  <div className="mini-list">
    {(d.latestRoutes || []).length === 0 ? (
      <p className="muted">Aucun trajet pour le moment.</p>
    ) : (
      d.latestRoutes.map((x) => (
        <div className="mini-row" key={x.id}>
          <div className="person">
            <Avatar name={x.livreur_nom} size="sm" />
            <div className="person-txt">
              <strong>{x.ville_depart} → {x.ville_arrivee}</strong>
              <small>
                {x.livreur_nom} · {x.colis?.length || 0} colis
              </small>
              <small>
                {x.etat_livraison}
              </small>
            </div>
          </div>
        </div>
      ))
    )}
  </div>
</Card>
        </div>
      </div>
    </>
  );
}
