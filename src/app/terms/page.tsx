"use client";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import Link from "next/link";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "var(--font-dm-sans), sans-serif", ffd: "var(--font-fraunces), Georgia, serif",
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

export default function TermsPage() {
  return (
    <>
      <Header />
      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>

        <div style={{ background: T.ink, padding: "3rem 2rem 2.5rem" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1 style={{ fontFamily: T.ffd, fontSize: "2rem", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Terms of Service</h1>
            <p style={{ fontSize: "0.85rem", color: "rgba(250,247,242,0.4)" }}>Last updated: June 2025 · Effective for all users</p>
          </div>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 2rem 4rem" }}>

          <div style={{ background: "#fdf3e0", border: "1px solid rgba(232,160,32,0.25)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "2.5rem", fontSize: "0.875rem", color: "#7a4a00", lineHeight: 1.6 }}>
            <strong>Short version:</strong> Be respectful. Teach real things. Don't abuse the platform. We reserve the right to suspend accounts that harm the community.
          </div>

          <Section title="1. Acceptance">
            <p>By creating an account or using OpenWebinar, you agree to these Terms. If you're using the platform on behalf of an organisation, you represent that you have authority to bind that organisation.</p>
          </Section>

          <Section title="2. Your account">
            <p>You are responsible for maintaining the confidentiality of your account credentials. You must be at least 13 years old to use the platform. You agree to provide accurate information and keep it updated.</p>
            <p>One person may not maintain multiple accounts. Accounts are non-transferable.</p>
          </Section>

          <Section title="3. Speaker responsibilities">
            <p>Speakers agree to: provide accurate information about their webinars, show up for scheduled sessions, present content that is legal, factual, and respectful, and not use the platform to market paid services in a way that misleads attendees.</p>
            <p>Repeated no-shows, misleading webinar descriptions, or inappropriate content may result in account suspension.</p>
          </Section>

          <Section title="4. Attendee conduct">
            <p>Attendees agree to treat speakers and other participants with respect. Disrupting webinars, harassment, or abuse of the platform's registration system (e.g., reserving spots with no intent to attend) may result in suspension.</p>
          </Section>

          <Section title="5. Content">
            <p>Speakers retain ownership of their content. By hosting on OpenWebinar, you grant us a limited licence to display and stream your webinars to registered attendees.</p>
            <p>You may not post or stream content that is defamatory, obscene, discriminatory, or violates any applicable law. We reserve the right to remove webinars or content at our discretion.</p>
          </Section>

          <Section title="6. Platform availability">
            <p>OpenWebinar is provided "as is." We aim for high availability but do not guarantee uninterrupted service. We are not liable for missed webinars due to technical issues outside our control.</p>
          </Section>

          <Section title="7. Termination">
            <p>You may delete your account at any time. We may suspend or terminate accounts that violate these Terms, with or without notice. Upon termination, your right to use the platform ceases immediately.</p>
          </Section>

          <Section title="8. Changes">
            <p>We may update these Terms. Continued use after changes constitutes acceptance. We'll notify registered users of material changes by email.</p>
          </Section>

          <Section title="9. Governing law">
            <p>These Terms are governed by the laws of India. Disputes shall be resolved in the courts of Bengaluru, Karnataka.</p>
          </Section>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "1.75rem", marginTop: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: T.inkMuted }}>
              Questions? Email us at <a href="mailto:support@open-webinar.com" style={{ color: T.leaf, textDecoration: "none", fontWeight: 500 }}>support@open-webinar.com</a> or <Link href="/contact" style={{ color: T.leaf, textDecoration: "none", fontWeight: 500 }}>use our contact form →</Link>
            </p>
            <p style={{ fontSize: "0.875rem", color: T.inkMuted, marginTop: "0.5rem" }}>Also read our <Link href="/privacy" style={{ color: T.leaf, textDecoration: "none", fontWeight: 500 }}>Privacy Policy →</Link></p>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
}
