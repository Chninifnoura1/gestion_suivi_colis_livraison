import { useId, useState } from "react";
import { Eye, EyeOff, AlertCircle, Search, X } from "lucide-react";

/* Champ unifié : input | select | textarea. Gère label, obligatoire, aide, erreur et accessibilité. */
export function Field({ label, required, hint, error, as = "input", options, icon: Icon, suffix, className = "", id, type = "text", ...rest }) {
  const auto = useId(), fid = id || auto;
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const props = { id: fid, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${fid}-e` : hint ? `${fid}-h` : undefined, required: undefined, ...rest };
  let control;
  if (as === "select") {
    control = (
      <select className="control control-select" {...props}>
        {rest.placeholder && <option value="">{rest.placeholder}</option>}
        {(options || []).map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    );
  } else if (as === "textarea") {
    control = <textarea className="control control-area" rows={4} {...props} />;
  } else {
    control = <input className={`control${Icon ? " has-icon" : ""}${isPw || suffix ? " has-suffix" : ""}`} type={isPw && show ? "text" : type} {...props} />;
  }
  return (
    <div className={`field ${error ? "has-error" : ""} ${className}`}>
      {label && <label htmlFor={fid}>{label}{required && <span className="req" aria-hidden> *</span>}{required && <span className="sr-only"> (obligatoire)</span>}</label>}
      <div className="control-wrap">
        {Icon && <Icon size={16} className="control-ic" aria-hidden />}
        {control}
        {isPw && <button type="button" className="control-btn" onClick={() => setShow(!show)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
        {suffix && !isPw && <span className="control-suffix">{suffix}</span>}
      </div>
      {error ? <p className="field-err" id={`${fid}-e`} role="alert"><AlertCircle size={13} aria-hidden />{error}</p> : hint && <p className="field-hint" id={`${fid}-h`}>{hint}</p>}
    </div>
  );
}

export function FormSection({ title, description, icon: Icon, children, id, aside }) {
  return (
    <section className="form-section" id={id}>
      <header>
        {Icon && <span className="form-section-ic"><Icon size={18} /></span>}
        <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
        {aside}
      </header>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`switch${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
      <i />
    </button>
  );
}

export function Checkbox({ label, error, checked, onChange, id, ...rest }) {
  const auto = useId(), cid = id || auto;
  return (
    <div className={`check ${error ? "has-error" : ""}`}>
      <input id={cid} type="checkbox" checked={!!checked} onChange={onChange} {...rest} />
      <label htmlFor={cid}>{label}</label>
      {error && <p className="field-err" role="alert"><AlertCircle size={13} />{error}</p>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Rechercher…", className = "", ...rest }) {
  return (
    <div className={`search ${className}`}>
      <Search size={16} aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} {...rest} />
      {value && <button type="button" onClick={() => onChange("")} aria-label="Effacer la recherche"><X size={14} /></button>}
    </div>
  );
}
