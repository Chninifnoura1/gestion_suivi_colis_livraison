import { useEffect, useState } from "react";

export default function useMedia(query) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query), on = () => setM(mq.matches);
    mq.addEventListener("change", on); on();
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}
