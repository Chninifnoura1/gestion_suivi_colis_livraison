import { useState } from "react";
import { Building2, Users, Package, Truck, CheckCircle2, Route, Clock, Percent } from "lucide-react";
import { PageHeader, Card, CardHeader, Tabs, KpiStrip, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import { AreaChart, BarChart, Donut, Legend } from "../../components/charts/Charts";
import { ActivityList, Rate } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { getDashboard } from "../../services/api";
import { PERIODS } from "../../lib/constants";
import { statusMix, SERIES } from "../../lib/charts";
import { greeting } from "../../lib/format";
import { Link } from "../../lib/router";

export default function SuperDashboard() {
  const { user, token } = useAuth(), [days, setDays] = useState(30);
  const { data: d, loading, error, reload } = useAsync(() => getDashboard(user, token, days), [token, days]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const { stats: s, counts: c } = d;
  const agencyBars = d.agencies.filter((a) => a.total).map((a) => ({ label: a.city, total: a.total, delivered: a.delivered }));
  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`} description="Vue d'ensemble de toutes les agences ColisTrack." actions={<><Tabs variant="pills" label="Période" value={days} onChange={setDays} items={PERIODS.map((p) => ({ id: p.id, label: p.label }))} /><Button to="/super/agences" icon={Building2}>Gérer les agences</Button></>} />
      <div className="stack" style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
        <KpiStrip items={[
          { label: "Agences", value: c.agencies, icon: Building2, tone: "info", sub: `${c.activeAgencies} actives` },
          { label: "Utilisateurs", value: c.users, icon: Users, tone: "violet", sub: `${c.admins} admins · ${c.couriers} livreurs` },
          { label: "Colis", value: s.total, icon: Package, tone: "orange", sub: `${s.today} enregistré(s) aujourd'hui` },
          { label: "Livraisons", value: s.deliveries, icon: Truck, tone: "teal", sub: `${s.ongoing} en cours` },
        ]} />
        <KpiStrip items={[
          { label: "Livraisons réussies", value: s.delivered, icon: CheckCircle2, tone: "success" },
          { label: "En transit", value: s.inTransit, icon: Route, tone: "info" },
          { label: "En retard", value: s.late, icon: Clock, tone: "warning", sub: "Livraison estimée dépassée" },
          { label: "Taux de réussite", value: Math.round(s.successRate), suffix: " %", icon: Percent, tone: "success" },
        ]} />
        <div className="grid-main">
          <Card className="rise" style={{ "--i": 1 }}><CardHeader title="Activité des colis" subtitle="Enregistrés et livrés sur la période" action={<Legend items={SERIES} />} /><AreaChart data={d.series} series={SERIES} /></Card>
          <Card className="rise" style={{ "--i": 2 }}><CardHeader title="Répartition des statuts" subtitle="Tous les colis" /><Donut data={statusMix(s.byStatus)} centerValue={s.total} centerLabel="colis" /></Card>
        </div>
        <div className="grid-main">
          <Card className="rise" style={{ "--i": 3 }}>
            <CardHeader title="Comparaison des agences" subtitle="Colis traités et colis livrés" action={<Legend items={[{ label: "Traités", color: "var(--blue)" }, { label: "Livrés", color: "var(--success)" }]} />} />
            <BarChart data={agencyBars} series={[{ key: "total", label: "Colis traités", color: "var(--blue)" }, { key: "delivered", label: "Colis livrés", color: "var(--success)" }]} />
          </Card>
          <Card className="rise" style={{ "--i": 4 }}><CardHeader title="Activité récente" subtitle="Dernières opérations" /><ActivityList items={d.activity} /></Card>
        </div>
        <Card className="rise" flush style={{ "--i": 5 }}>
          <div style={{ padding: 20 }}><CardHeader title="Performance par agence" subtitle="Taux de réussite des livraisons terminées" action={<Button to="/super/agences" variant="ghost" size="sm">Tout voir</Button>} /></div>
          <div className="dt-scroll"><table className="dt-table"><thead><tr><th>Agence</th><th>Colis</th><th>Livrés</th><th>En retard</th><th>Taux de réussite</th></tr></thead>
            <tbody>{d.agencies.map((a) => <tr key={a.id}><td className="is-primary" data-label="Agence"><Link to={`/super/agences/${a.id}`}>{a.name}</Link></td><td data-label="Colis" className="tabular">{a.total}</td><td data-label="Livrés" className="tabular">{a.delivered}</td><td data-label="En retard" className="tabular">{a.late}</td><td data-label="Taux"><Rate value={a.rate} /></td></tr>)}</tbody></table></div>
        </Card>
      </div>
    </>
  );
}
