import { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "default" });

export function MermaidBlock({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !chart) return;
    const id = `mermaid-${Date.now()}`;
    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      })
      .catch(() => {
        if (ref.current) {
          ref.current.innerHTML = "<p>Fluxograma indisponível.</p>";
        }
      });
  }, [chart]);

  return <div className="mermaid-card" ref={ref} />;
}