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
function fixture(motion = false) {
  const states: QuestSceneState[] = [];
  const container = Object.assign(new EventTarget(), {
    clientWidth: 1024,
    clientHeight: 540,
    dataset: {},
    appendChild: vi.fn(),
  }) as unknown as HTMLElement;
  const api = createQuestScene(
    container,
    { world: 0, boss: false, wordCount: 10, seed: "test-quest", motion },
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
