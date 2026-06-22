"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import { getProfile, updateProfile, uploadAvatar, clearProfileCache, getCategories, getDashboard, getPublicProfile, ProfileData, CategoryData, ReviewData, fullName, initials as profileInitials, makeProfileSlug, computeExpertiseLevel } from "@/lib/profile";
import { getMySessions, deleteSession, cancelSession, SessionData } from "@/lib/session";

/* ── design tokens ── */
const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sun: "#e8a020", sunLight: "#fdf3e0",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  clayLight: "#f8ede5",
  cream: "#faf7f2", white: "#ffffff", border: "#e2ded6",
  r: "16px", rs: "10px",
  ff: "var(--font-dm-sans), sans-serif",
  ffD: "var(--font-fraunces), Georgia, serif",
};

/* ── static data (hardcoded for MVP) ── */

const REVIEWS = [
  { initials: "AK", bg: "#1d6b3c", name: "Arjun Kumar", stars: "★★★★★", date: "Nov 2025", text: "Sarah's sessions are the most practical I've attended. Completely changed how I think about product strategy.", session: "Product Strategy for 2026" },
  { initials: "PM", bg: "#8b5cf6", name: "Priya Mehta", stars: "★★★★★", date: "Oct 2025", text: "After Sarah's session I built my own dashboard at work. Highly recommend to anyone in product or growth.", session: "Intro to SaaS Metrics" },
];
const INDIA_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Maharashtra","Madhya Pradesh","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"];
const TIMEZONES = ["Asia/Kolkata (IST, UTC+5:30)","America/New_York (EST, UTC-5)","America/Los_Angeles (PST, UTC-8)","Europe/London (GMT, UTC+0)","Asia/Singapore (SGT, UTC+8)","Asia/Dubai (GST, UTC+4)","Australia/Sydney (AEDT, UTC+11)"];

/* ── helpers ── */
const getInitials   = (p: Partial<ProfileData>) => profileInitials(p);
const getDisplayName = (p: Partial<ProfileData>) => fullName(p);
function getLocation(p: Partial<ProfileData>) {
  return [p.city, p.state, p.country].filter(Boolean).join(", ");
}

/* ── shared form styles ── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem",
  border: `1.5px solid ${T.border}`, borderRadius: T.rs,
  fontFamily: T.ff, fontSize: "0.875rem", color: T.ink,
  background: T.white, outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none" as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%236b7a72' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1rem center",
  paddingRight: "2.5rem",
  cursor: "pointer",
};
const labelStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  fontSize: "0.8rem", fontWeight: 600, color: T.ink, marginBottom: "0.4rem",
};
const hintStyle: React.CSSProperties = { fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.3rem" };

/* section card used in both view and edit */
const sectionCard: React.CSSProperties = {
  background: T.white, border: `1px solid ${T.border}`,
  borderRadius: T.r, padding: "1.5rem 1.75rem", marginBottom: "1.25rem",
};

/* ── Toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ position: "relative", width: 42, height: 24, borderRadius: 100, background: checked ? T.leaf : T.border, cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: checked ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: T.white, boxShadow: "0 1px 4px rgba(0,0,0,0.15)", transition: "left 0.2s" }} />
    </div>
  );
}

/* ── Tag input ── */
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("");
  function add() {
    const v = input.trim().replace(/,/g, "");
    if (v && !tags.includes(v) && tags.length < 10) { onChange([...tags, v]); setInput(""); }
  }
  function remove(t: string) { onChange(tags.filter((x) => x !== t)); }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && tags.length) remove(tags[tags.length - 1]);
  }
  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0.6rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: T.rs, background: T.white, minHeight: 46, cursor: "text", boxSizing: "border-box" }}
      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
    >
      {tags.map((t) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: T.skyLight, color: T.sky, fontSize: "0.75rem", fontWeight: 500, padding: "0.2rem 0.5rem 0.2rem 0.65rem", borderRadius: 100, border: "1px solid rgba(26,79,122,0.15)", whiteSpace: "nowrap" }}>
          {t}
          <button onClick={() => remove(t)} style={{ background: "none", border: "none", cursor: "pointer", color: T.sky, fontSize: "0.85rem", lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input
        value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
        placeholder={tags.length ? "" : "Add a tag…"}
        style={{ border: "none", outline: "none", fontFamily: T.ff, fontSize: "0.82rem", color: T.ink, minWidth: 120, flex: 1, background: "transparent" }}
      />
    </div>
  );
}

/* ── Social input row ── */
function SocialRow({ icon, bg, label, value, onChange, placeholder }: { icon: string; bg: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
      <div style={{ width: 36, height: 36, borderRadius: T.rs, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{icon}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: T.ink, width: 80, flexShrink: 0 }}>{label}</div>
      <input style={{ ...inputStyle, flex: 1 }} type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

/* ── Edit section header ── */
function EditSectionHeader({ emoji, bg, title, sub }: { emoji: string; bg: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 34, height: 34, borderRadius: T.rs, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{emoji}</div>
      <div>
        <div style={{ fontFamily: T.ffD, fontSize: "1rem", fontWeight: 700, color: T.ink }}>{title}</div>
        <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── Section title with green underline ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: T.ffD, fontSize: "1rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", marginBottom: "1rem" }}>
      {children}
      <div style={{ width: 28, height: 3, background: T.leaf, borderRadius: 2, marginTop: "0.3rem" }} />
    </div>
  );
}

/* ── session status / quality metadata ── */
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
const TERMINAL = ["COMPLETED", "CANCELLED", "NO_SHOW", "ABANDONED"];

function SessionStatusBadge({ sessionStatus, qualityFlag }: { sessionStatus?: string | null; qualityFlag?: string | null }) {
  const sm = sessionStatus ? SESSION_STATUS_META[sessionStatus] : null;
  const qm = qualityFlag && qualityFlag !== "NORMAL" ? QUALITY_FLAG_META[qualityFlag] : null;
  if (!sm && !qm) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      {sm && <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.6rem", borderRadius: 100, background: sm.bg, color: sm.color, letterSpacing: "0.02em" }}>{sm.icon} {sm.label}</span>}
      {qm && <span style={{ fontSize: "0.62rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 100, background: qm.bg, color: qm.color, letterSpacing: "0.02em" }}>{qm.label}</span>}
    </span>
  );
}

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"view" | "edit">("view");
  const [sessTab, setSessTab] = useState<"upcoming" | "draft" | "completed">("upcoming");
  const [mySessions, setMySessions] = useState<SessionData[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [teacherStats, setTeacherStats] = useState<{ totalSessions: number; totalReviews: number; avgRating: number | null; subscriberCount: number }>({ totalSessions: 0, totalReviews: 0, avgRating: null, subscriberCount: 0 });
  const [allReviews, setAllReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const [categories, setCategories] = useState<CategoryData[]>([]);

  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "", primaryCategory: "", title: "", subject: "",
    bio: "", tags: [] as string[],
    country: "", state: "", city: "", timezone: "",
    phone: "", linkedinUrl: "", twitterUrl: "", websiteUrl: "", youtubeUrl: "",
    notifySignups: true, notifyReviews: true, notifyReminders: true, notifyDigest: false, profilePublic: true,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { router.push("/login"); return; }
    getMySessions().then(setMySessions).catch(() => {});
    getDashboard().then(d => setTeacherStats({ totalSessions: d.stats.totalSessions, totalReviews: d.stats.totalReviews, avgRating: d.stats.avgRating, subscriberCount: d.stats.subscriberCount })).catch(() => {});
    getProfile()
      .then((p) => {
        setProfile(p);
        getPublicProfile(p.id).then(pub => setAllReviews(pub.reviews.filter(r => r.rating > 0))).catch(() => {});
        setForm({
          firstName: p.firstName || "", lastName: p.lastName || "",
          gender: p.gender || "", primaryCategory: p.primaryCategory || "",
          title: p.title || "", subject: p.subject || "",
          bio: p.bio || "",
          tags: (() => { try { return p.expertiseTags ? JSON.parse(p.expertiseTags) : []; } catch { return []; } })(),
          country: p.country || "", state: p.state || "", city: p.city || "",
          timezone: p.timezone || "Asia/Kolkata (IST, UTC+5:30)",
          phone: p.phone || "", linkedinUrl: p.linkedinUrl || "",
          twitterUrl: p.twitterUrl || "", websiteUrl: p.websiteUrl || "",
          youtubeUrl: p.youtubeUrl || "",
          notifySignups: p.notifySignups, notifyReviews: p.notifyReviews,
          notifyReminders: p.notifyReminders, notifyDigest: p.notifyDigest,
          profilePublic: p.profilePublic,
        });
      })
      .catch(() => { localStorage.removeItem("token"); clearProfileCache(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function handleDeleteSession(id: number) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteSession(id);
      setMySessions(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancel this session? Students will no longer be able to join. This cannot be undone.")) return;
    setCancellingId(id);
    try {
      await cancelSession(id);
      setMySessions(prev => prev.map(s => s.id === id ? { ...s, sessionStatus: "CANCELLED" } : s));
    } catch { /* ignore */ }
    finally { setCancellingId(null); }
  }

  function copySessionLink(id: number) {
    const url = `${window.location.origin}/session/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({
        firstName: form.firstName, lastName: form.lastName,
        gender: form.gender, primaryCategory: form.primaryCategory,
        title: form.title, subject: form.subject, bio: form.bio,
        expertiseTags: JSON.stringify(form.tags),
        country: form.country, state: form.state, city: form.city,
        timezone: form.timezone, phone: form.phone,
        linkedinUrl: form.linkedinUrl, twitterUrl: form.twitterUrl,
        websiteUrl: form.websiteUrl, youtubeUrl: form.youtubeUrl,
        notifySignups: form.notifySignups, notifyReviews: form.notifyReviews,
        notifyReminders: form.notifyReminders, notifyDigest: form.notifyDigest,
        profilePublic: form.profilePublic,
      });
      setProfile(updated);
      showToast("✓ Profile saved successfully!");
      setTimeout(() => setTab("view"), 1200);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Only JPG, PNG or WebP files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("File must be under 2 MB");
      return;
    }
    setUploading(true);
    try {
      const updated = await uploadAvatar(file);
      setProfile(updated);
      showToast("✓ Photo updated!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.cream, fontFamily: T.ff, color: T.inkMuted }}>
        Loading profile…
      </div>
    );
  }
  if (!profile) return null;

  const userInitials = getInitials(profile);
  const userName = getDisplayName(profile);
  const loc = getLocation(profile);
  const viewTags: string[] = (() => { try { return profile.expertiseTags ? JSON.parse(profile.expertiseTags) : []; } catch { return []; } })();


  return (
    <div style={{ fontFamily: T.ff, background: T.cream, minHeight: "100vh", overflowX: "hidden", fontSize: 15, lineHeight: 1.6, color: T.ink }}>

      <Header
        userName={userName}
        userRole={profile.title || "Teacher"}
        userInitials={userInitials}
        activeLink="profile"
        onSignOut={() => { localStorage.removeItem("token"); router.push("/login"); }}
      />

      {/* ── COVER ── */}
      <div style={{ height: 200, marginTop: isMobile ? 57 : 64, background: T.ink, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(29,107,60,0.2)", filter: "blur(55px)", right: -60, top: -80 }} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(26,79,122,0.15)", filter: "blur(55px)", left: "30%", bottom: -60 }} />
        <div style={{ position: "absolute", width: 150, height: 150, borderRadius: "50%", background: "rgba(232,160,32,0.1)", filter: "blur(55px)", left: 60, top: 20 }} />
        <div style={{ position: "absolute", top: "1.25rem", left: isMobile ? "1rem" : "2rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", zIndex: 1 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Home</Link>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>›</span>
          <Link href="/dashboard" style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Dashboard</Link>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>›</span>
          <span style={{ color: "rgba(255,255,255,0.7)" }}>My Profile</span>
        </div>
      </div>

      {/* ── PROFILE HEADER CARD ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "0 1rem" : "0 2rem", position: "relative" }}>
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: isMobile ? "1.25rem" : "1.75rem 2rem", marginTop: isMobile ? -48 : -72, position: "relative", zIndex: 2, display: "flex", alignItems: "flex-start", gap: "1.25rem", flexWrap: "wrap" as const, boxShadow: "0 4px 24px rgba(15,20,16,0.07)" }}>

          {/* avatar — clickable, shows hover overlay */}
          <div
            style={{ flexShrink: 0, position: "relative", cursor: "pointer" }}
            onClick={() => fileInputRef.current?.click()}
            title="Change photo"
          >
            <div style={{ width: 96, height: 96, borderRadius: 20, background: "linear-gradient(135deg, #1a4f7a, #0e3359)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.ffD, fontSize: "1.75rem", fontWeight: 700, color: T.white, border: `3px solid ${T.white}`, boxShadow: "0 4px 16px rgba(26,79,122,0.25)", overflow: "hidden", position: "relative" }}>
              {profile.avatarUrl
                ? <img src={`http://localhost:3002${profile.avatarUrl}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : userInitials}
              {/* hover overlay */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", opacity: uploading ? 1 : 0, transition: "opacity 0.2s" }}
                onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}>
                {uploading
                  ? <span style={{ fontSize: "0.65rem", color: T.white, fontWeight: 600 }}>Uploading…</span>
                  : <>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span style={{ fontSize: "0.65rem", color: T.white, fontWeight: 600 }}>Change photo</span>
                    </>}
              </div>
            </div>
          </div>
          {/* hidden file input shared by header avatar + edit upload button */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleAvatarFile} />

          {/* info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
              <span style={{ fontFamily: T.ffD, fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: T.ink }}>{userName}</span>
              {(() => {
                const lvl = computeExpertiseLevel(teacherStats.totalSessions, teacherStats.totalReviews, teacherStats.avgRating);
                return <span style={{ fontSize: "0.7rem", fontWeight: 700, color: lvl.color, background: lvl.bg, padding: "0.15rem 0.55rem", borderRadius: 100, whiteSpace: "nowrap" }}>{lvl.icon} {lvl.label}</span>;
              })()}
            </div>
            {(profile.title || profile.primaryCategory) && (
              <div style={{ fontSize: "0.9rem", color: T.inkMuted, marginBottom: "0.5rem" }}>
                {profile.title}{profile.primaryCategory ? ` · ${profile.primaryCategory}` : ""}
              </div>
            )}
            {loc && (
              <div style={{ fontSize: "0.8rem", color: T.inkMuted, display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.75rem" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {loc}
              </div>
            )}
            <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
              {([
                teacherStats.totalReviews > 0 && ["⭐", teacherStats.avgRating?.toFixed(1) ?? "—", `(${teacherStats.totalReviews} reviews)`],
                ["👥", teacherStats.subscriberCount.toLocaleString(), "Subscribers"],
                ["🎙", teacherStats.totalSessions.toString(), "Sessions"],
              ].filter(Boolean) as [string, string, string][]).map(([ic, val, lbl]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: T.inkSoft }}>
                  <span>{ic}</span>
                  <span style={{ fontFamily: T.ffD, fontSize: "1rem", fontWeight: 700, color: T.ink }}>{val}</span>
                  <span style={{ color: T.inkMuted, fontSize: "0.75rem" }}>&nbsp;{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* actions */}
          <div style={{ flexShrink: 0, width: isMobile ? "100%" : undefined }}>
            {mySessions.length >= 1 ? (
              <Link href={`/u/${makeProfileSlug(profile)}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", borderRadius: 100, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft, fontFamily: T.ff, transition: "all 0.2s", textDecoration: "none" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                View Public Profile
              </Link>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", borderRadius: 100, fontSize: "0.8rem", fontWeight: 500, border: `1.5px solid ${T.border}`, background: T.cream, color: T.inkMuted, fontFamily: T.ff, cursor: "not-allowed" }} title="Create and publish at least 1 session to unlock your public profile">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                View Public Profile
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ maxWidth: 1160, margin: "1rem auto 0", padding: isMobile ? "0 1rem" : "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "0.35rem" }}>
          {(["view", "edit"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "0.45rem 1rem", borderRadius: 100, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", border: `1.5px solid ${tab === t ? T.leaf : T.border}`, background: tab === t ? T.leaf : T.white, color: tab === t ? T.white : T.inkMuted, transition: "all 0.2s", fontFamily: T.ff }}>
              {t === "view" ? "👁 Profile View" : "✏️ Edit Profile"}
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY — always a 2-col grid; view=fragment, edit=full-span ── */}
      <div style={{ maxWidth: 1160, margin: "1.25rem auto 3rem", padding: isMobile ? "0 1rem" : "0 2rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: "1.5rem", alignItems: "start" }}>

        {/* ════ VIEW PANEL (React fragment = display:contents equivalent) ════ */}
        {tab === "view" && (
          <>
            <main>
              {/* About */}
              <div style={sectionCard}>
                <SectionTitle>About Me</SectionTitle>
                {profile.bio
                  ? <p style={{ fontSize: "0.875rem", color: T.inkSoft, lineHeight: 1.8, margin: 0 }}>{profile.bio}</p>
                  : <p style={{ fontSize: "0.875rem", color: T.inkMuted, fontStyle: "italic", margin: 0 }}>No bio yet. Switch to Edit Profile to add one.</p>
                }
              </div>

              {/* Expertise */}
              {viewTags.length > 0 && (
                <div style={sectionCard}>
                  <SectionTitle>Expertise</SectionTitle>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {viewTags.map((tag) => (
                      <span key={tag} style={{ fontSize: "0.78rem", fontWeight: 500, padding: "0.3rem 0.85rem", borderRadius: 100, background: T.skyLight, color: T.sky, border: "1px solid rgba(26,79,122,0.15)" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions */}
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem 0" }}>
                  <SectionTitle>My Webinars</SectionTitle>
                  <Link href="/session" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", borderRadius: T.rs, background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                    + New Webinar
                  </Link>
                </div>
                {/* tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, padding: "0 1.25rem" }}>
                  {(["upcoming", "draft", "completed"] as const).map((t) => {
                    const nowMs = now.getTime();
                    const count = mySessions.filter(s =>
                      t === "upcoming" ? s.status === "published" && !TERMINAL.includes(s.sessionStatus ?? "") && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 > nowMs :
                      t === "draft" ? s.status === "draft" :
                      TERMINAL.includes(s.sessionStatus ?? "") || (s.status === "published" && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 <= nowMs)
                    ).length;
                    const badgeBg    = { upcoming: T.leafLight, draft: T.sunLight, completed: T.border };
                    const badgeColor = { upcoming: T.leaf,      draft: T.sun,      completed: T.inkMuted };
                    return (
                      <button key={t} onClick={() => setSessTab(t)} style={{ padding: "0.9rem 1.1rem", fontSize: "0.85rem", fontWeight: sessTab === t ? 600 : 500, color: sessTab === t ? T.leaf : T.inkMuted, cursor: "pointer", border: "none", borderBottom: `2px solid ${sessTab === t ? T.leaf : "transparent"}`, marginBottom: -1, background: "none", fontFamily: T.ff, transition: "all 0.15s", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                        <span style={{ fontSize: "0.68rem", borderRadius: 100, padding: "0.1rem 0.45rem", fontWeight: 700, background: badgeBg[t], color: badgeColor[t] }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                {/* session rows */}
                <div style={{ padding: "0 1.25rem 1.25rem" }}>
                  {(() => {
                    const nowMs = now.getTime();
                    const filtered = mySessions.filter(s =>
                      sessTab === "upcoming" ? s.status === "published" && !TERMINAL.includes(s.sessionStatus ?? "") && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 > nowMs :
                      sessTab === "draft" ? s.status === "draft" :
                      TERMINAL.includes(s.sessionStatus ?? "") || (s.status === "published" && new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60_000 <= nowMs)
                    );
                    if (filtered.length === 0) return (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: T.inkMuted }}>
                        <p style={{ fontFamily: T.ffD, fontSize: "1rem", color: T.inkSoft, marginBottom: "0.5rem" }}>
                          {sessTab === "draft" ? "No drafts yet." : sessTab === "upcoming" ? "No upcoming sessions." : "No completed sessions yet."}
                        </p>
                        {sessTab !== "completed" && <Link href="/session" style={{ color: T.leaf, fontWeight: 600, textDecoration: "none", fontSize: "0.875rem" }}>Create one →</Link>}
                      </div>
                    );
                    return filtered.map((s, i) => {
                      const d         = new Date(s.scheduledAt);
                      const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
                      const typeBg    = s.type === "webinar" ? T.skyLight : T.leafLight;
                      const typeColor = s.type === "webinar" ? T.sky      : T.leaf;
                      const openMs    = d.getTime() - 30 * 60_000;
                      const closeMs   = d.getTime() + (s.duration + 30) * 60_000;
                      const joinOpen  = nowMs >= openMs  && nowMs <= closeMs;
                      const beforeOpen = nowMs < openMs;
                      const isLive    = nowMs >= d.getTime() && nowMs <= closeMs;
                      const openTime  = new Date(openMs);
                      const sameDay   = openTime.toDateString() === now.toDateString();
                      const openLabel = sameDay
                        ? openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : openTime.toLocaleDateString([], { month: "short", day: "numeric" }) + " at " + openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div key={s.id} style={{ padding: "1rem 0", borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "flex-start", gap: isMobile ? "0.65rem" : "1rem" }}>

                            {/* date badge + details — clickable */}
                            <a href={`/session/${s.id}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flex: 1, minWidth: 0, width: isMobile ? "100%" : undefined, textDecoration: "none", color: "inherit" }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>

                              {/* date badge */}
                              <div style={{ width: 52, flexShrink: 0, textAlign: "center", background: T.cream, border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "0.5rem 0.3rem" }}>
                                <div style={{ fontFamily: T.ffD, fontSize: "1.35rem", fontWeight: 700, color: T.leaf, lineHeight: 1 }}>{d.getDate()}</div>
                                <div style={{ fontSize: "0.6rem", textTransform: "uppercase" as const, color: T.inkMuted, letterSpacing: "0.04em", marginTop: "0.15rem" }}>{d.toLocaleString("default", { month: "short" })}</div>
                                <div style={{ fontSize: "0.6rem", color: T.inkMuted, marginTop: "0.1rem" }}>{d.getFullYear()}</div>
                              </div>

                              {/* details */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem", flexWrap: "wrap" as const }}>
                                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap" as const }}>{s.title}</span>
                                  <SessionStatusBadge sessionStatus={s.sessionStatus} qualityFlag={s.qualityFlag} />
                                  {sessTab === "completed" && !s.sessionStatus && (
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

                                {/* Registration bar */}
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
                            <div style={{ display: "flex", gap: "0.5rem", flexShrink: isMobile ? 1 : 0, flexWrap: "wrap" as const, justifyContent: isMobile ? "flex-start" : "flex-end", alignItems: "center", width: isMobile ? "100%" : undefined }}>
                              {s.approved ? (
                                sessTab === "upcoming" && (
                                  <button onClick={() => handleCancel(s.id)} disabled={cancellingId === s.id}
                                    style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: cancellingId === s.id ? "default" : "pointer", opacity: cancellingId === s.id ? 0.5 : 1, whiteSpace: "nowrap" as const }}>
                                    {cancellingId === s.id ? "…" : "Cancel Webinar"}
                                  </button>
                                )
                              ) : (
                                <>
                                  {s.status === "published" && (
                                    <span style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, background: "#fdf3e0", color: "#b5470e", border: "1.5px solid rgba(181,71,14,0.25)", whiteSpace: "nowrap" as const }}>⏳ Pending approval</span>
                                  )}
                                  <Link href={`/session?edit=${s.id}`} style={{ padding: "0.4rem 0.85rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft, textDecoration: "none" }}>Edit</Link>
                                  <button onClick={() => handleDeleteSession(s.id)} disabled={deletingId === s.id} style={{ padding: "0.4rem 0.75rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, border: "1.5px solid #fce8ef", background: "#fce8ef", color: "#9b2c4e", cursor: "pointer", opacity: deletingId === s.id ? 0.5 : 1 }}>
                                    {deletingId === s.id ? "…" : "Delete"}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Join row — approved upcoming only */}
                          {s.approved && sessTab === "upcoming" && (
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
                    });
                  })()}
                </div>
              </div>

              {/* Reviews */}
              <div style={{ ...sectionCard, marginBottom: 0 }}>
                <SectionTitle>Attendee Reviews</SectionTitle>
                {REVIEWS.map((r, i) => (
                  <div key={i} style={{ padding: "1rem 0", borderBottom: i < REVIEWS.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.5rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, color: T.white, flexShrink: 0 }}>{r.initials}</div>
                      <div>
                        <span style={{ fontSize: "0.84rem", fontWeight: 600, color: T.ink }}>{r.name}</span>
                        <span style={{ color: T.sun, fontSize: "0.8rem", marginLeft: "0.3rem" }}>{r.stars}</span>
                      </div>
                      <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: T.inkMuted }}>{r.date}</span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: T.inkSoft, lineHeight: 1.65 }}>&ldquo;{r.text}&rdquo;</div>
                    <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.3rem" }}>📖 {r.session}</div>
                  </div>
                ))}
              </div>
            </main>

            {/* ── SIDEBAR ── */}
            <aside style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Stats */}
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Stats</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {([
                    [teacherStats.avgRating != null ? teacherStats.avgRating.toFixed(1) : "—", "Avg Rating"],
                    [teacherStats.totalReviews.toString(), "Reviews"],
                    [teacherStats.subscriberCount.toLocaleString(), "Subscribers"],
                    [teacherStats.totalSessions.toString(), "Sessions"],
                  ] as [string, string][]).map(([v, l]) => (
                    <div key={l} style={{ background: T.cream, borderRadius: T.rs, padding: "0.85rem 0.75rem", textAlign: "center" }}>
                      <div style={{ fontFamily: T.ffD, fontSize: "1.3rem", fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>{v}</div>
                      <div style={{ fontSize: "0.68rem", color: T.inkMuted, marginTop: "0.2rem" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating breakdown */}
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Rating Breakdown</div>
                {teacherStats.totalReviews === 0 ? (
                  <div style={{ fontSize: "0.82rem", color: T.inkMuted, textAlign: "center", padding: "0.75rem 0" }}>No reviews yet</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontFamily: T.ffD, fontSize: "2.2rem", fontWeight: 700, color: T.ink, lineHeight: 1 }}>{teacherStats.avgRating?.toFixed(1) ?? "—"}</div>
                      <div style={{ color: T.sun, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        {Array.from({ length: 5 }, (_, i) => i < Math.round(teacherStats.avgRating ?? 0) ? "★" : "☆").join("")}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: T.inkMuted }}>{teacherStats.totalReviews} reviews</div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {[5, 4, 3, 2, 1].map(n => {
                        const count = allReviews.filter(r => r.rating === n).length;
                        const pct = allReviews.length > 0 ? Math.round(count / allReviews.length * 100) : 0;
                        return (
                          <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", color: T.inkMuted }}>
                            <span style={{ width: 20 }}>{n}★</span>
                            <div style={{ flex: 1, height: 5, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 3, background: T.sun, width: `${pct}%` }} />
                            </div>
                            <span style={{ width: 28 }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Connect */}
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.inkMuted, marginBottom: "1rem" }}>Connect</div>
                {[
                  { url: profile.linkedinUrl, icon: "🔗", bg: "#e8f0fe", label: "LinkedIn" },
                  { url: profile.twitterUrl, icon: "🐦", bg: "#e8f5fe", label: "Twitter / X" },
                  { url: profile.websiteUrl, icon: "🌐", bg: T.leafLight, label: "Personal Portfolio" },
                ].map((s) => (
                  s.url ? (
                    <a key={s.label} href={s.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.85rem", borderRadius: T.rs, border: `1.5px solid ${T.border}`, textDecoration: "none", color: T.inkSoft, fontSize: "0.84rem", fontWeight: 500, marginBottom: "0.6rem", background: T.white, transition: "all 0.2s" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>{s.icon}</div>
                      {s.label}
                    </a>
                  ) : (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 0.85rem", borderRadius: T.rs, border: `1.5px solid ${T.border}`, color: T.inkMuted, fontSize: "0.84rem", fontWeight: 500, marginBottom: "0.6rem", background: T.white }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", flexShrink: 0 }}>{s.icon}</div>
                      {s.label}
                    </div>
                  )
                ))}
              </div>
            </aside>
          </>
        )}

        {/* ════ EDIT PANEL — spans both grid columns ════ */}
        {tab === "edit" && (
          <div style={{ gridColumn: "1 / -1" }}>

            {/* Save bar */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", background: T.ink, borderRadius: T.r, padding: isMobile ? "1rem" : "1rem 1.5rem", marginBottom: "1.25rem", gap: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.sun, flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>Unsaved changes will be lost if you navigate away</span>
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setTab("view")} style={{ padding: "0.55rem 1rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(255,255,255,0.6)", transition: "all 0.2s" }}>Discard</button>
                <button onClick={handleSave} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1.25rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", border: "none", background: saving ? "#4a9e68" : T.leaf, color: T.white, transition: "background 0.2s" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>

            {/* ── BASIC INFO ── */}
            <div style={sectionCard}>
              <EditSectionHeader emoji="👤" bg={T.skyLight} title="Basic Information" sub="Your name, role and how you appear publicly" />

              {/* Avatar upload row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 72, height: 72, borderRadius: 16, background: "linear-gradient(135deg, #1a4f7a, #0e3359)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.ffD, fontSize: "1.3rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                  {profile.avatarUrl
                    ? <img src={`http://localhost:3002${profile.avatarUrl}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : userInitials}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.8rem", fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", border: `1.5px solid ${T.leaf}`, background: "transparent", color: uploading ? T.inkMuted : T.leaf, transition: "all 0.2s" }}
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                  <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>JPG, PNG or WebP · Max 2MB</span>
                </div>
              </div>

              {/* First Name | Last Name */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.1rem", marginBottom: "1.1rem" }}>
                <div>
                  <label style={labelStyle}><span>First Name</span></label>
                  <input style={inputStyle} type="text" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <label style={labelStyle}><span>Last Name</span></label>
                  <input style={inputStyle} type="text" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />
                </div>
              </div>

              {/* Gender */}
              <div style={{ marginBottom: "1.1rem" }}>
                <div>
                  <label style={labelStyle}><span>Gender</span></label>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {["Female", "Male", "Other", "Prefer not to say"].map((g) => (
                      <label key={g} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1rem", border: `1.5px solid ${form.gender === g ? T.leaf : T.border}`, borderRadius: T.rs, cursor: "pointer", fontSize: "0.82rem", color: form.gender === g ? T.leaf : T.inkSoft, background: form.gender === g ? "rgba(29,107,60,0.04)" : T.white, fontWeight: form.gender === g ? 500 : 400, transition: "all 0.2s" }}>
                        <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={() => set("gender", g)} style={{ accentColor: T.leaf }} />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Professional Title */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={labelStyle}><span>Professional Title / Role</span><span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>(shown under your name)</span></label>
                <input style={inputStyle} type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g., Professor of Mathematics · IIT Bombay" />
              </div>

              {/* Area of Interest */}
              <div>
                <label style={labelStyle}>
                  <span>Area of Interest</span>
                  <span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>Your primary domain or field of expertise</span>
                </label>
                <select style={selectStyle} value={form.primaryCategory} onChange={(e) => set("primaryCategory", e.target.value)}>
                  <option value="">Select your area of interest</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* ── LOCATION ── */}
            <div style={sectionCard}>
              <EditSectionHeader emoji="📍" bg={T.leafLight} title="Location" sub="Helps students find teachers near them" />

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.1rem", marginBottom: "1.1rem" }}>
                <div>
                  <label style={labelStyle}><span>Country</span></label>
                  <select style={selectStyle} value={form.country} onChange={(e) => { set("country", e.target.value); set("state", ""); }}>
                    <option value="">Select Country</option>
                    {["India", "United States", "United Kingdom", "Australia", "Canada", "Singapore", "UAE", "Other"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}><span>State / Province</span></label>
                  {form.country === "India" ? (
                    <select style={selectStyle} value={form.state} onChange={(e) => set("state", e.target.value)}>
                      <option value="">Select State</option>
                      {INDIA_STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input style={inputStyle} type="text" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State / Province" />
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "1.1rem" }}>
                <label style={labelStyle}><span>City</span></label>
                <input style={inputStyle} type="text" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g., Bangalore, Chennai, Pune" />
              </div>

              <div>
                <label style={labelStyle}><span>Time Zone</span></label>
                <select style={selectStyle} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                  {TIMEZONES.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
            </div>

            {/* ── ABOUT ── */}
            <div style={sectionCard}>
              <EditSectionHeader emoji="📝" bg={T.sunLight} title="About Me" sub="Tell students about your background and teaching style" />

              <div style={{ marginBottom: "1.1rem" }}>
                <label style={labelStyle}>
                  <span>Bio</span>
                  <span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>{form.bio.length}/600</span>
                </label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 130, lineHeight: 1.6 } as React.CSSProperties} value={form.bio} maxLength={600} onChange={(e) => set("bio", e.target.value)} rows={5} placeholder="Describe your background, what you teach, and why students should follow you." />
                <div style={hintStyle}>Tip: mention your background, what you teach, and why students should follow you.</div>
              </div>

              <div>
                <label style={labelStyle}><span>Expertise Tags</span><span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>(press Enter or comma to add)</span></label>
                <TagInput tags={form.tags} onChange={(t) => set("tags", t)} />
                <div style={hintStyle}>Add up to 10 tags that describe what you teach.</div>
              </div>
            </div>

            {/* ── CONTACT & SOCIAL ── */}
            <div style={sectionCard}>
              <EditSectionHeader emoji="🔗" bg={T.clayLight} title="Contact & Social Links" sub="Help students connect with you" />

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.1rem", marginBottom: "1.25rem" }}>
                <div>
                  <label style={labelStyle}><span>Email</span><span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>(not shown publicly)</span></label>
                  <input style={{ ...inputStyle, background: T.cream }} type="email" value={profile.email} readOnly />
                </div>
                <div>
                  <label style={labelStyle}><span>Phone</span><span style={{ fontSize: "0.7rem", color: T.inkMuted, fontWeight: 400 }}>(not shown publicly)</span></label>
                  <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <SocialRow icon="🔗" bg="#e8f0fe" label="LinkedIn" value={form.linkedinUrl} onChange={(v) => set("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
              <SocialRow icon="🐦" bg="#e8f5fe" label="Twitter / X" value={form.twitterUrl} onChange={(v) => set("twitterUrl", v)} placeholder="https://twitter.com/..." />
              <SocialRow icon="🌐" bg={T.leafLight} label="Website" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} placeholder="https://yourwebsite.com" />
              <SocialRow icon="📺" bg="#fce4ec" label="YouTube" value={form.youtubeUrl} onChange={(v) => set("youtubeUrl", v)} placeholder="https://youtube.com/@..." />
            </div>

            {/* ── NOTIFICATIONS & PRIVACY ── */}
            <div style={sectionCard}>
              <EditSectionHeader emoji="🔔" bg={T.skyLight} title="Notifications & Privacy" sub="Control what you receive and who sees your profile" />
              {([
                { key: "notifySignups" as const, title: "New student sign-ups", desc: "Email me when someone registers for my session" },
                { key: "notifyReviews" as const, title: "Review notifications", desc: "Email me when a student leaves a review" },
                { key: "notifyReminders" as const, title: "Session reminders", desc: "Remind me 1 hour before my session starts" },
                { key: "notifyDigest" as const, title: "Weekly digest", desc: "Summary of my teaching activity every Monday" },
                { key: "profilePublic" as const, title: "Show profile publicly", desc: "Your profile appears in teacher search results" },
              ]).map((item, i, arr) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none" }}>
                  <div style={{ fontSize: "0.875rem", color: T.inkSoft }}>
                    <strong style={{ display: "block", fontSize: "0.875rem", color: T.ink, fontWeight: 600 }}>{item.title}</strong>
                    {item.desc}
                  </div>
                  <Toggle checked={form[item.key]} onChange={(v) => set(item.key, v)} />
                </div>
              ))}
            </div>

            {/* ── DANGER ZONE ── */}
            <div style={{ border: "1.5px solid #fdecea", borderRadius: T.r, padding: "1.25rem 1.5rem", marginTop: "1.25rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#c0392b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>⚠ Danger Zone</div>
              {[
                { title: "Deactivate Account", desc: "Temporarily hide your profile and pause all sessions", label: "Deactivate" },
                { title: "Delete Account", desc: "Permanently delete your profile and all data. This cannot be undone.", label: "Delete Account" },
              ].map((item, i, arr) => (
                <div key={item.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.6rem 0", borderBottom: i < arr.length - 1 ? "1px solid #fdecea" : "none" }}>
                  <div style={{ fontSize: "0.82rem", color: T.inkSoft }}>
                    <strong style={{ display: "block", color: T.ink, fontSize: "0.85rem" }}>{item.title}</strong>
                    {item.desc}
                  </div>
                  <button style={{ flexShrink: 0, padding: "0.4rem 0.9rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", border: "1.5px solid #c0392b", background: "transparent", color: "#c0392b", whiteSpace: "nowrap", transition: "all 0.2s" }}>{item.label}</button>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: T.ink, color: T.white, borderRadius: T.rs, padding: "0.75rem 1.5rem", fontSize: "0.85rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.6rem", zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", fontFamily: T.ff }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7ed9a4", flexShrink: 0 }} />
          {toast}
        </div>
      )}
      <Footer />
    </div>
  );
}
