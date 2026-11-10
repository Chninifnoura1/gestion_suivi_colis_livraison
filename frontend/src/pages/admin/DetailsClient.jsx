import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function DetailsClient({ go }) {
  const page = { t: "Détails d'un client", d: "Sara Benali", b: [B("kv", { items: PERSON("Sara Benali") }), B("table", { cols: ["N° suivi", "Rôle", "Départ", "Arrivée", "Statut"], rows: [["CT-0001", "Destinataire", "Casablanca", "Agadir", "Arrivé à destination"], ["CT-0004", "Expéditeur", "Agadir", "Tanger", "Livré"]], open: "det" }), B("kv", { items: [["Dernières opérations", KV({ "07/11 09:12": "CT-0001 arrivé à destination", "06/11 11:05": "CT-0004 livré" })]] })] };
  return <PageView page={page} go={go} />;
}
