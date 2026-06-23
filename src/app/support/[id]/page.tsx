"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  OPEN:        { bg: "#e8f4ff", color: "#1a4f7a", label: "Open" },
  IN_PROGRESS: { bg: "#fff4e0", color: "#a05f00", label: "In Progress" },
  RESOLVED:    { bg: "#d4ead9", color: "#1d6b3c", label: "Resolved" },
  CLOSED:      { bg: "#f0f0f0", color: "#6b7a72", label: "Closed" },
};

interface Reply {
  id: number;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

interface Ticket {
  id: number;
  subject: string;
  category: string | null;
  status: string;
  priority: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  replies: Reply[];
  user: { email: string; firstName: string | null; lastName: string | null };
}

export default function SupportTicketPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id as string;
  const bottomRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
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
      const res = await fetch(`${API}/support/my/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 403 || res.status === 404) { router.push("/support"); return; }
      const data = await res.json() as Ticket;
      setTicket(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ticket) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!reply.trim()) return;
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/support/my/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message || "Failed to send reply");
      }
      setReply("");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSending(false); }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const isClosed = ticket?.status === "RESOLVED" || ticket?.status === "CLOSED";

  return (
    <>
      <Header />
      <main style={{ minHeight: "100vh", background: T.cream, paddingTop: 80, fontFamily: T.ff }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: isMobile ? "1.5rem 1.25rem 3rem" : "2rem 2rem 3rem" }}>

          {/* Back */}
          <Link href="/support" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: T.inkMuted, textDecoration: "none", marginBottom: "1.5rem" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6" /></svg>
            Back to Support
          </Link>

          {loading && <div style={{ textAlign: "center", padding: "3rem", color: T.inkMuted }}>Loading…</div>}

          {!loading && ticket && (() => {
            const s = STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN;
            return (
              <>
                {/* Header card */}
                <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: isMobile ? "1.25rem" : "1.5rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: T.inkMuted, marginBottom: "0.3rem" }}>Ticket #{ticket.id}</div>
                      <h1 style={{ margin: "0 0 0.5rem", fontSize: isMobile ? "1.2rem" : "1.4rem", fontFamily: T.ffd, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                        {ticket.subject}
                      </h1>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                        {ticket.category && (
                          <span style={{ fontSize: "0.75rem", color: T.inkMuted, background: T.cream, border: `1px solid ${T.border}`, padding: "0.2rem 0.6rem", borderRadius: 100 }}>
                            {ticket.category}
                          </span>
                        )}
                        <span style={{ fontSize: "0.75rem", color: T.inkMuted }}>{fmtDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                    <span style={{ padding: "0.3rem 0.85rem", borderRadius: 100, fontSize: "0.8rem", fontWeight: 600, background: s.bg, color: s.color, flexShrink: 0 }}>
                      {s.label}
                    </span>
                  </div>
                </div>

                {/* Thread */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
                  {/* Original message */}
                  <MessageBubble isAdmin={false} message={ticket.message} date={ticket.createdAt} fmtDate={fmtDate} isMobile={isMobile} />

                  {ticket.replies.map(r => (
                    <MessageBubble key={r.id} isAdmin={r.isAdmin} message={r.message} date={r.createdAt} fmtDate={fmtDate} isMobile={isMobile} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Reply box or closed notice */}
                {isClosed ? (
                  <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "1.25rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>✅</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: T.ink, marginBottom: "0.3rem" }}>This ticket is {ticket.status === "RESOLVED" ? "resolved" : "closed"}</div>
                    <div style={{ fontSize: "0.85rem", color: T.inkMuted, marginBottom: "1rem" }}>If you have a new question, please open a fresh ticket.</div>
                    <Link href="/support" style={{ display: "inline-block", padding: "0.55rem 1.25rem", background: T.leaf, color: T.white, borderRadius: 100, fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
                      New Ticket
                    </Link>
                  </div>
                ) : (
                  <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: isMobile ? "1.1rem" : "1.25rem" }}>
                    {error && (
                      <div style={{ padding: "0.65rem 0.9rem", background: "#fff0f0", border: "1px solid #f5c0c0", borderRadius: 10, marginBottom: "0.85rem", fontSize: "0.85rem", color: "#c0392b" }}>{error}</div>
                    )}
                    <form onSubmit={handleReply} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Write a reply…"
                        rows={3}
                        style={{ width: "100%", padding: "0.65rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: "0.9rem", fontFamily: T.ff, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button type="submit" disabled={sending || !reply.trim()} style={{ padding: "0.6rem 1.4rem", background: T.leaf, border: "none", borderRadius: 100, fontSize: "0.875rem", fontWeight: 600, color: T.white, cursor: (sending || !reply.trim()) ? "not-allowed" : "pointer", opacity: (sending || !reply.trim()) ? 0.6 : 1, fontFamily: T.ff }}>
                          {sending ? "Sending…" : "Send Reply"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </main>
      <Footer />
    </>
  );
}

function MessageBubble({ isAdmin, message, date, fmtDate, isMobile }: {
  isAdmin: boolean;
  message: string;
  date: string;
  fmtDate: (s: string) => string;
  isMobile: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: isAdmin ? "flex-start" : "flex-end" }}>
      <div style={{
        maxWidth: isMobile ? "92%" : "80%",
        background: isAdmin ? T.white : T.leafLight,
        border: `1.5px solid ${isAdmin ? T.border : "#a8d4b5"}`,
        borderRadius: isAdmin ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
        padding: "0.9rem 1.1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          {isAdmin && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700, color: T.leaf, background: T.leafLight, padding: "0.15rem 0.5rem", borderRadius: 100 }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              OpenWebinar Team
            </span>
          )}
          <span style={{ fontSize: "0.72rem", color: "#6b7a72" }}>{fmtDate(date)}</span>
        </div>
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.65, color: T.ink, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message}</p>
      </div>
    </div>
  );
}
