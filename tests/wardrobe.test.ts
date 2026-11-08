import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { parseBackup, freshProgress } from "../src/game";
import {
  collectionFor,
  equipItem,
  purchaseItem,
  tokenBalance,
  appearance,
} from "../src/shop";
import { companionModel, companionPosition } from "../src/companion-scene";
const oldCollection = () => ({
  spent: 8,
  owned: [
    "pet-none",
    "robe-lilac",
    "hat-mage",
    "staff-sun",
    "aura-none",
    "pet-fox",
  ],
  equipped: {
    pet: "pet-fox",
    robe: "robe-lilac",
    hat: "hat-mage",
    staff: "staff-sun",
    aura: "aura-none",
  },
});
describe("expanded wardrobe migration", () => {
  it("adds free hair, back and no-hat options to old collections without removing pets or spending", () => {
    const p = parseBackup(
      JSON.stringify({
        ...freshProgress(),
        xp: 500,
        collection: oldCollection(),
      }),
    );
    expect(collectionFor(p).equipped).toMatchObject({
      pet: "pet-fox",
      hair: "hair-none",
      back: "back-none",
    });
    expect(collectionFor(p).owned).toContain("hat-none");
    expect(tokenBalance(p)).toBe(42);
    expect(parseBackup(JSON.stringify(p))).toEqual(p);
  });
  it("keeps new slots independent and validates owned equipment after migration", () => {
    let p = parseBackup(
      JSON.stringify({
        ...freshProgress(),
        xp: 500,
        collection: oldCollection(),
      }),
    );
    p = equipItem(purchaseItem(p, "hair-silver"), "hair-silver");
    p = equipItem(purchaseItem(p, "back-fairy"), "back-fairy");
    p = equipItem(p, "hat-none");
    expect(appearance(collectionFor(p).equipped)).toMatchObject({
      pet: "pet-fox",
      hair: "hair-silver",
      back: "back-fairy",
      noHat: true,
    });
    expect(tokenBalance(p)).toBe(25);
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...p,
          collection: {
            ...collectionFor(p),
            equipped: { ...collectionFor(p).equipped, back: "back-dragon" },
          },
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...p,
          collection: {
            ...collectionFor(p),
            equipped: { ...collectionFor(p).equipped, hair: undefined },
          },
        }),
      ),
    ).toThrow();
  });
});
describe("visible travelling companions", () => {
  it("places the pet towards the stage camera and behind the spelling path at every heading", () => {
    const hero = new THREE.Vector3(12, 1, 3);
    for (const angle of [0, 0.6, 1.7, Math.PI, 4.8]) {
      const heading = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)),
        side = new THREE.Vector3(heading.z, 0, -heading.x);
      const offset = companionPosition(hero, heading).sub(hero);
      expect(offset.dot(side)).toBeLessThan(-0.9);
      expect(offset.dot(heading)).toBeLessThan(-0.5);
      expect(offset.y).toBeGreaterThan(0);
    }
  });
  it("builds six distinct original pet models with a modest geometry budget", () => {
    const signatures = [];
    for (const id of [
      "pet-fox",
      "pet-owl",
      "pet-dragon",
      "pet-bunny",
      "pet-cat",
      "pet-phoenix",
    ]) {
      const model = companionModel(id);
      let triangles = 0;
      const signature: string[] = [];
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
          signature.push(o.geometry.type + ":" + o.position.y.toFixed(2));
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      expect(triangles).toBeGreaterThan(100);
      expect(triangles).toBeLessThan(1800);
      signatures.push(signature.join("|"));
    }
    expect(new Set(signatures).size).toBe(6);
  });
});
