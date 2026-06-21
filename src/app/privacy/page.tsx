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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontFamily: T.ffd, fontSize: "1.25rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", marginBottom: "0.85rem" }}>{title}</h2>
      <div style={{ fontSize: "0.9rem", color: T.inkSoft, lineHeight: 1.85, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header />
      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>

        <div style={{ background: T.ink, padding: "3rem 2rem 2.5rem" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontFamily: T.ffd, fontSize: "2rem", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Privacy Policy</h1>
            <p style={{ fontSize: "0.85rem", color: "rgba(250,247,242,0.4)" }}>Last updated: June 2025</p>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 2rem 4rem" }}>

          <div style={{ background: T.leafLight, border: "1px solid rgba(29,107,60,0.2)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "2.5rem", fontSize: "0.875rem", color: "#1d6b3c", lineHeight: 1.6 }}>
            <strong>Short version:</strong> We collect only what we need to run the platform. We never sell your data. We never show ads. Webinars are live — not recorded by default.
          </div>

          <Section title="1. What we collect">
            <p>When you create an account, we collect your name and email address. Speakers may optionally add a bio, profile photo, social links, and expertise tags. Attendees may save webinar registrations and follow speakers.</p>
            <p>We collect basic usage data (pages visited, webinar join times) to improve the platform. This data is not linked to third-party ad networks.</p>
          </Section>

          <Section title="2. How we use your data">
            <p>Your information is used to: provide the platform (login, webinar access, notifications), personalise your experience (speaker recommendations, schedule), and communicate with you about your account or webinars you've registered for.</p>
            <p>We do not use your data for advertising, we do not build ad profiles, and we do not share your personal information with third parties for their marketing.</p>
          </Section>

          <Section title="3. Live webinars & recordings">
            <p>OpenWebinar sessions are live and are not recorded by default. Speakers may choose to record their own webinars using third-party tools, but OpenWebinar does not store webinar recordings on our servers unless a speaker explicitly uploads one as an intro video.</p>
            <p>Chat messages during a webinar are ephemeral and are not stored after the session ends.</p>
          </Section>

          <Section title="4. Cookies">
            <p>We use a session cookie to keep you logged in. We do not use third-party tracking cookies, analytics cookies from ad networks, or fingerprinting techniques.</p>
          </Section>

          <Section title="5. Data storage & security">
            <p>Your data is stored on secure servers. We use industry-standard encryption in transit (HTTPS) and at rest. Passwords are never stored in plain text.</p>
          </Section>

          <Section title="6. Your rights">
            <p>You can request deletion of your account and all associated data at any time by contacting us. You can update your profile information from your settings page at any time.</p>
          </Section>

          <Section title="7. Changes to this policy">
            <p>We may update this policy from time to time. We'll notify registered users of material changes via email. Continued use of the platform after changes constitutes acceptance.</p>
          </Section>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "1.75rem", marginTop: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: T.inkMuted }}>
              Questions about this policy? Email us at <a href="mailto:support@open-webinar.com" style={{ color: T.leaf, textDecoration: "none", fontWeight: 500 }}>support@open-webinar.com</a> or <Link href="/contact" style={{ color: T.leaf, textDecoration: "none", fontWeight: 500 }}>use our contact form →</Link>
            </p>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
