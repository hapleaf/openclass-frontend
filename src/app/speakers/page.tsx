"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";
import {
  getCategories,
  getTeachers,
  toggleSubscription,
  getMySubscriptions,
  makeProfileSlug,
  computeExpertiseLevel,
  TeacherListItem,
  CategoryData,
} from "@/lib/profile";

/* ─── colour helpers ────────────────────────────────────────────────── */
const COVER_COLORS = [
  "#0d2416", "#0d1a2e", "#1a0a2e", "#200814",
  "#0a1e1a", "#071820", "#2a1200", "#2a0a10",
];
const AVATAR_COLORS = [
  "#1d6b3c", "#1a4f7a", "#c45b2a", "#7c3aed",
  "#0e6370", "#9b2c4e", "#854d0e", "#b91c1c",
];
const coverBg = (id: number) => COVER_COLORS[id % COVER_COLORS.length];
const avatarBg = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/* ─── formatting helpers ─────────────────────────────────────────────── */
function fmtK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

function teacherInitials(t: TeacherListItem) {
  if (t.firstName && t.lastName) return (t.firstName[0] + t.lastName[0]).toUpperCase();
  if (t.firstName) return t.firstName.slice(0, 2).toUpperCase();
  return (t.name || "U").slice(0, 2).toUpperCase();
}

function teacherFullName(t: TeacherListItem) {
  return [t.firstName, t.lastName].filter(Boolean).join(" ") || t.name || "Unknown";
}

function topTags(t: TeacherListItem): string[] {
  const raw = t.expertiseTags || "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return (parsed as string[]).map(s => s.trim()).filter(Boolean).slice(0, 3);
  } catch {}
  return raw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);
}

/* ─── teacher card ───────────────────────────────────────────────────── */
interface CardProps {
  teacher: TeacherListItem;
  isSubscribed: boolean;
  isSubscribing: boolean;
  liveSubCount: number;
  onSubscribe: (e: React.MouseEvent, id: number) => void;
}

function TeacherCard({ teacher, isSubscribed, isSubscribing, liveSubCount, onSubscribe }: CardProps) {
  const router = useRouter();
  const tags = topTags(teacher);
  const name = teacherFullName(teacher);
  const slug = makeProfileSlug({ id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName });
  const year = new Date(teacher.createdAt).getFullYear();

  return (
    <>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <div
      onClick={() => router.push(`/u/${slug}`)}
      style={{
        background: "#fff", border: "1px solid #e2ded6", borderRadius: 14,
        overflow: "hidden", cursor: "pointer",
        display: "flex", flexDirection: "column",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 24px rgba(15,20,16,0.09)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Cover */}
      <div style={{ height: 72, position: "relative", flexShrink: 0 }}>
        <svg width="100%" height="72" viewBox="0 0 300 72" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <rect width="300" height="72" fill={coverBg(teacher.id)} />
          <circle cx="240" cy="20" r="50" fill="rgba(255,255,255,0.04)" />
          <circle cx="30" cy="60" r="35" fill="rgba(255,255,255,0.03)" />
        </svg>
        <div style={{ position: "absolute", bottom: -22, left: "1.1rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, border: "3px solid #fff",
            background: avatarBg(teacher.id), color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 700, letterSpacing: "-0.02em",
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}>
            {teacherInitials(teacher)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "1.5rem 1.1rem 0.9rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.25rem" }}>
          <div style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1rem", fontWeight: 700, color: "#0f1410", lineHeight: 1.2 }}>
            {name}
          </div>
          {(() => {
            const lvl = computeExpertiseLevel(teacher.sessionCount, teacher.reviewCount, teacher.avgRating);
            return (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: lvl.bg, color: lvl.color, fontSize: "0.65rem", fontWeight: 700, padding: "0.18rem 0.5rem", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0 }}>
                {lvl.icon} {lvl.label}
              </span>
            );
          })()}
        </div>

        {/* Role · Category */}
        <div style={{ fontSize: "0.8rem", color: "#6b7a72" }}>
          {[teacher.title, teacher.primaryCategory].filter(Boolean).join(" · ") || "—"}
        </div>

        {/* Location */}
        {(teacher.city || teacher.country) && (
          <div style={{ fontSize: "0.75rem", color: "#6b7a72", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            📍 {[teacher.city, teacher.country].filter(Boolean).join(", ")}
          </div>
        )}

        {/* Expertise chips */}
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.2rem" }}>
            {tags.map(tag => (
              <span key={tag} style={{ fontSize: "0.7rem", fontWeight: 500, padding: "0.18rem 0.55rem", borderRadius: 100, background: "#ddeaf8", color: "#1a4f7a" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "flex", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid #e2ded6", marginTop: "auto" }}>
          {[
            { val: fmtK(liveSubCount), lbl: "Subscribers" },
            { val: String(teacher.sessionCount), lbl: "Sessions" },
            { val: String(year), lbl: "Joined" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f1410", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.68rem", color: "#6b7a72", marginTop: "0.15rem" }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{ padding: "0.75rem 1.1rem", borderTop: "1px solid #e2ded6", display: "flex", gap: "0.6rem" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => { window.location.href = `/u/${slug}`; }}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0.55rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: "none", background: "#1d6b3c", color: "#fff", fontFamily: "var(--font-dm-sans), sans-serif", transition: "background 0.2s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#145c30")}
          onMouseLeave={e => (e.currentTarget.style.background = "#1d6b3c")}
        >
          View Profile →
        </button>
        <button
          onClick={e => onSubscribe(e, teacher.id)}
          disabled={isSubscribing}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            padding: "0.55rem 0.8rem", borderRadius: 8, fontSize: "0.82rem", fontWeight: 500,
            cursor: isSubscribing ? "default" : "pointer", whiteSpace: "nowrap", fontFamily: "var(--font-dm-sans), sans-serif",
            border: `1.5px solid ${isSubscribed ? "#1d6b3c" : "#e2ded6"}`,
            background: isSubscribed ? "#d4ead9" : "#fff",
            color: isSubscribed ? "#1d6b3c" : "#3a4140",
            opacity: isSubscribing ? 0.7 : 1,
            transition: "all 0.15s",
          }}
        >
          {isSubscribing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 14" />
            </svg>
          ) : null}
          {isSubscribed ? "✓ Subscribed" : "+ Subscribe"}
        </button>
      </div>
    </div>
    </>
  );
}

/* ─── filter option ──────────────────────────────────────────────────── */
function FilterOpt({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.42rem 0.55rem", borderRadius: 8, cursor: "pointer", background: active ? "#d4ead9" : "transparent", transition: "background 0.15s", userSelect: "none" }}
    >
      <div style={{ width: 15, height: 15, borderRadius: 4, border: `1.5px solid ${active ? "#1d6b3c" : "#e2ded6"}`, background: active ? "#1d6b3c" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
        {active && (
          <svg width="10" height="10" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: "0.84rem", color: active ? "#1d6b3c" : "#3a4140", flex: 1, fontWeight: active ? 500 : 400, fontFamily: "var(--font-dm-sans), sans-serif" }}>{label}</span>
      <span style={{ fontSize: "0.72rem", color: active ? "#1d6b3c" : "#6b7a72", background: active ? "rgba(29,107,60,0.15)" : "#faf7f2", borderRadius: 100, padding: "0.1rem 0.45rem" }}>{count}</span>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────────── */
type SortKey = "subscribers" | "sessions" | "name";

const TEACHERS_CACHE_KEY = "oc_teachers_cache";
const TEACHERS_CACHE_TTL = 120_000;

type TeachersCache = { teachers: TeacherListItem[]; categories: CategoryData[] };

function readTeachersCache(): TeachersCache | null {
  try {
    const raw = localStorage.getItem(TEACHERS_CACHE_KEY);
    if (!raw) return null;
    const { ts, payload } = JSON.parse(raw);
    if (Date.now() - ts > TEACHERS_CACHE_TTL) return null;
    return payload as TeachersCache;
  } catch { return null; }
}

function writeTeachersCache(data: TeachersCache) {
  try {
    localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload: data }));
  } catch { /* quota — ignore */ }
}

export default function TeachersPage() {
  const router = useRouter();
  const [allTeachers, setAllTeachers] = useState<TeacherListItem[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("subscribers");

  const [subscribedMap, setSubscribedMap] = useState<Record<number, boolean>>({});
  const [subscribingMap, setSubscribingMap] = useState<Record<number, boolean>>({});
  const [subCounts, setSubCounts] = useState<Record<number, number>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    function applyTeachers(teachers: TeacherListItem[], cats: CategoryData[]) {
      setAllTeachers(teachers);
      setCategories(cats);
      const counts: Record<number, number> = {};
      teachers.forEach(t => { counts[t.id] = t.subscriberCount; });
      setSubCounts(counts);
    }

    const cached = readTeachersCache();
    if (cached) {
      applyTeachers(cached.teachers, cached.categories);
      setLoading(false);
    }

    function fetchTeachers(initial = false) {
      Promise.all([getTeachers(), getCategories()])
        .then(([teachers, cats]) => {
          applyTeachers(teachers, cats);
          writeTeachersCache({ teachers, categories: cats });
        })
        .catch(initial ? console.error : () => {})
        .finally(() => { if (initial) setLoading(false); });
    }

    fetchTeachers(true);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      getMySubscriptions()
        .then(({ teacherIds }) => {
          const map: Record<number, boolean> = {};
          teacherIds.forEach(id => { map[id] = true; });
          setSubscribedMap(map);
        })
        .catch(() => {});
    }

    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchTeachers();
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* derived data */
  const countries = useMemo(() =>
    [...new Set(allTeachers.map(t => t.country).filter((c): c is string => !!c))].sort(),
    [allTeachers]
  );

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allTeachers.forEach(t => { if (t.primaryCategory) m[t.primaryCategory] = (m[t.primaryCategory] || 0) + 1; });
    return m;
  }, [allTeachers]);

  const countryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    allTeachers.forEach(t => { if (t.country) m[t.country] = (m[t.country] || 0) + 1; });
    return m;
  }, [allTeachers]);

  const filtered = useMemo(() => {
    // Sort and filter using original allTeachers counts so subscribe/unsubscribe
    // clicks don't reorder cards — live counts are displayed separately via subCounts prop.
    let data = [...allTeachers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(t => {
        const n = teacherFullName(t).toLowerCase();
        const tags = topTags(t).join(" ").toLowerCase();
        const cat = (t.primaryCategory || "").toLowerCase();
        const loc = [t.city, t.country].filter(Boolean).join(" ").toLowerCase();
        return n.includes(q) || tags.includes(q) || cat.includes(q) || loc.includes(q);
      });
    }
    if (selectedCats.length) data = data.filter(t => selectedCats.includes(t.primaryCategory || ""));
    if (selectedCountries.length) data = data.filter(t => selectedCountries.includes(t.country || ""));

    return data.sort((a, b) => {
      if (sortKey === "subscribers") return b.subscriberCount - a.subscriberCount;
      if (sortKey === "sessions") return b.sessionCount - a.sessionCount;
      return teacherFullName(a).localeCompare(teacherFullName(b));
    });
  }, [allTeachers, searchQuery, selectedCats, selectedCountries, sortKey]);

  const toggleCat = (cat: string) =>
    setSelectedCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);

  const toggleCountry = (c: string) =>
    setSelectedCountries(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const hasFilters = selectedCats.length + selectedCountries.length > 0;

  const handleSubscribe = async (e: React.MouseEvent, teacherId: number) => {
    e.stopPropagation();
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { router.push("/login"); return; }
    setSubscribingMap(prev => ({ ...prev, [teacherId]: true }));
    try {
      const result = await toggleSubscription(teacherId);
      setSubscribedMap(prev => ({ ...prev, [teacherId]: result.subscribed }));
      setSubCounts(prev => ({ ...prev, [teacherId]: result.count }));
    } catch (err) { console.error(err); }
    finally { setSubscribingMap(prev => ({ ...prev, [teacherId]: false })); }
  };

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "subscribers", label: "👥 Most Subscribed" },
    { key: "sessions",    label: "🎓 Most Sessions" },
    { key: "name",        label: "🔤 Name A–Z" },
  ];

  return (
    <>
      <Header activeLink="speakers" />

      <div style={{ paddingTop: isMobile ? 57 : 64, fontFamily: "var(--font-dm-sans), sans-serif", background: "#faf7f2", minHeight: "100vh", color: "#0f1410" }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ background: "#0f1410", padding: isMobile ? "1.5rem 1.25rem" : "2.5rem 2rem", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
          <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", textDecoration: "none" }}>Home</Link>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>›</span>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.8rem", fontWeight: 500 }}>Speakers</span>
              </div>
              <h1 style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Our <em style={{ color: "#7ed9a4", fontStyle: "italic" }}>Speakers</em>
              </h1>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
                Experts, practitioners, and thinkers hosting free webinars on OpenWebinar.
              </p>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: "0.8rem", fontWeight: 500, padding: "0.4rem 0.9rem", borderRadius: 100, alignSelf: "flex-start" }}>
              🎙️ {loading ? "…" : `${allTeachers.length} speakers`}
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "1rem" : "1.75rem 1.5rem", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr", gap: "1.75rem", alignItems: "start" }}>

          {/* Sidebar */}
          <aside style={{ background: "#fff", border: "1px solid #e2ded6", borderRadius: 14, padding: "1.25rem", position: isMobile ? "static" : "sticky", top: 80, display: isMobile && !filtersOpen ? "none" : undefined }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b7a72", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              Filters
              {hasFilters && (
                <button
                  onClick={() => { setSelectedCats([]); setSelectedCountries([]); }}
                  style={{ fontSize: "0.72rem", fontWeight: 500, color: "#1d6b3c", cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Active chips */}
            {hasFilters && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.85rem" }}>
                {selectedCats.map(cat => (
                  <span key={cat} onClick={() => toggleCat(cat)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>
                    {cat} ✕
                  </span>
                ))}
                {selectedCountries.map(c => (
                  <span key={c} onClick={() => toggleCountry(c)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#d4ead9", color: "#1d6b3c", fontSize: "0.74rem", fontWeight: 500, padding: "0.22rem 0.6rem", borderRadius: 100, cursor: "pointer" }}>
                    {c} ✕
                  </span>
                ))}
              </div>
            )}

            {/* Area of Expertise */}
            <div style={{ marginBottom: "1.4rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f1410", marginBottom: "0.55rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>📚 Area of Expertise</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {categories
                  .filter(cat => (catCounts[cat.name] || 0) > 0)
                  .map(cat => (
                    <FilterOpt
                      key={cat.id}
                      label={cat.name}
                      count={catCounts[cat.name] || 0}
                      active={selectedCats.includes(cat.name)}
                      onClick={() => toggleCat(cat.name)}
                    />
                  ))}
              </div>
            </div>

            <div style={{ height: 1, background: "#e2ded6", margin: "0 0 1.1rem" }} />

            {/* Country */}
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f1410", marginBottom: "0.55rem", fontFamily: "var(--font-dm-sans), sans-serif" }}>🌍 Country</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {countries.map(country => (
                  <FilterOpt
                    key={country}
                    label={country}
                    count={countryCounts[country] || 0}
                    active={selectedCountries.includes(country)}
                    onClick={() => toggleCountry(country)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Main */}
          <main style={{ minWidth: 0 }}>
            {/* Mobile filter toggle */}
            {isMobile && (
              <button
                onClick={() => setFiltersOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0.65rem 1rem", borderRadius: 10, border: `1.5px solid ${filtersOpen ? "#1d6b3c" : "#e2ded6"}`, background: filtersOpen ? "#d4ead9" : "#fff", color: filtersOpen ? "#1d6b3c" : "#3a4140", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", marginBottom: "0.75rem" }}
              >
                <span>🔽 Filters{hasFilters ? " •" : ""}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{filtersOpen ? "Hide ▲" : "Show ▼"}</span>
              </button>
            )}
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 100, padding: "0.55rem 1rem", marginBottom: "1rem" }}
              onFocus={e => { e.currentTarget.style.borderColor = "#1d6b3c"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,107,60,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#e2ded6"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b7a72" strokeWidth={2.2} style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, expertise, or category…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-dm-sans), sans-serif", fontSize: "0.875rem", color: "#0f1410", width: "100%" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7a72", padding: 0, display: "flex", alignItems: "center" }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Topbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7a72" }}>
                <strong style={{ color: "#0f1410", fontWeight: 600 }}>{filtered.length}</strong>{" "}
                speaker{filtered.length !== 1 ? "s" : ""} found
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", color: "#6b7a72" }}>Sort:</span>
                {sortOptions.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSortKey(s.key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.38rem 0.8rem", borderRadius: 100,
                      border: `1.5px solid ${sortKey === s.key ? "#1d6b3c" : "#e2ded6"}`,
                      fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap",
                      color: sortKey === s.key ? "#fff" : "#3a4140",
                      background: sortKey === s.key ? "#1d6b3c" : "#fff",
                      cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid / States */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "#6b7a72", fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Loading teachers…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7a72" }}>
                <p style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", color: "#0f1410", marginBottom: "0.5rem" }}>No speakers found</p>
                <p style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1.25rem" }}>
                {filtered.map(teacher => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    isSubscribed={subscribedMap[teacher.id] ?? false}
                    isSubscribing={subscribingMap[teacher.id] ?? false}
                    liveSubCount={subCounts[teacher.id] ?? teacher.subscriberCount}
                    onSubscribe={handleSubscribe}
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
