import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Dashboard({ go }) {
  const page = { t: "Bonjour Hamza", d: "Vos missions du jour", b: [B("stats", { items: [["Affectés", 4, "#172B4D"], ["En attente", 2, "#F59E0B"], ["En cours", 1, "#0E7490"], ["Terminées", 1, "#16A36A"]] }), B("dispo"), B("cards", { limit: 2 })] };
  return <PageView page={page} go={go} />;
}
