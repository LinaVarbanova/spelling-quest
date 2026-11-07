import type { Model, KaldiRecognizer } from "vosk-browser/dist/model";
import {
  parseLetters,
  type Candidate,
  type RecognitionStatus,
  type SpellingRecognizer,
} from "./speech";
/** Optional Apache-2.0 Vosk engine. Models are selected explicitly from local disk, never downloaded automatically. */
export class LocalVoskRecognizer implements SpellingRecognizer {
  status: RecognitionStatus = "idle";
  private model?: Model;
  private rec?: KaldiRecognizer;
  private stream?: MediaStream;
  private context?: AudioContext;
  private processor?: ScriptProcessorNode;
  private source?: MediaStreamAudioSourceNode;
  private generation = 0;
  private finishCallback?: () => void;
  capability() {
    return {
      supported:
        !!this.model &&
        window.isSecureContext &&
        !!navigator.mediaDevices?.getUserMedia,
      local: true,
      reason: this.model
        ? undefined
        : "Load an English Vosk model archive in settings first. The model stays on your device.",
    };
  }
  async load(file: File) {
    this.unload();
    const { Model: VoskModel } = await import("vosk-browser");
    const url = URL.createObjectURL(file);
    const model = new VoskModel(url, -1);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              Error(
                "Model loading timed out. Try a smaller compatible English model.",
              ),
            ),
          120000,
        );
        model.on("load", (m) => {
          clearTimeout(timer);
          if (m.event === "load" && m.result) resolve();
          else reject(Error("Invalid Vosk model archive"));
        });
        model.on("error", () => {
          clearTimeout(timer);
          reject(
            Error("Model failed to load. Use a compatible .tar.gz archive."),
          );
        });
      });
      this.model = model;
    } catch (e) {
      model.terminate();
      throw e;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  start(
    _local: boolean,
    _locale: string,
    onCandidate: (c: Candidate) => void,
    onError: (m: string) => void,
    onEnd: () => void,
  ) {
    this.stop();
    if (!this.capability().supported || !this.model) {
      onError(
        this.capability().reason ||
          "Local microphone unavailable. Use HTTPS and allow microphone access.",
      );
      onEnd();
      return;
    }
    const generation = this.generation;
    this.status = "listening";
    let text = "";
    let ending = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
        if (generation !== this.generation) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        this.stream = stream;
        const context = new AudioContext();
        this.context = context;
        await context.resume();
        if (generation !== this.generation) return;
        const rec = new this.model!.KaldiRecognizer(context.sampleRate);
        this.rec = rec;
        rec.setWords(true);
        rec.on("result", (m) => {
          if (generation !== this.generation) return;
          if (m.event === "result") {
            text = (text + " " + m.result.text).trim();
            if (text) onCandidate(parseLetters(text, 0.5));
            if (ending) {
              this.finishCallback?.();
              this.finishCallback = undefined;
              this.stop();
              onEnd();
            }
          }
        });
        rec.on("error", () => {
          if (generation !== this.generation) return;
          onError(
            "Local recognition failed. Retry; this attempt was not scored.",
          );
          this.stop();
          onEnd();
        });
        const processor = context.createScriptProcessor(4096, 1, 1);
        this.processor = processor;
        processor.onaudioprocess = (e) => {
          if (this.status === "listening") {
            try {
              rec.acceptWaveform(e.inputBuffer);
            } catch {
              onError("Could not process local audio. Retry.");
              this.stop();
              onEnd();
            }
          }
        };
        const source = context.createMediaStreamSource(stream);
        this.source = source;
        source.connect(processor);
        processor.connect(context.destination);
        this.finishCallback = () => {
          if (!text)
            onError(
              "No letters detected. Retry, or check the microphone and model.",
            );
        };
        this.finish = () => {
          if (generation !== this.generation) return;
          ending = true;
          processor.disconnect();
          source.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          this.status = "confirmation";
          rec.retrieveFinalResult();
        };
      } catch {
        if (generation === this.generation) {
          onError(
            "Local microphone could not start. Check permissions and your audio input.",
          );
          this.stop();
          onEnd();
        }
      }
    })();
  }
  finish() {
    /* Replaced while a recording is active. */
  }
  stop() {
    this.generation++;
    this.status = "idle";
    this.stream?.getTracks().forEach((t) => t.stop());
    this.processor?.disconnect();
    this.source?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
    this.rec?.remove();
    this.stream = undefined;
    this.context = undefined;
    this.processor = undefined;
    this.source = undefined;
    this.rec = undefined;
    this.finishCallback = undefined;
    this.finish = () => {};
  }
  unload() {
    this.stop();
    this.model?.terminate();
    this.model = undefined;
  }
}
