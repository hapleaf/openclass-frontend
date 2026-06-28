"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import {
  PublicSessionData, SessionReview,
  getMyRegistrationIds, toggleRegistration,
  getSessionRecording, getPublicSession, getCaptcha,
} from "@/lib/session";
import { apiFetch } from "@/lib/api";
import { makeProfileSlug, computeExpertiseLevel } from "@/lib/profile";
import { fmtTime, fmtDateLong, fmtDateShort } from "@/lib/tz";

function HlsPlayer({ src, label }: { src: string; label?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!src || !videoRef.current) return;
    const video = videoRef.current;
    // Safari has native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }
    // All other browsers use hls.js
    let hls: import("hls.js").default | null = null;
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) { video.src = src; return; }
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    });
    return () => { hls?.destroy(); };
  }, [src]);
  return (
    <div>
      {label && <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7a72", marginBottom: "0.5rem" }}>{label}</div>}
      <video ref={videoRef} controls style={{ width: "100%", borderRadius: 10, maxHeight: 480, display: "block", background: "#000" }} />
    </div>
  );
}

type Status = "live" | "upcoming" | "closed";

const TERMINAL = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"]);

function sessionStatus(s: PublicSessionData): Status {
  if (TERMINAL.has(s.sessionStatus ?? "")) return "closed";
  const nowMs = Date.now();
  const startMs = new Date(s.scheduledAt).getTime();
  const endMs = startMs + s.duration * 60 * 1000;
  if (nowMs > endMs) return "closed";
  if (nowMs >= startMs) return "live";
  return "upcoming";
}

function fmtDate(iso: string) { return fmtDateLong(iso); }
function teacherName(u: PublicSessionData["user"]) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "Unknown";
}
function teacherInitials(u: PublicSessionData["user"]) {
  if (u.firstName && u.lastName) return (u.firstName[0] + u.lastName[0]).toUpperCase();
  if (u.firstName) return u.firstName.slice(0, 2).toUpperCase();
  return (u.name || "U").slice(0, 2).toUpperCase();
}

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

const SESSION_STATUS_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  COMPLETED:  { label: "Completed",  bg: "#d4ead9", color: "#1d6b3c", icon: "✓" },
  CANCELLED:  { label: "Cancelled",  bg: "#f0f0f0", color: "#6b7a72", icon: "✕" },
  NO_SHOW:    { label: "No Show",    bg: "#fdf3e0", color: "#b5470e", icon: "⚠" },
  ABANDONED:  { label: "Abandoned",  bg: "#fce8ef", color: "#9b2c4e", icon: "⚡" },
};
const QUALITY_FLAG_META: Record<string, { label: string; bg: string; color: string }> = {
  HIGH_ENGAGEMENT:    { label: "High Engagement", bg: "#c8f0d8", color: "#14532d" },
  EARLY_COMPLETION:   { label: "Early End",       bg: "#fdf3e0", color: "#b5470e" },
  VERY_SHORT_SESSION: { label: "Very Short",      bg: "#fce8ef", color: "#9b2c4e" },
  LATE_START:         { label: "Late Start",      bg: "#fdf3e0", color: "#b5470e" },
  LOW_ATTENDANCE:     { label: "Low Attendance",  bg: "#fdf3e0", color: "#b5470e" },
};

function resolveRecordingUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${process.env.NEXT_PUBLIC_API_URL}/uploads/recordings/${url}`;
}

function getEmbedInfo(url: string): { kind: "video" | "embed"; src: string } {
  const resolved = resolveRecordingUrl(url);
  const ytMatch = resolved.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return { kind: "embed", src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  const vimeoMatch = resolved.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { kind: "embed", src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(resolved)) return { kind: "video", src: resolved };
  return { kind: "embed", src: resolved };
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.1rem" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          style={{ fontSize: "1.7rem", background: "none", border: "none", cursor: "pointer",
            color: n <= (hover || value) ? "#e8a020" : "#d0ccc5",
            padding: "0 0.05rem", lineHeight: 1, transition: "color 0.1s" }}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [session, setSession] = useState<PublicSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Recording
  const [recordingProcessing, setRecordingProcessing] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rec") === "1"
  );

  // Reviews & rating form
  const [reviews, setReviews] = useState<SessionReview[]>([]);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaChallenge, setCaptchaChallenge] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingDone, setRatingDone] = useState(false);

  // Organizer comment form
  const [orgComment, setOrgComment] = useState("");
  const [orgCommentLoading, setOrgCommentLoading] = useState(false);
  const [orgCommentError, setOrgCommentError] = useState<string | null>(null);
  const orgCommentRef = useRef<HTMLTextAreaElement>(null);

  const loadCaptcha = useCallback(async () => {
    try {
      const data = await getCaptcha();
      setCaptchaToken(data.token);
      setCaptchaChallenge(data.challenge);
      setCaptchaInput("");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const fromEnd = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rec") === "1";
    const fetchSession = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/browse/${id}${fromEnd ? `?t=${Date.now()}` : ""}`)
        .then(r => r.json())
        .then((s: PublicSessionData) => { setSession(s); setReviews(s.reviews ?? []); })
        .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));

    fetchSession();
    // When arriving straight from End Session, re-fetch once after 2s to catch
    // any DB write that hadn't committed by the time Next.js rendered this page
    if (fromEnd) setTimeout(fetchSession, 2000);
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      try {
        const cached = localStorage.getItem("oc_profile_cache");
        if (cached) setCurrentUserId(JSON.parse(cached).id ?? null);
      } catch {}
      getMyRegistrationIds()
        .then(ids => setIsRegistered(ids.includes(id)))
        .catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load captcha once session data arrives and user is a student
  useEffect(() => {
    if (!session) return;
    const started = Date.now() >= new Date(session.scheduledAt).getTime();
    if (started && currentUserId !== null && currentUserId !== session.user.id && !ratingDone) {
      loadCaptcha();
    }
  }, [session, currentUserId, ratingDone, loadCaptcha]);

  async function handleRegisterToggle() {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    setRegisterLoading(true);
    try {
      const result = await toggleRegistration(id);
      setIsRegistered(result.registered);
    } catch { /* ignore */ }
    finally { setRegisterLoading(false); }
  }

  // Poll for recording after session ends.
  // Keeps retrying for up to ~5 min (20 × 15s) to handle the EGRESS_ENDING encoding
  // delay that occurs between stopEgress() and the file being finalised.
  useEffect(() => {
    if (!session) return;
    if ((session.recordings?.length ?? 0) > 0) { setRecordingProcessing(false); return; }
    const fromRec = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rec") === "1";
    // Only poll when the organizer arrived here straight from End Session (?rec=1).
    // For all other visitors, if no recordings exist there is nothing to wait for.
    if (!fromRec) { setRecordingProcessing(false); return; }

    let cancelled = false;
    let attempts = 0;
    const MAX = 20;

    async function poll() {
      if (cancelled || attempts >= MAX) { setRecordingProcessing(false); return; }
      attempts++;
      try {
        const result = await getSessionRecording(id);
        if (cancelled) return;
        if (result.recordings.length > 0) {
          // Reload full session so recordings include hlsUrl (S3) where available,
          // falling back to local MP4 for any not yet processed.
          try {
            const fresh = await getPublicSession(id);
            if (!cancelled) setSession(fresh);
          } catch { /* keep existing session state */ }
          setRecordingProcessing(false);
        } else {
          setRecordingProcessing(result.processing);
          if (result.processing) setTimeout(poll, 15_000);
          else setRecordingProcessing(false);
        }
      } catch {
        setTimeout(poll, 15_000);
      }
    }
    void poll();
    return () => { cancelled = true; };
  }, [session?.sessionStatus, session?.recordings, session?.autoRecording, id]);

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!ratingValue) { setRatingError("Please select a star rating."); return; }
    if (!captchaInput.trim()) { setRatingError("Please solve the captcha."); return; }
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    setRatingError(null);
    setRatingLoading(true);
    try {
      const res = await apiFetch(`/live/${id}/rate`, {
        method: "POST",
        body: JSON.stringify({
          rating: ratingValue,
          comment: ratingComment.trim(),
          captchaToken,
          captchaAnswer: parseInt(captchaInput, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRatingError(json.message || "Failed to submit rating");
        loadCaptcha();
        return;
      }
      // Resolve author name from profile cache for optimistic display
      let authorName = "You";
      try {
        const cached = localStorage.getItem("oc_profile_cache");
        if (cached) {
          const p = JSON.parse(cached);
          authorName = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.name || "You";
        }
      } catch {}
      setReviews(prev => [
        { id: json.id, authorName, rating: ratingValue, comment: ratingComment.trim(), createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setRatingDone(true);
    } catch {
      setRatingError("Something went wrong. Please try again.");
      loadCaptcha();
    } finally { setRatingLoading(false); }
  }

  async function handleOrganizerComment(e: React.FormEvent) {
    e.preventDefault();
    if (!orgComment.trim()) { setOrgCommentError("Comment cannot be empty."); return; }
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    setOrgCommentError(null);
    setOrgCommentLoading(true);
    try {
      const res = await apiFetch(`/live/${id}/organizer-comment`, {
        method: "POST",
        body: JSON.stringify({ comment: orgComment.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setOrgCommentError(json.message || "Failed to post comment"); return; }
      let authorName = "Organizer";
      try {
        const cached = localStorage.getItem("oc_profile_cache");
        if (cached) {
          const p = JSON.parse(cached);
          authorName = [p.firstName, p.lastName].filter(Boolean).join(" ") || p.name || "Organizer";
        }
      } catch {}
      setReviews(prev => [
        ...prev,
        { id: json.id, authorName, rating: 0, comment: orgComment.trim(), createdAt: new Date().toISOString() },
      ]);
      setOrgComment("");
    } catch {
      setOrgCommentError("Something went wrong. Please try again.");
    } finally { setOrgCommentLoading(false); }
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return (
    <><Header activeLink="live" />
      <div style={{ paddingTop: 64, minHeight: "100vh", background: "#faf7f2", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7a72", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        Loading session…
      </div>
    </>
  );

  if (error || !session) return (
    <><Header activeLink="live" />
      <div style={{ paddingTop: 64, minHeight: "100vh", background: "#faf7f2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        <p style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", color: "#0f1410" }}>Session not found</p>
        <Link href="/live" style={{ color: "#1d6b3c", textDecoration: "none", fontSize: "0.875rem" }}>← Back to Webinars</Link>
      </div>
    </>
  );

  const status = sessionStatus(session);
  const isOrganizer = currentUserId === session.user.id;
  const sessionHasStarted = Date.now() >= new Date(session.scheduledAt).getTime();
  const isWebinar = session.type === "webinar";
  const typeBadge = isWebinar
    ? { label: "🔵 Webinar", bg: "rgba(26,79,122,0.9)", color: "#1a4f7a" }
    : { label: "🟢 Live Session", bg: "rgba(29,107,60,0.9)", color: "#1d6b3c" };

  const endMs = new Date(session.scheduledAt).getTime() + session.duration * 60 * 1000;
  const endTime = fmtTime(new Date(endMs).toISOString());
  const bannerBg = session.bannerColor || CATEGORY_BG[session.category || ""] || CATEGORY_BG.default;
  const emoji = CATEGORY_EMOJI[session.category || ""] || CATEGORY_EMOJI.default;

  const levelBg = session.skillLevel === "Beginner" ? "#d4ead9"
    : session.skillLevel === "Intermediate" ? "#ede9f7"
    : session.skillLevel === "Advanced" ? "#fde8d8" : "#f0ede8";
  const levelColor = session.skillLevel === "Beginner" ? "#1d6b3c"
    : session.skillLevel === "Intermediate" ? "#7c3aed"
    : session.skillLevel === "Advanced" ? "#c45b2a" : "#6b7a72";

  const teacherSlug = makeProfileSlug({ ...session.user });
  const parsedTags: string[] = (() => {
    if (!session.tags) return [];
    try {
      const p = JSON.parse(session.tags);
      return Array.isArray(p) ? p : session.tags.split(",").map(t => t.trim()).filter(Boolean);
    } catch {
      return session.tags.split(",").map(t => t.trim()).filter(Boolean);
    }
  })();

  const resolveUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${process.env.NEXT_PUBLIC_API_URL}${url}`;
  };
  const avatarSrc  = resolveUrl(session.user.avatarUrl);
  const bannerSrc  = resolveUrl(session.bannerUrl);
  const ratedReviews = reviews.filter(r => r.rating > 0);
  const avgRating = ratedReviews.length > 0 ? ratedReviews.reduce((s, r) => s + r.rating, 0) / ratedReviews.length : 0;

  return (
    <>
      <Header activeLink="live" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
        @keyframes oc-spin{to{transform:rotate(360deg)}}
        .sd-wrap{max-width:960px;margin:0 auto;padding:0 1.5rem}
        .sd-grid{display:grid;grid-template-columns:1fr 300px;gap:2rem;align-items:start;padding:1.75rem 0}
        .sd-sidebar{position:sticky;top:80px}
        .sd-title-row{display:grid;grid-template-columns:1fr 220px;gap:2rem;align-items:center;padding:2rem 0 1.5rem}
        .sd-page{padding-top:64px}
        .sd-left{min-width:0}
        .sd-share-icons{display:flex;gap:0.6rem;flex-wrap:wrap}
        @media(max-width:720px){
          .sd-page{padding-top:57px;padding-bottom:80px}
          .sd-grid{grid-template-columns:1fr;padding:1.25rem 0}
          .sd-sidebar{position:static}
          .sd-wrap{padding:0 1rem}
          .sd-title-row{grid-template-columns:1fr;gap:1rem;padding:1.5rem 0 1rem}
          .sd-thumb{order:-1}
          .sd-thumb-placeholder{display:none}
          .sd-outcome-inner{padding:1rem}
          .sd-nav-row{flex-wrap:wrap;gap:0.5rem}
        }
      `}</style>

      <div className="sd-page" style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "var(--font-dm-sans), sans-serif", color: "#0f1410" }}>

        {/* ── Colour accent strip ───────────────────────────────────────────────── */}
        <div style={{ height: 5, background: bannerBg }} />

        {/* ── Page header: title + thumbnail ───────────────────────────────────── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2ded6" }}>
          <div className="sd-wrap">

            {/* Nav row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1.25rem" }}>
              <Link href="/live" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "#6b7a72", fontSize: "0.8rem", textDecoration: "none" }}>
                ← Webinars
              </Link>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {status === "live" && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#dc2626", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "0.28rem 0.75rem", borderRadius: 100 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite", display: "inline-block" }} /> Live Now
                  </span>
                )}
                {!session.sessionStatus && status === "closed" && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.28rem 0.75rem", borderRadius: 100, background: "#e2ded6", color: "#6b7a72" }}>🔒 Closed</span>
                )}
              </div>
            </div>

            {/* Title row — title left, thumbnail right */}
            <div className="sd-title-row">
              {/* Left: badges + title + meta */}
              <div>
                {/* Badges */}
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" as const }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 100, background: isWebinar ? "#ddeaf8" : "#d4ead9", color: isWebinar ? "#1a4f7a" : "#1d6b3c" }}>
                    {typeBadge.label}
                  </span>
                  {session.category && (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: 100, background: "#f0ede8", color: "#6b7a72" }}>
                      {session.category}
                    </span>
                  )}
                  {session.skillLevel && (
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.65rem", borderRadius: 100, background: levelBg, color: levelColor }}>
                      {session.skillLevel}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", fontWeight: 700, color: "#0f1410", lineHeight: 1.2, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
                  {session.title}
                </h1>

                {/* Meta chips */}
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", marginTop: "0.25rem" }}>
                  {/* Date */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#f0ede8", border: "1px solid #e2ded6", borderRadius: 100, padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "#3a4140", fontWeight: 500 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {fmtDate(session.scheduledAt)}
                  </div>
                  {/* Time */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#f0ede8", border: "1px solid #e2ded6", borderRadius: 100, padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "#3a4140", fontWeight: 500 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {fmtTime(session.scheduledAt)}
                    <span style={{ color: "#a0a89a", fontWeight: 400 }}>→</span>
                    {endTime}
                  </div>
                  {/* Duration */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#f0ede8", border: "1px solid #e2ded6", borderRadius: 100, padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "#3a4140", fontWeight: 500 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12"/><line x1="12" y1="12" x2="15" y2="9"/></svg>
                    {session.duration} min
                  </div>
                  {/* Registrations */}
                  {session._count !== undefined && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#f0ede8", border: "1px solid #e2ded6", borderRadius: 100, padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "#3a4140", fontWeight: 500 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      <strong style={{ color: "#0f1410" }}>{session._count.registrations}</strong> registered
                    </div>
                  )}
                  {/* Rating */}
                  {sessionHasStarted && ratedReviews.length > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", background: "#fffbef", border: "1px solid #f0d98a", borderRadius: 100, padding: "0.35rem 0.85rem", fontSize: "0.8rem", color: "#7a5c00", fontWeight: 600 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#e8a020" stroke="#e8a020" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {avgRating.toFixed(1)}
                      <span style={{ fontWeight: 400, color: "#a07c20" }}>· {ratedReviews.length} {ratedReviews.length === 1 ? "review" : "reviews"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: thumbnail (image or colored card with emoji) */}
              <div className="sd-thumb">
                {bannerSrc ? (
                  <div style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "16/9", background: "#111", boxShadow: "0 4px 20px rgba(15,20,16,0.12)" }}>
                    <img src={bannerSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                ) : (
                  <div className="sd-thumb-placeholder" style={{ borderRadius: 14, aspectRatio: "16/9", background: bannerBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(15,20,16,0.1)" }}>
                    <span style={{ fontSize: "3.5rem", opacity: 0.7 }}>{emoji}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body grid ────────────────────────────────────────────────────────── */}
        <div className="sd-wrap">
          <div className="sd-grid">

          {/* Left column */}
          <div className="sd-left">

            {/* ── Intro video (lazy — src injected only on click) ───────────────── */}
            {session.introVideoUrl && (
              <div style={{ marginBottom: "1.25rem", borderRadius: 12, overflow: "hidden", border: "1px solid #e2ded6", background: "#0d1610" }}>
                {introPlaying ? (
                  <video src={`${process.env.NEXT_PUBLIC_API_URL}${session.introVideoUrl}`} controls autoPlay style={{ width: "100%", maxHeight: 320, display: "block", background: "#0d1610" }} />
                ) : (
                  <div onClick={() => setIntroPlaying(true)} style={{ position: "relative", height: 180, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: "0.75rem", cursor: "pointer", background: "linear-gradient(135deg, #0d1610 0%, #1a2f1e 100%)" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(29,107,60,0.85)", border: "2.5px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(29,107,60,0.45)" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div style={{ textAlign: "center" as const }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", marginBottom: "0.2rem" }}>Watch Intro Video</div>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>Click to load &amp; play</div>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #1d6b3c, #1a4f7a)" }} />
                  </div>
                )}
              </div>
            )}



            {/* ── Session Outcome Banner ─────────────────────────────────────────── */}
            {session.sessionStatus && (() => {
              const sm = SESSION_STATUS_META[session.sessionStatus];
              const qm = session.qualityFlag ? QUALITY_FLAG_META[session.qualityFlag] ?? null : null;
              if (!sm) return null;

              const ICON_BG: Record<string, string> = {
                COMPLETED: "#1d6b3c", CANCELLED: "#6b7a72", NO_SHOW: "#b5470e", ABANDONED: "#9b2c4e",
              };
              const iconBg = ICON_BG[session.sessionStatus] ?? "#6b7a72";

              return (
                <div style={{
                  marginBottom: "1.75rem",
                  borderRadius: 14,
                  border: `1.5px solid ${sm.color}30`,
                  background: sm.bg,
                  overflow: "hidden",
                }}>
                  {/* Top accent bar */}
                  <div style={{ height: 4, background: sm.color, opacity: 0.7 }} />

                  <div style={{ padding: "1.25rem 1.4rem", display: "flex", alignItems: "flex-start", gap: "1.1rem" }}>
                    {/* Icon circle */}
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                      background: iconBg, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.4rem", fontWeight: 700, boxShadow: `0 4px 12px ${iconBg}40`,
                    }}>
                      {sm.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Status headline */}
                      <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.05rem", fontWeight: 700, color: sm.color, marginBottom: "0.45rem" }}>
                        Session {sm.label}
                      </div>

                      {/* Quality flag + duration row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" as const }}>
                        {qm && (
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.22rem 0.65rem", borderRadius: 100, background: qm.bg, color: qm.color, border: `1px solid ${qm.color}30` }}>
                            {qm.label}
                          </span>
                        )}
                        {session.actualDuration != null && (
                          <span style={{ fontSize: "0.78rem", color: "#6b7a72" }}>
                            Ran <strong style={{ color: "#3a4140" }}>{session.actualDuration} min</strong>
                            {session.duration !== session.actualDuration && (
                              <span style={{ color: "#a0a89a" }}> · {session.duration} min scheduled</span>
                            )}
                          </span>
                        )}
                        {session.actualStartAt && (() => {
                          const sched = new Date(session.scheduledAt).getTime();
                          const actual = new Date(session.actualStartAt).getTime();
                          const lateMins = Math.round((actual - sched) / 60_000);
                          if (lateMins > 1) return (
                            <span style={{ fontSize: "0.78rem", color: "#6b7a72" }}>
                              Started <strong style={{ color: "#b5470e" }}>{lateMins} min late</strong>
                            </span>
                          );
                          return null;
                        })()}
                      </div>

                      {/* Contextual note per status */}
                      {session.sessionStatus === "NO_SHOW" && (
                        <div style={{ marginTop: "0.55rem", fontSize: "0.8rem", color: "#b5470e", lineHeight: 1.55 }}>
                          The host did not join this session.
                        </div>
                      )}
                      {session.sessionStatus === "ABANDONED" && (
                        <div style={{ marginTop: "0.55rem", fontSize: "0.8rem", color: "#9b2c4e", lineHeight: 1.55 }}>
                          The host left the session early without returning.
                        </div>
                      )}
                      {session.sessionStatus === "CANCELLED" && (
                        <div style={{ marginTop: "0.55rem", fontSize: "0.8rem", color: "#6b7a72", lineHeight: 1.55 }}>
                          This session was cancelled by the organiser.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {session.description
              ? <div dangerouslySetInnerHTML={{ __html: session.description }} style={{ fontSize: "0.95rem", color: "#3a4140", lineHeight: 1.75, marginBottom: "1.75rem", overflowWrap: "break-word", wordBreak: "break-word" }} />
              : <div style={{ fontSize: "0.9rem", color: "#6b7a72", fontStyle: "italic", marginBottom: "1.75rem" }}>No description provided.</div>
            }

            {parsedTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.5rem" }}>
                {parsedTags.map(t => (
                  <span key={t} style={{ fontSize: "0.75rem", color: "#6b7a72", background: "#f0ede8", border: "1px solid #e2ded6", padding: "0.2rem 0.65rem", borderRadius: 100 }}>{t}</span>
                ))}
              </div>
            )}

            {/* ── Recording player(s) ─────────────────────────────────────────────── */}
            {(session.recordings?.length ?? 0) > 0 && (
              <div style={{ marginBottom: "1.75rem", borderRadius: 14, border: "1px solid #e2ded6", background: "#fff", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid #f0ede8", background: "#faf7f2", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#1d6b3c"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#1d6b3c" }}>
                    Webinar Recording{session.recordings!.length > 1 ? "s" : ""}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "0.68rem", fontWeight: 600, padding: "0.15rem 0.55rem", borderRadius: 100, background: "#d4ead9", color: "#1d6b3c" }}>
                    {session.recordings!.length} {session.recordings!.length === 1 ? "video" : "videos"}
                  </span>
                </div>
                <div style={{ padding: "1.25rem" }}>
                  {session.recordings!.map((rec, idx) => {
                    const partLabel = session.recordings!.length > 1 ? `Part ${idx + 1}` : undefined;
                    if (rec.hlsUrl) {
                      return <div key={rec.id} style={{ marginBottom: idx < session.recordings!.length - 1 ? "1.5rem" : 0 }}><HlsPlayer src={rec.hlsUrl} label={partLabel} /></div>;
                    }
                    const url = resolveRecordingUrl(rec.filename);
                    const embed = getEmbedInfo(url);
                    return (
                      <div key={rec.id} style={{ marginBottom: idx < session.recordings!.length - 1 ? "1.5rem" : 0 }}>
                        {partLabel && <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#6b7a72", marginBottom: "0.5rem" }}>{partLabel}</div>}
                        {embed.kind === "video" ? (
                          <video controls style={{ width: "100%", borderRadius: 10, maxHeight: 480, display: "block", background: "#000" }}>
                            <source src={embed.src} type="video/mp4" />
                          </video>
                        ) : (
                          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 10, overflow: "hidden" }}>
                            <iframe src={embed.src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recording processing notice ──────────────────────────────────────── */}
            {!(session.recordings?.length) && recordingProcessing && (
              <div style={{ marginBottom: "1.75rem", borderRadius: 14, border: "1px solid #d4ead9", background: "#f0faf4", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2.5px solid rgba(29,107,60,0.25)", borderTopColor: "#1d6b3c", flexShrink: 0, animation: "oc-spin 0.9s linear infinite" }} />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1d6b3c", marginBottom: "0.2rem" }}>Recording is being processed…</div>
                    <div style={{ fontSize: "0.75rem", color: "#5a8a6a" }}>This usually takes 1–2 minutes. The video will appear here automatically.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher card */}
            <Link href={`/u/${teacherSlug}`} target="_blank" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.1rem 1.25rem", background: "#fff", border: "1px solid #e2ded6", borderRadius: 14, textDecoration: "none", color: "inherit" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatarBg(session.user.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                {avatarSrc ? <img src={avatarSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : teacherInitials(session.user)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f1410" }}>{teacherName(session.user)}</span>
                  {(() => {
                    const lvl = computeExpertiseLevel(session.user.sessionCount ?? 0, session.user.reviewCount ?? 0, session.user.avgRating ?? null);
                    return <span style={{ fontSize: "0.65rem", fontWeight: 700, color: lvl.color, background: lvl.bg, padding: "0.1rem 0.45rem", borderRadius: 100, whiteSpace: "nowrap" }}>{lvl.icon} {lvl.label}</span>;
                  })()}
                </div>
                {session.user.title && <div style={{ fontSize: "0.8rem", color: "#6b7a72", marginTop: "0.15rem" }}>{session.user.title}</div>}
                <div style={{ fontSize: "0.76rem", color: "#1d6b3c", marginTop: "0.2rem" }}>View full profile →</div>
              </div>
            </Link>

            {/* ── Ratings & Reviews ── visible once session scheduled time has passed */}
            {sessionHasStarted && (
              <div style={{ marginTop: "1.75rem", padding: "1.25rem 1.4rem", background: "#fff", border: "1px solid #e2ded6", borderRadius: 14 }}>
                {/* Section label */}
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7a72", marginBottom: "1rem" }}>
                  Ratings &amp; Reviews
                </div>

                {/* Prominent average rating block */}
                {ratedReviews.length > 0 && (() => {
                  const counts = [5, 4, 3, 2, 1].map(n => ({ n, c: ratedReviews.filter(r => r.rating === n).length }));
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1rem 1.2rem", background: "#faf7f2", border: "1px solid #ede9e2", borderRadius: 12, marginBottom: "1.25rem", flexWrap: "wrap" as const }}>
                      {/* Left: big number + stars */}
                      <div style={{ textAlign: "center", minWidth: 60 }}>
                        <div style={{ fontSize: "2.6rem", fontWeight: 800, color: "#0f1410", lineHeight: 1, fontFamily: "var(--font-fraunces), Georgia, serif" }}>{avgRating.toFixed(1)}</div>
                        <div style={{ color: "#e8a020", fontSize: "1rem", letterSpacing: "0.05em", margin: "0.25rem 0 0.15rem" }}>
                          {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "#6b7a72", fontWeight: 600 }}>{ratedReviews.length} {ratedReviews.length === 1 ? "review" : "reviews"}</div>
                      </div>

                      {/* Divider */}
                      <div style={{ width: 1, alignSelf: "stretch", background: "#e8e4de", flexShrink: 0 }} />

                      {/* Right: per-star bars */}
                      <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {counts.map(({ n, c }) => (
                          <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.72rem", color: "#6b7a72", width: 14, textAlign: "right", flexShrink: 0 }}>{n}</span>
                            <span style={{ color: "#e8a020", fontSize: "0.7rem", flexShrink: 0 }}>★</span>
                            <div style={{ flex: 1, height: 7, background: "#ede9e2", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: ratedReviews.length > 0 ? `${(c / ratedReviews.length) * 100}%` : "0%", background: n >= 4 ? "#1d6b3c" : n === 3 ? "#e8a020" : "#e05c3a", borderRadius: 99, transition: "width 0.3s" }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "#3a4140", width: 18, textAlign: "right", flexShrink: 0, fontWeight: c > 0 ? 600 : 400 }}>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Rating form — students only, one per session */}
                {/* Organizer comment form */}
                {isOrganizer && sessionHasStarted && (
                  <form onSubmit={handleOrganizerComment}
                    style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f0ede8" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f1410" }}>Post a comment</div>
                      <span style={{ fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.55rem", borderRadius: 100, background: "#edf7f1", color: "#1d6b3c", border: "1px solid #c4e0cc" }}>Organizer</span>
                    </div>
                    <textarea
                      ref={orgCommentRef}
                      value={orgComment}
                      onChange={e => setOrgComment(e.target.value)}
                      placeholder="Respond to your audience, add notes, or reply to a review…"
                      rows={3}
                      style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: 8, border: "1.5px solid #e2ded6", background: "#faf7f2", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", color: "#0f1410", resize: "vertical", boxSizing: "border-box" as const, outline: "none" }}
                    />
                    <div style={{ marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button type="submit" disabled={orgCommentLoading || !orgComment.trim()}
                        style={{ padding: "0.5rem 1.2rem", borderRadius: 8, border: "none", background: orgCommentLoading || !orgComment.trim() ? "#c8c4be" : "#1d6b3c", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.83rem", fontWeight: 600, cursor: orgCommentLoading || !orgComment.trim() ? "default" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {orgCommentLoading
                          ? <><span style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Posting…</>
                          : "Post Comment"}
                      </button>
                      {orgComment.trim() && <button type="button" onClick={() => setOrgComment("")} style={{ background: "none", border: "none", fontSize: "0.78rem", color: "#6b7a72", cursor: "pointer", padding: 0 }}>Cancel</button>}
                    </div>
                    {orgCommentError && <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#c0392b" }}>{orgCommentError}</div>}
                  </form>
                )}

                {!isOrganizer && !ratingDone && (
                  <form onSubmit={handleSubmitRating}
                    style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1px solid #f0ede8" }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f1410", marginBottom: "0.6rem" }}>Rate this webinar</div>
                    <StarInput value={ratingValue} onChange={setRatingValue} />
                    <textarea
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Share your experience (optional)…"
                      rows={3}
                      style={{ width: "100%", marginTop: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: 8, border: "1.5px solid #e2ded6", background: "#faf7f2", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", color: "#0f1410", resize: "vertical", boxSizing: "border-box", outline: "none" }}
                    />

                    {/* Captcha row */}
                    <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f5f2ee", border: "1px solid #e2ded6", borderRadius: 8, padding: "0.45rem 0.75rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "#3a4140", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.04em" }}>
                          {captchaChallenge} = ?
                        </span>
                        <input
                          type="number"
                          value={captchaInput}
                          onChange={e => setCaptchaInput(e.target.value)}
                          placeholder="Answer"
                          style={{ width: 68, padding: "0.3rem 0.5rem", borderRadius: 6, border: "1.5px solid #e2ded6", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", textAlign: "center", outline: "none", background: "#fff" }}
                        />
                        <button type="button" onClick={loadCaptcha} title="Refresh captcha"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7a72", fontSize: "1rem", padding: 0, lineHeight: 1 }}>
                          ↻
                        </button>
                      </div>
                      <button type="submit" disabled={ratingLoading || !ratingValue}
                        style={{ padding: "0.55rem 1.25rem", borderRadius: 8, border: "none", background: ratingLoading || !ratingValue ? "#c8c4be" : "#1d6b3c", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: ratingLoading || !ratingValue ? "default" : "pointer", display: "flex", alignItems: "center", gap: "0.4rem", transition: "background 0.15s" }}>
                        {ratingLoading
                          ? <><span style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Submitting…</>
                          : "Submit Review"}
                      </button>
                    </div>
                    {ratingError && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#c0392b" }}>{ratingError}</div>
                    )}
                  </form>
                )}

                {ratingDone && !isOrganizer && (
                  <div style={{ marginBottom: reviews.length > 0 ? "1.25rem" : 0, padding: "0.75rem 1rem", background: "#f0faf4", border: "1px solid #d4ead9", borderRadius: 8, fontSize: "0.85rem", color: "#1d6b3c", fontWeight: 500 }}>
                    ✓ Thanks for your review!
                  </div>
                )}

                {/* Reviews list — data-nosnippet prevents Google using UGC text in search snippets */}
                {reviews.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "0.75rem 0", fontSize: "0.85rem", color: "#a0a89a" }}>
                    No reviews yet — be the first to rate this session.
                  </div>
                ) : (
                  <div data-nosnippet style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {reviews.map((r, i) => {
                      const isOrgReply = r.rating === 0;
                      return (
                        <div key={r.id} style={{ paddingBottom: i < reviews.length - 1 ? "1rem" : 0, borderBottom: i < reviews.length - 1 ? "1px solid #f0ede8" : "none", paddingLeft: isOrgReply ? "0.85rem" : 0, borderLeft: isOrgReply ? "3px solid #1d6b3c" : "none" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: isOrgReply ? "#1d6b3c" : "#6b7a72", color: "#fff", fontSize: "0.68rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                                {r.authorName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f1410" }}>{r.authorName}</span>
                                  {isOrgReply && (
                                    <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: 100, background: "#edf7f1", color: "#1d6b3c", border: "1px solid #c4e0cc" }}>Organizer</span>
                                  )}
                                </div>
                                {!isOrgReply && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.15rem" }}>
                                    <span style={{ fontSize: "0.82rem", color: "#e8a020", letterSpacing: "0.05em", lineHeight: 1 }}>
                                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                    </span>
                                    <span style={{ fontSize: "0.7rem", color: "#6b7a72", fontWeight: 500 }}>{r.rating}.0</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isOrganizer && !isOrgReply && (
                              <button type="button" onClick={() => {
                                setOrgComment(`@${r.authorName} `);
                                setTimeout(() => { orgCommentRef.current?.focus(); orgCommentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
                              }} style={{ background: "none", border: "1px solid #e2ded6", borderRadius: 6, fontSize: "0.68rem", color: "#6b7a72", cursor: "pointer", padding: "0.15rem 0.5rem", fontFamily: "var(--font-dm-sans), sans-serif", flexShrink: 0 }}>
                                ↩ Reply
                              </button>
                            )}
                          </div>
                          {r.comment && (
                            <p style={{ margin: 0, fontSize: "0.85rem", color: isOrgReply ? "#1d4a2a" : "#3a4140", lineHeight: 1.6 }}>{r.comment}</p>
                          )}
                          <div style={{ marginTop: "0.3rem", fontSize: "0.72rem", color: "#a0a89a" }}>
                            {fmtDateShort(r.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Share section */}
            <div style={{ marginTop: "1.75rem", padding: "1.25rem 1.4rem", background: "#fff", border: "1px solid #e2ded6", borderRadius: 14 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7a72", marginBottom: "1rem" }}>
                Share this webinar
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
                <div style={{ flex: 1, fontSize: "0.78rem", color: "#6b7a72", background: "#faf7f2", border: "1px solid #e2ded6", borderRadius: 8, padding: "0.45rem 0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                  {typeof window !== "undefined" ? window.location.href : `open-webinar.com/session/${session.id}`}
                </div>
                <button onClick={handleCopy} style={{ flexShrink: 0, padding: "0.45rem 1rem", borderRadius: 8, border: copied ? "1.5px solid #1d6b3c" : "1.5px solid #e2ded6", background: copied ? "#d4ead9" : "#fff", color: copied ? "#1d6b3c" : "#3a4140", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                  {copied ? "✓ Copied!" : "Copy link"}
                </button>
              </div>
              <div className="sd-share-icons">
                {[
                  { label: "X (Twitter)", color: "#000", href: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(session.title)}&url=${encodeURIComponent(window.location.href)}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.266 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { label: "WhatsApp", color: "#25d366", href: () => `https://wa.me/?text=${encodeURIComponent(session.title + "\n" + window.location.href)}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
                  { label: "LinkedIn", color: "#0a66c2", href: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                  { label: "Facebook", color: "#1877f2", href: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                  { label: "Telegram", color: "#26a5e4", href: () => `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(session.title)}`, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
                ].map(({ label, color, href, icon }) => (
                  <a key={label} href={href()} target="_blank" rel="noopener noreferrer" title={`Share on ${label}`}
                    style={{ width: 40, height: 40, borderRadius: 10, border: "1.5px solid #e2ded6", background: "#fff", color, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.18s", flexShrink: 0 }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = color; el.style.color = "#fff"; el.style.borderColor = color; el.style.transform = "translateY(-2px)"; el.style.boxShadow = `0 4px 12px ${color}40`; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "#fff"; el.style.color = color; el.style.borderColor = "#e2ded6"; el.style.transform = ""; el.style.boxShadow = ""; }}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — sticky sidebar */}
          <div className="sd-sidebar" style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 16, overflow: "hidden" }}>
            {/* Sidebar header */}
            <div style={{ padding: "1rem 1.25rem 0.85rem", borderBottom: "1px solid #f0ede8", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const, color: "#1d6b3c" }}>Webinar Details</span>
            </div>

            {/* Detail rows */}
            <div style={{ padding: "0.25rem 0 0.5rem" }}>

              {/* Date & Time */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", padding: "0.9rem 1.25rem" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#edf7f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Date &amp; Time</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f1410" }}>{fmtDate(session.scheduledAt)}</div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7a72", marginTop: "0.1rem" }}>{fmtTime(session.scheduledAt)} → {endTime}</div>
                </div>
              </div>

              <div style={{ height: 1, background: "#f5f2ee", margin: "0 1.25rem" }} />

              {/* Duration */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", padding: "0.9rem 1.25rem" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "#edf0f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a4f7a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Duration</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f1410" }}>{session.duration} minutes</div>
                </div>
              </div>

              <div style={{ height: 1, background: "#f5f2ee", margin: "0 1.25rem" }} />

              {/* Format */}
              <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", padding: "0.9rem 1.25rem" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: isWebinar ? "#ddeaf8" : "#d4ead9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isWebinar ? "#1a4f7a" : "#1d6b3c"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Format</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: typeBadge.color }}>{isWebinar ? "Webinar" : "Live Class"}</div>
                </div>
              </div>

              <div style={{ height: 1, background: "#f5f2ee", margin: "0 1.25rem" }} />

              {/* Attendance */}
              {session.audienceLimit ? (
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start", padding: "0.9rem 1.25rem" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#fef3e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c47c1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Attendance</div>
                    {session._count !== undefined && (() => {
                      const reg = session._count!.registrations;
                      const cap = session.audienceLimit!;
                      const pct = Math.min(100, Math.round((reg / cap) * 100));
                      const full = reg >= cap;
                      return (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                            <span style={{ fontWeight: 700, color: full ? "#9b2c4e" : "#0f1410" }}>{reg} <span style={{ fontWeight: 400, color: "#6b7a72" }}>/ {cap.toLocaleString()} seats</span></span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: full ? "#9b2c4e" : "#1d6b3c" }}>{full ? "Full" : `${cap - reg} left`}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 100, background: "#e8e4de", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 100, background: full ? "#c0392b" : pct >= 80 ? "#e8a020" : "#1d6b3c", transition: "width 0.4s" }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : session._count !== undefined ? (
                <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", padding: "0.9rem 1.25rem" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "#edf7f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d6b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Attendance</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f1410" }}>{session._count.registrations} registered</div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7a72", marginTop: "0.1rem" }}>Open enrollment · no seat limit</div>
                  </div>
                </div>
              ) : null}

              {/* Skill level */}
              {session.skillLevel && (
                <>
                  <div style={{ height: 1, background: "#f5f2ee", margin: "0 1.25rem" }} />
                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", padding: "0.9rem 1.25rem" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: levelBg + "55", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={levelColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#a0a89a", marginBottom: "0.2rem" }}>Skill Level</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: levelColor }}>{session.skillLevel}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {isOrganizer ? (
              session.sessionStatus && SESSION_STATUS_META[session.sessionStatus] ? (() => {
                const sm = SESSION_STATUS_META[session.sessionStatus!];
                const qm = session.qualityFlag ? QUALITY_FLAG_META[session.qualityFlag] ?? null : null;
                return (
                  <div style={{ borderRadius: 10, border: `1.5px solid ${sm.color}35`, background: sm.bg, overflow: "hidden" }}>
                    <div style={{ height: 3, background: sm.color, opacity: 0.6 }} />
                    <div style={{ padding: "0.9rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: qm ? "0.45rem" : 0 }}>
                        <span style={{ fontSize: "1rem" }}>{sm.icon}</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: sm.color }}>Session {sm.label}</span>
                      </div>
                      {qm && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.18rem 0.55rem", borderRadius: 100, background: qm.bg, color: qm.color, display: "inline-block" }}>
                          {qm.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "1.5px solid #d4ead9", background: "#f0faf4", color: "#1d6b3c", fontSize: "0.88rem", fontWeight: 600, textAlign: "center", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  🎙️ You&apos;re hosting this session
                </div>
              )
            ) : status === "closed" ? (
              <button disabled style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "1px solid #e2ded6", background: "#faf7f2", color: "#6b7a72", fontSize: "0.9rem", fontWeight: 600, cursor: "default", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                🔒 Webinar Closed
              </button>
            ) : status === "live" ? (
              /* ── LIVE: gate join behind registration ── */
              isOrganizer ? (
                <button onClick={() => router.push(`/join/${id}`)}
                  style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "none", background: "#1d6b3c", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  🎙️ Start Session
                </button>
              ) : isRegistered ? (
                <button onClick={() => {
                  if (!localStorage.getItem("token")) { router.push(`/login?redirect=/join/${id}`); return; }
                  router.push(`/join/${id}`);
                }}
                  style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "none", background: "#1d6b3c", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  ▶ Join Now
                </button>
              ) : (
                /* Not registered — must register before joining */
                <div>
                  <button onClick={() => {
                    if (!localStorage.getItem("token")) { router.push(`/login?redirect=/session/${id}`); return; }
                    handleRegisterToggle();
                  }} disabled={registerLoading}
                    style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: "none", background: "#1a4f7a", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: registerLoading ? "default" : "pointer", fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    {registerLoading
                      ? <><span style={{ width: 15, height: 15, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Registering…</>
                      : <>🔔 Register to Join (Session is Live)</>}
                  </button>
                  <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#6b7a72", textAlign: "center" as const }}>
                    Register first, then you can join the live session.
                  </div>
                </div>
              )
            ) : (
              /* ── UPCOMING: register/unregister ── */
              <button onClick={handleRegisterToggle} disabled={registerLoading}
                style={{ width: "100%", padding: "0.85rem", borderRadius: 10, border: isRegistered ? "1.5px solid #1d6b3c" : "none", background: isRegistered ? "#fff" : "#1a4f7a", color: isRegistered ? "#1d6b3c" : "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: registerLoading ? "default" : "pointer", fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "all 0.15s" }}>
                {registerLoading
                  ? <><span style={{ width: 15, height: 15, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Updating…</>
                  : isRegistered ? <>✓ Registered — Click to cancel</> : <>🔔 Register Free</>}
              </button>
            )}

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link href="/live" style={{ fontSize: "0.78rem", color: "#6b7a72", textDecoration: "none" }}>
                ← Browse all webinars
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>
      {/* ── Mobile sticky CTA bar ─────────────────────────────────────────── */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid #e2ded6",
          padding: "0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom))",
          display: "flex", alignItems: "center", gap: "0.75rem",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        }}>
          {/* Left: status pill */}
          <div style={{ flexShrink: 0 }}>
            {status === "live" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#dc2626", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.7rem", borderRadius: 100, whiteSpace: "nowrap" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite", display: "inline-block" }} />
                LIVE
              </span>
            ) : status === "upcoming" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.7rem", borderRadius: 100, whiteSpace: "nowrap" }}>
                🗓 Upcoming
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#f0ede8", color: "#6b7a72", fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.7rem", borderRadius: 100, whiteSpace: "nowrap" }}>
                🔒 Ended
              </span>
            )}
          </div>

          {/* Right: CTA button */}
          <div style={{ flex: 1 }}>
            {isOrganizer ? (
              status === "live" ? (
                <button onClick={() => router.push(`/join/${id}`)}
                  style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: "none", background: "#1d6b3c", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  🎙️ Start Session
                </button>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "#6b7a72", textAlign: "center" }}>You&apos;re hosting this session</div>
              )
            ) : status === "closed" ? (
              <button disabled style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: "1px solid #e2ded6", background: "#faf7f2", color: "#6b7a72", fontSize: "0.9rem", fontWeight: 600, cursor: "default", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                🔒 Webinar Closed
              </button>
            ) : status === "live" ? (
              isRegistered ? (
                <button onClick={() => {
                  if (!localStorage.getItem("token")) { router.push(`/login?redirect=/join/${id}`); return; }
                  router.push(`/join/${id}`);
                }}
                  style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: "none", background: "#1d6b3c", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                  ▶ Join Now
                </button>
              ) : (
                <button onClick={() => {
                  if (!localStorage.getItem("token")) { router.push(`/login?redirect=/session/${id}`); return; }
                  handleRegisterToggle();
                }} disabled={registerLoading}
                  style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: "none", background: "#1a4f7a", color: "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: registerLoading ? "default" : "pointer", fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {registerLoading
                    ? <><span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Registering…</>
                    : <>🔔 Register to Join</>}
                </button>
              )
            ) : (
              <button onClick={() => {
                if (!localStorage.getItem("token")) { router.push(`/login?redirect=/session/${id}`); return; }
                handleRegisterToggle();
              }} disabled={registerLoading}
                style={{ width: "100%", padding: "0.7rem", borderRadius: 10, border: isRegistered ? "1.5px solid #1d6b3c" : "none", background: isRegistered ? "#fff" : "#1a4f7a", color: isRegistered ? "#1d6b3c" : "#fff", fontSize: "0.9rem", fontWeight: 700, cursor: registerLoading ? "default" : "pointer", fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "all 0.15s" }}>
                {registerLoading
                  ? <><span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} /> Updating…</>
                  : isRegistered ? <>✓ Registered — Tap to cancel</> : <>🔔 Register Free</>}
              </button>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
