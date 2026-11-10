import Block from "./Block";

export default function PageView({ page, go }) {
  return <>
    <h1>{page.t}</h1><p className="sub">{page.d}</p>
    {page.b.map((b, i) => <Block key={page.t + i} b={b} go={go} />)}
  </>;
}
