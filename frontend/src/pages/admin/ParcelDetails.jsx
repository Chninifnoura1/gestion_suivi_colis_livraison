import { ArrowLeft, Pencil, XCircle, Link2, Send, Inbox, Box, Building2, Truck, ArrowRight } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, PageSkeleton, ErrorState, Avatar } from "../../components/ui";
import Button from "../../components/ui/Button";
import Timeline from "../../components/domain/Timeline";
import RouteLine from "../../components/domain/RouteLine";
import { StatusBadge, PriorityBadge, DeliveryBadge } from "../../components/domain/StatusBadge";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useParams, Link } from "../../lib/router";
import { getParcel, cancelParcel } from "../../services/api";
import { CANCELLABLE } from "../../lib/constants";
import { fmtDate, fmtDateTime, phoneLink } from "../../lib/format";

const Contact = ({ c }) => [["Nom", c.name], ["Téléphone", <a href={phoneLink(c.phone)}>{c.phone}</a>], ["E-mail", c.email || "—"], ["Adresse", `${c.address}, ${c.city}`]];

export default function ParcelDetails() {
  const { id } = useParams(), { user, token } = useAuth(), toast = useToast(), confirm = useConfirm();
  const { data: p, error, reload } = useAsync(() => getParcel(user, id, token), [id, token]);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!p) return <PageSkeleton />;
  const closed = ["delivered", "cancelled"].includes(p.status);
  const cancel = async () => {
    const ok = await confirm({ title: `Annuler le colis ${p.id} ?`, message: "Le colis passera au statut « Annulé ». Cette action est enregistrée dans l'historique.", confirmLabel: "Annuler le colis", cancelLabel: "Conserver", tone: "danger" });
    if (!ok) return; await cancelParcel(user, p.id); toast.success("Colis annulé", p.id); reload(true);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/suivi/${p.trackingNumber || p.id}`); toast.success("Lien de suivi copié", "Partagez-le avec le destinataire."); } catch { toast.error("Copie impossible"); } };
  return (
    <>
      <PageHeader back={<Link to="/admin/colis" className="back-link"><ArrowLeft size={15} />Gestion des colis</Link>} title={p.trackingNumber || p.id} description={`Enregistré le ${fmtDateTime(p.createdAt)} par ${p.originAgency}`}
        meta={<><StatusBadge status={p.status} /><PriorityBadge priority={p.priority} />{p.late && <span className="badge tone-warning">En retard</span>}</>}
        actions={<><Button variant="secondary" icon={Link2} onClick={copy}>Lien public</Button>
          {p.canModify && !closed && (
            <Button
              variant="secondary"
              to={`/admin/colis/${p.id}/modifier`}
              icon={Pencil}
            >
              Modifier
            </Button>
          )}

          {p.canModify && CANCELLABLE.includes(p.status) && (
            <Button variant="danger" icon={XCircle} onClick={cancel}>
              Annuler
            </Button>
          )}</>} />
      <div className="stack">
        <Card><RouteLine from={p.fromCity} to={p.toCity} status={p.status} fromLabel={p.originAgency} toLabel={p.destAgency} /></Card>
        <div className="grid-main">
          <div className="stack">
            <Card><CardHeader title="Suivi du colis" subtitle="Étapes passées et à venir" /><Timeline events={p.events} status={p.status} showBy /></Card>
            <Card flush>
              <div style={{ padding: 20, paddingBottom: 0 }}><CardHeader title="Historique des changements" subtitle="Aucune opération n'est écrasée" /></div>
              <div className="dt-scroll"><table className="dt-table dense"><thead><tr><th>Date</th><th>Ancien statut</th><th>Nouveau statut</th><th>Utilisateur</th></tr></thead>
                <tbody>{p.history.map((h) => <tr key={h.id}><td data-label="Date" className="tabular">{fmtDateTime(h.at)}</td><td data-label="Ancien">{h.from ? <StatusBadge status={h.from} /> : <span className="muted">—</span>}</td><td data-label="Nouveau"><StatusBadge status={h.to} /></td><td data-label="Utilisateur">{h.by}</td></tr>)}</tbody></table></div>
            </Card>
          </div>
          <div className="stack">
            <Card><CardHeader icon={Send} title="Expéditeur" /><InfoList items={Contact({ c: p.sender })} /></Card>
            <Card><CardHeader icon={Inbox} title="Destinataire" /><InfoList items={Contact({ c: p.recipient })} /></Card>
            <Card><CardHeader icon={Box} title="Colis" /><InfoList cols={2} items={[["Contenu", p.content], ["Type", p.type], ["Poids", `${p.weight} kg`], ["Dimensions", `${p.dims.join(" × ")} cm`], ["Remarques", p.notes || "—"]]} /></Card>
            <Card><CardHeader icon={Building2} title="Expédition" /><InfoList cols={2} items={[["Agence d'origine", p.originAgency], ["Agence de destination", p.destAgency], ["Expédition", fmtDate(p.shipDate)], ["Livraison estimée", fmtDate(p.eta)]]} /></Card>
            <Card>
              <CardHeader icon={Truck} title="Livraison associée" />
              {p.delivery ? <div className="mini-row" style={{ padding: 0 }}><div className="person"><Avatar name={p.delivery.courierName} /><div className="person-txt"><strong>{p.delivery.courierName}</strong><small>Affecté le {fmtDate(p.delivery.assignedAt)}</small></div></div><DeliveryBadge status={p.delivery.status} /></div> : <p className="muted">Aucun livreur affecté pour le moment.</p>}
              {p.delivery && <Button to={`/admin/livraisons/${p.delivery.id}`} variant="secondary" size="sm" iconRight={ArrowRight} className="mt">Voir la livraison {p.delivery.id}</Button>}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
