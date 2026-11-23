import { useCallback, useRef, useState } from "react";

const PHONE = /^(\+212|0)[5-7]\d{8}$/;
export const rules = {
  required: (msg = "Ce champ est obligatoire.") => (v) => (String(v ?? "").trim() ? "" : msg),
  email: (msg = "Adresse e-mail invalide.") => (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : msg),
  phone: (msg = "Numéro invalide (ex. 06 12 34 56 78).") => (v) => (!v || PHONE.test(String(v).replace(/[\s.-]/g, "")) ? "" : msg),
  positive: (msg = "Saisissez une valeur supérieure à 0.") => (v) => (!v || Number(v) > 0 ? "" : msg),
  min: (n, msg) => (v) => (!v || String(v).length >= n ? "" : msg || `Minimum ${n} caractères.`),
  match: (other, msg = "Les valeurs ne correspondent pas.") => (v, all) => (v === all[other] ? "" : msg),
  checked: (msg = "Cette confirmation est obligatoire.") => (v) => (v ? "" : msg),
};

/* useForm : valeurs, erreurs par champ, validation à la soumission (puis à la volée), focus sur la 1re erreur. */
export default function useForm(initial, schema = {}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const root = useRef(null);

  const check = useCallback((name, v, all) => { for (const r of schema[name] || []) { const m = r(v, all); if (m) return m; } return ""; }, [schema]);

  const set = (name, v) => {
    setValues((cur) => {
      const next = { ...cur, [name]: v };
      setErrors((e) => (e[name] !== undefined ? { ...e, [name]: check(name, v, next) } : e));
      return next;
    });
  };
  const field = (name) => ({
    name, id: `f-${name}`, value: values[name] ?? "", error: errors[name],
    onChange: (e) => set(name, e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e),
    onBlur: () => setErrors((e) => (values[name] ? { ...e, [name]: check(name, values[name], values) } : e)),
  });
  const validate = () => {
    const next = {};
    Object.keys(schema).forEach((k) => { const m = check(k, values[k], values); if (m) next[k] = m; });
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) requestAnimationFrame(() => { const el = (root.current || document).querySelector(`#f-${first}`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.focus({ preventScroll: true }); });
    return !Object.keys(next).length;
  };
  const submit = (fn) => async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try { await fn(values); } finally { setSubmitting(false); }
  };
  const reset = (v = initial) => { setValues(v); setErrors({}); };
  return { values, errors, field, set, submit, reset, submitting, root, setValues, validate };
}
