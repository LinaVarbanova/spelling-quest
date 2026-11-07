import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuestScene, type QuestSceneState } from "../src/quest-scene";
const calls = vi.hoisted(() => ({
  render: vi.fn(),
  dispose: vi.fn(),
  pixelRatio: vi.fn(),
  lose: vi.fn(),
}));
vi.mock("three", async (importOriginal) => {
  const original = await importOriginal<typeof import("three")>();
  return {
    ...original,
    WebGLRenderer: class {
      domElement = Object.assign(new EventTarget(), {
        setAttribute: vi.fn(),
        setPointerCapture: vi.fn(),
        remove: vi.fn(),
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 1024,
          height: 540,
        }),
      });
      shadowMap = { enabled: true };
      info = { render: { triangles: 1234 } };
      outputColorSpace = "";
      setPixelRatio = calls.pixelRatio;
      setClearColor = vi.fn();
      setSize = vi.fn();
      render = calls.render;
      dispose = calls.dispose;
      forceContextLoss = calls.lose;
    },
  };
});
function fixture(motion = false, world = 0, boss = false) {
  const states: QuestSceneState[] = [];
  const container = Object.assign(new EventTarget(), {
    clientWidth: 1024,
    clientHeight: 540,
    dataset: {},
    appendChild: vi.fn(),
  }) as unknown as HTMLElement;
  const api = createQuestScene(
    container,
    { world, boss, wordCount: 10, seed: "test-quest", motion },
    (s) => states.push(s),
  );
  return { api, states, container };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("window", {
    devicePixelRatio: 3,
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        font: "",
        textAlign: "",
        textBaseline: "",
        fillStyle: "",
        clearRect: vi.fn(),
        fillText: vi.fn(),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
        fillRect: vi.fn(),
      }),
    }),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 34),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Sky Trail scene skeleton", () => {
  it("is ready without any target-word input and caps rendering density", () => {
    const { api, states } = fixture();
    expect(states.at(-1)).toMatchObject({
      arrived: 0,
      gap: 0,
      gold: 0,
      blue: 0,
      phase: "ready",
      walking: false,
    });
    expect(calls.pixelRatio).toHaveBeenCalledWith(1.75);
    api.dispose();
  });
  it("renders on demand in reduced motion and releases its renderer", async () => {
    const { api } = fixture();
    await vi.advanceTimersByTimeAsync(100);
    const painted = calls.render.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls.render).toHaveBeenCalledTimes(painted);
    api.dispose();
    expect(calls.dispose).toHaveBeenCalledOnce();
    expect(calls.lose).toHaveBeenCalledOnce();
    api.dispose();
    expect(calls.dispose).toHaveBeenCalledOnce();
  });
  it("stops its animation loop when disposed", async () => {
    const { api } = fixture(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(calls.render.mock.calls.length).toBeGreaterThan(1);
    api.dispose();
    const painted = calls.render.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(calls.render).toHaveBeenCalledTimes(painted);
  });
});

describe("rune bridges and queue", () => {
  it("uses fixed slot positions without taking a target word length", async () => {
    const { typedSlot, queueSpeed } = await import("../src/quest-scene");
    expect(typedSlot(0, 0).distanceTo(typedSlot(0, 1))).toBeGreaterThan(0.4);
    expect(typedSlot(0, 0)).toEqual(typedSlot(0, 0));
    expect(queueSpeed(1)).toBe(4.2);
    expect(queueSpeed(3)).toBeCloseTo(10.92);
  });
  it("queues correct crossings and reserves the next gap immediately", async () => {
    const { api, states } = fixture();
    api.typed("body");
    const first = api.resolve({ correct: true, word: "body" });
    expect(states.at(-1)?.gap).toBe(1);
    api.typed("clap");
    const second = api.resolve({ correct: true, word: "clap" });
    await Promise.all([first, second]);
    expect(states.at(-1)).toMatchObject({
      arrived: 2,
      gap: 2,
      gold: 2,
      blue: 0,
      walking: false,
    });
    api.dispose();
  });
  it("settles queued work on disposal instead of leaving promises waiting for frames", async () => {
    const { api } = fixture(true);
    const crossing = api.resolve({ correct: true, word: "body" });
    await vi.advanceTimersByTimeAsync(100);
    api.dispose();
    await crossing;
    expect(calls.dispose).toHaveBeenCalledOnce();
  });
});

describe("gentle misses", () => {
  it("crosses a blue wisp bridge without awarding a gold lantern", async () => {
    const { api, states } = fixture();
    api.typed("wrong");
    await api.resolve({ correct: false, word: "body" });
    expect(states.at(-1)).toMatchObject({
      arrived: 1,
      gap: 1,
      gold: 0,
      blue: 1,
      walking: false,
    });
    api.dispose();
  });
  it("keeps the hero and gap on a boss retry", async () => {
    const { api, states } = fixture();
    api.typed("wrong");
    await api.resolve({ correct: false, word: "body", retrySameGap: true });
    expect(states.at(-1)).toMatchObject({
      arrived: 0,
      gap: 0,
      gold: 0,
      blue: 0,
      phase: "ready",
    });
    api.dispose();
  });
});

describe("six themed worlds", () => {
  it("places deterministic scenery only behind the path", async () => {
    const { propPositions, islandPosition } =
      await import("../src/quest-scene");
    expect(propPositions("trail", 0)).toEqual(propPositions("trail", 0));
    expect(propPositions("trail", 0)).not.toEqual(
      propPositions("different", 0),
    );
    for (let i = 0; i < 10; i++) {
      const d = islandPosition(i + 1)
        .sub(islandPosition(i))
        .setY(0)
        .normalize();
      for (const p of propPositions("trail", i))
        expect(p.x * d.z - p.z * d.x).toBeGreaterThan(0.8);
    }
  });
  it("builds each world under the triangle budget without shadow maps", async () => {
    const THREE = await import("three");
    const { questLightTypes } = await import("../src/quest-scene");
    for (let world = 0; world < 6; world++) {
      const { api, container } = fixture(false, world);
      await vi.advanceTimersByTimeAsync(40);
      expect(container.dataset.sceneWorld).toBe(String(world));
      expect(container.dataset.sceneLight).toBe(questLightTypes[world]);
      const scene = calls.render.mock.lastCall?.[0] as import("three").Scene;
      let triangles = 0;
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh)
          triangles +=
            (o.geometry.index?.count ||
              o.geometry.getAttribute("position").count) / 3;
        else if (o instanceof THREE.Sprite) triangles += 2;
      });
      expect(triangles).toBeLessThan(25000);
      api.dispose();
    }
  });
});

describe("guardian battles", () => {
  it("cracks one shield per correct word, preserves it on a retry and shatters at victory", async () => {
    const { api, states, container } = fixture(false, 3, true);
    expect(container.dataset.sceneShield).toBe("10");
    api.typed("wrong");
    await api.resolve({ correct: false, word: "body", retrySameGap: true });
    expect(container.dataset.sceneShield).toBe("10");
    expect(states.at(-1)?.arrived).toBe(0);
    await api.resolve({ correct: true, word: "body" });
    expect(container.dataset.sceneShield).toBe("9");
    expect(states.at(-1)?.arrived).toBe(1);
    for (let i = 1; i < 10; i++)
      await api.resolve({ correct: true, word: "body" });
    await api.finish();
    expect(container.dataset.sceneShield).toBe("0");
    expect(states.at(-1)).toMatchObject({
      arrived: 10,
      gold: 10,
      blue: 0,
      phase: "finished",
    });
    api.dispose();
  });
});
