import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  freshProgress,
  recordAnswer,
  completeQuest,
  parseBackup,
} from "../src/game";
import {
  collectionFor,
  tokenBalance,
  purchaseItem,
  equipItem,
  freshCollection,
  shopItems,
} from "../src/shop";
import { progressStore } from "../src/storage";
describe("earned-token shop", () => {
  it("credits earlier XP without changing a legacy save or its history", () => {
    const p = { ...freshProgress(), xp: 257 };
    expect(tokenBalance(parseBackup(JSON.stringify(p)))).toBe(25);
    expect(p.collection).toBeUndefined();
    expect(collectionFor(p)).toEqual(freshCollection());
  });
  it("earns tokens through spelling and first quest treasure while mistakes earn nothing", () => {
    const p = recordAnswer(freshProgress(), 1, "accident", 1000).progress;
    expect(tokenBalance(p)).toBe(2);
    expect(tokenBalance(recordAnswer(p, 1, "wrong", 2000).progress)).toBe(2);
    expect(tokenBalance(completeQuest(p, "0-0"))).toBe(7);
    expect(tokenBalance(completeQuest(completeQuest(p, "0-0"), "0-0"))).toBe(7);
  });
  it("buys once, prevents overspending and keeps XP and word records intact", () => {
    const p = {
      ...recordAnswer(freshProgress(), 1, "accident", 1000).progress,
      xp: 100,
    };
    const bought = purchaseItem(p, "pet-fox");
    expect(tokenBalance(bought)).toBe(2);
    expect(bought.xp).toBe(p.xp);
    expect(bought.records).toBe(p.records);
    expect(purchaseItem(bought, "pet-fox")).toBe(bought);
    expect(() => purchaseItem(bought, "pet-owl")).toThrow();
    expect(() => purchaseItem(p, "unknown")).toThrow();
    expect(tokenBalance(p)).toBe(10);
  });
  it("only equips owned items, changes one slot, and lets pets be unequipped for free", () => {
    const p = { ...freshProgress(), xp: 300 };
    expect(() => equipItem(p, "pet-fox")).toThrow();
    const equipped = equipItem(purchaseItem(p, "pet-fox"), "pet-fox");
    expect(collectionFor(equipped).equipped.pet).toBe("pet-fox");
    expect(collectionFor(equipped).equipped.robe).toBe("robe-lilac");
    const solo = equipItem(equipped, "pet-none");
    expect(collectionFor(solo).equipped.pet).toBe("pet-none");
    expect(tokenBalance(solo)).toBe(tokenBalance(equipped));
  });
  it("round-trips purchases and equipment through IndexedDB and JSON export/import", async () => {
    let p = { ...freshProgress(), xp: 2000 };
    for (const item of shopItems.filter((i) => i.price > 0))
      p = equipItem(purchaseItem(p, item.id), item.id);
    const imported = parseBackup(JSON.stringify(p));
    expect(imported).toEqual(p);
    await progressStore.save(imported);
    expect(await progressStore.load()).toEqual(p);
  });
  it("rejects malformed inventories, spending and equipped items on import", () => {
    const p = purchaseItem({ ...freshProgress(), xp: 100 }, "pet-fox"),
      c = collectionFor(p);
    const invalid = [
      null,
      {},
      { ...c, spent: -1 },
      { ...c, spent: 0 },
      { ...c, spent: 101 },
      { ...c, spent: 1.5 },
      { ...c, owned: [...c.owned, "pet-fox"] },
      { ...c, owned: [...c.owned, "mystery"] },
      { ...c, equipped: { ...c.equipped, pet: "pet-owl" } },
      { ...c, equipped: { ...c.equipped, robe: "pet-fox" } },
      { ...c, equipped: { ...c.equipped, extra: "pet-none" } },
    ];
    for (const collection of invalid)
      expect(() => parseBackup(JSON.stringify({ ...p, collection }))).toThrow();
  });
});
