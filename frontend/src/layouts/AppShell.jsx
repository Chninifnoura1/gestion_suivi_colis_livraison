import { useState } from "react";
import { Bell, ChevronRight, Home, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, MoreHorizontal, Check, UserCog, Building2 } from "lucide-react";
import { NAV, MOBILE_PRIMARY, flatNav, activeItem } from "../config/nav";
import { ROLE_META } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { useRouter, Link } from "../lib/router";
import useMedia from "../hooks/useMedia";
import Logo, { LogoMark } from "../components/domain/Logo";
import NotificationItem from "../components/domain/NotificationItem";
import { Avatar, IconButton, Popover, Tooltip, Drawer, Menu, EmptyState } from "../components/ui";
import { getAgencyOfUser } from "../services/api";

const KEY = "ct-sidebar";
const readCollapsed = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

function NavItem({ item, active, compact, onClick }) {
  const link = (
    <Link to={item.to} className={`nav-item${active ? " on" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
      <item.icon size={19} aria-hidden /><span className="nav-label">{item.label}</span>
    </Link>
  );
  return compact ? <Tooltip label={item.label} side="right">{link}</Tooltip> : link;
}

function Sidebar({ compact, forced, onToggle }) {
  const { user, logout } = useAuth();
  const { path } = useRouter();
  const agency = getAgencyOfUser(user), cur = activeItem(user.role, path);
  const meta = ROLE_META[user.role];
  return (
    <aside className={`sidebar${compact ? " compact" : ""}`} aria-label="Navigation principale">
      <div className="side-top">
        <Link to={meta.base} className="side-logo" aria-label="ColisTrack — accueil de l'espace"><Logo compact={compact} inverse /></Link>
        {!forced && (
          <Tooltip label={compact ? "Développer le menu" : "Réduire le menu"} side="right">
            <button className="side-toggle" onClick={onToggle} aria-label={compact ? "Développer le menu" : "Réduire le menu"}>{compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
          </Tooltip>
        )}
      </div>
      <div className="side-space">
        <span className="side-space-ic"><Building2 size={16} /></span>
        <div className="side-space-txt"><strong>{meta.space}</strong><small>{agency ? agency.name : "Toutes les agences"}</small></div>
      </div>
      <nav className="side-nav">
        {NAV[user.role].map((g) => (
          <div className="nav-group" key={g.title}>
            <p className="nav-title">{g.title}</p>
            {g.items.map((it) => <NavItem key={it.to} item={it} active={cur?.to === it.to} compact={compact} />)}
          </div>
        ))}
      </nav>
      <div className="side-user">
        <Avatar name={user.name} tone="blue" />
        <div className="side-user-txt"><strong className="truncate">{user.name}</strong><small className="truncate">{meta.label}</small></div>
        <Tooltip label="Se déconnecter" side="right"><button className="side-logout" onClick={logout} aria-label="Se déconnecter"><LogOut size={17} /></button></Tooltip>
      </div>
    </aside>
  );
}

function NotificationPanel() {
  const { items, unread, markRead, markAll, loading } = useNotifications();
  const { user } = useAuth(), { navigate } = useRouter();
  const base = ROLE_META[user.role].base;
  return (
    <Popover align="end" width={380} className="popover-notif" trigger={<IconButton icon={Bell} label={`Notifications${unread ? `, ${unread} non lues` : ""}`} badge={unread} />}>
      {({ close }) => (
        <div className="notif-panel">
          <header><h3>Notifications</h3>{unread > 0 && <button className="link-btn" onClick={markAll}><Check size={14} />Tout marquer comme lu</button>}</header>
          <div className="notif-list">
            {loading ? <p className="muted pad">Chargement…</p> : !items.length ? <EmptyState compact icon={Bell} title="Aucune notification" description="Vous êtes à jour." /> :
              items.slice(0, 5).map((n) => <NotificationItem key={n.id} n={n} onClick={() => { markRead(n.id); close(); if (n.link) navigate(n.link); }} />)}
          </div>
          <footer><Link to={`${base}/notifications`} onClick={close}>Voir toutes les notifications</Link></footer>
        </div>
      )}
    </Popover>
  );
}

function Header({ crumbs, compact }) {
  const { user, logout } = useAuth(), { resolved, toggle } = useTheme(), { navigate } = useRouter();
  const [q, setQ] = useState("");
  const base = ROLE_META[user.role].base, canSearch = user.role !== "LIVREUR";
  const submit = (e) => {
    e.preventDefault();
    const v = q.trim(); if (!v) return;
    navigate(user.role === "ADMIN" ? `/admin/colis?q=${encodeURIComponent(v)}` : `/super/agences?q=${encodeURIComponent(v)}`);
    setQ("");
  };
  const last = crumbs[crumbs.length - 1];
  return (
    <header className="app-header">
      <Link to={base} className="hd-mark" aria-label="Accueil"><LogoMark size={30} /></Link>
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link to={base} aria-label="Accueil de l'espace"><Home size={15} /></Link>
        {crumbs.map((c, i) => (
          <span key={c.title} className="crumb">
            <ChevronRight size={14} aria-hidden />
            {i === crumbs.length - 1 ? <span aria-current="page">{c.title}</span> : <Link to={c.to}>{c.title}</Link>}
          </span>
        ))}
      </nav>
      <h2 className="hd-title">{last?.title}</h2>
      {canSearch && (
        <form className="hd-search" role="search" onSubmit={submit}>
          <Search size={16} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={user.role === "ADMIN" ? "Rechercher un colis (ex. CT-0001)" : "Rechercher une agence"} aria-label="Recherche globale" />
        </form>
      )}
      <div className="hd-right">
        <Tooltip label={resolved === "dark" ? "Mode clair" : "Mode sombre"} side="bottom"><IconButton icon={resolved === "dark" ? Sun : Moon} label={resolved === "dark" ? "Passer en mode clair" : "Passer en mode sombre"} onClick={toggle} /></Tooltip>
        {user.role !== "SUPER_ADMIN" && <NotificationPanel />}
        <Menu align="end" label="Menu utilisateur" trigger={<button className="user-btn" aria-label="Menu utilisateur"><Avatar name={user.name} size="sm" tone="blue" /><span className="user-btn-name">{user.name}</span></button>}
          items={[{ label: "Profil", icon: UserCog, onClick: () => navigate(`${base}/profil`) }, { label: resolved === "dark" ? "Mode clair" : "Mode sombre", icon: resolved === "dark" ? Sun : Moon, onClick: toggle }, { separator: true }, { label: "Se déconnecter", icon: LogOut, tone: "danger", onClick: logout }]} />
      </div>
    </header>
  );
}

function MobileNav() {
  const { user } = useAuth(), { path } = useRouter();
  const [more, setMore] = useState(false);
  const all = flatNav(user.role), primary = MOBILE_PRIMARY[user.role].map((to) => all.find((i) => i.to === to)).filter(Boolean);
  const rest = all.filter((i) => !primary.includes(i)), cur = activeItem(user.role, path);
  const { unread } = useNotifications();
  const short = {
  "Tableau de bord": "Accueil",
  "Gestion des colis": "Colis",
  "Mes livraisons": "Livraisons",
  Notifications: "Alertes",
  Administrateurs: "Admins"
};
  return (
    <>
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {primary.map((it) => (
          <Link key={it.to} to={it.to} className={cur?.to === it.to ? "on" : ""} aria-current={cur?.to === it.to ? "page" : undefined}>
            <span className="mn-ic"><it.icon size={21} />{it.label === "Notifications" && unread > 0 && <i className="mn-badge">{unread}</i>}</span><span>{short[it.label] || it.label}</span>
          </Link>
        ))}
        {rest.length > 0 && <button className={rest.includes(cur) ? "on" : ""} onClick={() => setMore(true)}><span className="mn-ic"><MoreHorizontal size={21} /></span><span>Plus</span></button>}
      </nav>
      <Drawer open={more} onClose={() => setMore(false)} title="Menu">
        <div className="more-grid">
          {rest.map((it) => <Link key={it.to} to={it.to} onClick={() => setMore(false)} className={cur?.to === it.to ? "on" : ""}><it.icon size={20} />{it.label}</Link>)}
        </div>
      </Drawer>
    </>
  );
}

export default function AppShell({ children, crumbs }) {
  const [pref, setPref] = useState(readCollapsed);
  const tablet = useMedia("(max-width: 1100px)"), mobile = useMedia("(max-width: 760px)");
  const compact = !mobile && (tablet || pref);
  const toggle = () => setPref((v) => { try { localStorage.setItem(KEY, v ? "0" : "1"); } catch { /* ignoré */ } return !v; });
  const { path } = useRouter();
  return (
    <div className={`shell${compact ? " is-compact" : ""}`}>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Aller au contenu</a>
      {!mobile && <Sidebar compact={compact} forced={tablet} onToggle={toggle} />}
      <div className="shell-main">
        <Header crumbs={crumbs} compact={compact} />
        <main id="main" tabIndex={-1} className="shell-content"><div className="page" key={path}>{children}</div></main>
      </div>
      {mobile && <MobileNav />}
    </div>
  );
}
