import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext(null);
const KEY = "ct-theme";
const store = { get: () => { try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* stockage indisponible */ } } };

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(store.get);
  const [sys, setSys] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)"), on = (e) => setSys(e.matches);
    mq.addEventListener("change", on); return () => mq.removeEventListener("change", on);
  }, []);
  const resolved = theme === "system" ? (sys ? "dark" : "light") : theme;
  useEffect(() => { document.documentElement.setAttribute("data-theme", resolved); }, [resolved]);
  const setTheme = useCallback((t) => {
    const root = document.documentElement;
    root.classList.add("theme-anim"); setTimeout(() => root.classList.remove("theme-anim"), 400);
    store.set(t); setThemeState(t);
  }, []);
  const toggle = useCallback(() => setTheme(resolved === "dark" ? "light" : "dark"), [resolved, setTheme]);
  const value = useMemo(() => ({ theme, resolved, setTheme, toggle }), [theme, resolved, setTheme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
