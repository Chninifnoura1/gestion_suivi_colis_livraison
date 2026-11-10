import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsLivreur({ go }) {
  const page = { t: "Détails d'un livreur", d: "Hamza Ouali", b: [B("stats", { items: [["Total", 42, "#172B4D"], ["Terminées", 36, "#16A36A"], ["Échouées", 3, "#DC4C4C"], ["En cours", 2, "#0E7490"]] }), B("kv", { items: PERSON("Hamza Ouali") }), B("table", { cols: ["N° suivi", "Destinataire", "Adresse", "Affectation", "Statut"], rows: [["CT-0003", "Laila Cherkaoui", "8 Bd Anfa", "06/11/2026", "En cours de livraison"]], open: "lvdet" }), B("table", { cols: ["Date", "Colis", "Opération", "Résultat"], rows: [["06/11/2026", "CT-0003", "Affectation", "Confirmée"], ["07/11/2026", "CT-0003", "Début de livraison", "En cours"]] })] };
  return <PageView page={page} go={go} />;
}
