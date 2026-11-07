import { useEffect, useRef, useState } from "react";
import { createPlayground } from "./playground-scene";
import { worlds } from "./game";
import { WorldArt } from "./Art";
export default function IslandPlayground({
  world,
  reduced,
  onSelect,
}: {
  world: number;
  reduced: boolean;
  onSelect: (i: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof createPlayground> | null>(null),
    select = useRef(onSelect);
  const [unavailable, setUnavailable] = useState(false),
    [systemReduced, setSystemReduced] = useState(false);
  select.current = onSelect;
  useEffect(() => {
    const pref = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(pref.matches);
    update();
    pref.addEventListener("change", update);
    return () => pref.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!host.current) return;
    const container = host.current;
    const lost = () => setUnavailable(true);
    container.addEventListener("playground-unavailable", lost);
    try {
      api.current = createPlayground(container, (i) => select.current(i));
    } catch {
      setUnavailable(true);
    }
    return () => {
      container.removeEventListener("playground-unavailable", lost);
      api.current?.dispose();
      api.current = null;
    };
  }, []);
  useEffect(() => api.current?.select(world), [world]);
  useEffect(
    () => api.current?.setMotion(!(reduced || systemReduced)),
    [reduced, systemReduced],
  );
  return (
    <section
      className="island-playground"
      aria-label="Interactive world playground"
    >
      <div className="playground-caption">
        <span>YOUR SPELLING UNIVERSE</span>
        <span className="live-dot">
          {unavailable ? "WORLD PREVIEW" : "LIVE 3D"}
        </span>
      </div>
      <div
        ref={host}
        className="playground-canvas"
        data-motion={reduced || systemReduced ? "reduced" : "on"}
      />
      {unavailable && (
        <div className="playground-fallback">
          <WorldArt world={world} />
          <p>3D view unavailable. Explore with the world buttons below.</p>
        </div>
      )}
      <div className="playground-toolbar">
        <span>
          {unavailable ? "Choose a realm" : "Drag the islands to look around"}
        </span>
        <div>
          <button
            aria-label="Rotate world playground left"
            disabled={unavailable}
            onClick={() => api.current?.rotate(-0.2)}
          >
            ←
          </button>
          <button
            aria-label="Rotate world playground right"
            disabled={unavailable}
            onClick={() => api.current?.rotate(0.2)}
          >
            →
          </button>
        </div>
      </div>
      <div className="realm-picker" role="group" aria-label="Preview a world">
        {worlds.map((w, i) => (
          <button
            key={w.name}
            aria-label={`Preview ${w.name}`}
            aria-pressed={world === i}
            className={world === i ? "active" : ""}
            onClick={() => onSelect(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
      <p className="selected-realm">
        <span>EXPLORING</span> {worlds[world].name}
      </p>
    </section>
  );
}
