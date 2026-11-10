import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsLivraison({ go }) {
  const page = { t: "Détails de la livraison", d: "CT-0003", b: [B("kv", { items: [["Colis", KV({ "N° suivi": "CT-0003", Description: "Vêtements", Poids: "4,2 kg", "Ville d'arrivée": "Agadir" })], ["Destinataire", KV({ Nom: "Laila Cherkaoui", Téléphone: "0655443322", Adresse: "8 Bd Anfa" })]] }),
    B("btns", { items: [["Appeler le destinataire", "navy", "det", "tel:0655443322"], ["Ouvrir la navigation", "navy", "det", "https://maps.google.com/?q=8+Bd+Anfa+Agadir"], ["Commencer la livraison", "", "statut"], ["Signaler un problème", "red", "prob"]], big: 1 })] };
  return <PageView page={page} go={go} />;
}
