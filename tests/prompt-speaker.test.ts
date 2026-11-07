import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { speaker } from "../src/speech";
let utterance: SpeechSynthesisUtterance;
const synthesis = {
  getVoices: () => [],
  cancel: vi.fn(),
  speak: vi.fn((u: SpeechSynthesisUtterance) => {
    utterance = u;
  }),
};
beforeEach(() => {
  vi.stubGlobal("window", { speechSynthesis: synthesis });
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
});
afterEach(() => {
  speaker.stop();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("reports actual playback and cancellation, ignoring late start events", () => {
  const activity = vi.fn(),
    error = vi.fn();
  speaker.speak(
    "body",
    { locale: "en-GB", voice: "", rate: 0.85 },
    error,
    activity,
  );
  expect(activity).not.toHaveBeenCalled();
  utterance.onstart?.({} as SpeechSynthesisEvent);
  expect(activity).toHaveBeenLastCalledWith(true);
  speaker.stop();
  expect(activity).toHaveBeenLastCalledWith(false);
  utterance.onstart?.({} as SpeechSynthesisEvent);
  expect(activity).toHaveBeenCalledTimes(2);
  expect(error).not.toHaveBeenCalled();
});
it("clears playback activity on completion or a speech error", () => {
  const activity = vi.fn(),
    error = vi.fn();
  speaker.speak(
    "body",
    { locale: "en-GB", voice: "", rate: 1 },
    error,
    activity,
  );
  utterance.onstart?.({} as SpeechSynthesisEvent);
  utterance.onend?.({} as SpeechSynthesisEvent);
  expect(activity).toHaveBeenLastCalledWith(false);
  speaker.speak(
    "body",
    { locale: "en-GB", voice: "", rate: 1 },
    error,
    activity,
  );
  utterance.onerror?.({ error: "network" } as SpeechSynthesisErrorEvent);
  expect(activity).toHaveBeenLastCalledWith(false);
  expect(error).toHaveBeenCalledOnce();
});
