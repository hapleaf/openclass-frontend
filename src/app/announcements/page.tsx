"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/common/HeadFoot/header";
import Footer from "@/components/common/HeadFoot/footer";

const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sky: "#1a4f7a",
  cream: "#faf7f2", white: "#fff", border: "#e2ded6",
  r: 16, rs: 10,
  ff: "var(--font-dm-sans), sans-serif",
  ffd: "var(--font-fraunces), Georgia, serif",
};

interface Speaker {
  id: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  title: string | null;
}

interface Ann {
  id: number;
  title: string | null;
  content: string;
  createdAt: string;
  speaker: Speaker;
  reads: { readAt: string }[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function speakerName(s: Speaker) {
  return [s.firstName, s.lastName].filter(Boolean).join(" ") || "Speaker";
}

function speakerInitials(s: Speaker) {
  return [s.firstName, s.lastName].filter(Boolean).map(w => w![0]).join("").toUpperCase() || "?";
}

function updateUnreadCache(count: number) {
  localStorage.setItem("oc_ann_unread", String(count));
  setTimeout(() => window.dispatchEvent(new Event("oc_ann_update")), 0);
}

function AnnouncementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [anns, setAnns] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ann | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const didMarkRef = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    loadFeed(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFeed(token?: string) {
    setLoading(true);
    const t = token ?? localStorage.getItem("token");
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/announcements/feed`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (r.ok) {
        const data: Ann[] = await r.json();
        setAnns(data);

        // auto-open if ?id= param present
        const idParam = searchParams.get("id");
        if (idParam) {
          const target = data.find(a => a.id === parseInt(idParam, 10));
          if (target) openAnn(target, data);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function markAllRead() {
    if (didMarkRef.current) return;
    didMarkRef.current = true;
    const token = localStorage.getItem("token");
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/announcements/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    updateUnreadCache(0);
    // reflect read state locally
    setAnns(prev => prev.map(a => a.reads.length > 0 ? a : { ...a, reads: [{ readAt: new Date().toISOString() }] }));
  }

  function openAnn(ann: Ann, list?: Ann[]) {
    setSelected(ann);
    setShowThread(true);
    // mark this one read locally
    const update = (prev: Ann[]) => prev.map(a => a.id === ann.id && a.reads.length === 0
      ? { ...a, reads: [{ readAt: new Date().toISOString() }] }
      : a
    );
    setAnns(prev => update(prev));
    if (list) setAnns(update(list));
  }

  // Mark all read when page is viewed
  useEffect(() => {
    if (!loading && anns.length > 0) markAllRead();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const unreadCount = anns.filter(a => a.reads.length === 0).length;

  const listPanel = (
    <div style={{ flex: isMobile ? "none" : "0 0 340px", width: isMobile ? "100%" : 340, borderRight: isMobile ? "none" : `1px solid ${T.border}`, display: "flex", flexDirection: "column", height: isMobile ? "auto" : "calc(100vh - 64px)", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "1.1rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: T.white, position: "sticky", top: 0, zIndex: 2 }}>
        <div>
          <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink }}>Announcements</div>
          {unreadCount > 0 && <div style={{ fontSize: "0.7rem", color: T.leaf, fontWeight: 600, marginTop: "0.1rem" }}>{unreadCount} new</div>}
        </div>
        <button onClick={() => { didMarkRef.current = false; loadFeed(); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, padding: "0.3rem", borderRadius: 8 }} title="Refresh">
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: T.inkMuted, fontSize: "0.85rem" }}>Loading…</div>
      ) : anns.length === 0 ? (
        <div style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📢</div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: T.ink, marginBottom: "0.4rem" }}>No announcements yet</div>
          <div style={{ fontSize: "0.78rem", color: T.inkMuted, lineHeight: 1.5 }}>
            Announcements from speakers you follow will appear here.
          </div>
          <Link href="/teachers" style={{ display: "inline-block", marginTop: "1rem", fontSize: "0.8rem", color: T.leaf, fontWeight: 600, textDecoration: "none" }}>
            Browse speakers →
          </Link>
        </div>
      ) : (
        anns.map(a => {
          const isRead = a.reads.length > 0;
          const isSelected = selected?.id === a.id;
          return (
            <div key={a.id}
              onClick={() => openAnn(a)}
              style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: isSelected ? T.leafLight : isRead ? T.white : "#f0f8f4", transition: "background 0.15s" }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = T.cream; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? T.leafLight : isRead ? T.white : "#f0f8f4"; }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.leaf, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0, overflow: "hidden" }}>
                  {a.speaker.avatarUrl
                    ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${a.speaker.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : speakerInitials(a.speaker)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.15rem" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                      {speakerName(a.speaker)}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: T.inkMuted, flexShrink: 0 }}>{timeAgo(a.createdAt)}</span>
                  </div>
                  {a.title && <div style={{ fontSize: "0.78rem", fontWeight: 600, color: T.inkSoft, marginBottom: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{a.title}</div>}
                  <div style={{ fontSize: "0.75rem", color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                    {a.content}
                  </div>
                  {!isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.leaf, display: "inline-block", marginTop: "0.35rem" }} />}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const threadPanel = (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: isMobile ? "auto" : "calc(100vh - 64px)", overflow: "hidden" }}>
      {selected ? (
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem", maxWidth: 720 }}>
          {isMobile && (
            <button onClick={() => setShowThread(false)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: T.leaf, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, padding: 0, marginBottom: "1.25rem" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back
            </button>
          )}
          {/* Speaker info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: T.leaf, color: T.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, overflow: "hidden", flexShrink: 0 }}>
              {selected.speaker.avatarUrl
                ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${selected.speaker.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : speakerInitials(selected.speaker)
              }
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: T.ink }}>{speakerName(selected.speaker)}</div>
              {selected.speaker.title && <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>{selected.speaker.title}</div>}
            </div>
            <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: T.inkMuted }}>{timeAgo(selected.createdAt)}</div>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: T.leafLight, color: T.leaf, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0.2rem 0.65rem", borderRadius: 100, marginBottom: "1rem" }}>
            📢 Announcement
          </div>

          {selected.title && (
            <h2 style={{ fontFamily: T.ffd, fontSize: "1.4rem", fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", marginBottom: "0.75rem", lineHeight: 1.25 }}>
              {selected.title}
            </h2>
          )}

          <div style={{ fontSize: "0.95rem", color: T.inkSoft, lineHeight: 1.75, whiteSpace: "pre-wrap" as const }}>
            {selected.content}
          </div>

          <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: `1px solid ${T.border}` }}>
            <Link href={`/u/${[selected.speaker.firstName, selected.speaker.lastName].filter(Boolean).join("-").toLowerCase().replace(/\s+/g, "-")}-${selected.speaker.id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: T.sky, fontWeight: 600, textDecoration: "none" }}>
              View {speakerName(selected.speaker)}'s profile →
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.inkMuted, gap: "0.75rem" }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke={T.border} strokeWidth={1.5}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <span style={{ fontSize: "0.85rem" }}>Select an announcement to read</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Header />
      <div style={{ paddingTop: 64, background: T.cream, minHeight: "100vh", fontFamily: T.ff }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden", display: "flex", minHeight: "calc(100vh - 64px - 2rem)", marginTop: "1rem", marginBottom: "1rem" }}>
          {isMobile ? (
            showThread && selected ? threadPanel : listPanel
          ) : (
            <>
              {listPanel}
              {threadPanel}
            </>
          )}
        </div>
      </div>
      <Footer />
      <style>{`@keyframes oc-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function AnnouncementsPage() {
  return (
    <Suspense>
      <AnnouncementsContent />
    </Suspense>
  );
}
