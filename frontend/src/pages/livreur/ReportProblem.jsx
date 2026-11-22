import { useRef, useState } from "react";
import { ArrowLeft, Camera, Send, ShieldAlert } from "lucide-react";
import { PageHeader, Card, CardHeader, InfoList, Field, Alert, PageSkeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useParams, useNavigate, Link } from "../../lib/router";
import { getDelivery, reportProblem } from "../../services/api";
import { PROBLEM_TYPES } from "../../lib/constants";
import { fmtDateTime } from "../../lib/format";
import { DEMO_NOW } from "../../data/seed";

const schema = { reason: [rules.required("Choisissez le type de problème.")], comment: [(v, all) => (all.reason === "Autre problème" && !String(v || "").trim() ? "Décrivez le problème rencontré." : "")] };

export default function ReportProblem() {
 const { id } = useParams(), { user, token } = useAuth(), toast = useToast(), navigate = useNavigate(), [photo, setPhoto] = useState(null), file = useRef(null);
  const { data: d, error, reload } = useAsync(() => getDelivery(user, id, token), [id, token]);
  const form = useForm({ reason: "", comment: "" }, schema);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!d) return <PageSkeleton />;
  if (d.status !== "out_for_delivery") return <Alert tone="warning" title="Signalement impossible" action={<Button size="sm" variant="secondary" to={`/livreur/livraisons/${id}`}>Retour</Button>}>Seule une livraison en cours peut être signalée.</Alert>;
  const submit = form.submit(async (v) => {
  await reportProblem(user, id, v, token);
  toast.success("Rapport envoyé", "La tentative est enregistrée et l'administrateur est notifié.");
  navigate("/livreur");
  });
  return (
    <>
      <PageHeader back={<Link to={`/livreur/livraisons/${id}/statut`} className="back-link"><ArrowLeft size={15} />Mise à jour du statut</Link>} title="Signaler un problème" description="La tentative sera enregistrée comme échec et l'administrateur sera notifié." />
      <form onSubmit={submit} noValidate ref={form.root} className="stack" style={{ maxWidth: 680 }}>
        <Card><CardHeader title="Livraison concernée" /><InfoList cols={2} items={[["N° de suivi", id], ["Destinataire", d.parcel.recipient.name], ["Adresse", `${d.parcel.recipient.address}, ${d.parcel.recipient.city}`], ["Date et heure", fmtDateTime(DEMO_NOW)]]} /></Card>
        <Card>
          <CardHeader icon={ShieldAlert} title="Rapport" />
          <div className="stack-sm">
            <Field as="select" label="Type de problème" placeholder="Choisir un motif" options={PROBLEM_TYPES} required {...form.field("reason")} />
            <Field as="textarea" rows={4} label={form.values.reason === "Autre problème" ? "Description" : "Description (facultatif)"} placeholder="Décrivez ce qui s'est passé : tentatives d'appel, personne rencontrée…" required={form.values.reason === "Autre problème"} {...form.field("comment")} />
            <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files[0]?.name || null)} />
            <button type="button" className="file-drop" style={{ width: "100%", textAlign: "left" }} onClick={() => file.current.click()}><Camera size={20} /><span><strong>{photo || "Joindre une photo (facultatif)"}</strong><small>{photo ? "Appuyez pour changer" : "Porte fermée, adresse introuvable…"}</small></span></button>
          </div>
        </Card>
        <div className="action-bar"><Button type="submit" size="lg" variant="danger" icon={Send} loading={form.submitting}>Envoyer le rapport</Button><Button size="lg" variant="ghost" to={`/livreur/livraisons/${id}/statut`}>Annuler</Button></div>
      </form>
    </>
  );
}
