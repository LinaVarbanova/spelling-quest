import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  createQuestScene,
  type QuestSceneAPI,
  type QuestSceneOptions,
  type QuestResolution,
} from "./quest-scene";
export type QuestSceneProps = Omit<QuestSceneOptions, "motion"> & {
  reduced: boolean;
  title: string;
  objective: string;
  fallback: ReactNode;
  answer: string;
  hearing: boolean;
  resolution: (QuestResolution & { id: string; last: boolean }) | null;
};
export default function QuestScene({
  world,
  equipment,
  boss,
  wordCount,
  seed,
  reduced,
  title,
  objective,
  fallback,
  answer,
  hearing,
  resolution,
}: QuestSceneProps) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<QuestSceneAPI | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const resolved = useRef(new Set<string>()),
    finished = useRef(false);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () =>
      !reduced &&
      !media.matches &&
      !document.documentElement.classList.contains("reduced-motion");
    const lost = () => {
      api.current?.dispose();
      api.current = null;
      setUnavailable(true);
    };
    container.addEventListener("quest-scene-unavailable", lost);
    resolved.current.clear();
    finished.current = false;
    try {
      api.current = createQuestScene(
        container,
        { world, boss, wordCount, seed, equipment, motion: motion() },
        (state) => {
          for (const [key, value] of Object.entries(state))
            container.setAttribute("data-scene-" + key, String(value));
        },
      );
    } catch {
      lost();
    }
    const update = () => api.current?.setMotion(motion());
    media.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      container.removeEventListener("quest-scene-unavailable", lost);
      media.removeEventListener("change", update);
      observer.disconnect();
      api.current?.dispose();
      api.current = null;
    };
  }, [world, boss, wordCount, seed, reduced, equipment]);
  useEffect(() => {
    api.current?.hear(hearing);
  }, [hearing]);
  useEffect(() => {
    if (!resolution) {
      try {
        api.current?.typed(answer);
      } catch {
        api.current?.dispose();
        api.current = null;
        setUnavailable(true);
      }
    }
  }, [answer, resolution]);
  useEffect(() => {
    if (!resolution || resolved.current.has(resolution.id) || !api.current)
      return;
    resolved.current.add(resolution.id);
    void api.current.resolve(resolution).catch(() => {
      api.current?.dispose();
      api.current = null;
      setUnavailable(true);
    });
    if (resolution.last && !finished.current) {
      finished.current = true;
      void api.current.finish().catch(() => {
        api.current?.dispose();
        api.current = null;
        setUnavailable(true);
      });
    }
  }, [resolution]);
  if (unavailable) return <>{fallback}</>;
  return (
    <section className="quest-stage-shell" aria-label="Sky Trail quest">
      <div className="quest-stage-title">
        <p className="eyebrow">SPELL THE BRIDGE · CROSS THE SKY</p>
        <h2>{title}</h2>
        <p>{objective}</p>
      </div>
      <div ref={host} className="quest-stage" />
      <p className="quest-stage-caption">
        Your letters become the path · Drag to look around
      </p>
    </section>
  );
}
