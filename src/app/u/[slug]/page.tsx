"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPublicProfile, fullName, initials, userIdFromSlug,
  computeExpertiseLevel, makeProfileSlug,
  PublicProfileData, ReviewData, toggleSubscription, createReview,
} from "@/lib/profile";
import { SessionData, getMyRegistrationIds } from "@/lib/session";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

const RATING_BARS = [
  { label: "5★", pct: 88 }, { label: "4★", pct: 9 },
  { label: "3★", pct: 2  }, { label: "2★", pct: 1  }, { label: "1★", pct: 0 },
];

const C = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sun: "#e8a020", sunLight: "#fdf3e0",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  clay: "#c45b2a", clayLight: "#f8ede5",
  cream: "#faf7f2", white: "#ffffff", border: "#e2ded6",
  r: "16px", rs: "10px",
  ff: "var(--font-dm-sans), sans-serif",
  ffD: "var(--font-fraunces), Georgia, serif",
};

type ChipVariant = "sky" | "green" | "clay" | "sun";
const CHIP_VARIANTS: ChipVariant[] = ["sky","green","sky","clay","sun","green","sky","clay"];
function Chip({ text, variant = "sky" }: { text: string; variant?: ChipVariant }) {
  const map = {
    sky:   { bg: C.skyLight,  color: C.sky,  border: "rgba(26,79,122,0.15)" },
    green: { bg: C.leafLight, color: C.leaf, border: "rgba(29,107,60,0.15)" },
    clay:  { bg: C.clayLight, color: C.clay, border: "rgba(196,91,42,0.15)" },
    sun:   { bg: C.sunLight,  color: C.sun,  border: "rgba(232,160,32,0.15)" },
  };
  const s = map[variant];
  return (
    <span style={{ fontSize: "0.78rem", fontWeight: 500, padding: "0.3rem 0.85rem", borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: C.ff }}>
      {text}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: C.ffD, fontSize: "1rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: "1rem" }}>
      {children}
      <div style={{ width: 28, height: 3, background: C.leaf, borderRadius: 2, marginTop: "0.3rem" }} />
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem 1.75rem", marginBottom: "1.25rem" }}>
      {children}
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.25rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: C.inkMuted, marginBottom: "1rem", fontFamily: C.ff }}>{title}</div>
      {children}
    </div>
  );
}

function SocialLink({ href, icon, bg, label }: { href: string; icon: string; bg: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.85rem", borderRadius: 10, border: `1.5px solid ${C.border}`, textDecoration: "none", color: C.inkSoft, fontSize: "0.84rem", fontWeight: 500, marginBottom: "0.6rem", background: C.white, fontFamily: C.ff }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0, background: bg }}>{icon}</div>
      {label}
    </a>
  );
}

/* ── star display ──────────────────────────────────────────────────────────── */
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: C.sun, fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

/* ── star picker ──────────────────────────────────────────────────────────── */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.2rem" }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: n <= (hover || value) ? C.sun : C.border, padding: "0 0.1rem", lineHeight: 1 }}>
          ★
        </button>
      ))}
    </div>
  );
}

/* ── session row (dashboard-style) ───────────────────────────────────────── */
function SessionRow({ s, isPast = false, idx, total, isRegistered = false, isOwner = false, isMobile = false }: { s: SessionData; isPast?: boolean; idx: number; total: number; isRegistered?: boolean; isOwner?: boolean; isMobile?: boolean }) {
  const d        = new Date(s.scheduledAt);
  const nowMs    = Date.now();
  const openMs   = d.getTime() - 30 * 60_000;
  const closeMs  = d.getTime() + (s.duration + 30) * 60_000;
  const isLive   = nowMs >= d.getTime() && nowMs <= closeMs;
  const joinOpen = !isPast && nowMs >= openMs && nowMs <= closeMs;

  const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
  const typeBg    = isPast ? C.cream    : s.type === "webinar" ? C.skyLight : C.leafLight;
  const typeColor = isPast ? C.inkMuted : s.type === "webinar" ? C.sky      : C.leaf;

  const reg   = s._count?.registrations ?? 0;
  const cap   = s.audienceLimit;
  const pct   = cap ? Math.min(100, Math.round((reg / cap) * 100)) : null;
  const isFull = cap !== null && cap !== undefined && reg >= cap;
  const isWarm = pct !== null && pct >= 80 && !isFull;
  const countColor = isFull ? "#9b2c4e" : isWarm ? "#b5470e" : C.leaf;

  return (
    <div style={{ padding: "1rem 0", borderBottom: idx < total - 1 ? `1px solid ${C.border}` : "none" }}>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "flex-start", gap: isMobile ? "0.65rem" : "1rem" }}>
        {/* date badge */}
        <div style={{ width: 52, flexShrink: 0, textAlign: "center" as const, background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.5rem 0.3rem", opacity: isPast ? 0.7 : 1 }}>
          <div style={{ fontFamily: C.ffD, fontSize: "1.35rem", fontWeight: 700, color: C.leaf, lineHeight: 1 }}>{d.getDate()}</div>
          <div style={{ fontSize: "0.6rem", textTransform: "uppercase" as const, color: C.inkMuted, letterSpacing: "0.04em", marginTop: "0.15rem" }}>{d.toLocaleString("default", { month: "short" })}</div>
          <div style={{ fontSize: "0.6rem", color: C.inkMuted, marginTop: "0.1rem" }}>{d.getFullYear()}</div>
        </div>

        {/* details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.3rem", flexWrap: "wrap" as const }}>
            {isLive && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.62rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: 100, background: "#fee2e2", color: "#c00", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#c00", display: "inline-block", animation: "live-dot 1.4s ease-in-out infinite" }} />
                Live
              </span>
            )}
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap" as const }}>{s.title}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" as const, marginBottom: "0.45rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, padding: "0.18rem 0.6rem", borderRadius: 100, background: typeBg, color: typeColor, border: isPast ? `1px solid ${C.border}` : "none" }}>
              {typeLabel}
            </span>
            {s.category && <span style={{ fontSize: "0.72rem", color: C.inkMuted }}>📂 {s.category}</span>}
            <span style={{ fontSize: "0.72rem", color: C.inkMuted }}>⏰ {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {s.duration} min</span>
            {s.skillLevel && <span style={{ fontSize: "0.65rem", color: C.inkMuted, background: C.cream, border: `1px solid ${C.border}`, padding: "0.1rem 0.45rem", borderRadius: 100 }}>{s.skillLevel}</span>}
          </div>
          {/* registration bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: countColor, display: "flex", alignItems: "center", gap: "0.3rem", whiteSpace: "nowrap" as const }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              {cap ? `${reg} / ${cap} registered` : `${reg} registered`}
            </span>
            {cap ? (
              <>
                <div style={{ flex: 1, maxWidth: 100, height: 5, borderRadius: 100, background: C.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: isFull ? "#c0392b" : isWarm ? "#e8a020" : C.leaf, transition: "width 0.4s" }} />
                </div>
                <span style={{ fontSize: "0.68rem", color: isFull ? "#9b2c4e" : C.inkMuted, fontWeight: isFull ? 600 : 400, whiteSpace: "nowrap" as const }}>
                  {isFull ? "🔒 Full" : `${cap - reg} left`}
                </span>
              </>
            ) : (
              <>
                <div style={{ flex: 1, maxWidth: 100, height: 5, borderRadius: 100, background: C.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: reg > 0 ? `${Math.min(100, Math.round((reg / Math.max(reg, 10)) * 100))}%` : "0%", borderRadius: 100, background: C.leaf, transition: "width 0.4s" }} />
                </div>
                <span style={{ fontSize: "0.68rem", color: C.inkMuted, fontWeight: 400, whiteSpace: "nowrap" as const }}>Unlimited</span>
              </>
            )}
          </div>
        </div>

        {/* action button */}
        {(() => {
          const canJoin = joinOpen && (isOwner || isRegistered);
          const href = canJoin ? `/join/${s.id}` : `/session/${s.id}`;
          const label = isPast
            ? "View Details →"
            : joinOpen
              ? (isOwner || isRegistered)
                ? (isLive ? "🔴 Join Now" : "🎬 Join Now")
                : "Register to Join →"
              : "View Webinar Details →";
          const bg = isPast
            ? C.cream
            : joinOpen
              ? (isOwner || isRegistered)
                ? (isLive ? C.leaf : C.sky)
                : "#e8a020"
              : C.leaf;
          const color = isPast ? C.inkSoft : "#fff";
          const border = isPast ? `1.5px solid ${C.border}` : "none";
          return (
            <a href={href} className={canJoin && isLive ? "live-join-btn" : ""}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", padding: "0.5rem 1.15rem", borderRadius: 100, fontFamily: C.ff, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" as const, transition: "background 0.2s", background: bg, color, border, width: isMobile ? "100%" : undefined }}>
              {label}
            </a>
          );
        })()}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PublicProfilePage() {
  const { slug }   = useParams<{ slug: string }>();
  const router     = useRouter();
  const [data, setData]           = useState<PublicProfileData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [subscribed, setSubscribed]     = useState(false);
  const [subCount, setSubCount]         = useState(0);
  const [subLoading, setSubLoading]     = useState(false);
  const [sessTab, setSessTab]           = useState<"upcoming" | "completed">("upcoming");
  const [now]                           = useState(() => new Date());
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [viewerId, setViewerId]         = useState<number | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());
  const [reviews, setReviews]           = useState<ReviewData[]>([]);
  const [isMobile, setIsMobile]         = useState(false);

  /* review form state */
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState<Date | null>(null);
  const [reviewRating, setReviewRating]     = useState(5);
  const [reviewComment, setReviewComment]   = useState("");
  const [reviewSaving, setReviewSaving]     = useState(false);
  const [reviewErr, setReviewErr]           = useState("");

  const barsRef = useRef<HTMLDivElement>(null);
  const [barsVisible, setBarsVisible] = useState(false);

  /* load profile */
  useEffect(() => {
    const userId = userIdFromSlug(slug);
    if (!userId) { setError("not found"); setLoading(false); return; }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    setIsLoggedIn(!!token);

    /* decode viewerId from token without a round-trip */
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setViewerId(payload.sub ?? null);
      } catch { /* invalid token */ }
    }

    if (token) {
      getMyRegistrationIds().then(ids => setRegisteredIds(new Set(ids))).catch(() => {});
    }

    getPublicProfile(userId)
      .then(d => {
        setData(d);
        setSubscribed(d.isSubscribed);
        setSubCount(d.subscriberCount);
        setReviews(d.reviews);
        const lastReview = d.lastReviewAt ? new Date(d.lastReviewAt) : null;
        const canReviewNow = !lastReview || (Date.now() - lastReview.getTime() > 7 * 24 * 60 * 60 * 1000);
        setShowReviewForm(canReviewNow);
        if (!canReviewNow && lastReview) {
          setNextReviewDate(new Date(lastReview.getTime() + 7 * 24 * 60 * 60 * 1000));
        }
      })
      .catch(() => setError("not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* rating bars intersection observer */
  useEffect(() => {
    if (!barsRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setBarsVisible(true); }, { threshold: 0.3 });
    obs.observe(barsRef.current);
    return () => obs.disconnect();
  }, [data]);

  const handleSubscribe = async () => {
    if (!isLoggedIn) { router.push("/login"); return; }
    if (!data) return;
    setSubLoading(true);
    try {
      const res = await toggleSubscription(data.profile.id);
      setSubscribed(res.subscribed);
      setSubCount(res.count);
    } catch { /* ignore */ }
    finally { setSubLoading(false); }
  };

  const handleSubmitReview = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!data || !reviewComment.trim()) return;
    setReviewSaving(true);
    setReviewErr("");
    try {
      const rev = await createReview(data.profile.id, reviewRating, reviewComment.trim());
      setReviews(prev => [rev, ...prev.filter(r => r.authorId !== rev.authorId)]);
      setShowReviewForm(false);
      setNextReviewDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setReviewComment("");
    } catch (err: any) {
      setReviewErr(err.message || "Failed to submit review");
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.cream, fontFamily: C.ff, color: C.inkMuted }}>Loading profile…</div>
  );
  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.cream, fontFamily: C.ff, gap: "1rem" }}>
      <div style={{ fontSize: "2.5rem" }}>🔍</div>
      <div style={{ fontFamily: C.ffD, fontSize: "1.3rem", fontWeight: 700, color: C.ink }}>Profile not found</div>
      <Link href="/" style={{ color: C.leaf, fontWeight: 600, textDecoration: "none", fontSize: "0.875rem" }}>← Back to home</Link>
    </div>
  );

  const { profile, sessions } = data;
  const name  = fullName(profile);
  const initl = initials(profile);
  const tags: string[] = (() => { try { return profile.expertiseTags ? JSON.parse(profile.expertiseTags) : []; } catch { return []; } })();
  const isOwnProfile = viewerId === profile.id;

  const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"];
  const upcoming  = sessions.filter(s => !TERMINAL.includes(s.sessionStatus ?? "") && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 > now.getTime());
  const completed = sessions.filter(s => TERMINAL.includes(s.sessionStatus ?? "") || new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 <= now.getTime());


  const avgRating = reviews.length > 0
    ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const ratingBars = [5,4,3,2,1].map(star => ({
    label: `${star}★`,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === star).length / reviews.length * 100) : RATING_BARS[5 - star].pct,
  }));

  return (
    <div style={{ minHeight: "100vh", background: C.cream, color: C.ink, fontFamily: C.ff }}>
      <style>{`
        @keyframes live-dot {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.75); }
        }
        @keyframes live-ring {
          0%   { box-shadow: 0 0 0 0 rgba(29,107,60,0.55), 0 0 12px 2px rgba(29,107,60,0.2); }
          70%  { box-shadow: 0 0 0 9px rgba(29,107,60,0),  0 0 18px 4px rgba(29,107,60,0.05); }
          100% { box-shadow: 0 0 0 0 rgba(29,107,60,0),    0 0 12px 2px rgba(29,107,60,0); }
        }
        .live-join-btn { animation: live-ring 2s ease-out infinite; }
        .live-join-btn:hover { background: #145c30 !important; }
      `}</style>

      {/* ── NAV ── */}
      <Header activeLink="speakers" />

      {/* ── COVER ── */}
      <div style={{ height: 200, marginTop: isMobile ? 57 : 64, background: C.ink, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(29,107,60,0.2)",  filter: "blur(55px)", right: -60,   top: -80  }} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(26,79,122,0.15)", filter: "blur(55px)", left: "30%",  bottom: -60 }} />
        <div style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", background: "rgba(232,160,32,0.1)", filter: "blur(55px)", left: 60,     top: 20   }} />
        <div style={{ position: "absolute", top: "1.25rem", left: isMobile ? "1rem" : "2rem", zIndex: 1, display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
          <Link href="/"    style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Home</Link>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>›</span>
          <Link href="/speakers" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Speakers</Link>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>›</span>
          <span style={{ color: "rgba(255,255,255,0.75)" }}>{name}</span>
        </div>
      </div>

      {/* ── PROFILE HEADER CARD ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 2rem" }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: C.r, padding: isMobile ? "1.25rem" : "1.75rem 2rem", marginTop: isMobile ? -48 : -72, position: "relative", zIndex: 2, display: "flex", alignItems: "flex-start", gap: "1.25rem", flexWrap: "wrap" as const, boxShadow: "0 4px 24px rgba(15,20,16,0.07)" }}>
          {/* avatar */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div style={{ width: 96, height: 96, borderRadius: 20, background: profile.avatarUrl ? "transparent" : "linear-gradient(135deg,#1a4f7a,#0e3359)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.ffD, fontSize: "1.75rem", fontWeight: 700, color: "#fff", border: `3px solid ${C.white}`, boxShadow: "0 4px 16px rgba(26,79,122,0.25)", overflow: "hidden" }}>
              {profile.avatarUrl
                ? <img src={`${API}${profile.avatarUrl}`} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initl}
            </div>
          </div>

          {/* info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const, marginBottom: "0.2rem" }}>
              <span style={{ fontFamily: C.ffD, fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: C.ink }}>{name}</span>
              {(() => {
                const lvl = computeExpertiseLevel(sessions.length, reviews.length, avgRating ? Number(avgRating) : null);
                return (
                  <Link href="/expertise" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: lvl.bg, color: lvl.color, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" as const, padding: "0.25rem 0.7rem", borderRadius: 100, border: `1px solid ${lvl.color}30`, textDecoration: "none" }}>
                    {lvl.icon} {lvl.label}
                  </Link>
                );
              })()}
            </div>
            <div style={{ fontSize: "0.9rem", color: C.inkMuted, marginBottom: "0.85rem" }}>
              {[profile.title, profile.primaryCategory].filter(Boolean).join(" · ")}
              {[profile.city, profile.country].filter(Boolean).length > 0 && (
                <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>· 📍 {[profile.city, profile.country].filter(Boolean).join(", ")}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" as const, marginTop: "0.25rem" }}>
              {/* Rating */}
              {avgRating && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#fffbef", border: "1px solid #f0d98a", borderRadius: 100, padding: "0.32rem 0.85rem" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#e8a020" stroke="#e8a020" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span style={{ fontFamily: C.ffD, fontSize: "0.92rem", fontWeight: 700, color: "#7a5c00" }}>{avgRating}</span>
                  <span style={{ fontSize: "0.72rem", color: "#a07c20" }}>· {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
                </div>
              )}
              {/* Students */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: C.leafLight, border: "1px solid rgba(29,107,60,0.18)", borderRadius: 100, padding: "0.32rem 0.85rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.leaf} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span style={{ fontFamily: C.ffD, fontSize: "0.92rem", fontWeight: 700, color: C.leaf }}>{subCount > 999 ? `${(subCount/1000).toFixed(1)}K` : subCount}</span>
                <span style={{ fontSize: "0.72rem", color: C.leaf, opacity: 0.8 }}>Subscribers</span>
              </div>
              {/* Live Classes */}
              {sessions.filter(s => s.type === "liveclass").length > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#fdf3e0", border: "1px solid rgba(232,160,32,0.25)", borderRadius: 100, padding: "0.32rem 0.85rem" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.sun} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  <span style={{ fontFamily: C.ffD, fontSize: "0.92rem", fontWeight: 700, color: C.sun }}>{sessions.filter(s => s.type === "liveclass").length}</span>
                  <span style={{ fontSize: "0.72rem", color: C.sun, opacity: 0.85 }}>Live Sessions</span>
                </div>
              )}
              {/* Webinars */}
              {sessions.filter(s => s.type === "webinar").length > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: C.clayLight, border: "1px solid rgba(196,91,42,0.18)", borderRadius: 100, padding: "0.32rem 0.85rem" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.clay} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 23h8"/></svg>
                  <span style={{ fontFamily: C.ffD, fontSize: "0.92rem", fontWeight: 700, color: C.clay }}>{sessions.filter(s => s.type === "webinar").length}</span>
                  <span style={{ fontSize: "0.72rem", color: C.clay, opacity: 0.85 }}>Webinars</span>
                </div>
              )}
            </div>
          </div>

          {/* subscribe */}
          {!isOwnProfile && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", alignItems: isMobile ? "flex-start" : "flex-end", flexShrink: 0, width: isMobile ? "100%" : undefined }}>
              <button
                onClick={handleSubscribe}
                disabled={subLoading}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.4rem", borderRadius: 100, fontFamily: C.ff, fontSize: "0.875rem", fontWeight: 600, cursor: subLoading ? "wait" : "pointer", border: subscribed ? "1.5px solid rgba(29,107,60,0.25)" : "none", background: subscribed ? C.leafLight : C.leaf, color: subscribed ? C.leaf : "#fff", boxShadow: subscribed ? "none" : "0 4px 12px rgba(29,107,60,0.3)", transition: "all 0.2s", whiteSpace: "nowrap" as const, opacity: subLoading ? 0.7 : 1 }}>
                {subscribed ? "✓ Subscribed" : (
                  <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> Subscribe Free</>
                )}
              </button>
              <div style={{ fontSize: "0.72rem", color: C.inkMuted, textAlign: "right" }}>
                {subscribed
                  ? `✓ You're following ${profile.firstName || name}`
                  : `Join ${subCount > 999 ? `${(subCount/1000).toFixed(1)}K` : subCount} others following ${profile.firstName || name}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1160, margin: "1.5rem auto 3rem", padding: isMobile ? "0 1rem" : "0 2rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: "1.5rem", alignItems: "start" }}>

        <main>
          {/* About */}
          {profile.bio && (
            <Section>
              <SectionTitle>About Me</SectionTitle>
              {profile.bio.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} style={{ fontSize: "0.875rem", color: C.inkSoft, lineHeight: 1.8, marginTop: i > 0 ? "0.75rem" : 0 }}>{p}</p>
              ))}
            </Section>
          )}

          {/* Expertise */}
          {tags.length > 0 && (
            <Section>
              <SectionTitle>Expertise</SectionTitle>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem" }}>
                {tags.map((t, i) => <Chip key={t} text={t} variant={CHIP_VARIANTS[i % CHIP_VARIANTS.length]} />)}
              </div>
            </Section>
          )}

          {/* Sessions + Reviews — only when at least one published/approved session exists */}
          {sessions.length > 0 && (
            <Section>
              <SectionTitle>Webinars</SectionTitle>
              <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "1.25rem" }}>
                {(["upcoming", "completed"] as const).map(t => (
                  <button key={t} onClick={() => setSessTab(t)} style={{ padding: "0.55rem 1.1rem", fontSize: "0.82rem", fontWeight: sessTab === t ? 600 : 500, color: sessTab === t ? C.leaf : C.inkMuted, cursor: "pointer", background: "none", border: "none", borderBottom: `2px solid ${sessTab === t ? C.leaf : "transparent"}`, marginBottom: -1, fontFamily: C.ff, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    <span style={{ fontSize: "0.68rem", background: C.leafLight, color: C.leaf, borderRadius: 100, padding: "0.1rem 0.45rem", fontWeight: 700 }}>
                      {t === "upcoming" ? upcoming.length : completed.length}
                    </span>
                  </button>
                ))}
              </div>
              {sessTab === "upcoming" && (
                upcoming.length === 0
                  ? <p style={{ fontSize: "0.82rem", color: C.inkMuted, padding: "1rem 0" }}>No upcoming webinars right now.</p>
                  : upcoming.map((s, i) => <SessionRow key={s.id} s={s} idx={i} total={upcoming.length} isRegistered={registeredIds.has(s.id)} isOwner={viewerId === data.profile.id} isMobile={isMobile} />)
              )}
              {sessTab === "completed" && (
                completed.length === 0
                  ? <p style={{ fontSize: "0.82rem", color: C.inkMuted, padding: "1rem 0" }}>No completed webinars yet.</p>
                  : completed.map((s, i) => <SessionRow key={s.id} s={s} idx={i} total={completed.length} isPast isRegistered={registeredIds.has(s.id)} isOwner={viewerId === data.profile.id} isMobile={isMobile} />)
              )}
            </Section>
          )}

          {/* Reviews — only when at least one published/approved session exists */}
          {sessions.length > 0 && (
            <Section>
              <SectionTitle>Attendee Reviews</SectionTitle>

              {/* Write a review — logged in, not own profile, within cooldown window */}
              {isLoggedIn && !isOwnProfile && showReviewForm && (
                <form onSubmit={handleSubmitReview} style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.ink, marginBottom: "0.6rem" }}>Leave a review</div>
                  <StarPicker value={reviewRating} onChange={setReviewRating} />
                  <textarea
                    value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                    placeholder="Share your experience with this speaker…"
                    rows={3}
                    style={{ width: "100%", marginTop: "0.75rem", padding: "0.65rem 0.85rem", fontFamily: C.ff, fontSize: "0.82rem", color: C.ink, border: `1.5px solid ${C.border}`, borderRadius: 8, outline: "none", resize: "vertical" as const, background: C.white }}
                  />
                  {reviewErr && <div style={{ fontSize: "0.75rem", color: "#c00", marginTop: "0.4rem" }}>{reviewErr}</div>}

                  {/* pre-submit notice */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "#fef9ec", border: "1px solid rgba(232,160,32,0.3)", borderRadius: 8, padding: "0.6rem 0.85rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "#7a5c00", lineHeight: 1.55, fontFamily: C.ff }}>
                    <span style={{ flexShrink: 0, fontSize: "0.9rem", marginTop: "0.05rem" }}>💡</span>
                    <span>
                      <strong>Review carefully.</strong> Once submitted, your review and rating are <strong>permanent</strong> — they cannot be edited or deleted.
                      You may leave one review per speaker every <strong>7 days</strong>.
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
                    <button type="submit" disabled={reviewSaving || !reviewComment.trim()} style={{ padding: "0.5rem 1.1rem", borderRadius: 8, background: C.leaf, color: "#fff", border: "none", fontFamily: C.ff, fontWeight: 600, fontSize: "0.82rem", cursor: reviewSaving ? "wait" : "pointer", opacity: !reviewComment.trim() ? 0.5 : 1 }}>
                      {reviewSaving ? "Submitting…" : "Submit Review"}
                    </button>
                    <button type="button" onClick={() => setShowReviewForm(false)} style={{ padding: "0.5rem 0.9rem", borderRadius: 8, background: "none", color: C.inkMuted, border: `1px solid ${C.border}`, fontFamily: C.ff, fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                  </div>
                </form>
              )}

              {/* Write a review button — can review but form was dismissed */}
              {isLoggedIn && !isOwnProfile && !showReviewForm && !nextReviewDate && (
                <button onClick={() => setShowReviewForm(true)} style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", fontWeight: 600, color: C.leaf, background: C.leafLight, border: `1px solid rgba(29,107,60,0.2)`, borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", marginBottom: "1.25rem", fontFamily: C.ff }}>
                  ✍️ Write a review
                </button>
              )}

              {/* prompt to login */}
              {!isLoggedIn && (
                <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: C.inkMuted, display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Link href="/login" style={{ color: C.leaf, fontWeight: 600, textDecoration: "none" }}>Log in</Link> to leave a review
                </div>
              )}

              {/* cooldown notice — reviewed within the last 7 days */}
              {isLoggedIn && !isOwnProfile && !showReviewForm && nextReviewDate && (
                <div style={{ background: "#fef9ec", border: "1px solid rgba(232,160,32,0.3)", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.25rem", fontFamily: C.ff }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "0.9rem" }}>🕐</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#7a5c00" }}>Review submitted — thank you!</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#9a7000", lineHeight: 1.55, paddingLeft: "1.4rem" }}>
                    To keep reviews thoughtful and trustworthy, each reviewer can submit once every 7 days.
                    Your next review window opens on{" "}
                    <strong>{nextReviewDate.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</strong>.
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <p style={{ fontSize: "0.82rem", color: C.inkMuted }}>No reviews yet — be the first!</p>
              ) : (
                reviews.map((r, i) => {
                  const authorSlug = makeProfileSlug({ id: r.authorId, firstName: r.authorFirstName ?? undefined, lastName: r.authorLastName ?? undefined });
                  const authorLvl  = computeExpertiseLevel(r.authorSessionCount ?? 0, r.authorReviewCount ?? 0, r.authorAvgRating ?? null);
                  return (
                    <div key={r.id} style={{ padding: "1rem 0", borderBottom: i < reviews.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.5rem" }}>
                        <Link href={`/u/${authorSlug}`} style={{ textDecoration: "none", flexShrink: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.sky, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, color: "#fff", overflow: "hidden" }}>
                            {r.authorAvatarUrl
                              ? <img src={`${API}${r.authorAvatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : r.authorName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
                            }
                          </div>
                        </Link>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" as const }}>
                            <Link href={`/u/${authorSlug}`} style={{ fontSize: "0.84rem", fontWeight: 600, color: C.ink, textDecoration: "none" }}>
                              {r.authorName}
                            </Link>
                            <Stars rating={r.rating} size={12} />
                          </div>
                          <div style={{ marginTop: "0.2rem" }}>
                            <Link href="/expertise" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: authorLvl.bg, color: authorLvl.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 100, textDecoration: "none" }}>
                              {authorLvl.icon} {authorLvl.label}
                            </Link>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: C.inkMuted, flexShrink: 0, paddingTop: "0.1rem" }}>
                          {new Date(r.createdAt).toLocaleDateString("default", { month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: C.inkSoft, lineHeight: 1.65, margin: 0 }}>"{r.comment}"</p>
                    </div>
                  );
                })
              )}
            </Section>
          )}
        </main>

        {/* ── SIDEBAR ── */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <SideCard title="Stats">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { val: avgRating ?? "–",                      lbl: "Avg Rating" },
                { val: String(reviews.length),                lbl: "Reviews" },
                { val: subCount > 999 ? `${(subCount/1000).toFixed(1)}K` : String(subCount), lbl: "Subscribers" },
                { val: String(sessions.length),               lbl: "Webinars" },
              ].map(({ val, lbl }) => (
                <div key={lbl} style={{ background: C.cream, borderRadius: C.rs, padding: "0.85rem 0.75rem", textAlign: "center" }}>
                  <div style={{ fontFamily: C.ffD, fontSize: "1.3rem", fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>{val}</div>
                  <div style={{ fontSize: "0.68rem", color: C.inkMuted, marginTop: "0.2rem" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </SideCard>

          {sessions.length > 0 && (
            <SideCard title="Rating Breakdown">
              <div ref={barsRef} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: C.ffD, fontSize: "2.2rem", fontWeight: 700, color: C.ink, lineHeight: 1 }}>{avgRating ?? "–"}</div>
                  <div style={{ color: C.sun, fontSize: "0.85rem", marginTop: "0.2rem" }}>★★★★★</div>
                  <div style={{ fontSize: "0.7rem", color: C.inkMuted }}>{reviews.length} reviews</div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {ratingBars.map(({ label, pct }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", color: C.inkMuted }}>
                      <span style={{ width: 18, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: C.sun, width: barsVisible ? `${pct}%` : "0%", transition: "width 0.8s ease" }} />
                      </div>
                      <span style={{ width: 24, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </SideCard>
          )}

          {(profile.linkedinUrl || profile.twitterUrl || profile.websiteUrl || profile.youtubeUrl) && (
            <SideCard title="Connect">
              {profile.linkedinUrl && <SocialLink href={profile.linkedinUrl} icon="💼" bg="#e8f0fe" label="LinkedIn" />}
              {profile.twitterUrl  && <SocialLink href={profile.twitterUrl}  icon="🐦" bg="#e8f5fe" label="Twitter / X" />}
              {profile.websiteUrl  && <SocialLink href={profile.websiteUrl}  icon="🌐" bg={C.leafLight} label="Personal Portfolio" />}
              {profile.youtubeUrl  && <SocialLink href={profile.youtubeUrl}  icon="▶️" bg="#fde8e8" label="YouTube" />}
            </SideCard>
          )}
        </aside>
      </div>
      <Footer />
    </div>
  );
}
