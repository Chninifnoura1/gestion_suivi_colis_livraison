import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* Routeur minimal basé sur le hash (#/chemin?x=1) : zéro dépendance et compatible avec tout hébergement statique.
   Remplaçable par react-router sans toucher aux pages : seules `navigate`, `Link`, `useParams` et `useQuery` sont utilisées. */
const Ctx = createContext(null);

function read() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = raw.split("?");
  return { path: path.length > 1 ? path.replace(/\/+$/, "") : "/", query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function matchPath(pattern, path) {
  const a = pattern.split("/").filter(Boolean), b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
export const buildPath = (pattern, params = {}) => pattern.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ""));

export function RouterProvider({ routes, children }) {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => { setLoc(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const navigate = useCallback((to, opts = {}) => {
    if (opts.replace) window.location.replace(`#${to}`); else window.location.hash = to;
  }, []);
  const match = useMemo(() => {
    for (const r of routes) { const params = matchPath(r.path, loc.path); if (params) return { route: r, params }; }
    return { route: null, params: {} };
  }, [routes, loc.path]);
  const value = useMemo(() => ({ ...loc, ...match, navigate }), [loc, match, navigate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useRouter = () => useContext(Ctx);
export const useNavigate = () => useContext(Ctx).navigate;
export const useParams = () => useContext(Ctx).params;
export const useQuery = () => useContext(Ctx).query;

export function Link({ to, children, ...rest }) {
  return <a href={`#${to}`} {...rest}>{children}</a>;
}
