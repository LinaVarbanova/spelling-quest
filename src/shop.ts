import type { Progress } from "./game";
export const slots = [
  "pet",
  "robe",
  "hat",
  "staff",
  "aura",
  "hair",
  "back",
] as const;
export type Slot = (typeof slots)[number];
export type ShopItem = {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  color: string;
  description: string;
};
export const shopItems: ShopItem[] = [
  {
    id: "pet-none",
    slot: "pet",
    name: "Solo adventurer",
    price: 0,
    color: "#d5c7ff",
    description: "Travel with your trusty guiding wisp.",
  },
  {
    id: "pet-fox",
    slot: "pet",
    name: "Ember Fox",
    price: 8,
    color: "#efa779",
    description: "A bright-eyed fox to explore the islands beside you.",
  },
  {
    id: "pet-owl",
    slot: "pet",
    name: "Moon Owl",
    price: 12,
    color: "#b7c8ee",
    description: "A moonlit companion with little silver wings.",
  },
  {
    id: "pet-dragon",
    slot: "pet",
    name: "Prism Dragon",
    price: 20,
    color: "#8fe0c9",
    description: "A pocket-sized dragon with crystal wings.",
  },
  {
    id: "robe-lilac",
    slot: "robe",
    name: "Spellkeeper robe",
    price: 0,
    color: "#9d8ad7",
    description: "Your original lilac adventuring robe.",
  },
  {
    id: "robe-tide",
    slot: "robe",
    name: "Tideweaver robe",
    price: 5,
    color: "#67c9be",
    description: "A sea-glass cloak for journeys above the clouds.",
  },
  {
    id: "robe-ember",
    slot: "robe",
    name: "Sunset robe",
    price: 5,
    color: "#e8a079",
    description: "Warm copper cloth from the ember forge.",
  },
  {
    id: "hat-mage",
    slot: "hat",
    name: "Mage hat",
    price: 0,
    color: "#635194",
    description: "The classic pointed hat with a golden brim.",
  },
  {
    id: "hat-moon",
    slot: "hat",
    name: "Moonlight hat",
    price: 6,
    color: "#9ebfdf",
    description: "A pale-blue pointed hat with a silver brim.",
  },
  {
    id: "hat-crown",
    slot: "hat",
    name: "Starlight crown",
    price: 15,
    color: "#f4d48e",
    description: "A golden crown for your own kind of champion.",
  },
  {
    id: "staff-sun",
    slot: "staff",
    name: "Sunstone staff",
    price: 0,
    color: "#ffe1a0",
    description: "Your original warm, glowing sunstone.",
  },
  {
    id: "staff-prism",
    slot: "staff",
    name: "Prism staff",
    price: 7,
    color: "#a4dfff",
    description: "Carry a crystal-blue star of light.",
  },
  {
    id: "staff-rose",
    slot: "staff",
    name: "Rose quartz staff",
    price: 7,
    color: "#f4b9d7",
    description: "A rose-coloured gem with a gentle glow.",
  },
  {
    id: "aura-none",
    slot: "aura",
    name: "Quiet magic",
    price: 0,
    color: "#a99bc6",
    description: "Keep your spellkeeper's silhouette simple.",
  },
  {
    id: "aura-stars",
    slot: "aura",
    name: "Star orbit",
    price: 10,
    color: "#ffe3a0",
    description: "Three small stars circle your character.",
  },
  {
    id: "aura-ring",
    slot: "aura",
    name: "Crystal halo",
    price: 10,
    color: "#a9e7e0",
    description: "A luminous ring of sea-glass magic.",
  },
  {
    id: "pet-bunny",
    slot: "pet",
    name: "Cloud Bunny",
    price: 10,
    color: "#eee0d2",
    description: "A long-eared cloud explorer who hops beside you.",
  },
  {
    id: "pet-cat",
    slot: "pet",
    name: "Starlight Cat",
    price: 12,
    color: "#b0a0dd",
    description: "A lilac cat with a curled, star-tipped tail.",
  },
  {
    id: "pet-phoenix",
    slot: "pet",
    name: "Dawn Phoenix",
    price: 16,
    color: "#f2ac72",
    description: "A tiny golden bird with a fiery feather crest.",
  },
  {
    id: "hair-none",
    slot: "hair",
    name: "Original look",
    price: 0,
    color: "#635194",
    description: "Your original spellkeeper silhouette.",
  },
  {
    id: "hair-chestnut",
    slot: "hair",
    name: "Chestnut curls",
    price: 4,
    color: "#8e5946",
    description: "Soft copper-brown curls that peek below your hat.",
  },
  {
    id: "hair-silver",
    slot: "hair",
    name: "Silver sweep",
    price: 5,
    color: "#d7e4ee",
    description: "A swept silver fringe and a short ponytail.",
  },
  {
    id: "hair-midnight",
    slot: "hair",
    name: "Midnight braid",
    price: 5,
    color: "#343555",
    description: "An indigo fringe and a long adventuring braid.",
  },
  {
    id: "hat-none",
    slot: "hat",
    name: "No hat",
    price: 0,
    color: "#635194",
    description: "Let your chosen hairstyle shine.",
  },
  {
    id: "back-none",
    slot: "back",
    name: "Classic cape",
    price: 0,
    color: "#5b4a91",
    description: "Your original travelling cape.",
  },
  {
    id: "back-fairy",
    slot: "back",
    name: "Crystal wings",
    price: 12,
    color: "#a4e4e0",
    description: "Sea-glass wings that flutter gently as you travel.",
  },
  {
    id: "back-dragon",
    slot: "back",
    name: "Dragon wings",
    price: 16,
    color: "#b3a1eb",
    description: "Violet wings with golden tips.",
  },
  {
    id: "back-pack",
    slot: "back",
    name: "Explorer pack",
    price: 6,
    color: "#b98763",
    description: "A little leather pack for every new trail.",
  },
];
export type Collection = {
  spent: number;
  owned: string[];
  equipped: Record<Slot, string>;
};
export const freshCollection = (): Collection => ({
  spent: 0,
  owned: shopItems.filter((i) => i.price === 0).map((i) => i.id),
  equipped: {
    pet: "pet-none",
    robe: "robe-lilac",
    hat: "hat-mage",
    staff: "staff-sun",
    aura: "aura-none",
    hair: "hair-none",
    back: "back-none",
  },
});
const newFree = ["hair-none", "back-none", "hat-none"];
/** Add free slots to pre-expansion saves without altering spending or existing equipment. */
export function upgradeCollection(c: Collection): Collection {
  if (
    c.equipped.hair &&
    c.equipped.back &&
    newFree.every((id) => c.owned.includes(id))
  )
    return c;
  return {
    ...c,
    owned: [...new Set([...c.owned, ...newFree])],
    equipped: { ...freshCollection().equipped, ...c.equipped },
  };
}
export const collectionFor = (p: Pick<Progress, "collection">) =>
  p.collection ? upgradeCollection(p.collection) : freshCollection();
export const tokenBalance = (p: Pick<Progress, "xp" | "collection">) =>
  Math.floor(p.xp / 10) - collectionFor(p).spent;
export function itemById(id: string) {
  const item = shopItems.find((i) => i.id === id);
  if (!item) throw Error("Unknown shop item.");
  return item;
}
export function purchaseItem(p: Progress, id: string): Progress {
  const item = itemById(id),
    c = collectionFor(p);
  if (c.owned.includes(id)) return p;
  if (tokenBalance(p) < item.price)
    throw Error("Keep practising to earn enough tokens for this item.");
  return {
    ...p,
    collection: { ...c, spent: c.spent + item.price, owned: [...c.owned, id] },
  };
}
export function equipItem(p: Progress, id: string): Progress {
  const item = itemById(id),
    c = collectionFor(p);
  if (!c.owned.includes(id))
    throw Error("Purchase this item before equipping it.");
  return {
    ...p,
    collection: { ...c, equipped: { ...c.equipped, [item.slot]: id } },
  };
}
export function validateCollection(value: unknown, xp: number): void {
  if (value === undefined) return; // Older saves earn their wallet from existing XP.
  const c = value as Collection;
  if (
    !c ||
    typeof c !== "object" ||
    !Number.isSafeInteger(c.spent) ||
    c.spent < 0 ||
    c.spent > Math.floor(xp / 10) ||
    !Array.isArray(c.owned) ||
    new Set(c.owned).size !== c.owned.length ||
    c.owned.some(
      (id) => typeof id !== "string" || !shopItems.some((i) => i.id === id),
    ) ||
    !c.equipped ||
    typeof c.equipped !== "object" ||
    Array.isArray(c.equipped)
  )
    throw Error("Invalid shop collection.");
  const oldSlots = ["pet", "robe", "hat", "staff", "aura"] as const;
  if (
    oldSlots.some((slot) => typeof c.equipped[slot] !== "string") ||
    (c.equipped.hair === undefined) !== (c.equipped.back === undefined)
  )
    throw Error("Invalid shop collection.");
  const legacy = c.equipped.hair === undefined && c.equipped.back === undefined;
  const normalized = legacy ? upgradeCollection(c) : c;
  if (
    shopItems
      .filter((i) => i.price === 0)
      .some((i) => !normalized.owned.includes(i.id)) ||
    c.spent !== c.owned.reduce((sum, id) => sum + itemById(id).price, 0) ||
    slots.some(
      (slot) =>
        !normalized.owned.includes(normalized.equipped[slot]) ||
        itemById(normalized.equipped[slot]).slot !== slot,
    ) ||
    Object.keys(c.equipped).some((k) => !slots.includes(k as Slot))
  )
    throw Error("Invalid shop collection.");
}
export function appearance(equipped?: Record<Slot, string>) {
  const e = { ...freshCollection().equipped, ...equipped };
  return {
    robe: itemById(e.robe).color,
    hat: itemById(e.hat).color,
    staff: itemById(e.staff).color,
    crown: e.hat === "hat-crown",
    pet: e.pet,
    aura: e.aura,
    hair: e.hair,
    hairColor: itemById(e.hair).color,
    back: e.back,
    backColor: itemById(e.back).color,
    noHat: e.hat === "hat-none",
  };
}
