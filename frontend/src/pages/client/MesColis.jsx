import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function MesColis({ go }) {
  const page = { t: "Mes colis", d: "Lecture seule : vous ne pouvez pas modifier un colis", b: [B("table", { cols: ["N° suivi", "Rôle", "Départ", "Arrivée", "Date", "Statut"], rows: C.map((x, i) => [x[0], i % 2 ? "Expéditeur" : "Destinataire", x[3], x[4], x[5], x[6]]), open: "suivi", label: "Voir le suivi", search: 1, filter: 1 })] };
  return <PageView page={page} go={go} />;
}
