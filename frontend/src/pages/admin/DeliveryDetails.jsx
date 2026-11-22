import { ArrowLeft, MessageSquarePlus, Truck, Inbox } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, Field, Alert, Avatar, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import Timeline from "../../components/domain/Timeline";
import RouteLine from "../../components/domain/RouteLine";
import { DeliveryBadge, StatusBadge } from "../../components/domain/StatusBadge";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useParams, Link } from "../../lib/router";
import { getDelivery, addRemark } from "../../services/api";
import { fmtDateTime, phoneLink } from "../../lib/format";

export default function DeliveryDetails() {
  const { id } = useParams(), { user, token } = useAuth(), toast = useToast();
  const { data: d, error, reload } = useAsync(
    () => getDelivery(user, id, token),
    [id, token]
  );
  const form = useForm({ text: "" }, { text: [rules.required("Écrivez votre remarque."), rules.min(3)] });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const p = d.parcel;
  const submit = form.submit(async (v) => { await addRemark(user, d.id, v.text); form.reset(); toast.success("Remarque ajoutée"); reload(true); });
  return (
    <>
      <PageHeader back={<Link to="/admin/livraisons" className="back-link"><ArrowLeft size={15} />Livraisons</Link>} title={`Livraison ${d.id}`} description={`Colis ${p.id} · ${p.recipient.name}`} meta={<><DeliveryBadge status={d.status} />{d.late && <span className="badge tone-warning">En retard</span>}</>}
        actions={<><Button variant="secondary" to={`/admin/colis/${p.id}`}>Voir le colis</Button></>} />
      <div className="stack">
        {d.failure && <Alert tone="danger" title={`Rapport d'échec : ${d.failure.reason}`}><span>{d.failure.comment} <span className="muted">— signalé le {fmtDateTime(d.failure.at)}</span></span></Alert>}
        <Card><RouteLine from={p.fromCity} to={p.toCity} status={p.status} fromLabel={p.originAgency} toLabel={p.destAgency} /></Card>
        <div className="grid-main">
          <div className="stack">
            <Card><CardHeader title="Évolution de la livraison" /><Timeline events={p.events} status={p.status} showBy /></Card>
            <Card>
              <CardHeader icon={MessageSquarePlus} title="Remarques de l'administrateur" />
              <form className="stack-sm" onSubmit={submit} noValidate><Field as="textarea" rows={3} label="Nouvelle remarque" placeholder="Ex. Client recontacté, nouvelle tentative demain." required {...form.field("text")} /><div><Button type="submit" loading={form.submitting} variant="secondary">Ajouter la remarque</Button></div></form>
              {d.remarks.length > 0 && <div className="mini-list" style={{ marginTop: 18 }}>{d.remarks.map((r) => <div className="mini-row" key={r.id}><div><span style={{ color: "var(--text)" }}>{r.text}</span><small>{r.by} · {fmtDateTime(r.at)}</small></div></div>)}</div>}
            </Card>
          </div>
          <div className="stack">
            <Card><CardHeader icon={Truck} title="Livreur" /><div className="person"><Avatar name={d.courierName} size="lg" /><div className="person-txt"><strong>{d.courierName}</strong><small>{d.courier.matricule}</small><a href={phoneLink(d.courier.phone)}>{d.courier.phone}</a></div></div></Card>
            <Card><CardHeader icon={Inbox} title="Destinataire" /><InfoList items={[["Nom", p.recipient.name], ["Téléphone", <a href={phoneLink(p.recipient.phone)}>{p.recipient.phone}</a>], ["Adresse", `${p.recipient.address}, ${p.recipient.city}`], ["Statut du colis", <StatusBadge status={p.status} />]]} /></Card>
            <Card><CardHeader title="Livraison" /><InfoList items={[["Affectée le", fmtDateTime(d.assignedAt)], ["Démarrée le", fmtDateTime(d.startedAt)], ["Terminée le", fmtDateTime(d.completedAt)], d.receiver && ["Reçu par", `${d.receiver.name} (${d.receiver.relation})`]]} /></Card>
          </div>
        </div>
      </div>
    </>
  );
}
