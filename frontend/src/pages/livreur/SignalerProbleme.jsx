import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function SignalerProbleme({ go }) {
  const page = { t: "Signaler un problème", d: "La tentative sera enregistrée et l'administrateur notifié", b: [B("kv", { items: [["Livraison", KV({ "N° suivi": "CT-0003", "Date et heure": new Date().toLocaleString("fr-FR") })]] }), B("form", { items: [["Rapport", ["Motif=Destinataire absent,Destinataire injoignable,Adresse introuvable,Refus du colis,Autre problème", "Commentaire (facultatif)"]]], submit: "Envoyer le rapport", next: "dash" })] };
  return <PageView page={page} go={go} />;
}
