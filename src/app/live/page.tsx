"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { getPublicSessions, PublicSessionData, getMyRegistrationIds, toggleRegistration } from "@/lib/session";
import { computeExpertiseLevel } from "@/lib/profile";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
function resolveUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API}${path}`;
}

/* ─── status logic ───────────────────────────────────────────────────── */
type Status = "live" | "upcoming" | "closed";

function sessionStatus(s: PublicSessionData): Status {
  const nowMs = Date.now();
  const startMs = new Date(s.scheduledAt).getTime();
  const endMs = startMs + s.duration * 60 * 1000;
  if (nowMs > endMs) return "closed";
  if (nowMs >= startMs) return "live";
  return "upcoming";
}

/* ─── formatting ─────────────────────────────────────────────────────── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) + " IST";
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtEndTime(s: PublicSessionData) {
  const endMs = new Date(s.scheduledAt).getTime() + s.duration * 60 * 1000;
  return fmtTime(new Date(endMs).toISOString());
}

function teacherName(u: PublicSessionData["user"]) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "Unknown";
}

function teacherInitials(u: PublicSessionData["user"]) {
  if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
  if (u.firstName) return u.firstName.slice(0, 2).toUpperCase();
  return (u.name || "U").slice(0, 2).toUpperCase();
}

/* ─── colour maps ────────────────────────────────────────────────────── */
const AVATAR_COLORS = ["#1d6b3c", "#1a4f7a", "#c45b2a", "#7c3aed", "#0e6370", "#9b2c4e", "#854d0e", "#b91c1c"];
const avatarBg = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const CATEGORY_BG: Record<string, string> = {
  "Mathematics": "#1a2f1e", "Engineering": "#1a2535", "Science": "#1e2f2a",
  "Finance & Investing": "#1a1a2e", "Humanities": "#2f1e10", "Languages": "#2a1020",
  "Arts & Design": "#200a2a", "History": "#1a0a2e", "default": "#1a2535",
};
const CATEGORY_EMOJI: Record<string, string> = {
  "Mathematics": "📐", "Engineering": "💻", "Science": "🔬",
  "Finance & Investing": "📊", "Humanities": "📚", "Languages": "✍️",
  "Arts & Design": "🎨", "History": "🏛️", "default": "🎓",
};

function cardBg(s: PublicSessionData) { return s.bannerColor || CATEGORY_BG[s.category || ""] || CATEGORY_BG.default; }
function cardEmoji(s: PublicSessionData) { return CATEGORY_EMOJI[s.category || ""] || CATEGORY_EMOJI.default; }

/* ─── time filter options ────────────────────────────────────────────── */
const TIME_OPTIONS = [
  { key: "today",   label: "🗓️ Today" },
  { key: "next-1m", label: "⏩ Coming 1 month" },
  { key: "next-3m", label: "⏩ Coming 3 months" },
  { key: "last-1m", label: "⏪ Last 1 month" },
  { key: "last-3m", label: "⏪ Last 3 months" },
  { key: "all",     label: "📋 All time" },
];

function timeLabelFor(key: string) {
  return TIME_OPTIONS.find(o => o.key === key)?.label ?? key;
}

/* ─── filter option components ───────────────────────────────────────── */
function FilterOpt({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.45rem 0.6rem", borderRadius: 8, cursor: "pointer", background: active ? "#d4ead9" : "transparent", transition: "background 0.15s", userSelect: "none" }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${active ? "#1d6b3c" : "#e2ded6"}`, background: active ? "#1d6b3c" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {active && <svg width="10" height="10" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" /></svg>}
      </div>
      <span style={{ fontSize: "0.85rem", color: active ? "#1d6b3c" : "#3a4140", flex: 1, fontWeight: active ? 500 : 400 }}>{label}</span>
      {count !== undefined && (
        <span style={{ fontSize: "0.72rem", color: active ? "#1d6b3c" : "#6b7a72", background: active ? "rgba(29,107,60,0.15)" : "#faf7f2", borderRadius: 100, padding: "0.1rem 0.45rem" }}>{count}</span>
      )}
    </div>
  );
}

function RadioOpt({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.45rem 0.6rem", borderRadius: 8, cursor: "pointer", background: active ? "#d4ead9" : "transparent", transition: "background 0.15s", userSelect: "none" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", border: `1.5px solid ${active ? "#1d6b3c" : "#e2ded6"}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1d6b3c" }} />}
      </div>
      <span style={{ fontSize: "0.85rem", color: active ? "#1d6b3c" : "#3a4140", fontWeight: active ? 500 : 400 }}>{label}</span>
    </div>
  );
}

/* ─── session card ───────────────────────────────────────────────────── */
function SessionCard({ s, isRegistered, registerLoading, onRegisterToggle }: {
  s: PublicSessionData;
  isRegistered: boolean;
  registerLoading: boolean;
  onRegisterToggle: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [regBtnHovered, setRegBtnHovered] = useState(false);
  const status = sessionStatus(s);
  const level = s.skillLevel || "";
  const isWebinar = s.type === "webinar";

  const levelBg = level === "Beginner" ? "rgba(29,107,60,0.88)"
    : level === "Intermediate" ? "rgba(107,58,122,0.88)"
    : level === "Advanced" ? "rgba(196,91,42,0.88)"
    : "rgba(100,100,100,0.88)";

  let timingText = "";
  if (status === "live") timingText = `Ends ${fmtEndTime(s)}`;
  else if (status === "upcoming") timingText = `${fmtDate(s.scheduledAt)} · ${fmtTime(s.scheduledAt)}`;

  return (
    <a
      href={`/session/${s.id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", opacity: status === "closed" ? 0.72 : 1, transition: "box-shadow 0.2s, transform 0.2s", height: "100%" }}
        onMouseEnter={e => {
          setIsHovered(true);
          if (status !== "closed") {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(15,20,16,0.09)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          }
        }}
        onMouseLeave={e => {
          setIsHovered(false);
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Banner */}
        <div style={{ height: 140, position: "relative", overflow: "hidden" }}>
          {resolveUrl(s.bannerUrl) ? (
            <img src={resolveUrl(s.bannerUrl)!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: cardBg(s), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.8rem" }}>
              {cardEmoji(s)}
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(15,20,16,0.55) 100%)" }} />

          {/* Top badges */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {/* E) Type badge — always shown */}
            <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.03em", padding: "0.2rem 0.6rem", borderRadius: 100, backdropFilter: "blur(8px)", background: isWebinar ? "rgba(26,79,122,0.9)" : "rgba(29,107,60,0.9)", color: "#fff" }}>
              {isWebinar ? "🔵 Webinar" : "🟢 Live Session"}
            </span>
            {/* Status badge — only when live now */}
            {status === "live" && (
              <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.03em", padding: "0.2rem 0.6rem", borderRadius: 100, backdropFilter: "blur(8px)", background: "rgba(220,38,38,0.9)", color: "#fff" }}>
                🔴 Live Now
              </span>
            )}
            {level && (
              <span style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.03em", padding: "0.2rem 0.6rem", borderRadius: 100, backdropFilter: "blur(8px)", background: levelBg, color: "#fff" }}>
                {level}
              </span>
            )}
          </div>

          {timingText && (
            <div style={{ position: "absolute", bottom: 8, right: 10 }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>⏱ {timingText}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", fontFamily: "'DM Sans', sans-serif" }}>
          {s.category && <div style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#6b7a72" }}>{s.category}</div>}

          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "0.98rem", fontWeight: 700, color: "#0f1410", lineHeight: 1.3 }}>
            {s.title}
          </div>

          {/* C) Description: shows 2 lines normally, full text on hover */}
          {s.description && (
            <div
              style={isHovered
                ? { fontSize: "0.8rem", color: "#6b7a72", lineHeight: 1.55 }
                : { fontSize: "0.8rem", color: "#6b7a72", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties
              }
            >
              {s.description}
            </div>
          )}

          {/* Teacher row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid #e2ded6", marginTop: "0.25rem" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(s.user.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>
              {teacherInitials(s.user)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "#0f1410", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                {teacherName(s.user)}
                {(() => {
                  const lvl = computeExpertiseLevel(s.user.sessionCount ?? 0, s.user.reviewCount ?? 0, s.user.avgRating ?? null);
                  return (
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: lvl.color, background: lvl.bg, padding: "0.1rem 0.45rem", borderRadius: 100, whiteSpace: "nowrap" }}>
                      {lvl.icon} {lvl.label}
                    </span>
                  );
                })()}
              </div>
              {s.user.title && <div style={{ fontSize: "0.72rem", color: "#6b7a72" }}>{s.user.title}</div>}
            </div>
          </div>

          {/* Timing row */}
          <div style={{ fontSize: "0.78rem", color: "#6b7a72", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            📅 {fmtDate(s.scheduledAt)} &nbsp;·&nbsp; {fmtTime(s.scheduledAt)} → {fmtEndTime(s)}
            {s.audienceLimit && <span style={{ marginLeft: "auto" }}>👥 {s.audienceLimit.toLocaleString()} seats</span>}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ padding: "0.75rem 1.1rem", borderTop: "1px solid #e2ded6" }}>
          {status === "closed" ? (
            <button disabled onClick={e => e.preventDefault()} style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "1px solid #e2ded6", background: "#faf7f2", color: "#6b7a72", fontSize: "0.875rem", fontWeight: 600, cursor: "default", fontFamily: "'DM Sans', sans-serif" }}>
              🔒 Session Closed
            </button>
          ) : status === "live" ? (
            <button onClick={e => e.preventDefault()} style={{ width: "100%", padding: "0.65rem", borderRadius: 8, border: "none", background: "#1d6b3c", color: "#fff", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              ▶ Join Now — Free
            </button>
          ) : (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onRegisterToggle(); }}
              disabled={registerLoading}
              onMouseEnter={() => setRegBtnHovered(true)}
              onMouseLeave={() => setRegBtnHovered(false)}
              style={{
                width: "100%", padding: isRegistered ? "0.65rem" : "0.72rem 1rem",
                borderRadius: isRegistered ? 8 : 100,
                border: isRegistered ? "1.5px solid #1d6b3c" : "none",
                background: isRegistered ? "#fff" : regBtnHovered
                  ? "linear-gradient(135deg, #196035 0%, #25a047 100%)"
                  : "linear-gradient(135deg, #1d6b3c 0%, #2ea84d 100%)",
                color: isRegistered ? "#1d6b3c" : "#fff",
                fontSize: "0.875rem", fontWeight: 600,
                cursor: registerLoading ? "default" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                transition: "all 0.18s",
                boxShadow: isRegistered ? "none" : regBtnHovered
                  ? "0 6px 20px rgba(29,107,60,0.38)"
                  : "0 3px 10px rgba(29,107,60,0.22)",
                transform: (!isRegistered && regBtnHovered) ? "translateY(-1px)" : "translateY(0)",
              }}
            >
              {registerLoading
                ? <><span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Updating…</>
                : isRegistered
                  ? <>✓ Registered</>
                  : <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                      Reserve Spot
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", background: "rgba(255,255,255,0.22)", padding: "0.15rem 0.45rem", borderRadius: 100 }}>FREE</span>
                    </>}
            </button>
          )}
        </div>
      </div>
    </a>
  );
}

/* ─── page ───────────────────────────────────────────────────────────── */
type SortKey = "time-asc" | "time-desc" | "title-asc";

export default function LivePage() {
  const router = useRouter();
  const [allSessions, setAllSessions] = useState<PublicSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selLevels, setSelLevels] = useState<string[]>([]);
  const [selCategories, setSelCategories] = useState<string[]>([]);
  const [selType, setSelType] = useState<string | null>(null);
  const [selStatus, setSelStatus] = useState<Status | null>(null);
  const [selTime, setSelTime] = useState<string>("next-3m");
  const [sortKey, setSortKey] = useState<SortKey>("time-asc");
  const [tick, setTick] = useState(0);
  const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());
  const [registerLoadingId, setRegisterLoadingId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true, level: true, time: true, type: false, status: false,
  });
  const toggleSection = (k: string) => setOpenSections(p => ({ ...p, [k]: !p[k] }));

  useEffect(() => {
    getPublicSessions()
      .then(setAllSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
    // load existing registrations if logged in
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      getMyRegistrationIds()
        .then(ids => setRegisteredIds(new Set(ids)))
        .catch(() => {});
    }
  }, []);

  async function handleRegisterToggle(sessionId: number) {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    setRegisterLoadingId(sessionId);
    try {
      const result = await toggleRegistration(sessionId);
      setRegisteredIds(prev => {
        const next = new Set(prev);
        if (result.registered) next.add(sessionId); else next.delete(sessionId);
        return next;
      });
    } catch { /* ignore */ }
    finally { setRegisterLoadingId(null); }
  }

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const liveCount = useMemo(() => allSessions.filter(s => sessionStatus(s) === "live").length, [allSessions, tick]);

  const categories = useMemo(() => [...new Set(allSessions.map(s => s.category).filter(Boolean) as string[])].sort(), [allSessions]);

  const levelCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allSessions.forEach(s => { if (s.skillLevel) m[s.skillLevel] = (m[s.skillLevel] || 0) + 1; });
    return m;
  }, [allSessions]);

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allSessions.forEach(s => { if (s.category) m[s.category] = (m[s.category] || 0) + 1; });
    return m;
  }, [allSessions]);

  const filtered = useMemo(() => {
    let data = [...allSessions];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        teacherName(s.user).toLowerCase().includes(q)
      );
    }

    if (selLevels.length) data = data.filter(s => selLevels.includes(s.skillLevel || ""));
    if (selCategories.length) data = data.filter(s => selCategories.includes(s.category || ""));
    // F) Fixed: type value is "liveclass" not "live"
    if (selType) data = data.filter(s => s.type === selType);
    if (selStatus) data = data.filter(s => sessionStatus(s) === selStatus);

    // D) Time range filter
    const now = Date.now();
    if (selTime === "today") {
      const todayStr = new Date().toDateString();
      data = data.filter(s => new Date(s.scheduledAt).toDateString() === todayStr);
    } else if (selTime === "last-1m") {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      data = data.filter(s => { const t = new Date(s.scheduledAt).getTime(); return t >= cutoff && t <= now; });
    } else if (selTime === "last-3m") {
      const cutoff = now - 90 * 24 * 60 * 60 * 1000;
      data = data.filter(s => { const t = new Date(s.scheduledAt).getTime(); return t >= cutoff && t <= now; });
    } else if (selTime === "next-1m") {
      const cutoff = now + 30 * 24 * 60 * 60 * 1000;
      data = data.filter(s => { const t = new Date(s.scheduledAt).getTime(); return t >= now && t <= cutoff; });
    } else if (selTime === "next-3m") {
      const cutoff = now + 90 * 24 * 60 * 60 * 1000;
      data = data.filter(s => { const t = new Date(s.scheduledAt).getTime(); return t >= now && t <= cutoff; });
    }
    // "all" — no time filter applied

    return data.sort((a, b) => {
      if (sortKey === "time-asc") return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      if (sortKey === "time-desc") return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      return a.title.localeCompare(b.title);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions, search, selLevels, selCategories, selType, selStatus, selTime, sortKey, tick]);

  const hasFilters = selLevels.length + selCategories.length > 0 || !!selType || !!selStatus || selTime !== "next-3m";
  const clearAll = () => { setSelLevels([]); setSelCategories([]); setSelType(null); setSelStatus(null); setSelTime("next-3m"); };

  const toggleLevel = (v: string) => setSelLevels(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  const toggleCat = (v: string) => setSelCategories(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "time-asc", label: "⏱ Time ↑" },
    { key: "time-desc", label: "⏱ Time ↓" },
    { key: "title-asc", label: "🔤 Title A–Z" },
  ];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Header activeLink="live" />

      <div style={{ paddingTop: isMobile ? 57 : 64, fontFamily: "'DM Sans', sans-serif", background: "#faf7f2", minHeight: "100vh", color: "#0f1410" }}>

        {/* Page header */}
        <div style={{ background: "#0f1410", padding: isMobile ? "1.5rem 1.25rem" : "2.5rem 2rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textDecoration: "none" }}>Home</Link>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>›</span>
                <span style={{ color: "#7ed9a4", fontSize: "0.8rem", fontWeight: 600 }}>Webinars</span>
              </div>
              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Free <em style={{ color: "#7ed9a4", fontStyle: "italic" }}>Webinars</em>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", marginTop: "0.35rem", maxWidth: 560 }}>
                Live, interactive webinars from expert hosts across Mathematics, Science, Finance, Technology, Languages, and more.
              </p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: "0.8rem", fontWeight: 500, padding: "0.4rem 0.9rem", borderRadius: 100, alignSelf: "flex-start" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
              {loading ? "…" : `${liveCount} session${liveCount !== 1 ? "s" : ""} live right now`}
            </div>
          </div>
        </div>

        <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}} @keyframes oc-spin{to{transform:rotate(360deg)}}`}</style>

        {/* Body */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1rem" : "1.75rem 1.5rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "268px 1fr", gap: "1.75rem", alignItems: "start" }}>

          {/* Sidebar */}
          <aside style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 14, padding: "1.25rem", position: isMobile ? "static" : "sticky", top: 80, maxHeight: isMobile ? "none" : "calc(100vh - 96px)", overflowY: isMobile ? "visible" : "auto", display: isMobile && !filtersOpen ? "none" : undefined }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7a72", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Filters
              {hasFilters && (
                <button onClick={clearAll} style={{ fontSize: "0.72rem", fontWeight: 500, color: "#1d6b3c", cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  Clear all
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                {selCategories.map(v => <span key={v} onClick={() => toggleCat(v)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>{v} ✕</span>)}
                {selLevels.map(v => <span key={v} onClick={() => toggleLevel(v)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>{v} ✕</span>)}
                {selType && <span onClick={() => setSelType(null)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>{selType === "webinar" ? "Webinar" : "Live Session"} ✕</span>}
                {selStatus && <span onClick={() => setSelStatus(null)} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>{selStatus} ✕</span>}
                {selTime !== "next-3m" && <span onClick={() => setSelTime("next-3m")} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>{timeLabelFor(selTime)} ✕</span>}
              </div>
            )}

            {/* Collapsible filter sections */}
            {([
              {
                key: "category",
                label: "Category",
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
                active: selCategories.length > 0,
                content: (
                  <>
                    {categories.map(cat => <FilterOpt key={cat} label={cat} count={catCounts[cat] || 0} active={selCategories.includes(cat)} onClick={() => toggleCat(cat)} />)}
                    {categories.length === 0 && !loading && <div style={{ fontSize: "0.78rem", color: "#a0a89a", padding: "0.2rem 0.5rem" }}>No categories yet</div>}
                  </>
                ),
              },
              {
                key: "level",
                label: "Skill Level",
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
                active: selLevels.length > 0,
                content: ["Beginner", "Intermediate", "Advanced", "All Levels"].map(lv =>
                  <FilterOpt key={lv} label={lv} count={levelCounts[lv] || 0} active={selLevels.includes(lv)} onClick={() => toggleLevel(lv)} />
                ),
              },
              {
                key: "time",
                label: "Time Range",
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                active: selTime !== "next-3m",
                content: TIME_OPTIONS.map(opt => <RadioOpt key={opt.key} label={opt.label} active={selTime === opt.key} onClick={() => setSelTime(opt.key)} />),
              },
              {
                key: "type",
                label: "Session Type",
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
                active: !!selType,
                content: (
                  <>
                    <RadioOpt label="Live Session" active={selType === "liveclass"} onClick={() => setSelType(selType === "liveclass" ? null : "liveclass")} />
                    <RadioOpt label="Webinar" active={selType === "webinar"} onClick={() => setSelType(selType === "webinar" ? null : "webinar")} />
                  </>
                ),
              },
              {
                key: "status",
                label: "Status",
                icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                active: !!selStatus,
                content: (
                  <>
                    <RadioOpt label="🔴 Live Now" active={selStatus === "live"} onClick={() => setSelStatus(selStatus === "live" ? null : "live")} />
                    <RadioOpt label="🟡 Upcoming" active={selStatus === "upcoming"} onClick={() => setSelStatus(selStatus === "upcoming" ? null : "upcoming")} />
                    <RadioOpt label="⬛ Closed" active={selStatus === "closed"} onClick={() => setSelStatus(selStatus === "closed" ? null : "closed")} />
                  </>
                ),
              },
            ] as const).map(({ key, label, icon, active, content }, i, arr) => (
              <div key={key}>
                {/* Section header — clickable toggle */}
                <button
                  onClick={() => toggleSection(key)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "0.55rem 0", cursor: "pointer", marginBottom: openSections[key] ? "0.55rem" : 0 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ color: active ? "#1d6b3c" : "#6b7a72", display: "flex" }}>{icon}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: active ? "#1d6b3c" : "#0f1410", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1d6b3c", flexShrink: 0 }} />}
                  </div>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0a89a" strokeWidth="2.5" strokeLinecap="round" style={{ transform: openSections[key] ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Section body */}
                {openSections[key] && (
                  <div style={{ paddingBottom: "0.35rem" }}>
                    {content}
                  </div>
                )}

                {/* Divider between sections */}
                {i < arr.length - 1 && (
                  <div style={{ height: 1, background: "#f0ede8", margin: openSections[key] ? "0.75rem 0" : "0.35rem 0" }} />
                )}
              </div>
            ))}
          </aside>

          {/* Main */}
          <main style={{ minWidth: 0 }}>
            {/* Mobile filter toggle */}
            {isMobile && (
              <button
                onClick={() => setFiltersOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.65rem 1rem", borderRadius: 10, border: `1.5px solid ${filtersOpen ? "#1d6b3c" : "#e2ded6"}`, background: filtersOpen ? "#d4ead9" : "#fff", color: filtersOpen ? "#1d6b3c" : "#3a4140", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", marginBottom: "0.75rem" }}
              >
                <span>🔽 Filters{hasFilters ? " •" : ""}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{filtersOpen ? "Hide ▲" : "Show ▼"}</span>
              </button>
            )}
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 100, padding: "0.55rem 1rem", marginBottom: "1rem" }}
              onFocus={e => { e.currentTarget.style.borderColor = "#1d6b3c"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,107,60,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2ded6"; e.currentTarget.style.boxShadow = "none"; }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b7a72" strokeWidth={2.2} style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search webinars, speakers, or subjects…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "#0f1410", width: "100%" }} />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7a72", padding: 0, display: "flex", alignItems: "center" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>

            {/* Topbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7a72" }}>
                <strong style={{ color: "#0f1410", fontWeight: 600 }}>{filtered.length}</strong> session{filtered.length !== 1 ? "s" : ""} found
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", color: "#6b7a72" }}>Sort by:</span>
                {sortOptions.map(s => (
                  <button key={s.key} onClick={() => setSortKey(s.key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.85rem", borderRadius: 100, border: `1.5px solid ${sortKey === s.key ? "#1d6b3c" : "#e2ded6"}`, fontSize: "0.8rem", fontWeight: 500, whiteSpace: "nowrap", color: sortKey === s.key ? "#fff" : "#3a4140", background: sortKey === s.key ? "#1d6b3c" : "#fff", cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#6b7a72" }}>Loading sessions…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7a72" }}>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.4rem", color: "#0f1410", marginBottom: "0.5rem" }}>No sessions found</p>
                <p>Try adjusting your filters or check a different time range.</p>
                {selTime !== "all" && (
                  <button onClick={() => setSelTime("all")} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", borderRadius: 100, border: "1.5px solid #1d6b3c", background: "transparent", color: "#1d6b3c", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    Show all time
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
                {filtered.map(s => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    isRegistered={registeredIds.has(s.id)}
                    registerLoading={registerLoadingId === s.id}
                    onRegisterToggle={() => handleRegisterToggle(s.id)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
}
