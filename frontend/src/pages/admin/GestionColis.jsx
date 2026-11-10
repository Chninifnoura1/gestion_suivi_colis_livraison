import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function GestionColis({ go }) {
  const page = { t: "Gestion des colis", d: "Consultez et gérez tous les colis", b: [act("+ Ajouter un colis", "add"), B("table", { cols: CC, rows: C, acts: [["Détails", "navy", "det"], ["Modifier", "blue", "edit"], ["Annuler", "red", null, "Annuler ce colis selon les règles métier ?"]], search: 1, filter: 1, date: 1 })] };
  return <PageView page={page} go={go} />;
}
