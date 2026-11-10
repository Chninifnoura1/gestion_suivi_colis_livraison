import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function GestionLivraisons({ go }) {
  const page = { t: "Gestion des livraisons", d: "Suivi des livraisons à domicile", b: [B("stats", { items: [["En attente", 3, "#F59E0B"], ["En cours", 12, "#0E7490"], ["Terminées", 51, "#16A36A"], ["Échouées", 5, "#DC4C4C"]] }),
    B("table", { cols: ["N° livraison", "N° suivi", "Livreur", "Destinataire", "Statut"], rows: [["LV-001", "CT-0003", "Hamza Ouali", "Laila Cherkaoui", "En cours de livraison"], ["LV-002", "CT-0004", "Imane Rachidi", "Reda Lahlou", "Livré"]], open: "lvdet", search: 1, filter: 1 })] };
  return <PageView page={page} go={go} />;
}
