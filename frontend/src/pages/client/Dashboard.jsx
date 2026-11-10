import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Dashboard({ go }) {
  const page = { t: "Bonjour Sara, bienvenue dans votre espace personnel", d: "Résumé de vos colis", b: [B("stats", { items: [["Total", 5, "#172B4D"], ["En transit", 1, "#2563EB"], ["En livraison", 1, "#0E7490"], ["Livrés", 2, "#16A36A"]] }), B("table", { cols: ["N° suivi", "Départ", "Arrivée", "Date d'expédition", "Statut"], rows: C.slice(0, 3).map(x => [x[0], x[3], x[4], x[5], x[6]]), open: "suivi", label: "Suivre" }), B("notifs")] };
  return <PageView page={page} go={go} />;
}
