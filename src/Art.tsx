const realmNames = [
  "Enchanted Forest",
  "Crystal Caves",
  "Whispering Mountains",
  "Shadow Castle",
  "Dragon’s Lair",
  "Champion’s Kingdom",
];

/** Each realm uses its own 2400px 3D render, not a crop enlarged from a shared illustration. */
export function WorldArt({
  world = 0,
  boss = false,
  thumbnail = false,
}: {
  world?: number;
  boss?: boolean;
  thumbnail?: boolean;
}) {
  return (
    <div className={"world-artwork" + (boss ? " guardian-scene" : "")}>
      <img
        className="realm-render"
        src={`${import.meta.env.BASE_URL}worlds/realm-${world + 1}${thumbnail ? "-card" : ""}.webp`}
        width={thumbnail ? 960 : 2400}
        height={thumbnail ? 560 : 1400}
        alt={`${realmNames[world]} floating 3D island`}
        decoding="async"
      />
      {boss && world !== 4 && (
        <span className="guardian-aura" aria-hidden="true">
          <Crest />
        </span>
      )}
    </div>
  );
}

export function Crest() {
  return (
    <svg viewBox="0 0 40 48" aria-hidden="true">
      <path
        d="M20 2L37 9v17L20 45 3 26V9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M20 10l4 10 9 3-9 3-4 11-4-11-9-3 9-3z" fill="currentColor" />
    </svg>
  );
}

export function TreasureChest() {
  return (
    <svg
      className="treasure-chest"
      viewBox="0 0 120 100"
      aria-label="Treasure chest"
      role="img"
    >
      <path
        d="M17 51V34Q17 12 42 12h36q25 0 25 22v17"
        fill="#9c7140"
        stroke="#edca81"
        strokeWidth="4"
      />
      <path
        d="M20 50h80v38H20z"
        fill="#614a30"
        stroke="#edca81"
        strokeWidth="4"
      />
      <path d="M35 17v70m50-70v70" stroke="#d5ad65" strokeWidth="7" />
      <path d="M17 50h86" stroke="#f0d694" strokeWidth="5" />
      <rect x="50" y="44" width="20" height="21" rx="3" fill="#f0cd7d" />
      <circle cx="60" cy="53" r="3" fill="#3c382a" />
      <path d="M60 0v7M2 30l8 3m100 0 8-3" stroke="#eac77f" strokeWidth="3" />
    </svg>
  );
}
