"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { getMySessions, deleteSession, cancelSession, SessionData } from "@/lib/session";

const T = {
  ink: "#0f1410", inkMuted: "#6b7a72", inkSoft: "#3a4140",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  sun: "#b5470e", sunLight: "#fdf3e0",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  ff: "'DM Sans', sans-serif", ffD: "'Fraunces', Georgia, serif",
  rs: 10,
};

type SessTab = "upcoming" | "draft" | "rejected" | "completed";

const REJECTION_LABEL: Record<string, string> = {
  REJECTED_QUALITY:       "Content Quality",
  REJECTED_INAPPROPRIATE: "Inappropriate Content",
  REJECTED_DUPLICATE:     "Duplicate Session",
  REJECTED_INCOMPLETE:    "Incomplete Information",
  REJECTED_WRONG_CAT:     "Wrong Category / Type",
  REJECTED_SPAM:          "Spam / Promotional",
  REJECTED_SCHEDULING:    "Scheduling Conflict",
  REJECTED_BY_ADMIN:      "Other (Admin Decision)",
};

const SESSION_STATUS_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  COMPLETED:  { label: "Completed",  bg: "#d4ead9", color: "#1d6b3c", icon: "✓" },
  CANCELLED:  { label: "Cancelled",  bg: "#f0f0f0", color: "#6b7a72", icon: "✕" },
  NO_SHOW:    { label: "No Show",    bg: "#fdf3e0", color: "#b5470e", icon: "⚠" },
  ABANDONED:  { label: "Abandoned",  bg: "#fce8ef", color: "#9b2c4e", icon: "⚡" },
};
const QUALITY_FLAG_META: Record<string, { label: string; bg: string; color: string }> = {
  EARLY_COMPLETION:  { label: "Early End",       bg: "#fdf3e0", color: "#b5470e" },
  VERY_SHORT_SESSION:{ label: "Very Short",      bg: "#fce8ef", color: "#9b2c4e" },
  LATE_START:        { label: "Late Start",      bg: "#fdf3e0", color: "#b5470e" },
  LOW_ATTENDANCE:    { label: "Low Attendance",  bg: "#fdf3e0", color: "#b5470e" },
  HIGH_ENGAGEMENT:   { label: "High Engagement", bg: "#d4ead9", color: "#1d6b3c" },
};

function SessionStatusBadge({ sessionStatus, qualityFlag }: { sessionStatus?: string | null; qualityFlag?: string | null }) {
  const sm = sessionStatus ? SESSION_STATUS_META[sessionStatus] : null;
  const qm = qualityFlag && qualityFlag !== "NORMAL" ? QUALITY_FLAG_META[qualityFlag] : null;
  if (!sm && !qm) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      {sm && (
        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.6rem", borderRadius: 100, background: sm.bg, color: sm.color, letterSpacing: "0.02em" }}>
          {sm.icon} {sm.label}
        </span>
      )}
      {qm && (
        <span style={{ fontSize: "0.62rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 100, background: qm.bg, color: qm.color, letterSpacing: "0.02em" }}>
          {qm.label}
        </span>
      )}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const MYSESS_CACHE_KEY = "oc_mysess_cache";
const MYSESS_CACHE_TTL = 90_000;

function readMysessCache(): SessionData[] | null {
  try {
    const raw = localStorage.getItem(MYSESS_CACHE_KEY);
    if (!raw) return null;
    const { ts, payload } = JSON.parse(raw);
    if (Date.now() - ts > MYSESS_CACHE_TTL) return null;
    return payload as SessionData[];
  } catch { return null; }
}

function writeMysessCache(data: SessionData[]) {
  try {
    localStorage.setItem(MYSESS_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload: data }));
  } catch { /* quota — ignore */ }
}

export default function MySessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SessTab>("upcoming");
  const [now, setNow] = useState(() => new Date());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  function copySessionLink(id: number) {
    const url = `${window.location.origin}/session/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }

    const stale = localStorage.getItem("oc_mysess_stale");
    localStorage.removeItem("oc_mysess_stale");

    const cached = stale ? null : readMysessCache();
    if (cached) {
      setSessions(cached);
      setLoading(false);
    }

    getMySessions()
      .then(fresh => { setSessions(fresh); writeMysessCache(fresh); })
      .catch(() => { if (!cached) router.replace("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  // tick clock every 30s so live status updates
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions(p => p.filter(s => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancel this session? Students will no longer be able to join. This cannot be undone.")) return;
    setCancellingId(id);
    try {
      await cancelSession(id);
      setSessions(p => p.map(s => s.id === id ? { ...s, sessionStatus: "CANCELLED" } : s));
    } catch { /* ignore */ }
    finally { setCancellingId(null); }
  }

  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"];
  function filterSessions(t: SessTab) {
    return sessions.filter(s => {
      const endMs = new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000;
      const isTerminal = TERMINAL.includes(s.sessionStatus ?? "");
      const isRejected = s.qualityFlag?.startsWith("REJECTED") ?? false;
      if (t === "rejected") return isRejected && s.status === "draft";
      if (t === "draft") return s.status === "draft" && !isRejected;
      if (t === "upcoming") return s.status === "published" && !isTerminal && endMs > now.getTime();
      return isTerminal || (s.status === "published" && endMs <= now.getTime());
    });
  }

  const tabCounts: Record<SessTab, number> = {
    upcoming:  filterSessions("upcoming").length,
    draft:     filterSessions("draft").length,
    rejected:  filterSessions("rejected").length,
    completed: filterSessions("completed").length,
  };

  const tabBadgeBg: Record<SessTab, string>    = { upcoming: T.leafLight, draft: T.sunLight, rejected: "#fdecea", completed: T.border };
  const tabBadgeColor: Record<SessTab, string> = { upcoming: T.leaf,      draft: T.sun,      rejected: "#c0392b", completed: T.inkMuted };

  const filtered = filterSessions(tab);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header activeLink="sessions" />

      <div style={{ paddingTop: isMobile ? 57 : 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>

        {/* Page header */}
        <div style={{ background: T.ink, padding: isMobile ? "1.5rem 1rem 1.25rem" : "2rem 2rem 1.75rem" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
              <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", textDecoration: "none" }}>Dashboard</Link>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.78rem" }}>›</span>
              <span style={{ color: "#7ed9a4", fontSize: "0.78rem", fontWeight: 600 }}>My Sessions</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h1 style={{ fontFamily: T.ffD, fontSize: "clamp(1.4rem,2.5vw,1.9rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                  My Sessions
                </h1>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                  All your live classes and webinars in one place.
                </p>
              </div>
              <Link href="/session" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.25rem", borderRadius: 100, background: T.leaf, color: "#fff", fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                + New Session
              </Link>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "1rem" : "1.75rem 1.5rem" }}>

          {/* Stats row */}
          {!loading && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
              {(["upcoming", "draft", "rejected", "completed"] as SessTab[]).map(t => (
                <div key={t} onClick={() => setTab(t)} style={{ background: T.white, border: `1.5px solid ${tab === t ? (t === "rejected" ? "#c0392b" : T.leaf) : T.border}`, borderRadius: 12, padding: "1rem 1.25rem", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ fontSize: "1.6rem", fontFamily: T.ffD, fontWeight: 700, color: tab === t ? (t === "rejected" ? "#c0392b" : T.leaf) : T.ink }}>{tabCounts[t]}</div>
                  <div style={{ fontSize: "0.78rem", color: T.inkMuted, fontWeight: 500, textTransform: "capitalize", marginTop: "0.1rem" }}>{t}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: isMobile ? "0 0.5rem" : "0 1.25rem", overflowX: "auto" as const }}>
              {(["upcoming", "draft", "rejected", "completed"] as SessTab[]).map(t => {
                const activeColor = t === "rejected" ? "#c0392b" : T.leaf;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "0.9rem 1.1rem", fontSize: "0.85rem", fontWeight: tab === t ? 600 : 500, color: tab === t ? activeColor : T.inkMuted, cursor: "pointer", border: "none", borderBottom: `2px solid ${tab === t ? activeColor : "transparent"}`, marginBottom: -1, background: "none", fontFamily: T.ff, transition: "all 0.15s", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    <span style={{ fontSize: "0.68rem", background: tabBadgeBg[t], color: tabBadgeColor[t], borderRadius: 100, padding: "0.1rem 0.45rem", fontWeight: 700 }}>{tabCounts[t]}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "0.5rem 1.25rem 1.25rem" }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: T.inkMuted }}>Loading sessions…</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: T.inkMuted }}>
                  <p style={{ fontFamily: T.ffD, fontSize: "1.1rem", color: T.inkSoft, marginBottom: "0.5rem" }}>
                    {tab === "draft" ? "No drafts yet." : tab === "upcoming" ? "No upcoming sessions." : tab === "rejected" ? "No rejected sessions." : "No completed sessions yet."}
                  </p>
                  {tab !== "completed" && (
                    <Link href="/session" style={{ color: T.leaf, fontWeight: 600, textDecoration: "none", fontSize: "0.875rem" }}>
                      Create one →
                    </Link>
                  )}
                </div>
              ) : (
                filtered.map((s, i) => {
                  const d = new Date(s.scheduledAt);
                  const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
                  const typeBg = s.type === "webinar" ? T.skyLight : T.leafLight;
                  const typeColor = s.type === "webinar" ? T.sky : T.leaf;

                  const openMs  = d.getTime() - 30 * 60_000;
                  const closeMs = d.getTime() + (s.duration + 30) * 60_000;
                  const nowMs   = now.getTime();
                  const isTerminal = ["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"].includes(s.sessionStatus ?? "");
                  const joinOpen   = !isTerminal && nowMs >= openMs && nowMs <= closeMs;
                  const beforeOpen = !isTerminal && nowMs < openMs;
                  const isLive     = !isTerminal && nowMs >= d.getTime() && nowMs <= closeMs;

                  const openTime  = new Date(openMs);
                  const sameDay   = openTime.toDateString() === now.toDateString();
                  const openLabel = sameDay
                    ? openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : openTime.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={s.id} style={{ padding: "1rem 0", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: "1rem" }}>

                        {/* date badge + details — clickable area opens session detail */}
                        <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>

                        {/* date badge */}
                        <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: T.cream, border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "0.5rem 0.3rem" }}>
                          <div style={{ fontFamily: T.ffD, fontSize: "1.35rem", fontWeight: 700, color: T.leaf, lineHeight: 1 }}>{d.getDate()}</div>
                          <div style={{ fontSize: "0.6rem", textTransform: "uppercase", color: T.inkMuted, letterSpacing: "0.04em", marginTop: "0.15rem" }}>{d.toLocaleString("default", { month: "short" })}</div>
                          <div style={{ fontSize: "0.6rem", color: T.inkMuted, marginTop: "0.1rem" }}>{d.getFullYear()}</div>
                        </div>

                        {/* details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem", flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap" as const }}>{s.title}</span>
                            <SessionStatusBadge sessionStatus={s.sessionStatus} qualityFlag={s.qualityFlag} />
                            {tab === "completed" && !s.sessionStatus && (
                              <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.18rem 0.6rem", borderRadius: 100, background: T.border, color: T.inkMuted, letterSpacing: "0.02em", whiteSpace: "nowrap" as const }}>⏳ Computing</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" as const, marginBottom: s._count !== undefined ? "0.55rem" : 0 }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, padding: "0.18rem 0.6rem", borderRadius: 100, background: typeBg, color: typeColor }}>{typeLabel}</span>
                            {s.category && <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>📂 {s.category}</span>}
                            <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                              ⏰ {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s.duration} min
                            </span>
                            {s.skillLevel && <span style={{ fontSize: "0.65rem", color: T.inkMuted, background: T.cream, border: `1px solid ${T.border}`, padding: "0.1rem 0.45rem", borderRadius: 100 }}>{s.skillLevel}</span>}
                            {s.visibility === "private" && <span style={{ fontSize: "0.65rem", color: "#9b2c4e", background: "#fce8ef", padding: "0.1rem 0.45rem", borderRadius: 100, fontWeight: 600 }}>🔒 Private</span>}
                          </div>

                          {/* Registration count + bar */}
                          {s._count !== undefined && (() => {
                            const reg = s._count.registrations;
                            const cap = s.audienceLimit;
                            const pct = cap ? Math.min(100, Math.round((reg / cap) * 100)) : null;
                            const isFull = cap !== null && cap !== undefined && reg >= cap;
                            const isWarm = pct !== null && pct >= 80 && !isFull;
                            const countColor = isFull ? "#9b2c4e" : isWarm ? "#b5470e" : T.leaf;
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.1rem" }}>
                                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: countColor, display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" as const }}>
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                                  {cap ? `${reg} / ${cap} registered` : `${reg} registered`}
                                </span>
                                {cap ? (
                                  <>
                                    <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 100, background: T.border, overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: isFull ? "#c0392b" : isWarm ? "#e8a020" : T.leaf, transition: "width 0.4s" }} />
                                    </div>
                                    <span style={{ fontSize: "0.68rem", color: isFull ? "#9b2c4e" : T.inkMuted, fontWeight: isFull ? 600 : 400, whiteSpace: "nowrap" as const }}>
                                      {isFull ? "Full" : `${cap - reg} left`}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 100, background: T.border, overflow: "hidden" }}>
                                      <div style={{ height: "100%", width: reg > 0 ? `${Math.min(100, Math.round((reg / Math.max(reg, 10)) * 100))}%` : "0%", borderRadius: 100, background: T.leaf, transition: "width 0.4s" }} />
                                    </div>
                                    <span style={{ fontSize: "0.68rem", color: T.inkMuted, fontWeight: 400, whiteSpace: "nowrap" as const }}>Unlimited</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        </a>

                        {/* actions */}
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" as const, justifyContent: isMobile ? "flex-start" : "flex-end", alignItems: "center", width: isMobile ? "100%" : undefined }}>
                          {s.approved ? (
                            /* approved — only cancel allowed, only in upcoming tab */
                            tab === "upcoming" && (
                              <button onClick={() => handleCancel(s.id)} disabled={cancellingId === s.id}
                                style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: cancellingId === s.id ? "default" : "pointer", opacity: cancellingId === s.id ? 0.5 : 1, whiteSpace: "nowrap" as const }}>
                                {cancellingId === s.id ? "…" : "Cancel Session"}
                              </button>
                            )
                          ) : (
                            /* not yet approved — edit + delete allowed */
                            <>
                              {s.qualityFlag?.startsWith("REJECTED") && s.status === "draft" ? (
                                <span style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, background: "#fdecea", color: "#c0392b", border: "1.5px solid rgba(192,57,43,0.25)", whiteSpace: "nowrap" as const }}>
                                  ✕ Rejected
                                </span>
                              ) : s.status === "published" ? (
                                <span style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, background: "#fdf3e0", color: "#b5470e", border: "1.5px solid rgba(181,71,14,0.25)", whiteSpace: "nowrap" as const }}>
                                  ⏳ Pending approval
                                </span>
                              ) : null}
                              <Link href={`/session?edit=${s.id}`} style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft, textDecoration: "none" }}>
                                Edit
                              </Link>
                              <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: "pointer", opacity: deletingId === s.id ? 0.5 : 1 }}>
                                {deletingId === s.id ? "…" : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Rejection reason banner */}
                      {s.qualityFlag?.startsWith("REJECTED") && s.status === "draft" && (
                        <div style={{ marginTop: "0.75rem", marginLeft: isMobile ? 0 : 68, padding: "0.75rem 1rem", borderRadius: T.rs, background: "#fdecea", border: "1.5px solid rgba(192,57,43,0.2)", display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                          <span style={{ fontSize: "1rem", flexShrink: 0 }}>🚫</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#c0392b", marginBottom: "0.15rem" }}>
                              Rejected by Admin — {REJECTION_LABEL[s.qualityFlag] ?? "Admin Decision"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#7a3025" }}>
                              Edit and resubmit, or contact support if you believe this is an error.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Join row — approved upcoming sessions only */}
                      {s.approved && tab === "upcoming" && (
                        <div style={{ marginTop: "0.7rem", marginLeft: isMobile ? 0 : 68, display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" as const }}>
                          <button
                            disabled={!joinOpen}
                            onClick={() => joinOpen && router.push(`/join/${s.id}`)}
                            className={isLive ? "live-join-btn" : ""}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", padding: "0.5rem 1.25rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 700, border: "none", cursor: joinOpen ? "pointer" : "not-allowed", background: joinOpen ? (isLive ? T.leaf : T.sky) : T.border, color: joinOpen ? "#fff" : T.inkMuted, transition: "background 0.2s" }}>
                            {isLive ? (
                              <>
                                <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
                                  <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(255,255,255,0.5)", animation: "live-dot 1.4s ease-in-out infinite" }} />
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block", flexShrink: 0 }} />
                                </span>
                                <span style={{ fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, background: "rgba(255,255,255,0.18)", padding: "0.1rem 0.45rem", borderRadius: 100 }}>Live</span>
                                Join Now
                              </>
                            ) : joinOpen ? "🎬 Join Now" : "🔒 Opens Soon"}
                          </button>
                          <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                            {joinOpen && isLive ? "Session is live · closes 30 min after end" :
                             joinOpen ? `Room opens 30 min early · starts at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` :
                             beforeOpen ? `Room opens at ${openLabel} (30 min before start)` : ""}
                          </span>
                        </div>
                      )}

                      {/* Share link row — all published sessions */}
                      {s.status === "published" && (
                        <div style={{ marginTop: "0.6rem", marginLeft: isMobile ? 0 : 68, display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" as const }}>
                          <span style={{ fontSize: "0.72rem", color: T.inkMuted, fontFamily: "monospace", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.25rem 0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 280 }}>
                            {typeof window !== "undefined" ? `${window.location.origin}/session/${s.id}` : `/session/${s.id}`}
                          </span>
                          <button
                            onClick={() => copySessionLink(s.id)}
                            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.28rem 0.75rem", borderRadius: 6, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, border: `1.5px solid ${copiedId === s.id ? T.leaf : T.border}`, background: copiedId === s.id ? T.leafLight : T.white, color: copiedId === s.id ? T.leaf : T.inkSoft, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" as const }}>
                            {copiedId === s.id
                              ? <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                              : <><svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy link</>
                            }
                          </button>
                          <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer"
                            style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: T.sky, textDecoration: "none", fontWeight: 500 }}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Preview
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer note */}
          {!loading && sessions.length > 0 && (
            <p style={{ fontSize: "0.75rem", color: T.inkMuted, textAlign: "center", marginTop: "1.25rem" }}>
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} total · last updated {fmtDate(new Date().toISOString())}
            </p>
          )}
        </div>
      </div>
      <Footer />
      <style>{`
        @keyframes live-ring {
          0%   { box-shadow: 0 0 0 0 rgba(29,107,60,0.55), 0 0 12px 2px rgba(29,107,60,0.2); }
          70%  { box-shadow: 0 0 0 9px rgba(29,107,60,0),  0 0 18px 4px rgba(29,107,60,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(29,107,60,0),    0 0 12px 2px rgba(29,107,60,0); }
        }
        @keyframes live-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.5; transform:scale(0.75); }
        }
        .live-join-btn { animation: live-ring 2s ease-out infinite; }
        .live-join-btn:hover { background: #145c30 !important; }
      `}</style>
    </>
  );
}
