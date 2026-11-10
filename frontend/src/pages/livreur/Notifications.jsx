import PageView from "../../components/PageView";
import { B, act, KV, CC, C, LV, SEC, PROFIL, COLIS_KV, PERSON } from "../../data/mock";

export default function Notifications({ go }) {
  const page = { t: "Notifications", d: "Vos missions", b: [B("notifs")] };
  return <PageView page={page} go={go} />;
}
