"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCachedProfile, shortName } from "@/lib/profile";

const ROLE_KEY = "oc_default_role";

type Role = "teacher" | "student";

const ROLE_DEST: Record<Role, string> = {
  teacher: "/dashboard",
  student: "/student-dashboard",
};

/* ─── card data ─────────────────────────────────────────────────────── */
const CARDS: {
  role: Role;
  emoji: string;
  title: string;
  tagline: string;
  bullets: string[];
  accentBg: string;
  accentText: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
}[] = [
  {
    role: "teacher",
    emoji: "🎓",
    title: "Teacher",
    tagline: "Share your expertise. Reach thousands.",
    bullets: [
      "Create & manage live classes and webinars",
      "Track subscribers, reviews, and engagement",
      "Build your public teacher profile",
      "View your Teaching Center dashboard",
    ],
    accentBg: "#1d6b3c",
    accentText: "#d4ead9",
    badgeBg: "#d4ead9",
    badgeText: "#1d6b3c",
    borderHover: "#1d6b3c",
  },
  {
    role: "student",
    emoji: "📚",
    title: "Student",
    tagline: "Learn from the best. Grow every day.",
    bullets: [
      "Browse live classes & webinars across subjects",
      "Follow your favourite teachers",
      "Register for upcoming sessions for free",
      "Track sessions you've attended",
    ],
    accentBg: "#1a4f7a",
    accentText: "#ddeaf8",
    badgeBg: "#ddeaf8",
    badgeText: "#1a4f7a",
    borderHover: "#1a4f7a",
  },
];

function RolesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Role | null>(null);
  const [saveDefault, setSaveDefault] = useState(false);
  const [hovered, setHovered] = useState<Role | null>(null);
  const [currentDefault, setCurrentDefault] = useState<Role | null>(null);

  const isChanging = searchParams.get("change") === "1";

  useEffect(() => {
    // If not explicitly changing and a default is already set, skip this page
    const stored = localStorage.getItem(ROLE_KEY) as Role | null;
    setCurrentDefault(stored);
    if (stored && !isChanging) {
      router.replace(ROLE_DEST[stored]);
    }
  }, [router, isChanging]);

  const profile = getCachedProfile();
  const name = shortName(profile) || "there";

  function handleContinue() {
    if (!selected) return;
    if (saveDefault) {
      localStorage.setItem(ROLE_KEY, selected);
    }
    router.push(ROLE_DEST[selected]);
  }

  function handleClearDefault() {
    localStorage.removeItem(ROLE_KEY);
    setCurrentDefault(null);
  }

  return (
    <>

      <div style={{ minHeight: "100vh", background: "#0f1410", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "var(--font-dm-sans), sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Background texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 500, height: 500, background: "rgba(29,107,60,0.07)", borderRadius: "50%", filter: "blur(80px)", top: -100, right: -100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, background: "rgba(26,79,122,0.07)", borderRadius: "50%", filter: "blur(80px)", bottom: -100, left: -100, pointerEvents: "none" }} />

        {/* Logo */}
        <Link href="/" style={{ position: "absolute", top: "1.5rem", left: "2rem", fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: "#fff", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Open<span style={{ color: "#4a9e68" }}>Class</span>
        </Link>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 780, textAlign: "center" }}>

          {/* Header */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.3rem 0.8rem", borderRadius: 100, marginBottom: "1rem" }}>
              Welcome back, {name}
            </div>
            <h1 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "clamp(1.8rem,4vw,2.6rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "0.6rem" }}>
              How are you using <em style={{ color: "#7ed9a4", fontStyle: "italic" }}>OpenClass</em> today?
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", maxWidth: 460, margin: "0 auto" }}>
              {isChanging ? "Switch your view. You can change this any time." : "Choose your role to get the right dashboard. You can always switch later."}
            </p>
          </div>

          {/* Role cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.75rem" }}>
            {CARDS.map(card => {
              const isSelected = selected === card.role;
              const isHov = hovered === card.role;
              return (
                <div key={card.role}
                  onClick={() => setSelected(card.role)}
                  onMouseEnter={() => setHovered(card.role)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isSelected ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                    border: `2px solid ${isSelected ? card.borderHover : isHov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    padding: "1.75rem",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    position: "relative",
                    overflow: "hidden",
                    transform: isSelected ? "translateY(-2px)" : isHov ? "translateY(-1px)" : "none",
                    boxShadow: isSelected ? `0 8px 32px ${card.accentBg}30` : "none",
                  }}>

                  {/* Glow accent on select */}
                  {isSelected && (
                    <div style={{ position: "absolute", top: 0, right: 0, width: 180, height: 180, background: card.accentBg, opacity: 0.08, borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />
                  )}

                  {/* Currently default badge */}
                  {currentDefault === card.role && isChanging && (
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "0.2rem 0.6rem", borderRadius: 100, background: card.badgeBg, color: card.badgeText }}>
                      Current default
                    </div>
                  )}

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", width: 24, height: 24, borderRadius: "50%", background: card.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                    </div>
                  )}

                  {/* Emoji + title */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: isSelected ? card.accentBg : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", transition: "background 0.2s", flexShrink: 0 }}>
                      {card.emoji}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.15rem", fontFamily: "var(--font-fraunces), Georgia, serif", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{card.title}</div>
                      <div style={{ fontSize: "0.8rem", color: isSelected ? card.accentText : "rgba(255,255,255,0.45)", marginTop: "0.1rem", transition: "color 0.2s" }}>{card.tagline}</div>
                    </div>
                  </div>

                  {/* Bullets */}
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {card.bullets.map(b => (
                      <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", background: isSelected ? `${card.accentBg}40` : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.15rem", transition: "background 0.2s" }}>
                          <svg width="8" height="8" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke={isSelected ? card.accentText : "rgba(255,255,255,0.4)"} strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Save as default toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <button
              role="switch"
              aria-checked={saveDefault}
              onClick={() => setSaveDefault(v => !v)}
              style={{ width: 42, height: 24, borderRadius: 100, border: "none", cursor: "pointer", background: saveDefault ? "#1d6b3c" : "rgba(255,255,255,0.15)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: saveDefault ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </button>
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
              Remember this as my default view
              {saveDefault && <span style={{ color: "#7ed9a4", marginLeft: "0.4rem", fontWeight: 500 }}>— won't ask again</span>}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!selected}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2.5rem", borderRadius: 100, fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.95rem", fontWeight: 700, border: "none", cursor: selected ? "pointer" : "not-allowed", background: selected ? (selected === "teacher" ? "#1d6b3c" : "#1a4f7a") : "rgba(255,255,255,0.1)", color: selected ? "#fff" : "rgba(255,255,255,0.3)", transition: "all 0.2s", boxShadow: selected ? "0 4px 20px rgba(0,0,0,0.3)" : "none" }}>
            Continue as {selected ? (selected === "teacher" ? "Teacher" : "Student") : "…"}
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          {/* Change default hint */}
          {isChanging && currentDefault && (
            <div style={{ marginTop: "1.25rem" }}>
              <button onClick={handleClearDefault} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", textDecoration: "underline" }}>
                Clear saved default (always ask on login)
              </button>
            </div>
          )}

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.25)" }}>
            You can switch roles any time from the top-right menu.
          </p>
        </div>
      </div>
    </>
  );
}

export default function RolesPage() {
  return (
    <Suspense>
      <RolesPageInner />
    </Suspense>
  );
}
