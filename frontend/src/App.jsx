import { useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { MENU, TITLES } from "./data/menus";
import { PAGES, LOGINS } from "./pages";

export default function App() {
  const [role, setRole] = useState("admin"), [auth, setAuth] = useState(false), [page, setPage] = useState("dash");
  if (!auth) { const Login = LOGINS[role]; return <Login role={role} setRole={setRole} onLogin={() => { setAuth(true); setPage("dash"); }} />; }
  const Page = PAGES[role][page], menu = MENU[role], cur = menu.find(m => m[0] === page) ? page : null;
  const Item = ({ m, cls, Ic = m[2] }) => <button className={`${cls || "nav"} ${cur === m[0] ? "on" : ""}`} onClick={() => setPage(m[0])}><Ic size={18} />{cls ? m[1].split(" ")[0] : m[1]}</button>;
  return <div className="app">
    <aside className="side"><div className="logo">Colis<b>Track</b></div>{menu.map(m => <Item key={m[0]} m={m} />)}
      <button className="nav" style={{ marginTop: "auto" }} onClick={() => setAuth(false)}><LogOut size={18} />Déconnexion</button></aside>
    <div className="main"><header className="top"><b style={{ color: "var(--navy)" }}>{TITLES[role]}</b>
        {role === "admin" && <input className="gs" placeholder="Recherche globale..." />}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><button className="nav" aria-label="Notifications" style={{ color: "var(--navy)" }} onClick={() => setPage("notifs")}><Bell size={20} /><span className="cnt">2</span></button>
          <span className="av">{{ admin: "AD", client: "SB", livreur: "HO" }[role]}</span><span className="nm">{{ admin: "Administrateur", client: "Sara Benali", livreur: "Hamza Ouali" }[role]}</span></div></header>
      <div className="page"><Page go={setPage} /></div></div>
    <nav className="bottom">{menu.slice(0, 5).map(m => <Item key={m[0]} m={m} cls="nav" />)}</nav></div>;
}
