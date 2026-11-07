import { openDB } from "idb";
import { freshProgress, parseBackup, type Progress } from "./game";
export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
}
const database = () =>
  openDB("spelling-quest", 1, {
    upgrade(db) {
      db.createObjectStore("progress");
    },
  });
export const progressStore: ProgressStore = {
  async load() {
    const db = await database();
    const p = await db.get("progress", "player");
    return p ? parseBackup(JSON.stringify(p)) : freshProgress();
  },
  async save(p) {
    const db = await database();
    await db.put("progress", p, "player");
  },
};
