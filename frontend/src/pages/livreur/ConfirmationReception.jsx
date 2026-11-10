import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function ConfirmationReception({ go }) {
  const page = { t: "Confirmation de réception", d: "CT-0003", b: [B("kv", { items: [["Livraison", KV({ "N° suivi": "CT-0003", Destinataire: "Laila Cherkaoui", "Date et heure": new Date().toLocaleString("fr-FR") })]] }), B("form", { items: [["Remise du colis", ["Nom de la personne ayant reçu le colis", "Remarque", "Signature électronique (facultatif)"]]], submit: "Confirmer la réception", next: "dash" })] };
  return <PageView page={page} go={go} />;
}
