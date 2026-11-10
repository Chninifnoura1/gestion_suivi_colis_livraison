import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function HistoriqueStatuts({ go }) {
  const page = { t: "Historique des statuts", d: "Aucune opération n'est écrasée", b: [B("table", { cols: ["N° suivi", "Ancien statut", "Nouveau statut", "Date", "Utilisateur", "Remarque"], rows: [["CT-0001", "En transit", "Arrivé à destination", "07/11 09:12", "Admin", "—"], ["CT-0003", "Livreur affecté", "En cours de livraison", "07/11 08:00", "Hamza Ouali", "—"]], search: 1 })] };
  return <PageView page={page} go={go} />;
}
