import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function GestionLivreurs({ go }) {
  const page = { t: "Gestion des livreurs", d: "Livreurs de la livraison à domicile", b: [act("+ Ajouter un livreur", "addl"), B("table", { cols: ["Photo", "Nom complet", "Téléphone", "Email", "Disponibilité", "En cours", "Statut du compte"], rows: LV.map(x => [x[0].split(" ").map(w => w[0]).join(""), x[0], x[1], "livreur@colistrack.ma", x[2], x[3], "Actif"]), acts: [["Profil", "navy", "ldet"], ["Modifier", "blue", "addl"], ["Activer / désactiver", "gray", null, "Changer l'état du compte ?"]], search: 1, filter: 1 })] };
  return <PageView page={page} go={go} />;
}
