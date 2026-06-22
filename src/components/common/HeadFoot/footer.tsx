"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <>
      <style>{`
        .oc-footer-link:hover { color:#7ed9a4 !important; }
        @media(max-width:860px){
          .oc-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 1.5rem !important; }
          .oc-footer-bottom { flex-direction: column !important; gap: 0.75rem !important; align-items: flex-start !important; }
        }
        @media(max-width:520px){
          .oc-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <footer style={{ background: "#0f1410", color: "#faf7f2", padding: "4rem 2rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="oc-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                Open<span style={{ color: "#7ed9a4" }}>Webinar</span>
              </h3>
              <p style={{ fontSize: "0.875rem", color: "rgba(250,247,242,0.72)", maxWidth: 280, lineHeight: 1.7 }}>
                The world's only free webinar hub. Host webinars, build your reputation, and reach a global audience — at zero cost.
              </p>
              <div style={{ marginTop: "1.25rem" }}>
                <span style={{ fontSize: "0.78rem", color: "rgba(250,247,242,0.62)" }}>Built with love in India 🇮🇳</span>
              </div>
            </div>
            {([
              { title: "Discover", links: [["Browse Webinars", "/live"], ["Upcoming Schedule", "/live"], ["Browse by Subject", "/live"], ["Speakers", "/speakers"]] },
              { title: "Host",     links: [["Apply to Speak", "/login"], ["Speaker Dashboard", "/dashboard"], ["Host a Webinar", "/session"], ["My Webinars", "/my-sessions"]] },
              { title: "About",    links: [["Our Mission", "/about"], ["How We're Funded", "/about#funding"], ["Expertise Levels", "/expertise"], ["Contact Us", "/contact"]] },
            ] as { title: string; links: [string, string][] }[]).map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(250,247,242,0.68)", marginBottom: "1rem" }}>
                  {col.title}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map(([label, href]) => (
                    <li key={label} style={{ marginBottom: "0.6rem" }}>
                      <Link href={href} className="oc-footer-link" style={{ textDecoration: "none", fontSize: "0.875rem", color: "rgba(250,247,242,0.82)", transition: "color 0.2s" }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Address row */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem", marginBottom: "1.25rem", display: "flex", gap: "3rem", flexWrap: "wrap" as const }}>
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "rgba(250,247,242,0.62)", marginBottom: "0.4rem" }}>🇺🇸 US Address</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(250,247,242,0.68)", lineHeight: 1.7 }}>
                Hapleaf Technologies<br />
                9169 W State St #3977<br />
                Garden City, ID 83714
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "rgba(250,247,242,0.62)", marginBottom: "0.4rem" }}>🇮🇳 India Address</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(250,247,242,0.68)", lineHeight: 1.7 }}>
                101, 1st Cross, Lakeshore Garden<br />
                Thindlu, Vidyaranyapura<br />
                Bengaluru – 560097
              </div>
            </div>
          </div>
          <div className="oc-footer-bottom" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", color: "rgba(250,247,242,0.62)" }}>
            <span>© 2026 OpenWebinar · A product of Hapleaf Technologies Private Limited (CIN: U72900KA2021PTC148827) · Free webinars, for everyone.</span>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <Link href="/privacy" className="oc-footer-link" style={{ textDecoration: "none", color: "rgba(250,247,242,0.62)", transition: "color 0.2s" }}>Privacy</Link>
              <Link href="/terms" className="oc-footer-link" style={{ textDecoration: "none", color: "rgba(250,247,242,0.62)", transition: "color 0.2s" }}>Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
