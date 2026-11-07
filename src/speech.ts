export interface SpeechSettings {
  locale: string;
  voice: string;
  rate: number;
}
export interface PromptSpeaker {
  available(): boolean;
  speak(
    text: string,
    settings: SpeechSettings,
    onError: () => void,
    onActivity?: (active: boolean) => void,
  ): void;
  stop(): void;
}
let endPrompt: (() => void) | undefined;
export const speaker: PromptSpeaker = {
  available: () => "speechSynthesis" in window,
  speak(text, settings, onError, onActivity) {
    if (!this.available()) {
      onError();
      return;
    }
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    let ended = false;
    const done = () => {
      if (ended) return;
      ended = true;
      onActivity?.(false);
      if (endPrompt === done) endPrompt = undefined;
    };
    endPrompt = done;
    u.onstart = () => {
      if (!ended) onActivity?.(true);
    };
    u.onend = done;
    u.lang = settings.locale;
    u.rate = settings.rate;
    u.voice =
      speechSynthesis.getVoices().find((v) => v.voiceURI === settings.voice) ||
      speechSynthesis.getVoices().find((v) => v.lang === settings.locale) ||
      speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) ||
      null;
    u.onerror = (e) => {
      done();
      if (e.error !== "interrupted" && e.error !== "canceled") onError();
    };
    try {
      speechSynthesis.speak(u);
    } catch {
      done();
      onError();
    }
  },
  stop() {
    endPrompt?.();
    if (this.available()) speechSynthesis.cancel();
  },
};
export type RecognitionStatus = "idle" | "listening" | "confirmation" | "error";
export type Candidate = {
  letters: string[];
  confidence: number;
  ambiguous: boolean;
  transcript: string;
  revisionDetected?: boolean;
};
export interface SpellingRecognizer {
  capability(): { supported: boolean; local: boolean; reason?: string };
  start(
    local: boolean,
    locale: string,
    onCandidate: (c: Candidate) => void,
    onError: (message: string) => void,
    onEnd: () => void,
  ): void;
  stop(): void;
  finish(): void;
  status: RecognitionStatus;
}
const names: Record<string, string> = {
  a: "a",
  ay: "a",
  aye: "a",
  b: "b",
  bee: "b",
  be: "b",
  c: "c",
  see: "c",
  sea: "c",
  d: "d",
  dee: "d",
  e: "e",
  ee: "e",
  f: "f",
  ef: "f",
  eff: "f",
  g: "g",
  gee: "g",
  h: "h",
  aitch: "h",
  haitch: "h",
  i: "i",
  eye: "i",
  j: "j",
  jay: "j",
  k: "k",
  kay: "k",
  l: "l",
  el: "l",
  ell: "l",
  m: "m",
  em: "m",
  n: "n",
  en: "n",
  o: "o",
  oh: "o",
  p: "p",
  pee: "p",
  q: "q",
  cue: "q",
  queue: "q",
  r: "r",
  ar: "r",
  s: "s",
  ess: "s",
  t: "t",
  tea: "t",
  tee: "t",
  u: "u",
  you: "u",
  v: "v",
  vee: "v",
  w: "w",
  x: "x",
  ex: "x",
  y: "y",
  why: "y",
  z: "z",
  zed: "z",
  zee: "z",
};
export function parseLetters(transcript: string, confidence = 0): Candidate {
  const normalized = transcript
    .toLowerCase()
    .replace(/double[ -]+(you|u|yew)/g, "w")
    .replace(/[^a-z\s-]/g, " ")
    .replace(/-/g, " ");
  const tokens = normalized.trim().split(/\s+/).filter(Boolean),
    letters: string[] = [];
  let ambiguous = !Number.isFinite(confidence) || confidence < 0.75;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.length === 1 || names[token]) letters.push(names[token] || token);
    else if (token === "as" && tokens[i + 1] === "in" && tokens[i + 2]) {
      letters.pop();
      letters.push(tokens[i + 2][0]);
      i += 2;
    } else {
      ambiguous = true;
    }
  }
  return { letters, confidence, ambiguous, transcript };
}
export type RecognitionSegment = {
  text: string;
  confidence: number;
  final: boolean;
};
/** Some browser services put successive full-phrase revisions in separate result slots.
 * Collapse growing snapshots, never blindly deduplicate letters (B E E must keep both Es).
 * This does not consult the target word or correct the learner's spelling.
 */
export function mergeRecognitionSegments(
  segments: RecognitionSegment[],
  includeDraft = false,
): Candidate | null {
  const stable = segments.filter((s) => s.final && s.text.trim());
  const drafts = segments.filter((s) => !s.final && s.text.trim());
  if (includeDraft && drafts.length)
    stable.push({ ...drafts[drafts.length - 1], confidence: 0.3 });
  if (!stable.length) return null;
  const output: RecognitionSegment[] = [];
  let run: RecognitionSegment[] = [],
    keys: string[][] = [],
    rolling = false,
    revised = false;
  const key = (text: string) => {
    const parsed = parseLetters(text, 1);
    return !parsed.ambiguous && parsed.letters.length
      ? parsed.letters
      : text.toLowerCase().trim().split(/\s+/);
  };
  const flush = () => {
    if (rolling) {
      output.push(run[run.length - 1]);
      revised = true;
    } else output.push(...run);
    run = [];
    keys = [];
    rolling = false;
  };
  for (const part of stable) {
    const next = key(part.text),
      previous = keys[keys.length - 1];
    if (!previous) {
      run.push(part);
      keys.push(next);
      continue;
    }
    const prefix =
      previous.length <= next.length &&
      previous.every((letter, i) => letter === next[i]);
    const same = previous.length === next.length && prefix;
    // Once a growing full-phrase revision is observed, later edits of that phrase replace it too.
    const revisesPhrase = rolling && next.length > 1 && next[0] === keys[0][0];
    if (prefix || revisesPhrase) {
      if (!same) rolling = true;
      run.push(part);
      keys.push(next);
    } else {
      flush();
      run.push(part);
      keys.push(next);
    }
  }
  flush();
  const candidate = parseLetters(
    output.map((p) => p.text.trim()).join(" "),
    Math.min(...output.map((p) => p.confidence)),
  );
  return {
    ...candidate,
    ambiguous: candidate.ambiguous || revised,
    revisionDetected: revised,
  };
}

interface RecognitionEvent {
  results: {
    isFinal: boolean;
    0: { transcript: string; confidence: number };
  }[];
  resultIndex: number;
}
interface NativeRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  processLocally?: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => NativeRecognition;
function constructor(): RecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}
export class BrowserSpellingRecognizer implements SpellingRecognizer {
  status: RecognitionStatus = "idle";
  private recognition?: NativeRecognition;
  capability() {
    const C = constructor();
    return {
      supported: !!C && window.isSecureContext,
      local: !!C && "processLocally" in C.prototype,
      reason: !window.isSecureContext
        ? "Microphone requires HTTPS or localhost."
        : !C
          ? "This browser has no speech recognition. Choose Listen & Type explicitly, or open a supported Chrome/Edge browser."
          : undefined,
    };
  }
  private restartTimer?: ReturnType<typeof setTimeout>;
  private finishTimer?: ReturnType<typeof setTimeout>;
  private capturing = false;
  private finishCapture?: () => void;

  start(
    local: boolean,
    locale: string,
    onCandidate: (c: Candidate) => void,
    onError: (m: string) => void,
    onEnd: () => void,
  ) {
    this.stop();
    const cap = this.capability(),
      C = constructor();
    if (!cap.supported || !C) {
      this.status = "error";
      onError(cap.reason || "Recognition unavailable");
      onEnd();
      return;
    }
    if (local && !cap.local) {
      this.status = "error";
      onError(
        "On-device recognition is not supported in this browser. Nothing was uploaded.",
      );
      onEnd();
      return;
    }
    this.capturing = true;
    this.status = "listening";
    const committed: RecognitionSegment[] = [];
    let session: RecognitionSegment[] = [];
    let ended = false,
      rapidEnds = 0;
    const publish = (finalizing = false) => {
      const candidate = mergeRecognitionSegments(
        [...committed, ...session],
        finalizing,
      );
      if (candidate) onCandidate(candidate);
    };
    const commitSession = () => {
      // An interim hypothesis from a session that ended on silence must never become permanent.
      committed.push(...session.filter((part) => part.final));
      session = [];
    };
    const complete = (failed = false) => {
      if (ended) return;
      ended = true;
      this.capturing = false;
      clearTimeout(this.restartTimer);
      clearTimeout(this.finishTimer);
      publish(true);
      this.status = failed ? "error" : "confirmation";
      const r = this.recognition;
      this.recognition = undefined;
      if (r) {
        r.onresult = null;
        r.onerror = null;
        r.onend = null;
        try {
          r.abort();
        } catch {
          /* Already ended. */
        }
      }
      this.finishCapture = undefined;
      onEnd();
    };
    const beginSession = () => {
      if (!this.capturing || ended) return;
      const r = new C();
      this.recognition = r;
      const started = Date.now();
      r.lang = locale;
      r.continuous = true;
      r.interimResults = false;
      if (local || "processLocally" in r) r.processLocally = local;
      r.onresult = (e) => {
        if (this.recognition !== r || ended) return;
        // Results are a cumulative snapshot within this browser session, not new letters to append each time.
        session = Array.from(e.results, (result) => ({
          text: result[0].transcript,
          confidence: result.isFinal ? result[0].confidence : 0.3,
          final: result.isFinal,
        }));
        publish();
      };
      r.onerror = (e) => {
        if (this.recognition !== r || ended) return;
        // Silence is normal when a child is thinking. The ensuing end event restarts capture.
        if (e.error === "no-speech") return;
        if (e.error === "aborted" && !this.capturing) return;
        const messages: Record<string, string> = {
          "not-allowed":
            "Microphone permission was denied. Enable it in browser settings and retry.",
          "audio-capture": "No microphone found. Check your device input.",
          network:
            "The browser speech service lost its connection. Your letters are kept; no answer has been scored.",
          "language-not-supported":
            "This English recognition language is unavailable in the browser service.",
          "service-not-allowed":
            "This browser’s recognition service is unavailable.",
        };
        onError(
          messages[e.error] ||
            `Recording stopped (${e.error}). Your letters are kept; nothing was scored.`,
        );
        complete(true);
      };
      r.onend = () => {
        if (this.recognition !== r || ended) return;
        this.recognition = undefined;
        if (!this.capturing) {
          complete();
          return;
        }
        commitSession();
        publish();
        // Browsers can end continuous sessions on silence or service limits. Keep the user-controlled recording open.
        rapidEnds = Date.now() - started < 500 ? rapidEnds + 1 : 0;
        if (rapidEnds >= 3) {
          onError(
            "The browser could not keep its microphone session open. Your letters are kept. Press Start recording to retry.",
          );
          complete(true);
          return;
        }
        this.restartTimer = setTimeout(beginSession, 350);
      };
      try {
        r.start();
      } catch {
        onError(
          "Could not start the microphone. Your letters are kept. Check permissions and retry.",
        );
        complete(true);
      }
    };
    this.finishCapture = () => {
      if (ended) return;
      this.capturing = false;
      clearTimeout(this.restartTimer);
      const r = this.recognition;
      if (!r) {
        complete();
        return;
      }
      // Allow the browser's final letters to arrive after Stop before enabling scoring.
      this.finishTimer = setTimeout(() => complete(), 4000);
      try {
        r.stop();
      } catch {
        complete();
      }
    };
    beginSession();
  }
  stop() {
    this.capturing = false;
    clearTimeout(this.restartTimer);
    clearTimeout(this.finishTimer);
    this.finishCapture = undefined;
    const r = this.recognition;
    this.recognition = undefined;
    if (r) {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try {
        r.abort();
      } catch {
        /* Already ended. */
      }
    }
    this.status = "idle";
  }
  finish() {
    this.finishCapture?.();
  }
}
