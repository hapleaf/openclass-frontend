"use client";
import { useState, useEffect, useCallback } from "react";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import Link from "next/link";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "'DM Sans', sans-serif", ffd: "'Fraunces', Georgia, serif",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const SUBJECTS = [
  { value: "general",     label: "General enquiry" },
  { value: "teaching",    label: "I want to teach on OpenClass" },
  { value: "bug",         label: "Bug report" },
  { value: "partnership", label: "Partnership / collaboration" },
  { value: "other",       label: "Something else" },
];

interface Captcha { id: string; question: string }

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "general", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const fetchCaptcha = useCallback(async () => {
    try {
      const res = await fetch(`${API}/contact/captcha`);
      const data = await res.json() as Captcha;
      setCaptcha(data);
      setCaptchaAnswer("");
    } catch { /* silently ignore — handled at submit time */ }
  }, []);

  useEffect(() => { fetchCaptcha(); }, [fetchCaptcha]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    const ans = parseInt(captchaAnswer.trim(), 10);
    if (!captcha) { setError("Captcha not loaded yet. Please wait a moment."); return; }
    if (isNaN(ans)) { setError("Please enter a number for the captcha answer."); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaId: captcha.id, captchaAnswer: ans }),
      });
      if (!res.ok) {
        const j = await res.json() as { message?: string };
        throw new Error(j.message ?? "Failed to send");
      }
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      fetchCaptcha(); // refresh so they can try again
    } finally {
      setSending(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "0.8rem 1rem", borderRadius: 12,
    border: `1.5px solid ${T.border}`, background: T.white,
    fontFamily: T.ff, fontSize: "0.925rem", color: T.ink, outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header />
      <div style={{ paddingTop: isMobile ? 57 : 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>

        {/* Hero */}
        <div style={{ background: T.ink, padding: isMobile ? "3.5rem 1.25rem 3rem" : "5rem 2rem 4rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 400, height: 400, background: "rgba(29,107,60,0.12)", borderRadius: "50%", filter: "blur(80px)", top: -100, right: "10%", pointerEvents: "none" }} />
          <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(29,107,60,0.2)", border: "1px solid rgba(29,107,60,0.35)", color: "#7ed9a4", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "0.3rem 0.85rem", borderRadius: 100, marginBottom: "1.5rem" }}>
              Contact us
            </div>
            <h1 style={{ fontFamily: T.ffd, fontSize: "clamp(2rem,5vw,2.75rem)", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "1rem" }}>
              We'd love to hear from you
            </h1>
            <p style={{ fontSize: "1rem", color: "rgba(250,247,242,0.5)", lineHeight: 1.75 }}>
              Whether you have a question, an idea, or just want to say hello — we read every message and reply within 1–2 business days.
            </p>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "1rem", transform: "translateY(-1.75rem)" }}>
            {[
              { icon: "📧", title: "Email", detail: "hello@open-webinar.com", sub: "For anything and everything" },
              { icon: "🐛", title: "Bug report", detail: "Use the form below", sub: "Include steps to reproduce" },
              { icon: "🎙️", title: "Teach with us", detail: "hello@open-webinar.com", sub: "Tell us your subject & background" },
            ].map(c => (
              <div key={c.title} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "1.4rem 1.5rem", boxShadow: "0 4px 20px rgba(15,20,16,0.06)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: T.ink, marginBottom: "0.25rem" }}>{c.title}</div>
                <div style={{ fontSize: "0.82rem", color: T.leaf, fontWeight: 500, marginBottom: "0.2rem" }}>{c.detail}</div>
                <div style={{ fontSize: "0.78rem", color: T.inkMuted }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "0 1rem 4rem" : "0 2rem 5rem" }}>
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 20, padding: isMobile ? "1.5rem 1.25rem" : "2.5rem", boxShadow: "0 8px 32px rgba(15,20,16,0.06)" }}>

            {sent ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.leafLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", margin: "0 auto 1.25rem" }}>✅</div>
                <div style={{ fontFamily: T.ffd, fontSize: "1.5rem", fontWeight: 700, color: T.ink, marginBottom: "0.65rem" }}>Message sent!</div>
                <div style={{ fontSize: "0.9rem", color: T.inkMuted, lineHeight: 1.7, maxWidth: 360, margin: "0 auto 1.5rem" }}>
                  Thanks for reaching out. We'll get back to you at <strong style={{ color: T.ink }}>{form.email}</strong> within 1–2 business days.
                </div>
                <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "general", message: "" }); fetchCaptcha(); }}
                  style={{ padding: "0.6rem 1.5rem", borderRadius: 100, border: `1.5px solid ${T.border}`, background: "none", fontFamily: T.ff, fontSize: "0.875rem", color: T.inkSoft, cursor: "pointer" }}>
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "2rem" }}>
                  <h2 style={{ fontFamily: T.ffd, fontSize: "1.35rem", fontWeight: 700, color: T.ink, marginBottom: "0.35rem" }}>Send us a message</h2>
                  <p style={{ fontSize: "0.875rem", color: T.inkMuted }}>All fields are required.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                  {/* Name + email */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.inkSoft, display: "block", marginBottom: "0.5rem" }}>Your name</label>
                      <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Priya Sharma" style={inputBase}
                        onFocus={e => (e.target.style.borderColor = T.leaf)} onBlur={e => (e.target.style.borderColor = T.border)} />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.inkSoft, display: "block", marginBottom: "0.5rem" }}>Email address</label>
                      <input required type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="you@example.com" style={inputBase}
                        onFocus={e => (e.target.style.borderColor = T.leaf)} onBlur={e => (e.target.style.borderColor = T.border)} />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.inkSoft, display: "block", marginBottom: "0.5rem" }}>What's this about?</label>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "0.6rem" }}>
                      {SUBJECTS.slice(0, 3).map(s => (
                        <button key={s.value} type="button" onClick={() => set("subject", s.value)}
                          style={{ padding: "0.6rem 0.5rem", borderRadius: 10, border: `1.5px solid ${form.subject === s.value ? T.leaf : T.border}`, background: form.subject === s.value ? T.leafLight : T.white, color: form.subject === s.value ? T.leaf : T.inkSoft, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: form.subject === s.value ? 600 : 400, cursor: "pointer", transition: "all 0.15s", textAlign: "center" as const }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginTop: "0.6rem" }}>
                      {SUBJECTS.slice(3).map(s => (
                        <button key={s.value} type="button" onClick={() => set("subject", s.value)}
                          style={{ padding: "0.6rem 0.5rem", borderRadius: 10, border: `1.5px solid ${form.subject === s.value ? T.leaf : T.border}`, background: form.subject === s.value ? T.leafLight : T.white, color: form.subject === s.value ? T.leaf : T.inkSoft, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: form.subject === s.value ? 600 : 400, cursor: "pointer", transition: "all 0.15s", textAlign: "center" as const }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: T.inkSoft, display: "block", marginBottom: "0.5rem" }}>Your message</label>
                    <textarea required value={form.message} onChange={e => set("message", e.target.value)} rows={6} placeholder="Tell us what's on your mind…"
                      style={{ ...inputBase, resize: "vertical" as const }}
                      onFocus={e => (e.target.style.borderColor = T.leaf)} onBlur={e => (e.target.style.borderColor = T.border)} />
                  </div>

                  {/* Math captcha */}
                  <div style={{ background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" as const }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>Quick check</div>
                      <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink }}>
                        {captcha ? captcha.question : "Loading…"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <input
                        required
                        type="number"
                        value={captchaAnswer}
                        onChange={e => setCaptchaAnswer(e.target.value)}
                        placeholder="?"
                        style={{ width: 72, padding: "0.65rem 0.75rem", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.white, fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink, outline: "none", textAlign: "center" as const, boxSizing: "border-box" as const }}
                        onFocus={e => (e.target.style.borderColor = T.leaf)} onBlur={e => (e.target.style.borderColor = T.border)}
                      />
                      <button type="button" onClick={fetchCaptcha} title="New question"
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, fontSize: "1rem", padding: "0.25rem", lineHeight: 1 }}>
                        ↺
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#fdecea", border: "1px solid rgba(192,57,43,0.2)", fontSize: "0.85rem", color: "#c0392b" }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={sending || !captcha}
                    style={{ padding: "0.85rem 2rem", borderRadius: 100, border: "none", background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.925rem", fontWeight: 600, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1, transition: "opacity 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    {sending ? (
                      <><span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Sending…</>
                    ) : "Send message →"}
                  </button>

                  <p style={{ fontSize: "0.75rem", color: T.inkMuted, textAlign: "center" as const, margin: 0 }}>
                    By submitting you agree to our <Link href="/privacy" style={{ color: T.leaf, textDecoration: "none" }}>Privacy Policy</Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
        <Footer />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}`}</style>
    </>
  );
}
