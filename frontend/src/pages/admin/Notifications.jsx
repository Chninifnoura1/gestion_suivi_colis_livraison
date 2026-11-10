import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Notifications({ go }) {
  const page = { t: "Notifications", d: "4 au total · 2 non lues", b: [B("table", { cols: ["Destinataire", "Type", "Message", "Date d'envoi", "Statut"], rows: [["Sara Benali", "Colis arrivé", "CT-0001 est arrivé à Agadir.", "07/11 09:12", "Non lu"], ["Hamza Ouali", "Nouvelle affectation", "CT-0003 vous est affecté.", "06/11 16:40", "Lu"]], search: 1, filter: 1 }), B("form", { items: [["Notification manuelle", ["Destinataire", "Message"]]], submit: "Envoyer", next: "notifs" })] };
  return <PageView page={page} go={go} />;
}
