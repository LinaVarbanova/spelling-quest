export interface SpeechSettings {
  locale: string;
  voice: string;
  rate: number;
}
export interface PromptSpeaker {
  available(): boolean;
  speak(text: string, settings: SpeechSettings, onError: () => void): void;
  stop(): void;
}
export const speaker: PromptSpeaker = {
  available: () => "speechSynthesis" in window,
  speak(text, settings, onError) {
    if (!this.available()) {
      onError();
      return;
    }
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.locale;
    u.rate = settings.rate;
    u.voice =
      speechSynthesis.getVoices().find((v) => v.voiceURI === settings.voice) ||
      speechSynthesis.getVoices().find((v) => v.lang === settings.locale) ||
      speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) ||
      null;
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") onError();
    };
    speechSynthesis.speak(u);
  },
  stop() {
    if (this.available()) speechSynthesis.cancel();
  },
};
export type RecognitionStatus = "idle" | "listening" | "confirmation" | "error";
export type Candidate = {
  letters: string[];
  confidence: number;
  ambiguous: boolean;
  transcript: string;
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
  start(
    local: boolean,
    locale: string,
    onCandidate: (c: Candidate) => void,
    onError: (m: string) => void,
    onEnd: () => void,
  ) {
    const cap = this.capability(),
      C = constructor();
    if (!cap.supported || !C) {
      onError(cap.reason || "Recognition unavailable");
      return;
    }
    if (local && !cap.local) {
      onError(
        "On-device recognition is not supported in this browser. Nothing was uploaded.",
      );
      return;
    }
    this.stop();
    const r = new C();
    this.recognition = r;
    r.lang = locale;
    r.continuous = false;
    r.interimResults = false;
    if (local || "processLocally" in r) r.processLocally = local;
    r.onresult = (e) => {
      let text = "";
      let confidence = 1;
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          text += " " + e.results[i][0].transcript;
          confidence = Math.min(confidence, e.results[i][0].confidence);
        }
      }
      this.status = "confirmation";
      onCandidate(parseLetters(text.trim(), confidence));
    };
    r.onerror = (e) => {
      this.status = "error";
      const messages: Record<string, string> = {
        "not-allowed":
          "Microphone permission was denied. Enable it in browser settings and retry.",
        "audio-capture": "No microphone found. Check your device input.",
        "no-speech": "No speech detected. Retry and say one letter at a time.",
        network:
          "Recognition needs a network connection. Your attempt has not been scored.",
        "language-not-supported":
          "The on-device English model is missing or unsupported. Install a supported language pack in your browser or choose browser online recognition explicitly.",
        "service-not-allowed":
          "This browser’s recognition service is unavailable.",
      };
      onError(
        messages[e.error] ||
          `Recognition stopped (${e.error}). Retry; no score was recorded.`,
      );
    };
    r.onend = () => {
      if (this.status === "listening") this.status = "idle";
      onEnd();
    };
    this.status = "listening";
    try {
      r.start();
    } catch {
      this.status = "error";
      onError(
        "Could not start the microphone. Stop other recording apps and retry.",
      );
      onEnd();
    }
  }
  stop() {
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.abort();
      this.recognition = undefined;
    }
    this.status = "idle";
  }
  finish() {
    this.recognition?.stop();
  }
}
