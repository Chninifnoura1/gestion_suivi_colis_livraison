import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function GestionClients({ go }) {
  const page = { t: "Gestion des clients", d: "Clients enregistrés", b: [B("table", { cols: ["Photo", "Nom complet", "Email", "Téléphone", "Inscription", "Colis", "Statut du compte"], rows: [["SB", "Sara Benali", "sara@mail.ma", "0698765432", "01/09/2026", "3", "Actif"], ["OT", "Omar Tazi", "omar@mail.ma", "0611223344", "12/09/2026", "1", "Inactif"]], acts: [["Profil", "navy", "cdet"], ["Activer / désactiver", "gray", null, "Changer l'état du compte ?"]], search: 1, filter: 1 })] };
  return <PageView page={page} go={go} />;
}
