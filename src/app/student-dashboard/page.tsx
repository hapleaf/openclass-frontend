"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { getStudentDashboard, StudentDashboardData, FollowedTeacher, fullName, initials, shortName, computeExpertiseLevel, makeProfileSlug } from "@/lib/profile";
import { PublicSessionData } from "@/lib/session";
import { fmtTime, fmtDateShort } from "@/lib/tz";

/* ─── tokens ─────────────────────────────────────────────────────────── */
const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sun: "#e8a020", sunLight: "#fdf3e0",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  clay: "#c45b2a", clayLight: "#f8ede5",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  r: 16, rs: 10,
  ff: "var(--font-dm-sans), sans-serif", ffd: "var(--font-fraunces), Georgia, serif",
};

const AVATAR_COLORS = ["#1d6b3c","#1a4f7a","#c45b2a","#7c3aed","#0e6370","#9b2c4e","#854d0e","#e8a020"];
const avatarBg = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/* ─── helpers ────────────────────────────────────────────────────────── */
function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name}!`;
}

function teacherDisplayName(t: FollowedTeacher) {
  return [t.firstName, t.lastName].filter(Boolean).join(" ") || t.name || "Teacher";
}

function teacherInitials(t: FollowedTeacher) {
  if (t.firstName && t.lastName) return (t.firstName[0] + t.lastName[0]).toUpperCase();
  if (t.firstName) return t.firstName.slice(0, 2).toUpperCase();
  return (t.name || "T").slice(0, 2).toUpperCase();
}

function fmtDate(iso: string) { return fmtDateShort(iso); }

function fmtCountdown(minsToStart: number): string {
  if (minsToStart < 60) return `Starts in ${minsToStart} min`;
  const hrs = Math.round(minsToStart / 60);
  if (hrs < 24) return `Starts in ${hrs} hr${hrs !== 1 ? "s" : ""}`;
  const days = Math.round(hrs / 24);
  return `Starts in ${days} day${days !== 1 ? "s" : ""}`;
}

const TERMINAL_SET = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"]);

function sessionStatus(s: PublicSessionData) {
  if (TERMINAL_SET.has(s.sessionStatus ?? "")) return "done";
  const now = Date.now();
  const startMs = new Date(s.scheduledAt).getTime();
  const endMs = startMs + s.duration * 60_000;
  if (now > endMs) return "done";
  if (now >= startMs) return "live";
  return "soon";
}

/* ─── sub-components ─────────────────────────────────────────────────── */
function SectionHeader({ title, linkHref, linkLabel }: { title: string; linkHref: string; linkLabel: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.1rem" }}>
      <div style={{ fontFamily: T.ffd, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", color: T.ink }}>
        {title}
        <div style={{ width: 32, height: 3, background: T.leaf, borderRadius: 2, marginTop: "0.35rem" }} />
      </div>
      <Link href={linkHref} style={{ fontSize: "0.8rem", fontWeight: 500, color: T.leaf, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
        {linkLabel} →
      </Link>
    </div>
  );
}

/* ─── student dashboard cache (90 s TTL) ─────────────────────────────── */
const STUD_CACHE_KEY = "oc_stud_cache";
const STUD_CACHE_TTL = 90_000;

function readStudCache(): StudentDashboardData | null {
  try {
    const raw = localStorage.getItem(STUD_CACHE_KEY);
    if (!raw) return null;
    const { ts, payload } = JSON.parse(raw);
    if (Date.now() - ts > STUD_CACHE_TTL) return null;
    return payload as StudentDashboardData;
  } catch { return null; }
}

function writeStudCache(d: StudentDashboardData) {
  try {
    localStorage.setItem(STUD_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload: d }));
  } catch { /* quota — ignore */ }
}

/* ─── page ───────────────────────────────────────────────────────────── */
export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingSessions, setRefreshingSessions] = useState(false);
  const [regSearch, setRegSearch] = useState("");
  const [regFilter, setRegFilter] = useState<"all" | "upcoming" | "past">("all");
  const [isMobile, setIsMobile] = useState(false);  // < 960 → no sidebar
  const [isNarrow, setIsNarrow] = useState(false);  // < 640 → 1-col cards

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 960);
      setIsNarrow(window.innerWidth < 640);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    localStorage.setItem("oc_default_role", "student");

    const cached = readStudCache();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    getStudentDashboard()
      .then(fresh => { setData(fresh); writeStudCache(fresh); })
      .catch(() => { if (!cached) router.replace("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  function refreshSessions() {
    setRefreshingSessions(true);
    getStudentDashboard()
      .then(fresh => { setData(fresh); writeStudCache(fresh); })
      .catch(() => {})
      .finally(() => setRefreshingSessions(false));
  }

  if (loading) return (
    <>
      <Header activeLink="dashboard" />
      <div style={{ paddingTop: 64, minHeight: "100vh", background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.ff, color: T.inkMuted }}>
        Loading…
      </div>
    </>
  );
  if (!data) return null;

  const { profile, stats, followedTeachers, upcomingSessions, registeredSessions } = data;
  const firstName = profile.firstName || shortName(profile) || "there";

  /* upcoming registered sessions in next 7 days */
  const nowMs = Date.now();
  const weekMs = nowMs + 7 * 24 * 3600_000;
  const thisWeek = registeredSessions.filter(s => {
    const t = new Date(s.scheduledAt).getTime();
    return t >= nowMs && t <= weekMs;
  }).length;

  /* registered sessions search + filter */
  const regQ = regSearch.toLowerCase().trim();
  const regMatchSearch = (s: typeof registeredSessions[0]) =>
    !regQ ||
    s.title.toLowerCase().includes(regQ) ||
    [s.user.firstName, s.user.lastName].filter(Boolean).join(" ").toLowerCase().includes(regQ);
  const regUpcoming = registeredSessions.filter(s => sessionStatus(s) !== "done" && regMatchSearch(s));
  const regPast     = registeredSessions.filter(s => sessionStatus(s) === "done"  && regMatchSearch(s));
  const regVisible  = regFilter === "upcoming" ? regUpcoming : regFilter === "past" ? regPast : [...regUpcoming, ...regPast];

  return (
    <>
      <Header activeLink="dashboard" userName={fullName(profile)} userInitials={initials(profile)} userRole="Student" />

      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff, color: T.ink }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1rem 1rem 2rem" : "1.75rem 2rem 3rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: "1.75rem", alignItems: "start" }}>

          <main style={{ minWidth: 0 }}>

            {/* ── Welcome banner ──────────────────────────────── */}
            <div style={{ background: T.ink, borderRadius: T.r, padding: isMobile ? "1.25rem" : "2rem 2.5rem", position: "relative", overflow: "hidden", marginBottom: "1.75rem" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: 280, height: 280, background: "rgba(29,107,60,0.18)", borderRadius: "50%", filter: "blur(50px)", right: -60, top: -60, pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: 180, height: 180, background: "rgba(26,79,122,0.12)", borderRadius: "50%", filter: "blur(50px)", left: "40%", bottom: -60, pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <h1 style={{ fontFamily: T.ffd, fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: T.white, letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
                  {greeting(firstName)} <em style={{ fontStyle: "italic", color: "#7ed9a4" }}></em>
                </h1>
                <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", maxWidth: 480 }}>
                  {thisWeek > 0
                    ? `You have ${thisWeek} registered webinar${thisWeek > 1 ? "s" : ""} coming up this week. Keep learning!`
                    : registeredSessions.length > 0
                      ? `You have ${registeredSessions.length} registered webinar${registeredSessions.length > 1 ? "s" : ""}. They'll appear in your schedule.`
                      : "Start your journey — browse free webinars and register to save your spot."}
                </p>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                  <Link href="/live" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, background: T.leaf, color: T.white, textDecoration: "none" }}>
                    Browse Webinars
                  </Link>
                  <Link href="/speakers" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none" }}>
                    Discover Speakers
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Stats row ───────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
              {[
                { icon: "📅", bg: T.skyLight,  label: "Registered",    value: registeredSessions.length, sub: `${thisWeek} this week` },
                { icon: "✅", bg: T.leafLight, label: "Completed",     value: 0,              sub: "total sessions" },
                { icon: "⏱",  bg: T.sunLight,  label: "Learning Hours", value: "0h",          sub: "across all sessions" },
                { icon: "🔥", bg: T.clayLight, label: "Following",     value: stats.following, sub: "speakers subscribed" },
              ].map(s => (
                <div key={s.label} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.9rem", transition: "box-shadow 0.2s, transform 0.2s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 4px 16px rgba(15,20,16,0.07)"; el.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>
                  <div style={{ width: 40, height: 40, borderRadius: T.rs, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>{s.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.72rem", color: T.inkMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</div>
                    <div style={{ fontFamily: T.ffd, fontSize: "1.5rem", fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>{s.value}</div>
                    <div style={{ fontSize: "0.7rem", color: T.inkMuted, marginTop: "0.1rem" }}>{s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── My Registered Sessions ──────────────────────── */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1.1rem" }}>
              <div style={{ fontFamily: T.ffd, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em", color: T.ink }}>
                My Registered Webinars
                <div style={{ width: 32, height: 3, background: T.leaf, borderRadius: 2, marginTop: "0.35rem" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button onClick={refreshSessions} disabled={refreshingSessions} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 500, color: refreshingSessions ? T.inkMuted : T.leaf, background: "none", border: "none", cursor: refreshingSessions ? "default" : "pointer", padding: 0, fontFamily: T.ff }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" style={{ animation: refreshingSessions ? "oc-spin 0.7s linear infinite" : "none" }}>
                    <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  {refreshingSessions ? "Refreshing…" : "Refresh"}
                </button>
                <Link href="/live" style={{ fontSize: "0.8rem", fontWeight: 500, color: T.leaf, textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  Find More Webinars →
                </Link>
              </div>
            </div>
            {registeredSessions.length === 0 ? (
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "2.5rem", textAlign: "center", marginBottom: "1.75rem" }}>
                <p style={{ fontFamily: T.ffd, fontSize: "1rem", color: T.inkSoft, marginBottom: "0.4rem" }}>No registered webinars yet.</p>
                <p style={{ fontSize: "0.85rem", color: T.inkMuted, marginBottom: "1rem" }}>
                  Browse free webinars and hit <strong>Register Free</strong> to save your spot here.
                </p>
                <Link href="/live" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, background: T.leaf, color: T.white, textDecoration: "none" }}>
                  Browse Webinars
                </Link>
              </div>
            ) : (
              <>
              {/* Search + filter bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" as const }}>
                <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: "0.5rem", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.42rem 0.9rem" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.inkMuted} strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  <input value={regSearch} onChange={e => setRegSearch(e.target.value)} placeholder="Search by title or speaker…" style={{ border: "none", outline: "none", background: "transparent", fontFamily: T.ff, fontSize: "0.82rem", color: T.ink, width: "100%" }} />
                  {regSearch && <button onClick={() => setRegSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, fontSize: "0.9rem", lineHeight: 1, padding: 0 }}>✕</button>}
                </div>
                <div style={{ display: "flex", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 100, padding: "0.2rem" }}>
                  {(["all", "upcoming", "past"] as const).map(f => (
                    <button key={f} onClick={() => setRegFilter(f)} style={{ padding: "0.3rem 0.85rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: regFilter === f ? 600 : 500, border: "none", cursor: "pointer", background: regFilter === f ? T.white : "transparent", color: regFilter === f ? T.ink : T.inkMuted, boxShadow: regFilter === f ? "0 1px 4px rgba(15,20,16,0.1)" : "none", transition: "all 0.15s" }}>
                      {f === "all" ? `All (${registeredSessions.length})` : f === "upcoming" ? `Upcoming (${regUpcoming.length})` : `Past (${regPast.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {regVisible.length === 0 ? (
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "2rem", textAlign: "center", marginBottom: "1.75rem", color: T.inkMuted, fontSize: "0.85rem" }}>
                  No sessions match your search.
                </div>
              ) : (
              <div style={{ marginBottom: "1.75rem" }}>
                {regUpcoming.length > 0 && (regFilter === "all" || regFilter === "upcoming") && (
                  <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: regFilter === "all" && regPast.length > 0 ? "1.5rem" : 0 }}>
                    {regUpcoming.map(s => {
                  const status = sessionStatus(s);
                  const isLive = status === "live";
                  const startMs = new Date(s.scheduledAt).getTime();
                  const minsToStart = Math.round((startMs - Date.now()) / 60_000);
                  const startingSoon = status === "soon" && minsToStart <= 30;
                  const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
                  const typeBg = s.type === "webinar" ? T.leafLight : T.skyLight;
                  const typeColor = s.type === "webinar" ? T.leaf : T.sky;
                  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
                  const teacherLvl = computeExpertiseLevel(s.user.sessionCount ?? 0, s.user.reviewCount ?? 0, s.user.avgRating ?? null);
                  const registered = s._count?.registrations ?? 0;
                  const limit = s.audienceLimit;
                  const pct = limit ? Math.min(100, Math.round((registered / limit) * 100)) : 0;
                  const isFull = !!limit && registered >= limit;
                  const isWarm = !!limit && pct >= 80;
                  const barColor = isFull ? "#c0392b" : isWarm ? T.sun : T.leaf;
                  return (
                    <div key={s.id} onClick={() => router.push(`/session/${s.id}`)} style={{ background: T.white, border: `1px solid ${isLive ? T.leaf : T.border}`, borderRadius: T.r, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem", transition: "box-shadow 0.2s, transform 0.2s", cursor: "pointer" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "0 4px 20px rgba(15,20,16,0.08)"; el.style.transform = "translateY(-2px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>

                      {/* Top row: type badge + live/soon indicator */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.2rem 0.65rem", borderRadius: 100, background: typeBg, color: typeColor }}>
                          {typeLabel}
                        </span>
                        {isLive && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", animation: "pulse-dot 2s infinite" }} />
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#ef4444" }}>Live Now</span>
                          </div>
                        )}
                        {startingSoon && !isLive && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: T.sun, background: T.sunLight, padding: "0.18rem 0.55rem", borderRadius: 100 }}>
                            ⏱ {minsToStart} min
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{s.title}</div>

                      {/* Teacher row: avatar + name + badge + rating */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(s.user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                          {s.user.avatarUrl
                            ? <img src={`${API}${s.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : ([s.user.firstName, s.user.lastName].filter(Boolean).map(n => n![0]).join("").toUpperCase() || "T")
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: T.ink }}>
                              {[s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.name || "Teacher"}
                            </span>
                            {s.user.avgRating && (
                              <span style={{ fontSize: "0.7rem", color: T.sun, fontWeight: 600 }}>★ {s.user.avgRating}</span>
                            )}
                          </div>
                          <div style={{ marginTop: "0.2rem" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: teacherLvl.bg, color: teacherLvl.color, fontSize: "0.58rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 100 }}>
                              {teacherLvl.icon} {teacherLvl.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Registration progress bar */}
                      {limit ? (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: T.inkMuted, marginBottom: "0.3rem" }}>
                            <span>{registered} registered</span>
                            <span style={{ fontWeight: 600, color: isFull ? "#c0392b" : isWarm ? T.sun : T.inkMuted }}>
                              {isFull ? "Full" : `${limit - registered} seats left`}
                            </span>
                          </div>
                          <div style={{ height: 5, borderRadius: 100, background: T.border, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 100, transition: "width 0.4s" }} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.68rem", color: T.inkMuted }}>{registered} registered · Open enrollment</div>
                      )}

                      {/* Date/time */}
                      <div style={{ fontSize: "0.75rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {fmtDate(s.scheduledAt)} · {fmtTime(s.scheduledAt)}
                      </div>

                      {/* CTA */}
                      {status !== "done" && (
                        <div style={{ marginTop: "auto" }}>
                          {/* Countdown label shown only in the 30-min window */}
                          {startingSoon && (
                            <div style={{ fontSize: "0.7rem", fontWeight: 600, textAlign: "center", marginBottom: "0.4rem", color: T.sun }}>
                              ⏱ Starts in {minsToStart} min
                            </div>
                          )}
                          {/* Button: active when live or within 30-min window */}
                          <button
                            disabled={!isLive && !startingSoon}
                            onClick={() => (isLive || startingSoon) && router.push(`/join/${s.id}`)}
                            style={{
                              width: "100%", padding: "0.55rem 1.1rem", borderRadius: T.rs,
                              fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600,
                              cursor: (isLive || startingSoon) ? "pointer" : "not-allowed",
                              border: "none",
                              background: isLive ? T.leaf : startingSoon ? T.sun : T.leafLight,
                              color: (isLive || startingSoon) ? T.white : T.leaf,
                              opacity: (isLive || startingSoon) ? 1 : 0.8,
                              transition: "all 0.2s",
                            }}>
                            ▶ Join Now
                          </button>
                          {/* Hint shown only when more than 30 mins away */}
                          {!isLive && !startingSoon && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", marginTop: "0.45rem" }}>
                              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: T.inkMuted, flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              <span style={{ fontSize: "0.68rem", color: T.inkMuted, fontStyle: "italic" }}>
                                Activates 30 min before · {fmtCountdown(minsToStart)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {regPast.length > 0 && (regFilter === "all" || regFilter === "past") && (
              <>
                {regFilter === "all" && regUpcoming.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.5rem 0 1rem" }}>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>Past Sessions ({regPast.length})</span>
                    <div style={{ flex: 1, height: 1, background: T.border }} />
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                  {regPast.map(s => {
                    const API = process.env.NEXT_PUBLIC_API_URL ?? "";
                    const teacherLvl = computeExpertiseLevel(s.user.sessionCount ?? 0, s.user.reviewCount ?? 0, s.user.avgRating ?? null);
                    const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
                    return (
                      <div key={s.id} onClick={() => router.push(`/session/${s.id}`)} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem", opacity: 0.72, cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" as const, padding: "0.2rem 0.65rem", borderRadius: 100, background: T.border, color: T.inkMuted }}>{typeLabel}</span>
                          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: T.inkMuted, background: T.cream, border: `1px solid ${T.border}`, padding: "0.18rem 0.55rem", borderRadius: 100 }}>✓ Session Ended</span>
                        </div>
                        <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.inkSoft, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{s.title}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(s.user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                            {s.user.avatarUrl
                              ? <img src={`${API}${s.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : ([s.user.firstName, s.user.lastName].filter(Boolean).map(n => n![0]).join("").toUpperCase() || "T")
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" as const }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: T.inkSoft }}>{[s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.name || "Teacher"}</span>
                              {s.user.avgRating && <span style={{ fontSize: "0.7rem", color: T.sun, fontWeight: 600 }}>★ {s.user.avgRating}</span>}
                            </div>
                            <div style={{ marginTop: "0.2rem" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: teacherLvl.bg, color: teacherLvl.color, fontSize: "0.58rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 100 }}>{teacherLvl.icon} {teacherLvl.label}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          Ended: {fmtDate(s.scheduledAt)} · {fmtTime(s.scheduledAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
              </div>
              )}
              </>
            )}
            <style>{`@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes oc-spin{to{transform:rotate(360deg)}}`}</style>

            {/* ── Speakers You Follow ─────────────────────────── */}
            <SectionHeader title="Speakers You Follow" linkHref="/teachers" linkLabel="Browse All" />
            {followedTeachers.length === 0 ? (
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "2rem", textAlign: "center", marginBottom: "1.75rem" }}>
                <p style={{ fontFamily: T.ffd, fontSize: "1rem", color: T.inkSoft, marginBottom: "0.4rem" }}>You haven't followed any speakers yet.</p>
                <Link href="/speakers" style={{ fontSize: "0.875rem", color: T.leaf, fontWeight: 600, textDecoration: "none" }}>Browse Speakers →</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
                {followedTeachers.map(t => {
                  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
                  const tSlug = makeProfileSlug({ id: t.id, firstName: t.firstName ?? undefined, lastName: t.lastName ?? undefined });
                  const tLvl = computeExpertiseLevel(t.liveCount + t.webinarCount, t.reviewCount, t.avgRating);
                  return (
                    <Link key={t.id} href={`/u/${tSlug}`} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.9rem", textDecoration: "none", transition: "box-shadow 0.2s, transform 0.2s" }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = "0 4px 16px rgba(15,20,16,0.07)"; el.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = "none"; el.style.transform = "translateY(0)"; }}>
                      <div style={{ width: 46, height: 46, borderRadius: "50%", background: avatarBg(t.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                        {t.avatarUrl
                          ? <img src={`${API}${t.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : teacherInitials(t)
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: T.ink }}>{teacherDisplayName(t)}</div>
                        <div style={{ marginTop: "0.2rem" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: tLvl.bg, color: tLvl.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 100 }}>
                            {tLvl.icon} {tLvl.label}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.85rem", marginTop: "0.45rem", flexWrap: "wrap" as const }}>
                          {t.avgRating && <span style={{ fontSize: "0.72rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.25rem" }}>★ <strong style={{ color: T.ink }}>{t.avgRating}</strong></span>}
                          <span style={{ fontSize: "0.72rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.25rem" }}>📅 <strong style={{ color: T.ink }}>{t.liveCount}</strong> Live</span>
                          <span style={{ fontSize: "0.72rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.25rem" }}>🎤 <strong style={{ color: T.ink }}>{t.webinarCount}</strong> Webinars</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ── Learning History ────────────────────────────── */}
            <SectionHeader title="Learning History" linkHref="/live" linkLabel="View All" />
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "2rem", textAlign: "center", marginBottom: "1.75rem" }}>
              <p style={{ fontFamily: T.ffd, fontSize: "1rem", color: T.inkSoft, marginBottom: "0.4rem" }}>Your learning history will appear here.</p>
              <p style={{ fontSize: "0.82rem", color: T.inkMuted }}>Session registration and attendance tracking coming soon.</p>
            </div>

          </main>

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Promo card */}
            <div style={{ background: T.ink, borderRadius: T.r, padding: "1.5rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
              <div style={{ position: "absolute", width: 160, height: 160, background: "rgba(29,107,60,0.2)", borderRadius: "50%", filter: "blur(40px)", right: -40, top: -40, pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>⚡</div>
                <div style={{ fontFamily: T.ffd, fontSize: "1.05rem", fontWeight: 700, color: T.white, marginBottom: "0.5rem" }}>Keep Growing</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.55, marginBottom: "1.1rem" }}>
                  {stats.following > 0
                    ? `You follow ${stats.following} speaker${stats.following > 1 ? "s" : ""}. Check out their upcoming webinars and keep learning.`
                    : "Discover expert speakers across maths, science, engineering, languages and more — all free webinars."}
                </div>
                <Link href="/speakers" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.1rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, background: T.leaf, color: T.white, textDecoration: "none" }}>
                  {stats.following > 0 ? "Browse Webinars →" : "Find Speakers →"}
                </Link>
              </div>
            </div>

            {/* Recommended sessions */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>
                {followedTeachers.length > 0 ? "From Speakers You Follow" : "Recommended for You"}
              </div>
              {upcomingSessions.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: T.inkMuted, textAlign: "center", padding: "0.75rem 0" }}>
                  {stats.following > 0 ? "No upcoming webinars yet." : "Follow speakers to see their webinars here."}
                </p>
              ) : upcomingSessions.slice(0, 4).map((s, i) => (
                <div key={s.id} onClick={() => window.open(`/session/${s.id}`, "_blank")} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0", borderBottom: i < Math.min(upcomingSessions.length, 4) - 1 ? `1px solid ${T.border}` : "none", cursor: "pointer" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarBg(s.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>
                    {s.category === "Mathematics" ? "📐" : s.category === "Engineering" ? "💻" : s.category === "Science" ? "🔬" : "🎓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                      {[s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.name} · {s.skillLevel && <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: 100, background: s.skillLevel === "Advanced" ? T.clayLight : s.skillLevel === "Intermediate" ? T.skyLight : T.leafLight, color: s.skillLevel === "Advanced" ? T.clay : s.skillLevel === "Intermediate" ? T.sky : T.leaf }}>{s.skillLevel}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming schedule */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Upcoming Schedule</div>
              {registeredSessions.filter(s => new Date(s.scheduledAt).getTime() >= nowMs).length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: T.inkMuted, textAlign: "center", padding: "0.75rem 0" }}>No upcoming sessions yet.</p>
              ) : registeredSessions.filter(s => new Date(s.scheduledAt).getTime() >= nowMs).slice(0, 4).map((s, i) => {
                const d = new Date(s.scheduledAt);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0", borderBottom: i < Math.min(upcomingSessions.length, 4) - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ width: 38, height: 42, borderRadius: 9, background: T.cream, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.leaf, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ fontSize: "0.58rem", textTransform: "uppercase", color: T.inkMuted, letterSpacing: "0.04em" }}>{d.toLocaleString("default", { month: "short" })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                      <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                        {fmtTime(s.scheduledAt)} · {s.type === "webinar" ? "Webinar" : "Live Class"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
}
