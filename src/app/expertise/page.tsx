"use client";

import React from "react";
import Link from "next/link";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { EXPERTISE_LEVELS, ExpertiseLevelMeta } from "@/lib/profile";

const T = {
  ink: "#0f1410", inkMuted: "#6b7a72", cream: "#faf7f2",
  border: "#e2ded6", white: "#ffffff", leaf: "#1d6b3c",
  leafLight: "#d4ead9", ff: "'DM Sans', sans-serif", ffD: "'Fraunces', Georgia, serif",
};

const CRITERIA_ROWS = [
  { label: "Sessions conducted", key: "minSessions" as const, suffix: "+" },
  { label: "Learner reviews",    key: "minReviews"  as const, suffix: "+" },
  { label: "Avg star rating",    key: "minRating"   as const, suffix: "★" },
];

function LevelCard({ lvl, index }: { lvl: ExpertiseLevelMeta; index: number }) {
  return (
    <div
      style={{
        background: T.white,
        border: `1.5px solid ${T.border}`,
        borderRadius: 20,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.18s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(15,20,16,0.10)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* accent bar */}
      <div style={{ height: 5, background: lvl.color, opacity: 0.85 }} />

      {/* header */}
      <div style={{ padding: "1.5rem 1.5rem 1.1rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: lvl.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
          {lvl.icon}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <span style={{ fontFamily: T.ffD, fontSize: "1.15rem", fontWeight: 700, color: T.ink }}>
              Level {index + 1} — {lvl.label}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: lvl.bg, color: lvl.color, fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: 100 }}>
              {lvl.icon} {lvl.label}
            </span>
          </div>
          <div style={{ fontSize: "0.82rem", color: T.inkMuted, fontStyle: "italic" }}>{lvl.tagline}</div>
        </div>
      </div>

      {/* description */}
      <div style={{ padding: "0 1.5rem 1.25rem", fontSize: "0.875rem", color: T.inkMuted, lineHeight: 1.7 }}>
        {lvl.description}
      </div>

      {/* criteria table */}
      <div style={{ margin: "0 1.5rem 1.5rem", borderRadius: 12, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        <div style={{ background: "#f5f3ef", padding: "0.5rem 1rem", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkMuted }}>
          Requirements
        </div>
        {CRITERIA_ROWS.map((row, i) => {
          const val = lvl[row.key];
          const met = val === 0;
          return (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem", background: i % 2 === 0 ? T.white : "#faf7f2", borderTop: i > 0 ? `1px solid ${T.border}` : undefined }}>
              <span style={{ fontSize: "0.8rem", color: T.inkMuted }}>{row.label}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: met ? T.inkMuted : lvl.color }}>
                {met ? "None" : `${val}${row.suffix}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExpertisePage() {
  return (
    <>
      <Header activeLink="" />
      <div style={{ paddingTop: 64, minHeight: "100vh", background: T.cream, fontFamily: T.ff, color: T.ink }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #0f2318 0%, #1d6b3c 60%, #145c30 100%)", padding: "4rem 1.5rem 3.5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)" }} />
          <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏅</div>
            <h1 style={{ fontFamily: T.ffD, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              OpenClass Expertise Levels
            </h1>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 1.5rem" }}>
              Every teacher on OpenClass earns a badge that reflects their real track record — sessions taught, learner reviews, and star ratings. Here's how each level works.
            </p>
            <Link href="/teachers" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: 600, padding: "0.6rem 1.25rem", borderRadius: 100, textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
              Browse Teachers →
            </Link>
          </div>
        </div>

        {/* How it works strip */}
        <div style={{ background: T.white, borderBottom: `1px solid ${T.border}`, padding: "1.5rem 1.5rem" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", textAlign: "center" }}>
            {[
              { icon: "📅", title: "Sessions Conducted", body: "The number of approved, published sessions a teacher has hosted on OpenClass." },
              { icon: "💬", title: "Learner Reviews", body: "Real feedback left by registered students after attending a session." },
              { icon: "⭐", title: "Average Star Rating", body: "The mean of all star ratings across every review a teacher has received." },
            ].map(item => (
              <div key={item.title}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{item.icon}</div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: T.ink, marginBottom: "0.3rem" }}>{item.title}</div>
                <div style={{ fontSize: "0.78rem", color: T.inkMuted, lineHeight: 1.6 }}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Level cards */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem" }}>
          <h2 style={{ fontFamily: T.ffD, fontSize: "1.4rem", fontWeight: 700, color: T.ink, marginBottom: "0.4rem", textAlign: "center" }}>
            The 5 Levels
          </h2>
          <p style={{ textAlign: "center", color: T.inkMuted, fontSize: "0.875rem", marginBottom: "2.5rem" }}>
            Badges are awarded automatically based on your activity — no application needed.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.25rem" }}>
            {EXPERTISE_LEVELS.map((lvl, i) => (
              <LevelCard key={lvl.level} lvl={lvl} index={i} />
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: T.white, borderTop: `1px solid ${T.border}`, padding: "3rem 1.5rem" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ fontFamily: T.ffD, fontSize: "1.3rem", fontWeight: 700, color: T.ink, marginBottom: "1.75rem", textAlign: "center" }}>
              Frequently Asked Questions
            </h2>
            {[
              {
                q: "How often is my badge updated?",
                a: "Your badge is computed live every time your public profile is viewed, so it reflects your latest stats instantly — no waiting for a review cycle.",
              },
              {
                q: "Can my badge go down if reviews drop?",
                a: "Yes. Badge levels reflect your current standing. If your average rating falls below a threshold due to new reviews, your badge will adjust accordingly.",
              },
              {
                q: "Do draft or unapproved sessions count?",
                a: "No. Only sessions that are published and approved by the OpenClass moderation team count toward your session tally.",
              },
              {
                q: "Is Level 1 shown on my profile?",
                a: "Yes. All teachers display a badge — Level 1 (Newcomer) is shown proudly because every expert starts somewhere.",
              },
            ].map((item, i) => (
              <div key={i} style={{ paddingBottom: "1.25rem", marginBottom: "1.25rem", borderBottom: i < 3 ? `1px solid ${T.border}` : undefined }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: T.ink, marginBottom: "0.4rem" }}>{item.q}</div>
                <div style={{ fontSize: "0.84rem", color: T.inkMuted, lineHeight: 1.7 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
