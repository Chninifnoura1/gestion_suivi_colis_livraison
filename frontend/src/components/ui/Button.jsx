import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

/* variant : primary | accent | secondary | ghost | danger | success — size : sm | md | lg */
const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, iconRight: IconR, loading, full, to, children, className = "", disabled, type = "button", ...rest }, ref
) {
  const cls = `btn btn-${variant} btn-${size}${full ? " btn-full" : ""}${loading ? " is-loading" : ""} ${className}`;
  const content = (
    <>
      {loading ? <Loader2 size={size === "sm" ? 14 : 16} className="spin" aria-hidden /> : Icon && <Icon size={size === "sm" ? 15 : 17} aria-hidden />}
      {children && <span>{children}</span>}
      {IconR && !loading && <IconR size={size === "sm" ? 15 : 17} aria-hidden />}
    </>
  );
  if (to) return <a ref={ref} href={`#${to}`} className={cls} {...rest}>{content}</a>;
  if (rest.href) return <a ref={ref} className={cls} {...rest}>{content}</a>;
  return <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>{content}</button>;
});
export default Button;

export const IconButton = forwardRef(function IconButton({ icon: Icon, label, size = "md", variant = "ghost", className = "", badge, ...rest }, ref) {
  return (
    <button ref={ref} type="button" className={`icon-btn icon-btn-${variant} icon-btn-${size} ${className}`} aria-label={label} {...rest}>
      <Icon size={size === "sm" ? 16 : 18} aria-hidden />
      {badge > 0 && <span className="icon-btn-badge">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
});
