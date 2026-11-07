export function WorldArt({
  world = 0,
  boss = false,
}: {
  world?: number;
  boss?: boolean;
}) {
  const palettes = [
    ["#152f31", "#376d59", "#87ad69", "#e6dc9a"],
    ["#15253a", "#375a86", "#82c5cc", "#cfedfb"],
    ["#242f4c", "#677d9e", "#a5b7c8", "#f2dbbd"],
    ["#201e36", "#504b72", "#8a79a6", "#e5c5ed"],
    ["#351d2a", "#923f3c", "#ce7451", "#ffcf7b"],
    ["#263a4c", "#536e89", "#bfa768", "#f5e0a5"],
  ];
  const p = palettes[world];
  return (
    <svg
      className="world-svg"
      viewBox="0 0 600 330"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={
        boss
          ? "Fantasy guardian"
          : `${["Forest", "Cave", "Mountain", "Castle", "Volcano", "Kingdom"][world]} landscape`
      }
    >
      <defs>
        <linearGradient id={`sky${world}${boss}`} x2="0" y2="1">
          <stop stopColor={p[0]} />
          <stop offset="1" stopColor={p[1]} />
        </linearGradient>
      </defs>
      <rect width="600" height="330" fill={`url(#sky${world}${boss})`} />
      <circle cx="450" cy="78" r="40" fill={p[3]} opacity=".8" />
      <g fill={p[3]} opacity=".7">
        {[40, 130, 240, 340, 540].map((x, i) => (
          <circle key={x} cx={x} cy={30 + (i % 3) * 28} r={i % 2 ? 2 : 1} />
        ))}
      </g>
      <path
        d="M0 210L100 90 205 205 320 65 460 220 560 130 600 170V330H0Z"
        fill={p[1]}
      />
      <path
        d="M0 265Q100 180 200 245T400 220T600 245V330H0"
        fill={p[2]}
        opacity=".4"
      />
      <path
        d="M360 330Q280 290 345 260T400 200Q330 250 290 267T235 330"
        fill={p[3]}
        opacity=".5"
      />
      {world === 0 ? (
        <g fill={p[0]}>
          {[30, 100, 180, 485, 560].map((x, i) => (
            <g key={x} transform={`translate(${x} ${110 + (i % 2) * 35})`}>
              <path d="M0 0L-38 80H-20L-50 125H50L20 80H38Z" />
              <rect x="-5" y="100" width="10" height="100" />
            </g>
          ))}
        </g>
      ) : world === 1 ? (
        <g fill={p[2]} stroke={p[3]} strokeWidth="2">
          {[50, 130, 480, 545].map((x, i) => (
            <path key={x} d={`M${x} 300l-22 -70 20 -${55 + i * 10} 26 80Z`} />
          ))}
        </g>
      ) : world === 2 ? (
        <g fill={p[3]} opacity=".7">
          <path d="M100 90l-30 36 29-10 27 12zM320 65l-35 43 32-12 32 14z" />
          <path
            d="M0 250q150-40 300 0t300 0v18q-150 35-300 0T0 268"
            opacity=".4"
          />
        </g>
      ) : world === 4 ? (
        <g>
          <path d="M230 220l90-155 104 170-80-66-28-51-35 64z" fill={p[0]} />
          <path d="M315 119l-8 64 31 32-25 115h24l28-122-34-34z" fill={p[3]} />
        </g>
      ) : (
        <g fill={p[0]} stroke={p[2]} strokeWidth="2">
          <path d="M210 250V130h20v-25h15v25h20v120zm80 0V100l30-35 30 35v150zm85 0V130h20v-25h15v25h20v120z" />
          <path d="M230 200h175v65H230z" />
          <path d="M303 265v-35a18 18 0 0136 0v35" fill={p[3]} />
        </g>
      )}
      {boss && (
        <g transform="translate(285 125)" className="guardian">
          <path
            d="M-75 105L-100 30-45 55-25-25 0 0 25-25 45 55 100 30 75 105 30 135H-30Z"
            fill={p[0]}
            stroke={p[3]}
            strokeWidth="3"
          />
          <path d="M-45 55l28 5-8 13zM45 55l-28 5 8 13z" fill={p[3]} />
          <path
            d="M-20 100q20 10 40 0"
            fill="none"
            stroke={p[3]}
            strokeWidth="3"
          />
        </g>
      )}
      <path d="M0 320Q100 270 200 315T400 300T600 310V330H0" fill={p[0]} />
    </svg>
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
