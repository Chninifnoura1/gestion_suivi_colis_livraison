import { useState } from "react";
import { ArrowLeft, Pencil, MapPin, Phone, Mail, Package, CheckCircle2, Clock, Percent, Truck } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, KpiStrip, Avatar, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import { AreaChart, Legend } from "../../components/charts/Charts";
import { ActiveBadge, StatusBadge, AvailabilityBadge } from "../../components/domain/StatusBadge";
import { RouteCell } from "../../components/domain/Cells";
import { AgencyModal } from "./Agencies";
import useAsync from "../../hooks/useAsync";
import { useParams, Link } from "../../lib/router";
import { useToast } from "../../context/ToastContext";
import { getAgency } from "../../services/api";
import { SERIES } from "../../lib/charts";
import { fmtDate } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";

export default function AgencyDetails() {
  const { id } = useParams();
  const { token } = useAuth();
  const { data: a, error, reload } = useAsync(
  () => getAgency(id, token),
  [id, token]
  );  
  const [edit, setEdit] = useState(false);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!a) return <PageSkeleton />;
  const s = a.stats;
  return (
    <>
    <PageHeader
      back={
        <Link to="/super/agences" className="back-link">
          <ArrowLeft size={15} />
          Toutes les agences
        </Link>
      }
      title={a.name}
      description={`${a.address}, ${a.city} · ouverte depuis le ${fmtDate(a.openedAt)}`}
      meta={<ActiveBadge active={a.active} />}
      actions={
        <Button
          variant="secondary"
          icon={Pencil}
          onClick={() => setEdit(true)}
        >
          Modifier
        </Button>
      }
    />
      <div className="stack">
        <KpiStrip items={[
          { label: "Colis traités", value: s.total, icon: Package, tone: "info" }, { label: "Livrés", value: s.delivered, icon: CheckCircle2, tone: "success" },
          { label: "En retard", value: s.late, icon: Clock, tone: "warning" }, { label: "Taux de réussite", value: Math.round(s.successRate), suffix: " %", icon: Percent, tone: "success" },
        ]} />
        <div className="grid-main">
          <Card><CardHeader title="Activité sur 30 jours" action={<Legend items={SERIES} />} /><AreaChart data={a.series} series={SERIES} height={230} /></Card>
          <div className="stack">
            <Card><CardHeader title="Coordonnées" /><InfoList items={[["Adresse", <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><MapPin size={14} />{a.address}, {a.city}</span>], ["Téléphone", <span className="row" style={{ gap: 6 }}><Phone size={14} />{a.phone}</span>], ["E-mail", <span className="row" style={{ gap: 6 }}><Mail size={14} />{a.email}</span>]]} /></Card>
            <Card><CardHeader title="Administrateur" />{a.admins.length ? a.admins.map((x) => <div className="mini-row" key={x.id}><div className="person"><Avatar name={x.name} /><div className="person-txt"><strong>{x.name}</strong><small>{x.email}</small></div></div><ActiveBadge active={x.active} /></div>) : <p className="muted">Aucun administrateur assigné.</p>}</Card>
          </div>
        </div>
        <div className="grid-even">
          <Card><CardHeader icon={Truck} title={`Livreurs (${a.couriers.length})`} />
            <div className="mini-list">{a.couriers.length ? a.couriers.map((c) => <div className="mini-row" key={c.id}><div className="person"><Avatar name={c.name} size="sm" /><div><strong>{c.name}</strong><small>{c.total} livraisons · {Math.round(c.rate)} % de réussite</small></div></div><AvailabilityBadge available={c.available} /></div>) : <p className="muted">Aucun livreur.</p>}</div></Card>
          <Card><CardHeader icon={Package} title="Derniers colis" />
            <div className="mini-list">{a.latest.map((p) => <div className="mini-row" key={p.id}><div><strong>{p.id}</strong><small><RouteCell from={p.fromCity} to={p.toCity} /></small></div><StatusBadge status={p.status} /></div>)}</div></Card>
        </div>
      </div>
      {edit && <AgencyModal open agency={a} onClose={() => setEdit(false)} onSaved={() => reload(true)} />}
    </>
  );
}
