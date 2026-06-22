"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { getDashboard, getSubscribers, toggleSubscription, makeProfileSlug, computeExpertiseLevel, DashboardData, SubscriberItem, fullName, initials } from "@/lib/profile";
import { deleteSession, cancelSession } from "@/lib/session";

/* ─── design tokens ──────────────────────────────────────────────────── */
const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sun: "#e8a020", sunLight: "#fdf3e0",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  clayLight: "#f8ede5",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  r: 16, rs: 10,
  ff: "var(--font-dm-sans), sans-serif", ffd: "var(--font-fraunces), Georgia, serif",
};

/* ─── helpers ────────────────────────────────────────────────────────── */
function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name || "there"}!`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function profileHealth(p: DashboardData["profile"]): { pct: number; items: { label: string; done: boolean }[] } {
  const items = [
    { label: "Profile photo",   done: !!p.avatarUrl },
    { label: "Bio added",       done: !!p.bio },
    { label: "Expertise tags",  done: !!p.expertiseTags },
    { label: "YouTube / video",  done: !!p.youtubeUrl },
    { label: "Social profiles", done: !!(p.linkedinUrl || p.twitterUrl || p.websiteUrl || p.youtubeUrl) },
  ];
  const pct = Math.round((items.filter(i => i.done).length / items.length) * 100);
  return { pct, items };
}

/* ─── sub-components ─────────────────────────────────────────────────── */
function StatCard({ icon, bg, label, subtitle, value, delta, deltaColor, onClick }: {
  icon: string; bg: string; label: string; subtitle?: string; value: string | number;
  delta?: string; deltaColor?: "leaf" | "sun" | "sky"; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem", overflow: "hidden", transition: "box-shadow 0.2s, transform 0.2s", cursor: onClick ? "pointer" : "default", position: "relative" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 4px 20px rgba(15,20,16,0.08)"; el.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>
      <div style={{ marginBottom: "0.85rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: T.rs, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{icon}</div>
      </div>
      <div style={{ fontFamily: T.ffd, fontSize: "1.8rem", fontWeight: 700, color: T.ink, lineHeight: 1, marginBottom: "0.4rem" }}>{value}</div>
      {delta && (
        <span style={{ display: "inline-block", fontSize: "0.68rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: 100, marginBottom: "0.35rem", background: deltaColor === "leaf" ? T.leafLight : deltaColor === "sun" ? T.sunLight : T.skyLight, color: deltaColor === "leaf" ? T.leaf : deltaColor === "sun" ? T.sun : T.sky }}>
          {delta}
        </span>
      )}
      <div style={{ fontSize: "0.78rem", color: T.inkMuted, fontWeight: 500, display: "flex", alignItems: "center", gap: "0.35rem" }}>
        {label}
        {onClick && <span style={{ fontSize: "0.68rem", color: T.leaf, fontWeight: 600 }}>View →</span>}
      </div>
      {subtitle && <div style={{ fontSize: "0.7rem", color: T.inkMuted, marginTop: "0.25rem", fontStyle: "italic", lineHeight: 1.4 }}>{subtitle}</div>}
    </div>
  );
}

function RatingStatCard({ rating, reviewCount }: { rating: number | null; reviewCount: number }) {
  const filled = rating ? Math.round(rating) : 0;
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: T.rs, background: T.sunLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>⭐</div>
        {reviewCount > 0 && (
          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 100, background: T.sunLight, color: T.sun }}>
            {reviewCount} reviews
          </span>
        )}
      </div>
      {rating ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem", lineHeight: 1, marginBottom: "0.45rem" }}>
            <span style={{ fontFamily: T.ffd, fontSize: "1.8rem", fontWeight: 700, color: T.ink }}>{rating}</span>
            <span style={{ fontSize: "0.85rem", color: T.inkMuted, fontWeight: 600 }}>&thinsp;/ 5</span>
          </div>
          <div style={{ display: "flex", gap: "0.1rem", marginBottom: "0.45rem" }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ fontSize: "0.88rem", color: n <= filled ? T.sun : T.border }}>★</span>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontFamily: T.ffd, fontSize: "1.8rem", fontWeight: 700, color: T.ink, lineHeight: 1, marginBottom: "0.9rem" }}>—</div>
      )}
      <div style={{ fontSize: "0.78rem", color: T.inkMuted, fontWeight: 500 }}>Avg Rating</div>
    </div>
  );
}

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em", color: T.ink }}>
      {children}
      <div style={{ width: 28, height: 3, background: T.leaf, borderRadius: 2, marginTop: "0.3rem" }} />
    </div>
  );
}


/* ─── dashboard cache (90 s TTL) ─────────────────────────────────────── */
const DASH_CACHE_KEY = "oc_dash_cache";
const DASH_CACHE_TTL = 90_000;

function readDashCache(): DashboardData | null {
  try {
    const raw = localStorage.getItem(DASH_CACHE_KEY);
    if (!raw) return null;
    const { ts, payload } = JSON.parse(raw);
    if (Date.now() - ts > DASH_CACHE_TTL) return null;
    return payload as DashboardData;
  } catch { return null; }
}

function writeDashCache(d: DashboardData) {
  try {
    localStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload: d }));
  } catch { /* storage quota — ignore */ }
}

/* ─── page ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [showSubscribers, setShowSubscribers] = useState(false);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsSearch, setSubsSearch] = useState("");
  const [followLoadingId, setFollowLoadingId] = useState<number | null>(null);
  const [dashSessTab, setDashSessTab] = useState<"upcoming" | "draft" | "rejected" | "completed">("upcoming");
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
    localStorage.setItem("oc_default_role", "teacher");

    const stale = localStorage.getItem('oc_dash_stale');
    localStorage.removeItem('oc_dash_stale');

    const cached = stale ? null : readDashCache();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    getDashboard()
      .then(fresh => { setData(fresh); writeDashCache(fresh); })
      .catch(() => { if (!cached) router.replace("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleFollowBack(subscriberId: number, currentlyFollowing: boolean) {
    setFollowLoadingId(subscriberId);
    try {
      await toggleSubscription(subscriberId);
      setSubscribers(prev => prev.map(s =>
        s.id === subscriberId ? { ...s, isFollowedBack: !currentlyFollowing } : s
      ));
    } catch { /* ignore */ }
    finally { setFollowLoadingId(null); }
  }

  async function openSubscribers() {
    setShowSubscribers(true);
    if (subscribers.length > 0) return; // already loaded
    setSubsLoading(true);
    try {
      const list = await getSubscribers();
      setSubscribers(list);
    } catch { /* ignore */ }
    finally { setSubsLoading(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      setData(prev => prev ? { ...prev, sessions: prev.sessions.filter(s => s.id !== id) } : prev);
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancel this session? Students will no longer be able to join. This cannot be undone.")) return;
    setCancellingId(id);
    try {
      await cancelSession(id);
      setData(prev => prev ? {
        ...prev,
        sessions: prev.sessions.map(s => s.id === id ? { ...s, sessionStatus: "CANCELLED" } : s),
      } : prev);
    } catch { /* ignore */ }
    finally { setCancellingId(null); }
  }


  if (loading) {
    return (
      <>
        <Header activeLink="dashboard" />
        <div style={{ paddingTop: 64, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: T.cream, fontFamily: T.ff, color: T.inkMuted }}>
          Loading dashboard…
        </div>
      </>
    );
  }

  if (!data) return null;

  const { profile, sessions: allSessions, stats, thisMonth, recentReviews, recentActivity } = data;
  const liveSessionCount = allSessions.filter(s => s.type !== "webinar").length;
  const webinarCount     = allSessions.filter(s => s.type === "webinar").length;
  const nowMs = new Date().getTime();
  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"];
  const dashTabSessions = {
    upcoming:  allSessions.filter(s => s.status === "published" && !TERMINAL.includes(s.sessionStatus ?? "") && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 > nowMs),
    draft:     allSessions.filter(s => s.status === "draft" && !s.qualityFlag?.startsWith("REJECTED")),
    rejected:  allSessions.filter(s => s.qualityFlag?.startsWith("REJECTED") && s.status === "draft"),
    completed: allSessions.filter(s => TERMINAL.includes(s.sessionStatus ?? "") || (s.status === "published" && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 <= nowMs)),
  };
  const health = profileHealth(profile);
  const firstName = profile.firstName || profile.name?.split(" ")[0] || "there";
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (health.pct / 100) * circumference;

  return (
    <>
      <Header activeLink="dashboard" userName={fullName(profile)} userInitials={initials(profile)} userRole={profile.title || "Teacher"} />

      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1rem 1rem 2rem" : "1.75rem 2rem 3rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: "1.75rem", alignItems: "start" }}>

          {/* ── Welcome banner ──────────────────────────────────────── */}
          <div style={{ gridColumn: "1 / -1", background: T.ink, borderRadius: T.r, padding: isMobile ? "1.25rem 1.25rem" : "1.75rem 2.5rem", position: "relative", overflow: "hidden", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "1.5rem" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: 280, height: 280, background: "rgba(232,160,32,0.12)", borderRadius: "50%", filter: "blur(55px)", right: 100, top: -80, pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: 180, height: 180, background: "rgba(29,107,60,0.15)", borderRadius: "50%", filter: "blur(55px)", left: "40%", bottom: -60, pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(232,160,32,0.15)", border: "1px solid rgba(232,160,32,0.25)", color: "#f5c84a", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.25rem 0.7rem", borderRadius: 100, marginBottom: "0.75rem" }}>
                🎙️ Speaker Center
              </div>
              <h1 style={{ fontFamily: T.ffd, fontSize: "clamp(1.4rem,2.5vw,1.8rem)", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", marginBottom: "0.3rem" }}>
                {greeting(firstName)}
              </h1>
              <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", maxWidth: 420 }}>
                {stats.subscriberCount > 0
                  ? `Your knowledge is reaching ${stats.subscriberCount.toLocaleString()} subscribers. Keep it going!`
                  : "Welcome to your teaching center. Create your first session to get started."}
              </p>
            </div>

            <div style={{ position: "relative", zIndex: 1, flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.65rem", alignItems: isMobile ? "flex-start" : "flex-end", width: isMobile ? "100%" : "auto" }}>
              <Link href="/session" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.5rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.9rem", fontWeight: 600, background: T.leaf, color: T.white, textDecoration: "none" }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Webinar
              </Link>
              <a href={`/u/${makeProfileSlug(profile)}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.55rem 1.2rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", textDecoration: "none", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Public Profile
              </a>
            </div>
          </div>

          {/* ── Main column ─────────────────────────────────────────── */}
          <main style={{ minWidth: 0 }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
              <StatCard icon="👥" bg={T.leafLight} label="Subscribers"     value={stats.subscriberCount.toLocaleString()} delta={thisMonth.newSubscribers > 0 ? `+${thisMonth.newSubscribers} this month` : undefined} deltaColor="leaf" onClick={openSubscribers} />
              <StatCard icon="🎙️" bg={T.skyLight}  label="Live Sessions"   value={liveSessionCount} subtitle="Real-time interactive classes with live chat & Q&A" />
              <StatCard icon="📡" bg="#ede9fe"      label="Webinars"        value={webinarCount}     subtitle="One-to-many broadcasts for large audiences" />
              <RatingStatCard rating={stats.avgRating} reviewCount={stats.totalReviews} />
              <StatCard icon="📝" bg={T.sunLight}  label="Reviews this month" value={thisMonth.newReviews} />
            </div>

            {/* Active & Upcoming Sessions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
              <SectionTitle>Active &amp; Upcoming Webinars</SectionTitle>
              <Link href="/my-sessions" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.9rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 500, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft, textDecoration: "none" }}>
                View all →
              </Link>
            </div>

            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden", marginBottom: "1.75rem" }}>
              {/* tab bar */}
              <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 1.25rem", overflowX: "auto" }}>
                {(["upcoming", "draft", "rejected", "completed"] as const).map(t => {
                  const counts   = { upcoming: dashTabSessions.upcoming.length, draft: dashTabSessions.draft.length, rejected: dashTabSessions.rejected.length, completed: dashTabSessions.completed.length };
                  const badgeBg  = { upcoming: T.leafLight, draft: T.sunLight, rejected: "#fdecea", completed: T.border };
                  const badgeClr = { upcoming: T.leaf,      draft: T.sun,      rejected: "#c0392b", completed: T.inkMuted };
                  const activeClr = t === "rejected" ? "#c0392b" : T.leaf;
                  return (
                    <button key={t} onClick={() => setDashSessTab(t)} style={{ padding: "0.9rem 1.1rem", fontSize: "0.85rem", fontWeight: dashSessTab === t ? 600 : 500, color: dashSessTab === t ? activeClr : T.inkMuted, cursor: "pointer", border: "none", borderBottom: `2px solid ${dashSessTab === t ? activeClr : "transparent"}`, marginBottom: -1, background: "none", fontFamily: T.ff, transition: "all 0.15s", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                      <span style={{ fontSize: "0.68rem", borderRadius: 100, padding: "0.1rem 0.45rem", fontWeight: 700, background: badgeBg[t], color: badgeClr[t] }}>{counts[t]}</span>
                    </button>
                  );
                })}
              </div>

              {/* session rows */}
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                {dashTabSessions[dashSessTab].length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: T.inkMuted }}>
                    <p style={{ fontFamily: T.ffd, fontSize: "1rem", color: T.inkSoft, marginBottom: "0.5rem" }}>
                      {dashSessTab === "draft" ? "No drafts yet." : dashSessTab === "upcoming" ? "No upcoming sessions." : dashSessTab === "rejected" ? "No rejected sessions." : "No completed sessions yet."}
                    </p>
                    {dashSessTab !== "completed" && (
                      <Link href="/session" style={{ color: T.leaf, fontWeight: 600, textDecoration: "none", fontSize: "0.875rem" }}>Create one →</Link>
                    )}
                  </div>
                ) : dashTabSessions[dashSessTab].map((s, i) => {
                  const d          = new Date(s.scheduledAt);
                  const typeLabel  = s.type === "webinar" ? "Webinar" : "Live Class";
                  const typeBg     = s.type === "webinar" ? T.skyLight : T.leafLight;
                  const typeColor  = s.type === "webinar" ? T.sky      : T.leaf;
                  const openMs     = d.getTime() - 30 * 60_000;
                  const closeMs    = d.getTime() + (s.duration + 30) * 60_000;
                  const joinOpen   = nowMs >= openMs  && nowMs <= closeMs;
                  const beforeOpen = nowMs < openMs;
                  const isLive     = nowMs >= d.getTime() && nowMs <= closeMs;
                  const openTime   = new Date(openMs);
                  const sameDay    = openTime.toDateString() === new Date().toDateString();
                  const openLabel  = sameDay
                    ? openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : openTime.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const list = dashTabSessions[dashSessTab];
                  return (
                    <div key={s.id} style={{ padding: "1rem 0", borderBottom: i < list.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: "1rem" }}>

                        {/* date badge + details — clickable, opens session detail page */}
                        <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>

                          {/* date badge */}
                          <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: T.cream, border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "0.5rem 0.3rem" }}>
                            <div style={{ fontFamily: T.ffd, fontSize: "1.35rem", fontWeight: 700, color: T.leaf, lineHeight: 1 }}>{d.getDate()}</div>
                            <div style={{ fontSize: "0.6rem", textTransform: "uppercase" as const, color: T.inkMuted, letterSpacing: "0.04em", marginTop: "0.15rem" }}>{d.toLocaleString("default", { month: "short" })}</div>
                            <div style={{ fontSize: "0.6rem", color: T.inkMuted, marginTop: "0.1rem" }}>{d.getFullYear()}</div>
                          </div>

                          {/* details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem", flexWrap: "wrap" as const }}>
                              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{s.title}</span>
                              <SessionStatusBadge sessionStatus={s.sessionStatus} qualityFlag={s.qualityFlag} />
                              {dashSessTab === "completed" && !s.sessionStatus && (
                                <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.18rem 0.6rem", borderRadius: 100, background: T.border, color: T.inkMuted, letterSpacing: "0.02em", whiteSpace: "nowrap" as const }}>⏳ Computing</span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" as const, marginBottom: s._count !== undefined ? "0.55rem" : 0 }}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, padding: "0.18rem 0.6rem", borderRadius: 100, background: typeBg, color: typeColor }}>{typeLabel}</span>
                              {s.category && <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>📂 {s.category}</span>}
                              <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>⏰ {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s.duration} min</span>
                              {s.skillLevel && <span style={{ fontSize: "0.65rem", color: T.inkMuted, background: T.cream, border: `1px solid ${T.border}`, padding: "0.1rem 0.45rem", borderRadius: 100 }}>{s.skillLevel}</span>}
                              {s.visibility === "private" && <span style={{ fontSize: "0.65rem", color: "#9b2c4e", background: "#fce8ef", padding: "0.1rem 0.45rem", borderRadius: 100, fontWeight: 600 }}>🔒 Private</span>}
                            </div>

                            {/* Registration count */}
                            {s._count !== undefined && (() => {
                              const reg = s._count.registrations;
                              const cap = s.audienceLimit;
                              const pct = cap ? Math.min(100, Math.round((reg / cap) * 100)) : null;
                              const isFull = cap !== null && cap !== undefined && reg >= cap;
                              const isWarm = pct !== null && pct >= 80 && !isFull;
                              const countColor = isFull ? "#9b2c4e" : isWarm ? "#b5470e" : T.leaf;
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.1rem" }}>
                                  {/* count chip */}
                                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: countColor, display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" as const }}>
                                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                                    {cap ? `${reg} / ${cap} registered` : `${reg} registered`}
                                  </span>
                                  {cap ? (
                                    /* capped session: progress bar + seats left */
                                    <>
                                      <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 100, background: T.border, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: isFull ? "#c0392b" : isWarm ? "#e8a020" : T.leaf, transition: "width 0.4s" }} />
                                      </div>
                                      <span style={{ fontSize: "0.68rem", color: isFull ? "#9b2c4e" : T.inkMuted, fontWeight: isFull ? 600 : 400, whiteSpace: "nowrap" as const }}>
                                        {isFull ? "Full" : `${cap - reg} left`}
                                      </span>
                                    </>
                                  ) : (
                                    /* unlimited session: open enrollment indicator */
                                    <>
                                      <div style={{ flex: 1, maxWidth: 120, height: 5, borderRadius: 100, background: T.border, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: reg > 0 ? `${Math.min(100, Math.round((reg / Math.max(reg, 10)) * 100))}%` : "0%", borderRadius: 100, background: T.leaf, transition: "width 0.4s" }} />
                                      </div>
                                      <span style={{ fontSize: "0.68rem", color: T.inkMuted, fontWeight: 400, whiteSpace: "nowrap" as const }}>
                                        Unlimited
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </a>

                        {/* actions */}
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: isMobile ? 1 : 0, flexWrap: "wrap" as const, justifyContent: isMobile ? "flex-start" : "flex-end", alignItems: "center" }}>
                          {s.approved ? (
                            dashSessTab === "upcoming" && (
                              <button onClick={() => handleCancel(s.id)} disabled={cancellingId === s.id}
                                style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: cancellingId === s.id ? "default" : "pointer", opacity: cancellingId === s.id ? 0.5 : 1, whiteSpace: "nowrap" as const }}>
                                {cancellingId === s.id ? "…" : "Cancel Session"}
                              </button>
                            )
                          ) : (
                            <>
                              {s.qualityFlag?.startsWith("REJECTED") && s.status === "draft" ? (
                                <span style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, background: "#fdecea", color: "#c0392b", border: "1.5px solid rgba(192,57,43,0.25)", whiteSpace: "nowrap" as const }}>✕ Rejected</span>
                              ) : s.status === "published" ? (
                                <span style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, background: "#fdf3e0", color: "#b5470e", border: "1.5px solid rgba(181,71,14,0.25)", whiteSpace: "nowrap" as const }}>⏳ Pending approval</span>
                              ) : null}
                              <Link href={`/session?edit=${s.id}`} style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft, textDecoration: "none" }}>Edit</Link>
                              <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: "pointer", opacity: deletingId === s.id ? 0.5 : 1 }}>
                                {deletingId === s.id ? "…" : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Rejection reason banner */}
                      {s.qualityFlag?.startsWith("REJECTED") && s.status === "draft" && (
                        <div style={{ marginTop: "0.75rem", marginLeft: 68, padding: "0.7rem 0.9rem", borderRadius: T.rs, background: "#fdecea", border: "1.5px solid rgba(192,57,43,0.2)", display: "flex", alignItems: "flex-start", gap: "0.55rem" }}>
                          <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>🚫</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#c0392b", marginBottom: "0.1rem" }}>
                              Rejected by Admin
                              {s.qualityFlag !== "REJECTED_BY_ADMIN" && ` — ${{
                                REJECTED_QUALITY:       "Content Quality",
                                REJECTED_INAPPROPRIATE: "Inappropriate Content",
                                REJECTED_DUPLICATE:     "Duplicate Session",
                                REJECTED_INCOMPLETE:    "Incomplete Information",
                                REJECTED_WRONG_CAT:     "Wrong Category / Type",
                                REJECTED_SPAM:          "Spam / Promotional",
                                REJECTED_SCHEDULING:    "Scheduling Conflict",
                              }[s.qualityFlag] ?? "Admin Decision"}`}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#7a3025" }}>
                              Edit and resubmit, or contact support if you believe this is an error.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Join row — approved upcoming sessions only */}
                      {s.approved && dashSessTab === "upcoming" && (
                        <div style={{ marginTop: "0.7rem", marginLeft: 68, display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" as const }}>
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
                                <span style={{ fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.18)", padding: "0.1rem 0.45rem", borderRadius: 100 }}>Live</span>
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
                        <div style={{ marginTop: "0.6rem", marginLeft: 68, display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
                })}
              </div>
            </div>

            {/* Recent Reviews */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
              <SectionTitle>Recent Reviews</SectionTitle>
              <Link href="/profile" style={{ fontSize: "0.8rem", color: T.leaf, textDecoration: "none", fontWeight: 500 }}>View all →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {recentReviews.length === 0 ? (
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.5rem", textAlign: "center", color: T.inkMuted, fontSize: "0.875rem" }}>
                  No reviews yet.
                </div>
              ) : recentReviews.map(r => {
                const authorSlug = makeProfileSlug({ id: r.authorId, firstName: r.authorFirstName ?? undefined, lastName: r.authorLastName ?? undefined });
                const authorLvl  = computeExpertiseLevel(r.authorSessionCount ?? 0, r.authorReviewCount ?? 0, r.authorAvgRating ?? null);
                return (
                  <div key={r.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.4rem" }}>
                      <Link href={`/u/${authorSlug}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: T.leaf, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, overflow: "hidden" }}>
                          {r.authorAvatarUrl
                            ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${r.authorAvatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : r.authorName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                          }
                        </div>
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" as const }}>
                          <Link href={`/u/${authorSlug}`} style={{ fontSize: "0.84rem", fontWeight: 600, color: T.ink, textDecoration: "none" }}>
                            {r.authorName}
                          </Link>
                          <span style={{ color: T.sun, fontSize: "0.75rem" }}>{"★".repeat(r.rating)}</span>
                        </div>
                        <div style={{ marginTop: "0.2rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: authorLvl.bg, color: authorLvl.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 100 }}>
                            {authorLvl.icon} {authorLvl.label}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: T.inkMuted, flexShrink: 0, paddingTop: "0.1rem" }}>{timeAgo(r.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: T.inkSoft, lineHeight: 1.6 }}>"{r.comment}"</div>
                  </div>
                );
              })}
            </div>
          </main>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Profile Health */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Profile Health</div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1rem" }}>
                <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                  <svg viewBox="0 0 64 64" width="72" height="72" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="32" cy="32" r="30" fill="none" stroke={T.border} strokeWidth="6" />
                    <circle cx="32" cy="32" r="30" fill="none" stroke={T.leaf} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.ffd, fontSize: "0.95rem", fontWeight: 700, color: T.leaf }}>{health.pct}%</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: T.ink, marginBottom: "0.2rem" }}>
                    {health.pct === 100 ? "Complete!" : health.pct >= 60 ? "Almost there!" : "Just getting started"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: T.inkMuted, lineHeight: 1.5 }}>Complete your profile to attract more students.</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
                {health.items.map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: item.done ? T.leaf : T.inkMuted }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: item.done ? T.leafLight : T.border, color: item.done ? T.leaf : T.inkMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", flexShrink: 0, fontWeight: 700 }}>
                      {item.done ? "✓" : "+"}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
              {health.pct < 100 && (
                <Link href="/profile" style={{ display: "block", padding: "0.55rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, border: `1.5px solid ${T.leaf}`, background: "transparent", color: T.leaf, textAlign: "center", textDecoration: "none" }}>
                  Complete Profile →
                </Link>
              )}
            </div>

            {/* This Month */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>This Month</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                {[
                  { val: thisMonth.sessionsHeld, lbl: "Sessions held" },
                  { val: thisMonth.newSubscribers, lbl: "New subscribers" },
                  { val: `${Math.round(thisMonth.teachingMinutes / 60)}h`, lbl: "Teaching time" },
                  { val: thisMonth.newReviews, lbl: "New reviews" },
                ].map(({ val, lbl }) => (
                  <div key={lbl} style={{ background: T.cream, borderRadius: T.rs, padding: "0.75rem", textAlign: "center" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1.2rem", fontWeight: 700, color: T.ink, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: "0.65rem", color: T.inkMuted, marginTop: "0.2rem" }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Stream */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Activity Stream</div>
              {recentActivity.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: T.inkMuted, textAlign: "center", padding: "1rem 0" }}>No recent activity.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {recentActivity.map((item, i) => {
                    const parts = item.text.match(/^(.+?) (subscribed|left)/);
                    const name = parts?.[1] ?? "";
                    const rest = parts ? item.text.slice(name.length) : item.text;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", fontSize: "0.8rem", color: T.inkSoft }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: "0.4rem", background: item.type === "subscribe" ? T.sky : T.sun }} />
                        <div>
                          <div><strong>{name}</strong>{rest}</div>
                          <div style={{ fontSize: "0.68rem", color: T.inkMuted, marginTop: "0.1rem" }}>{timeAgo(item.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </aside>
        </div>
      </div>
      <Footer />
      {/* ── Subscriber Drawer ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes oc-spin { to { transform: rotate(360deg); } }
        @keyframes live-ring {
          0%   { box-shadow: 0 0 0 0 rgba(29,107,60,0.55), 0 0 12px 2px rgba(29,107,60,0.2); }
          70%  { box-shadow: 0 0 0 9px rgba(29,107,60,0),  0 0 18px 4px rgba(29,107,60,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(29,107,60,0),    0 0 12px 2px rgba(29,107,60,0); }
        }
        @keyframes live-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.5; transform:scale(0.75); }
        }
        .live-join-btn {
          animation: live-ring 2s ease-out infinite;
        }
        .live-join-btn:hover {
          background: #145c30 !important;
        }
      `}</style>
      {showSubscribers && (
        <>
          {/* Backdrop */}
          <div onClick={() => setShowSubscribers(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,20,16,0.45)", zIndex: 500, backdropFilter: "blur(2px)" }} />

          {/* Panel */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, maxWidth: "100vw", background: T.white, zIndex: 501, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(15,20,16,0.18)" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink }}>Subscribers</div>
                <div style={{ fontSize: "0.75rem", color: T.inkMuted, marginTop: "0.1rem" }}>
                  {subsLoading ? "Loading…" : `${subscribers.length} total`}
                </div>
              </div>
              <button onClick={() => setShowSubscribers(false)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.inkMuted, fontFamily: T.ff }}>✕</button>
            </div>

            {/* Search */}
            <div style={{ padding: "0.85rem 1.5rem", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.45rem 1rem" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.inkMuted} strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input value={subsSearch} onChange={e => setSubsSearch(e.target.value)} placeholder="Search subscribers…" style={{ border: "none", outline: "none", background: "transparent", fontFamily: T.ff, fontSize: "0.85rem", color: T.ink, width: "100%" }} />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0" }}>
              {subsLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: T.inkMuted, fontSize: "0.875rem" }}>Loading subscribers…</div>
              ) : subscribers.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👥</div>
                  <div style={{ fontFamily: T.ffd, fontSize: "1rem", color: T.ink, marginBottom: "0.4rem" }}>No subscribers yet</div>
                  <div style={{ fontSize: "0.8rem", color: T.inkMuted }}>Share your profile to attract your first follower.</div>
                </div>
              ) : (() => {
                const query = subsSearch.toLowerCase().trim();
                const filtered = query ? subscribers.filter(s => s.name.toLowerCase().includes(query)) : subscribers;
                if (filtered.length === 0) return (
                  <div style={{ padding: "2rem", textAlign: "center", color: T.inkMuted, fontSize: "0.85rem" }}>No results for "{subsSearch}"</div>
                );
                return filtered.map((s, i) => {
                  const initl = s.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
                  const sinceMs = Date.now() - new Date(s.subscribedAt).getTime();
                  const sinceDays = Math.floor(sinceMs / 86_400_000);
                  const since = sinceDays === 0 ? "Today" : sinceDays === 1 ? "Yesterday" : sinceDays < 30 ? `${sinceDays}d ago` : sinceDays < 365 ? `${Math.floor(sinceDays / 30)}mo ago` : `${Math.floor(sinceDays / 365)}y ago`;
                  const profileSlug = (s.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "-") || "user") + `-${s.id}`;
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.75rem 1.5rem", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                      {s.avatarUrl ? (
                        <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${s.avatarUrl}`} alt={s.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.leafLight, color: T.leaf, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0, fontFamily: T.ff }}>{initl}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a href={`/u/${profileSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.875rem", fontWeight: 600, color: T.leaf, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {s.name}
                        </a>
                        <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.1rem" }}>Subscribed {since}</div>
                      </div>
                      <button
                        onClick={() => handleFollowBack(s.id, s.isFollowedBack)}
                        disabled={followLoadingId === s.id}
                        style={{
                          flexShrink: 0, display: "flex", alignItems: "center", gap: "0.3rem",
                          fontSize: "0.72rem", fontWeight: 600, fontFamily: T.ff,
                          padding: "0.3rem 0.75rem", borderRadius: 100,
                          cursor: followLoadingId === s.id ? "default" : "pointer",
                          transition: "all 0.15s", opacity: followLoadingId === s.id ? 0.7 : 1,
                          ...(s.isFollowedBack
                            ? { background: T.leafLight, color: T.leaf, border: `1px solid rgba(29,107,60,0.25)` }
                            : { background: T.leaf,      color: "#fff",  border: "none" }),
                        }}
                      >
                        {followLoadingId === s.id ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ animation: "oc-spin 0.7s linear infinite" }}>
                              <path d="M12 2a10 10 0 0 1 10 10"/>
                            </svg>
                            {s.isFollowedBack ? "Unsubscribing…" : "Subscribing…"}
                          </>
                        ) : s.isFollowedBack ? (
                          <>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                              <path d="M16 11l2 2 4-4"/>
                            </svg>
                            Subscribed
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                              <line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>
                            </svg>
                            Subscribe back
                          </>
                        )}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
