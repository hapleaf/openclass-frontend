"use client";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import Link from "next/link";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "'DM Sans', sans-serif", ffd: "'Fraunces', Georgia, serif",
};

export default function AboutPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header />
      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>

        {/* Hero */}
        <div style={{ background: T.ink, padding: "4rem 2rem 3.5rem", textAlign: "center" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(29,107,60,0.2)", border: "1px solid rgba(29,107,60,0.35)", color: "#7ed9a4", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.3rem 0.85rem", borderRadius: 100, marginBottom: "1.25rem" }}>
              About OpenClass
            </div>
            <h1 style={{ fontFamily: T.ffd, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "1rem" }}>
              Education is a right,<br />not a privilege.
            </h1>
            <p style={{ fontSize: "1rem", color: "rgba(250,247,242,0.55)", lineHeight: 1.75, maxWidth: 520, margin: "0 auto" }}>
              OpenClass is a purpose-driven platform where teachers teach freely and students learn freely — no paywalls, no algorithms, no gatekeeping.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "3.5rem 2rem 4rem" }}>

          {/* Our Mission */}
          <section id="mission" style={{ marginBottom: "3.5rem" }}>
            <h2 style={{ fontFamily: T.ffd, fontSize: "1.65rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>Our Mission</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.95rem", color: T.inkSoft, lineHeight: 1.8 }}>
              <p>We started OpenClass with one belief: the best teachers in the world shouldn't need a million followers or a subscription model to share what they know. And learners shouldn't need a credit card to grow.</p>
              <p>OpenClass connects teachers and students through live, real-time sessions — webinars, classes, workshops — with no transaction fees and no barriers. Every session on our platform is free to attend.</p>
              <p>We think the internet has enough paid courses. What it needs is more genuine teaching — the kind that happens when a person who knows something deeply wants to share it with people who genuinely want to learn.</p>
            </div>
          </section>

          <div style={{ height: 1, background: T.border, marginBottom: "3.5rem" }} />

          {/* How We're Funded */}
          <section id="funding" style={{ marginBottom: "3.5rem" }}>
            <h2 style={{ fontFamily: T.ffd, fontSize: "1.65rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: "1.25rem" }}>How We're Funded</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.95rem", color: T.inkSoft, lineHeight: 1.8 }}>
              <p>OpenClass is currently self-funded. We run lean, keep infrastructure costs low, and believe that a platform serving a public good shouldn't need VC money to survive.</p>
              <p>In the future, we plan to sustain ourselves through optional features for power users — think premium analytics for teachers, branded class pages, and integrations — while keeping the core platform free forever.</p>
              <p>We will never sell student data, never show ads, and never put a paywall between a learner and knowledge. That's a promise, not a policy.</p>
            </div>

            <div style={{ marginTop: "2rem", background: T.leafLight, border: `1px solid rgba(29,107,60,0.2)`, borderRadius: 14, padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🌱</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: T.leaf, marginBottom: "0.3rem" }}>Want to support the mission?</div>
                <div style={{ fontSize: "0.85rem", color: T.inkSoft, lineHeight: 1.6 }}>If you're a teacher, the best thing you can do is host a session. If you're a learner, bring a friend. That's all we ask.</div>
              </div>
            </div>
          </section>

          <div style={{ height: 1, background: T.border, marginBottom: "3.5rem" }} />

          {/* Values */}
          <section style={{ marginBottom: "3.5rem" }}>
            <h2 style={{ fontFamily: T.ffd, fontSize: "1.65rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>What We Stand For</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { icon: "🔓", title: "Radical openness", body: "No barriers to entry. No approval required to learn. No gatekeeping on knowledge." },
                { icon: "🎙️", title: "Real teachers", body: "We value practitioners, not influencers. People who know things and love to share them." },
                { icon: "🌍", title: "Built for India", body: "Designed with Indian internet realities in mind — low bandwidth, diverse languages, varied backgrounds." },
                { icon: "🤝", title: "Community first", body: "We don't optimise for engagement metrics. We optimise for learning that actually happens." },
              ].map(v => (
                <div key={v.title} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <div style={{ fontSize: "1.4rem", marginBottom: "0.6rem" }}>{v.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: T.ink, marginBottom: "0.4rem" }}>{v.title}</div>
                  <div style={{ fontSize: "0.84rem", color: T.inkMuted, lineHeight: 1.65 }}>{v.body}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <Link href="/live" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: T.leaf, color: T.white, padding: "0.75rem 1.75rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}>
              Explore live classes →
            </Link>
          </div>

        </div>
        <Footer />
      </div>
    </>
  );
}
