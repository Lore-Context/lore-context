"use client";

// PricingCards — v1.9 Lane F US-019
// Renders 4 Lore tier cards. Highlights the current tier and calls onUpgrade
// when the user clicks an Upgrade button.

export type Tier = "free" | "go" | "plus" | "pro";

interface TierCard {
  tier: Tier;
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaLabel: string;
}

const TIER_CARDS: TierCard[] = [
  {
    tier: "free",
    name: "Start",
    price: "$0",
    description: "Try shared memory across assistants with source receipts.",
    features: [
      "Basic memory storage and recall",
      "Source receipts on every memory",
      "Connect 1 assistant",
    ],
    ctaLabel: "Get started free",
  },
  {
    tier: "go",
    name: "Go",
    price: "$9.99/mo",
    description: "For one person using Lore across daily AI assistants.",
    features: [
      "Everything in Start",
      "Source sync across assistants",
      "Standard recall quota",
    ],
    ctaLabel: "Upgrade to Go",
  },
  {
    tier: "plus",
    name: "Plus",
    price: "$19.99/mo",
    description: "For heavy personal workflows, temporal graph, and reports.",
    features: [
      "Everything in Go",
      "Cohere reranker for higher precision",
      "Temporal graph queries",
      "Eval runs and audit logs",
    ],
    ctaLabel: "Upgrade to Plus",
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$99.99/mo",
    description: "For high-volume personal agent workflows and long history.",
    features: [
      "Everything in Plus",
      "Dreaming butler (async consolidation)",
      "Extended 90-day+ recall window",
      "High recall quota (1000+ queries/day)",
    ],
    ctaLabel: "Upgrade to Pro",
  },
];

interface PricingCardsProps {
  currentTier?: Tier;
  onUpgrade: (tier: Tier) => void;
}

export function PricingCards({ currentTier, onUpgrade }: PricingCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "16px",
      }}
    >
      {TIER_CARDS.map((card) => {
        const isCurrent = card.tier === currentTier;
        return (
          <div
            key={card.tier}
            style={{
              background: "var(--panel)",
              border: isCurrent
                ? "2px solid var(--brand)"
                : "1px solid var(--line)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{ fontWeight: 750, color: "var(--text)", fontSize: "17px" }}
              >
                {card.name}
              </span>
              {isCurrent && (
                <span
                  style={{
                    fontSize: "11px",
                    background: "var(--brand)",
                    color: "#fff",
                    borderRadius: "4px",
                    padding: "2px 7px",
                    fontWeight: 650,
                  }}
                >
                  Current plan
                </span>
              )}
            </div>

            <div style={{ fontSize: "22px", fontWeight: 750, color: "var(--text)" }}>
              {card.price}
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
              {card.description}
            </p>

            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                fontSize: "13px",
                color: "var(--text)",
                lineHeight: 1.6,
                flexGrow: 1,
              }}
            >
              {card.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>

            {isCurrent ? (
              <button
                disabled
                style={{
                  background: "var(--panel-soft)",
                  color: "var(--muted)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: "not-allowed",
                }}
              >
                Current plan
              </button>
            ) : (
              <button
                onClick={() => onUpgrade(card.tier)}
                style={{
                  background: "var(--brand)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                {card.ctaLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
