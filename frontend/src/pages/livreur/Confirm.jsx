import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Camera, PenLine } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, Field, Checkbox, Alert, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import SignaturePad from "../../components/ui/SignaturePad";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useParams, Link } from "../../lib/router";
import { getDelivery, confirmDelivery } from "../../services/api";
import { fmtDateTime } from "../../lib/format";
import { DEMO_NOW } from "../../data/seed";

export default function Confirm() {
  const { id } = useParams(), { user, token } = useAuth(), [done, setDone] = useState(false), [photo, setPhoto] = useState(null), file = useRef(null);
  const { data: d, error, reload } = useAsync(() => getDelivery(user, id, token), [id, token]);
  const form = useForm({ receiver: "", relation: "Destinataire", attest: false, remark: "" }, { receiver: [rules.required("Indiquez le nom de la personne qui a reçu le colis.")], attest: [rules.checked("Confirmez la remise du colis en bon état.")] });
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  const submit = form.submit(async (v) => { await confirmDelivery(user, id, {
  receiver: v.receiver,
  relation: v.relation,
  remark: v.remark,
}, token); setDone(true); });
  if (done) return (
    <Card style={{ maxWidth: 560, margin: "0 auto" }}><div className="success-pop"><span className="ic"><CheckCircle2 size={40} /></span><h2>Livraison confirmée</h2><p>Le colis {id} a été remis à {form.values.receiver}. L'agence et le suivi public sont mis à jour.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 10 }}><Button to="/livreur">Retour au tableau de bord</Button><Button variant="secondary" to="/livreur/livraisons">Mes livraisons</Button></div></div></Card>
  );
  if (d.status !== "out_for_delivery") return <Alert tone="warning" title="Confirmation impossible" action={<Button size="sm" variant="secondary" to={`/livreur/livraisons/${id}`}>Retour</Button>}>Cette livraison n'est pas en cours.</Alert>;
  return (
    <>
      <PageHeader back={<Link to={`/livreur/livraisons/${id}/statut`} className="back-link"><ArrowLeft size={15} />Mise à jour du statut</Link>} title="Confirmation de réception" description={`${id} · ${d.parcel.recipient.name}`} />
      <form onSubmit={submit} noValidate ref={form.root} className="stack" style={{ maxWidth: 680 }}>
        <Card><CardHeader title="Livraison" /><InfoList cols={2} items={[["N° de suivi", id], ["Destinataire", d.parcel.recipient.name], ["Adresse", d.parcel.recipient.address], ["Date et heure", fmtDateTime(DEMO_NOW)]]} /></Card>
        <Card>
          <CardHeader title="Remise du colis" />
          <div className="form-grid">
            <Field className="span-2" label="Nom de la personne ayant reçu le colis" placeholder="Ex. Laila Cherkaoui" required {...form.field("receiver")} />
            <Field className="span-2" as="select" label="Lien avec le destinataire" options={["Destinataire", "Membre de la famille", "Voisin", "Gardien ou accueil"]} {...form.field("relation")} />
            <Field className="span-2" as="textarea" rows={2} label="Remarque (facultatif)" placeholder="Ex. Colis laissé au gardien." {...form.field("remark")} />
            <div className="span-2 field"><label><PenLine size={14} style={{ display: "inline", verticalAlign: "-2px" }} /> Signature électronique (facultatif)</label><SignaturePad /></div>
            <div className="span-2"><input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files[0]?.name || null)} /><button type="button" className="file-drop" style={{ width: "100%", textAlign: "left" }} onClick={() => file.current.click()}><Camera size={20} /><span><strong>{photo || "Ajouter une photo de preuve (facultatif)"}</strong><small>{photo ? "Appuyez pour changer" : "Photo du colis remis ou de la porte"}</small></span></button></div>
            <div className="span-2"><Checkbox label="Je confirme avoir remis le colis en bon état." {...form.field("attest")} checked={form.values.attest} error={form.errors.attest} /></div>
          </div>
        </Card>
        <div className="action-bar"><Button type="submit" size="lg" variant="success" icon={CheckCircle2} loading={form.submitting}>Confirmer la réception</Button><Button size="lg" variant="ghost" to={`/livreur/livraisons/${id}/statut`}>Annuler</Button></div>
      </form>
    </>
  );
}
