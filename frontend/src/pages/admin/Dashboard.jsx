import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Dashboard({ go }) {
  const page = { t: "Tableau de bord", d: "Vue globale de l'activité", b: [B("stats", { items: [["Total des colis", 128, "#172B4D"], ["En attente", 14, "#F59E0B"], ["En transit", 37, "#2563EB"], ["Arrivés", 9, "#8B5CF6"], ["En livraison", 12, "#0E7490"], ["Livrés", 51, "#16A36A"], ["Échoués", 5, "#DC4C4C"]] }),
    B("charts"), B("btns", { items: [["Ajouter un colis", "", "add"], ["Ajouter un livreur", "navy", "addl"], ["Affecter un livreur", "navy", "assign"], ["Consulter les colis", "navy", "colis"]] }),
    B("table", { cols: CC, rows: C.slice(0, 4), open: "det" })] };
  return <PageView page={page} go={go} />;
}
