import { useState } from "react";
import type { Progress } from "./game";
import {
  appearance,
  collectionFor,
  shopItems,
  tokenBalance,
  type Slot,
} from "./shop";
export function CharacterPortrait({
  equipped,
}: {
  equipped: Record<Slot, string>;
}) {
  const look = appearance(equipped);
  return (
    <svg
      className="character-portrait"
      viewBox="0 0 280 270"
      role="img"
      aria-label="Your customized spellkeeper"
    >
      <defs>
        <radialGradient id="portrait-glow">
          <stop stopColor="#8276b1" stopOpacity=".55" />
          <stop offset="1" stopColor="#8276b1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="140" cy="138" r="120" fill="url(#portrait-glow)" />
      <ellipse cx="137" cy="239" rx="71" ry="12" fill="#121526" />
      {look.aura !== "aura-none" && (
        <g
          className="portrait-aura"
          fill="none"
          stroke={look.aura === "aura-ring" ? "#a9e7e0" : "#ffe3a0"}
          strokeWidth="3"
        >
          <ellipse cx="137" cy="175" rx="88" ry="29" />
          {[55, 140, 225].map((x, i) => (
            <path
              key={x}
              transform={`translate(${x} ${165 + (i % 2) * 30})`}
              fill="#ffe3a0"
              d="M0-9 3-3 9 0 3 3 0 9-3 3-9 0-3-3Z"
            />
          ))}
        </g>
      )}
      <path
        d="M123 124Q94 143 89 220L138 238 173 217 152 129Z"
        fill="#493e73"
      />
      <path d="M123 122 146 122 176 225Q139 246 100 224Z" fill={look.robe} />
      <path d="M145 138 162 215 148 224Z" fill="#ffffff" opacity=".13" />
      <circle cx="135" cy="105" r="23" fill="#f0c9a5" />
      <path
        d="M119 108h5m20 0h5"
        stroke="#4b3b63"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {look.crown ? (
        <path
          d="M108 87 106 63 122 74 135 52 149 74 164 63 161 90Z"
          fill={look.hat}
          stroke="#fff0bf"
          strokeWidth="2"
        />
      ) : (
        <>
          <path d="M101 92 137 25 163 95Z" fill={look.hat} />
          <ellipse
            cx="133"
            cy="94"
            rx="39"
            ry="7"
            fill={equipped.hat === "hat-moon" ? "#e2f3ff" : "#f2d397"}
          />
        </>
      )}
      <path
        d="M181 224 183 98"
        stroke="#997889"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M183 72 195 89 183 107 171 89Z"
        fill={look.staff}
        stroke="#fff5db"
        strokeWidth="2"
      />
      {look.pet !== "pet-none" && (
        <g className="portrait-pet" transform="translate(211 199)">
          {look.pet === "pet-fox" ? (
            <>
              <path d="M2 24Q47 31 37-2L23 3 12 18" fill="#efa779" />
              <path d="M-23-11-27-36-7-24 9-24 28-36 23-11Z" fill="#efa779" />
              <ellipse cy="2" rx="25" ry="24" fill="#efa779" />
              <path d="M-21 1Q0 23 21 1L0 22Z" fill="#fff0d6" />
            </>
          ) : look.pet === "pet-owl" ? (
            <>
              <ellipse rx="24" ry="30" fill="#b7c8ee" />
              <path d="M-21-2-32 18-19 15M21-2 32 18 19 15" fill="#8c9bc5" />
              <circle cx="-10" cy="-5" r="9" fill="#fff1d8" />
              <circle cx="10" cy="-5" r="9" fill="#fff1d8" />
            </>
          ) : (
            <>
              <path
                d="M-17 1-37-22-31 13-16 19M17 1 37-22 31 13 16 19"
                fill="#afa3ed"
              />
              <ellipse rx="21" ry="28" fill="#8fe0c9" />
              <path d="M-14-15-15-34-4-23M14-15 15-34 4-23" fill="#f4d48e" />
            </>
          )}
          <circle cx="-8" cy="-4" r="3" fill="#302b48" />
          <circle cx="8" cy="-4" r="3" fill="#302b48" />
        </g>
      )}
    </svg>
  );
}
export default function Shop({
  progress,
  pending,
  onAction,
}: {
  progress: Progress;
  pending: boolean;
  onAction: (id: string, buy: boolean) => void;
}) {
  const [slot, setSlot] = useState<Slot>("pet"),
    [preview, setPreview] = useState<string | null>(null);
  const collection = collectionFor(progress),
    tokens = tokenBalance(progress),
    selected = shopItems.find((i) => i.id === preview);
  const equipped = selected
    ? { ...collection.equipped, [selected.slot]: selected.id }
    : collection.equipped;
  return (
    <section className="panel shop">
      <div className="shop-heading">
        <div>
          <p className="eyebrow">THE CLOUD MARKET</p>
          <h1>Companions & curiosities</h1>
          <p>Make your spellkeeper your own.</p>
        </div>
        <strong
          className="token-wallet"
          aria-label={`${tokens} tokens available`}
        >
          <span aria-hidden="true">◈</span> {tokens} tokens
        </strong>
      </div>
      <div className="shop-layout">
        <aside className="wardrobe">
          <CharacterPortrait equipped={equipped} />
          <h2>
            {selected ? "Trying on: " + selected.name : "Your adventurer"}
          </h2>
          <p>
            {selected
              ? "Preview only. Buy to collect, then equip it for your next adventure."
              : "Your equipped look and pet travel with you in Sky Trail quests."}
          </p>
          {selected && (
            <button onClick={() => setPreview(null)}>
              Back to equipped look
            </button>
          )}
          <p className="small">
            Every 10 XP earned gives 1 token, including your earlier XP.
            Spending never lowers XP or levels. Cosmetics only: no boosts, real
            money or pet upkeep.
          </p>
        </aside>
        <div>
          <div className="shop-tabs" aria-label="Shop categories">
            {(
              [
                ["pet", "Pets"],
                ["robe", "Robes"],
                ["hat", "Hats"],
                ["staff", "Staffs"],
                ["aura", "Magic effects"],
              ] as [Slot, string][]
            ).map(([id, name]) => (
              <button
                key={id}
                aria-pressed={slot === id}
                onClick={() => {
                  setSlot(id);
                  setPreview(null);
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="shop-grid">
            {shopItems
              .filter((i) => i.slot === slot)
              .map((item) => {
                const owned = collection.owned.includes(item.id),
                  equipped = collection.equipped[slot] === item.id;
                return (
                  <article
                    className={"shop-card " + (equipped ? "is-equipped" : "")}
                    key={item.id}
                  >
                    <button
                      className="item-preview"
                      aria-label={`Preview ${item.name}`}
                      onClick={() => setPreview(item.id)}
                    >
                      <CharacterPortrait
                        equipped={{ ...collection.equipped, [slot]: item.id }}
                      />
                    </button>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="shop-price">
                      {owned
                        ? equipped
                          ? "Equipped"
                          : "Collected"
                        : `${item.price} tokens`}
                    </span>
                    <button
                      disabled={
                        pending || equipped || (!owned && tokens < item.price)
                      }
                      onClick={() => onAction(item.id, !owned)}
                    >
                      {equipped
                        ? "Equipped"
                        : owned
                          ? `Equip ${item.name}`
                          : `Buy ${item.name} · ${item.price} tokens`}
                    </button>
                    {!owned && tokens < item.price && (
                      <small>
                        {item.price - tokens} more tokens to collect
                      </small>
                    )}
                  </article>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
