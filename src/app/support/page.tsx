"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import Link from "next/link";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "var(--font-dm-sans), sans-serif",
  ffd: "var(--font-fraunces), Georgia, serif",
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const CATEGORIES = [
  "General Question", "Technical Issue", "Account / Billing",
  "Session / Content", "Feedback", "Other",
];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  OPEN:        { bg: "#e8f4ff", color: "#1a4f7a", label: "Open" },
  IN_PROGRESS: { bg: "#fff4e0", color: "#a05f00", label: "In Progress" },
  RESOLVED:    { bg: "#d4ead9", color: "#1d6b3c", label: "Resolved" },
  CLOSED:      { bg: "#f0f0f0", color: "#6b7a72", label: "Closed" },
};

interface Ticket {
  id: number;
  subject: string;
  category: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  _count: { replies: number };
}

export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", category: CATEGORIES[0], message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function load() {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    try {
      const res = await fetch(`${API}/support/my`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json() as Ticket[];
      setTickets(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.subject.trim() || !form.message.trim()) { setError("Subject and message are required."); return; }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: form.subject.trim(), category: form.category, message: form.message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message || "Failed to create ticket");
      }
      setForm({ subject: "", category: CATEGORIES[0], message: "" });
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSubmitting(false); }
  }

  const sc = STATUS_COLORS;

  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", background: T.cream, paddingTop: 80, fontFamily: T.ff }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem" }}>

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? "1.5rem" : "1.8rem", fontFamily: T.ffd, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>
                Support
              </h1>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.9rem", color: T.inkMuted }}>
                Get help from the OpenWebinar team
              </p>
            </div>
            <button
              onClick={() => { setShowForm(v => !v); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 1.2rem", background: T.leaf, color: T.white, border: "none", borderRadius: 100, fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: T.ff }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
              New Ticket
            </button>
          </div>

          {/* New ticket form */}
          {showForm && (
            <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "1.25rem" : "1.75rem", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontFamily: T.ffd, color: T.ink }}>New Support Ticket</h2>
              {error && (
                <div style={{ padding: "0.75rem 1rem", background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 10, marginBottom: "1rem", fontSize: "0.875rem", color: "#c0392b" }}>{error}</div>
              )}
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "1rem" }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkMuted, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject *</label>
                    <input
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      style={{ width: "100%", padding: "0.65rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: "0.9rem", fontFamily: T.ff, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkMuted, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ width: "100%", padding: "0.65rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: "0.9rem", fontFamily: T.ff, outline: "none", background: T.white, boxSizing: "border-box" }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: T.inkMuted, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue in as much detail as possible..."
                    rows={5}
                    style={{ width: "100%", padding: "0.65rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: "0.9rem", fontFamily: T.ff, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => { setShowForm(false); setError(""); }} style={{ padding: "0.6rem 1.2rem", background: "transparent", border: `1.5px solid ${T.border}`, borderRadius: 100, fontSize: "0.875rem", fontWeight: 500, color: T.inkSoft, cursor: "pointer", fontFamily: T.ff }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} style={{ padding: "0.6rem 1.4rem", background: T.leaf, border: "none", borderRadius: 100, fontSize: "0.875rem", fontWeight: 600, color: T.white, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, fontFamily: T.ff }}>
                    {submitting ? "Submitting…" : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: T.inkMuted }}>Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem 2rem", background: T.white, borderRadius: 16, border: `1.5px solid ${T.border}` }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎫</div>
              <h3 style={{ margin: "0 0 0.5rem", fontFamily: T.ffd, color: T.ink }}>No support tickets yet</h3>
              <p style={{ margin: 0, color: T.inkMuted, fontSize: "0.9rem" }}>Have a question or issue? Submit a ticket and we&apos;ll get back to you.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tickets.map(t => {
                const s = sc[t.status] || sc.OPEN;
                return (
                  <Link key={t.id} href={`/support/${t.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", transition: "box-shadow 0.2s", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(15,20,16,0.08)")}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            #{t.id} — {t.subject}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                          {t.category && <span style={{ fontSize: "0.75rem", color: T.inkMuted }}>{t.category}</span>}
                          <span style={{ fontSize: "0.75rem", color: T.inkMuted }}>
                            {new Date(t.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {t._count.replies > 0 && (
                            <span style={{ fontSize: "0.75rem", color: T.inkMuted }}>
                              {t._count.replies} {t._count.replies === 1 ? "reply" : "replies"}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ padding: "0.25rem 0.7rem", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600, background: s.bg, color: s.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                        {s.label}
                      </span>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7a72" strokeWidth={2} style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
