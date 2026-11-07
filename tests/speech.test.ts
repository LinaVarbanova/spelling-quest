import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowserSpellingRecognizer,
  mergeRecognitionSegments,
} from "../src/speech";
type Result = {
  isFinal: boolean;
  0: { transcript: string; confidence: number };
};
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  processLocally = true;
  continuous = false;
  interimResults = false;
  lang = "";
  onresult: ((e: { results: Result[]; resultIndex: number }) => void) | null =
    null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.instances.push(this);
  }
  result(...parts: { text: string; final?: boolean }[]) {
    this.onresult?.({
      results: parts.map((p) => ({
        isFinal: p.final !== false,
        0: { transcript: p.text, confidence: 0.95 },
      })),
      resultIndex: 0,
    });
  }
}
beforeEach(() => {
  vi.useFakeTimers();
  FakeRecognition.instances = [];
  vi.stubGlobal("window", {
    SpeechRecognition: FakeRecognition,
    isSecureContext: true,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function setup() {
  const recognizer = new BrowserSpellingRecognizer(),
    candidate = vi.fn(),
    error = vi.fn(),
    end = vi.fn();
  recognizer.start(false, "en-GB", candidate, error, end);
  return {
    recognizer,
    candidate,
    error,
    end,
    native: FakeRecognition.instances[0],
  };
}
describe("user-controlled letter recording", () => {
  it("uses continuous browser service and does not finish on a result", () => {
    const { recognizer, native, end, candidate } = setup();
    expect(native.continuous).toBe(true);
    expect(native.interimResults).toBe(false);
    expect(native.processLocally).toBe(false);
    native.result({ text: "ay bee" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("ab");
    expect(end).not.toHaveBeenCalled();
    expect(recognizer.status).toBe("listening");
    recognizer.stop();
  });
  it("combines cumulative result snapshots and restarted sessions without duplicated letters", () => {
    const { recognizer, native, candidate, end } = setup();
    native.result({ text: "a" }, { text: "bee", final: false });
    native.result({ text: "a" }, { text: "bee" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("ab");
    vi.advanceTimersByTime(1000);
    native.onend?.();
    vi.advanceTimersByTime(350);
    const second = FakeRecognition.instances[1];
    second.result({ text: "see dee" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("abcd");
    expect(end).not.toHaveBeenCalled();
    recognizer.stop();
  });
  it("treats pauses as normal and allows Stop while waiting to restart", () => {
    const { recognizer, native, candidate, error, end } = setup();
    native.result({ text: "a bee" });
    vi.advanceTimersByTime(2000);
    native.onerror?.({ error: "no-speech" });
    native.onend?.();
    recognizer.finish();
    vi.advanceTimersByTime(1000);
    expect(FakeRecognition.instances).toHaveLength(1);
    expect(error).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("ab");
  });
  it("keeps final letters that arrive after Stop and never restarts a stopped recording", () => {
    const { recognizer, native, candidate, end } = setup();
    native.result({ text: "a bee" });
    recognizer.finish();
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(end).not.toHaveBeenCalled();
    native.result({ text: "a bee see" });
    native.onend?.();
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("abc");
    expect(end).toHaveBeenCalledTimes(1);
    expect(recognizer.status).toBe("confirmation");
    vi.advanceTimersByTime(10000);
    expect(FakeRecognition.instances).toHaveLength(1);
  });
  it("preserves uncertain interim letters if a browser never returns a final end event", () => {
    const { recognizer, native, candidate, end } = setup();
    native.result({ text: "a bee", final: false });
    recognizer.finish();
    vi.advanceTimersByTime(4000);
    expect(end).toHaveBeenCalledTimes(1);
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("ab");
    expect(candidate.mock.lastCall?.[0].ambiguous).toBe(true);
    expect(native.abort).toHaveBeenCalled();
  });
  it("cancel detaches stale callbacks and prevents scheduled microphone restarts", () => {
    const { recognizer, native, candidate, end } = setup();
    const old = native.onresult;
    recognizer.stop();
    old?.({
      results: [{ isFinal: true, 0: { transcript: "bee", confidence: 1 } }],
      resultIndex: 0,
    });
    vi.advanceTimersByTime(10000);
    expect(candidate).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
    expect(native.abort).toHaveBeenCalled();
    expect(FakeRecognition.instances).toHaveLength(1);
  });
  it("fatal errors preserve letters and stop retrying", () => {
    const { native, candidate, error, end } = setup();
    native.result({ text: "a bee" });
    native.onerror?.({ error: "network" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("ab");
    expect(error).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5000);
    expect(FakeRecognition.instances).toHaveLength(1);
  });
});

describe("browser transcript revisions", () => {
  const final = (text: string) => ({ text, confidence: 0.95, final: true });
  it("collapses the growing phrase slots seen in the phone screenshot", () => {
    const parts = [
      "c",
      "c",
      "c a",
      "c a n",
      "c a n n",
      "c a n n",
      "c a n n a",
      "c a n n a r",
      "c a n n a r y",
    ].map(final);
    const result = mergeRecognitionSegments(parts)!;
    expect(result.letters.join("")).toBe("cannary");
    expect(result.transcript).toBe("c a n n a r y");
    expect(result.ambiguous).toBe(true);
    expect(result.revisionDetected).toBe(true);
  });
  it("uses the latest correction rather than appending an earlier wrong hypothesis", () => {
    const result = mergeRecognitionSegments(
      ["c", "c a", "c a n n", "c a n a r y"].map(final),
    )!;
    expect(result.letters.join("")).toBe("canary");
  });
  it("preserves legitimate repeated isolated letters and repeated letters within a phrase", () => {
    expect(
      mergeRecognitionSegments(["bee", "ee", "ee"].map(final))?.letters.join(
        "",
      ),
    ).toBe("bee");
    expect(
      mergeRecognitionSegments(["see", "see"].map(final))?.letters.join(""),
    ).toBe("cc");
    expect(
      mergeRecognitionSegments([final("a d d i t i o n a l")])?.letters.join(
        "",
      ),
    ).toBe("additional");
  });
  it("joins distinct final chunks without deleting overlaps by letter value alone", () => {
    expect(
      mergeRecognitionSegments(
        ["a d", "d i", "t i o n a l"].map(final),
      )?.letters.join(""),
    ).toBe("additional");
  });
  it("does not score or permanently commit drafts from a silence restart", () => {
    const { recognizer, native, candidate } = setup();
    native.result({ text: "c", final: false });
    expect(candidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    native.onend?.();
    vi.advanceTimersByTime(350);
    const next = FakeRecognition.instances[1];
    next.result({ text: "c a n a r y" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("canary");
    recognizer.stop();
  });
  it("ignores duplicate callbacks for the same result snapshot", () => {
    const { recognizer, native, candidate } = setup();
    native.result({ text: "b e e" });
    native.result({ text: "b e e" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("bee");
    recognizer.stop();
  });
  it("handles rolling full transcripts across browser restarts without appending prefixes", () => {
    const { recognizer, native, candidate } = setup();
    native.result({ text: "c a" });
    vi.advanceTimersByTime(1000);
    native.onend?.();
    vi.advanceTimersByTime(350);
    FakeRecognition.instances[1].result({ text: "c a n a r y" });
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("canary");
    expect(candidate.mock.lastCall?.[0].ambiguous).toBe(true);
    recognizer.stop();
  });
  it("works through the prefixed WebKit API without enabling interim callbacks", () => {
    vi.stubGlobal("window", {
      webkitSpeechRecognition: FakeRecognition,
      isSecureContext: true,
    });
    const { recognizer, native, candidate } = setup();
    expect(native.interimResults).toBe(false);
    native.result(
      ...["c", "c a", "c a n", "c a n a r y"].map((text) => ({ text })),
    );
    recognizer.finish();
    native.onend?.();
    expect(candidate.mock.lastCall?.[0].letters.join("")).toBe("canary");
    recognizer.stop();
  });
});
