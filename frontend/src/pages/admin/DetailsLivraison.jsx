import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsLivraison({ go }) {
  const page = { t: "Détails d'une livraison", d: "LV-001", b: [B("btns", { items: [["Réaffecter un livreur", "", "assign"], ["Rapport d'échec", "gray", "lvdet"], ["Retour", "gray", "livraisons"]] }), B("kv", { items: [["Livraison", KV({ "N° livraison": "LV-001", "N° suivi": "CT-0003", Livreur: "Hamza Ouali", Destinataire: "Laila Cherkaoui", Adresse: "8 Bd Anfa, Agadir", Statut: "En cours de livraison" })]] }), B("tl", { at: 5 }), B("form", { items: [["Remarque administrateur", ["Remarque"]]], submit: "Ajouter la remarque", next: "lvdet" })] };
  return <PageView page={page} go={go} />;
}
