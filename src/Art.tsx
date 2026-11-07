const realmNames = [
  "Enchanted Forest",
  "Crystal Caves",
  "Whispering Mountains",
  "Shadow Castle",
  "Dragon’s Lair",
  "Champion’s Kingdom",
];

/** One original illustrated continent; SVG viewports frame each realm without duplicating the image download. */
export function WorldArt({
  world = 0,
  boss = false,
}: {
  world?: number;
  boss?: boolean;
}) {
  const column = world % 3,
    row = Math.floor(world / 3);
  return (
    <div className={"world-artwork" + (boss ? " guardian-scene" : "")}>
      <svg
        className="realm-illustration"
        viewBox={`${column * 512} ${row ? [350, 390, 400][column] : 0} 512 512`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${realmNames[world]} illustrated fairy-tale landscape`}
      >
        <image
          href={`${import.meta.env.BASE_URL}worlds/fairy-realms.webp`}
          width="1536"
          height="1024"
        />
      </svg>
      <span className="fairy-sparks" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${8 + i * 7}%`,
              animationDelay: `${i * 0.65}s`,
              bottom: `${8 + (i % 4) * 12}%`,
            }}
          />
        ))}
      </span>
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
