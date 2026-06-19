"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/common/HeadFoot/header";
import {
  getAdminSessionDetail, approveSession, rejectSession,
  updateSessionSchedule, getSessionAuditLog,
  AdminSessionDetail, AuditLogEntry,
} from "@/lib/admin";
import { computeExpertiseLevel, makeProfileSlug } from "@/lib/profile";

/* ── tokens ── */
const T = {
  ink: "#0f1410", inkSoft: "#3a4140", inkMuted: "#6b7a72",
  leaf: "#1d6b3c", leafLight: "#d4ead9",
  sky: "#1a4f7a", skyLight: "#ddeaf8",
  sun: "#e8a020", sunLight: "#fdf3e0",
  clay: "#c45b2a", clayLight: "#f8ede5",
  red: "#c0392b", redLight: "#fdecea",
  cream: "#faf7f2", white: "#ffffff", border: "#e2ded6",
  r: 16, rs: 10,
  ff: "'DM Sans', sans-serif", ffd: "'Fraunces', Georgia, serif",
};

const REJECTION_REASONS: { value: string; label: string; desc: string }[] = [
  { value: "REJECTED_QUALITY",       label: "Content Quality",         desc: "Content does not meet platform standards" },
  { value: "REJECTED_INAPPROPRIATE", label: "Inappropriate Content",   desc: "Violates community guidelines or policies" },
  { value: "REJECTED_DUPLICATE",     label: "Duplicate Session",       desc: "Very similar session already exists" },
  { value: "REJECTED_INCOMPLETE",    label: "Incomplete Information",  desc: "Missing required details or description" },
  { value: "REJECTED_WRONG_CAT",     label: "Wrong Category / Type",   desc: "Session is misclassified" },
  { value: "REJECTED_SPAM",          label: "Spam / Promotional",      desc: "Appears to be advertising or spam" },
  { value: "REJECTED_SCHEDULING",    label: "Scheduling Conflict",     desc: "Date/time conflicts with another session" },
  { value: "REJECTED_BY_ADMIN",      label: "Other (Admin Decision)",  desc: "Doesn't fit any specific category above" },
];

const AVATAR_COLORS = ["#1d6b3c","#1a4f7a","#c45b2a","#7c3aed","#0e6370","#9b2c4e"];
const avatarBg = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

function userName(u: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email;
}
function userInitials(u: { firstName: string | null; lastName: string | null; name: string | null; email: string }) {
  const n = [u.firstName, u.lastName].filter(Boolean);
  if (n.length >= 2) return (n[0]![0] + n[1]![0]).toUpperCase();
  if (n.length === 1) return n[0]!.slice(0, 2).toUpperCase();
  return u.email.slice(0, 2).toUpperCase();
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
      <div style={{ padding: "0.85rem 1.5rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: T.inkMuted }}>
        {title}
      </div>
      <div style={{ padding: "1.25rem 1.5rem" }}>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", padding: "0.5rem 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 160, flexShrink: 0, fontSize: "0.75rem", color: T.inkMuted, fontWeight: 600, paddingTop: 2 }}>{label}</div>
      <div style={{ flex: 1, fontSize: "0.82rem", color: T.ink, wordBreak: "break-word" as const }}>{value ?? "—"}</div>
    </div>
  );
}

export default function AdminSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sessionId = Number(id);
  const router = useRouter();

  const [session, setSession] = useState<AdminSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [editSchedule, setEditSchedule] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("REJECTED_QUALITY");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* Admin guard */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "admin") { router.replace("/"); return; }
    } catch { router.replace("/"); }
  }, [router]);

  /* Load session */
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getAdminSessionDetail(sessionId)
      .then(s => {
        setSession(s);
        setAuditLog(s.auditLog);
        // Pre-fill schedule editor
        const d = new Date(s.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setEditValue(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleApprove() {
    setActionLoading("approve");
    try {
      await approveSession(sessionId);
      setSession(s => s ? { ...s, approved: true } : s);
      showToast("Session approved ✓");
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setActionLoading(null); }
  }

  async function handleReject(reason: string) {
    setShowRejectModal(false);
    setActionLoading("reject");
    try {
      await rejectSession(sessionId, reason);
      setSession(s => s ? { ...s, approved: false, status: "draft", qualityFlag: reason } : s);
      showToast("Session rejected");
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setActionLoading(null); }
  }

  async function handleSaveSchedule() {
    if (!editValue) return;
    setActionLoading("schedule");
    try {
      await updateSessionSchedule(sessionId, new Date(editValue).toISOString(), editNote || undefined);
      const fresh = await getAdminSessionDetail(sessionId);
      setSession(fresh);
      setAuditLog(fresh.auditLog);
      setEditSchedule(false);
      setEditNote("");
      showToast("Schedule updated ✓");
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setActionLoading(null); }
  }

  async function refreshAuditLog() {
    const logs = await getSessionAuditLog(sessionId).catch(() => []);
    setAuditLog(logs);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: T.ff }}>
      <Header />
      <div style={{ paddingTop: 80, textAlign: "center", padding: "120px 24px", color: T.inkMuted }}>Loading session…</div>
    </div>
  );

  if (error || !session) return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: T.ff }}>
      <Header />
      <div style={{ paddingTop: 80, textAlign: "center", padding: "120px 24px" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
        <div style={{ color: T.red, fontWeight: 600 }}>{error || "Session not found"}</div>
        <Link href="/admin" style={{ display: "inline-block", marginTop: "1rem", color: T.leaf, textDecoration: "none", fontWeight: 600 }}>← Back to Admin</Link>
      </div>
    </div>
  );

  const API = process.env.NEXT_PUBLIC_API_URL ?? "";
  const teacherSlug = makeProfileSlug({ id: session.user.id, firstName: session.user.firstName ?? undefined, lastName: session.user.lastName ?? undefined });
  const teacherLvl = computeExpertiseLevel(session.user.sessionCount, session.user.reviewCount, session.user.avgRating);
  const tags = (() => { try { return JSON.parse(session.tags ?? "[]") as string[]; } catch { return []; } })();
  const bannerColors: Record<string, string> = { leaf: "#1d6b3c", sky: "#1a4f7a", sun: "#e8a020", clay: "#c45b2a", violet: "#6d28d9", teal: "#0e7490" };
  const bannerBg = bannerColors[session.bannerColor ?? ""] ?? "#1d6b3c";

  return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: T.ff }}>
      <Header />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 80, right: 24, zIndex: 999, padding: "0.75rem 1.25rem", borderRadius: T.rs, background: toast.ok ? T.leaf : T.red, color: T.white, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Banner strip */}
      <div style={{ height: 180, background: bannerBg, position: "relative", marginTop: 64 }}>
        {session.bannerUrl && (
          <img src={`${API}${session.bannerUrl}`} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))" }} />
        {/* Back link */}
        <Link href="/admin" style={{ position: "absolute", top: 16, left: 24, display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", textDecoration: "none", background: "rgba(0,0,0,0.25)", padding: "0.35rem 0.85rem", borderRadius: 100 }}>
          ← Admin Panel
        </Link>
        {/* Status badges */}
        <div style={{ position: "absolute", top: 16, right: 24, display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: 100, background: session.type === "webinar" ? "#d4ead9" : "#ddeaf8", color: session.type === "webinar" ? T.leaf : T.sky }}>
            {session.type === "webinar" ? "Webinar" : "Live Class"}
          </span>
          {session.approved ? (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>✓ Approved</span>
          ) : session.qualityFlag?.startsWith("REJECTED") && session.status === "draft" ? (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: 100, background: T.redLight, color: T.red }}>✕ Rejected</span>
          ) : (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: 100, background: T.sunLight, color: T.sun }}>⏳ Pending Approval</span>
          )}
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.7rem", borderRadius: 100, background: "rgba(255,255,255,0.2)", color: T.white }}>
            {session.status}
          </span>
        </div>
        {/* Session ID */}
        <div style={{ position: "absolute", bottom: 16, left: 24, fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
          Session #{session.id}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 24px 4rem" }}>

        {/* Title + approve actions */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 0.35rem", fontFamily: T.ffd, fontSize: "1.75rem", fontWeight: 700, color: T.ink, lineHeight: 1.2 }}>{session.title}</h1>
            <div style={{ fontSize: "0.8rem", color: T.inkMuted }}>Created {fmt(session.createdAt)} · Last updated {fmt(session.updatedAt)}</div>
          </div>
          {/* Approval actions */}
          {session.approved ? (
            <button disabled={!!actionLoading} onClick={() => { setRejectReason("REJECTED_BY_ADMIN"); setShowRejectModal(true); }}
              style={{ padding: "0.6rem 1.5rem", border: `1.5px solid ${T.border}`, borderRadius: T.rs, background: T.white, color: T.inkMuted, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
              Revoke Approval
            </button>
          ) : session.qualityFlag?.startsWith("REJECTED") && session.status === "draft" ? (
            /* Still in draft after rejection — offer re-approve */
            <button disabled={!!actionLoading} onClick={handleApprove}
              style={{ padding: "0.6rem 1.5rem", border: "none", borderRadius: T.rs, background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}>
              {actionLoading === "approve" ? "Approving…" : "↺ Re-approve"}
            </button>
          ) : session.status === "published" ? (
            /* Pending — offer approve + reject */
            <div style={{ display: "flex", gap: "0.65rem", flexShrink: 0 }}>
              <button disabled={!!actionLoading} onClick={handleApprove}
                style={{ padding: "0.6rem 1.5rem", border: "none", borderRadius: T.rs, background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading === "approve" ? "Approving…" : "✓ Approve"}
              </button>
              <button disabled={!!actionLoading} onClick={() => { setRejectReason("REJECTED_QUALITY"); setShowRejectModal(true); }}
                style={{ padding: "0.6rem 1.5rem", border: `2px solid ${T.red}`, borderRadius: T.rs, background: T.white, color: T.red, fontFamily: T.ff, fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading === "reject" ? "Rejecting…" : "✗ Reject"}
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Banner image preview */}
            {session.bannerUrl && (
              <SectionCard title="Banner Image">
                <img src={`${API}${session.bannerUrl}`} alt="Session banner"
                  style={{ width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 10, background: "#f0f0f0" }} />
              </SectionCard>
            )}

            {/* Intro video */}
            {session.introVideoUrl && (
              <SectionCard title="Intro Video">
                <video src={`${API}${session.introVideoUrl}`} controls
                  style={{ width: "100%", maxHeight: 320, borderRadius: 10, background: "#000", display: "block" }} />
              </SectionCard>
            )}

            {/* Core details */}
            <SectionCard title="Session Details">
              <div style={{ marginBottom: 0 }}>
                <Field label="Category"    value={session.category} />
                <Field label="Skill Level" value={session.skillLevel} />
                <Field label="Visibility"  value={session.visibility} />
                <Field label="Duration"    value={`${session.duration} minutes`} />
                <Field label="Audience Limit" value={session.audienceLimit ? `${session.audienceLimit} seats` : "Unlimited"} />
                <Field label="Passcode"    value={session.passcode} />
                <Field label="Invite Slug" value={session.inviteSlug} />
                <Field label="Chat"        value={session.chatEnabled ? "Enabled" : "Disabled"} />
                <Field label="Auto Record" value={session.autoRecording ? "Yes" : "No"} />
                <Field label="Require Approval" value={session.requireApproval ? "Yes" : "No"} />
                <Field label="Send Reminder" value={session.sendReminder ? "Yes" : "No"} />
                <Field label="Quality Flag" value={session.qualityFlag} />
                {session.sessionStatus && <Field label="Session Outcome" value={session.sessionStatus} />}
                {session.actualDuration !== null && <Field label="Actual Duration" value={`${session.actualDuration} min`} />}
                {session.actualStartAt && <Field label="Actual Start" value={fmt(session.actualStartAt)} />}
                {session.recordingUrl && (
                  <Field label="Recording" value={
                    <a href={session.recordingUrl} target="_blank" rel="noreferrer" style={{ color: T.sky, textDecoration: "none", wordBreak: "break-all" as const }}>
                      {session.recordingUrl}
                    </a>
                  } />
                )}
                {tags.length > 0 && (
                  <Field label="Tags" value={
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.3rem" }}>
                      {tags.map(t => (
                        <span key={t} style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem", borderRadius: 100, background: T.cream, border: `1px solid ${T.border}`, color: T.inkSoft }}>{t}</span>
                      ))}
                    </div>
                  } />
                )}
              </div>
            </SectionCard>

            {/* Description */}
            {session.description && (
              <SectionCard title="Description">
                <p style={{ margin: 0, fontSize: "0.88rem", color: T.inkSoft, lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>{session.description}</p>
              </SectionCard>
            )}

            {/* Registrations */}
            <SectionCard title={`Registrations (${session._count.registrations})`}>
              {session.registrations.length === 0 ? (
                <p style={{ margin: 0, color: T.inkMuted, fontSize: "0.82rem" }}>No registrations yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {session.registrations.map(r => {
                    const u = r.user;
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.5rem 0", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(r.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                          {u?.avatarUrl
                            ? <img src={`${API}${u.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : u ? userInitials(u) : "?"
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: T.ink }}>{u ? userName(u) : `User #${r.userId}`}</div>
                          <div style={{ fontSize: "0.7rem", color: T.inkMuted }}>{u?.email} · Registered {fmtDate(r.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Attendances */}
            {session.attendances.length > 0 && (
              <SectionCard title={`Attendance (${session.attendances.length})`}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {session.attendances.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.78rem", padding: "0.35rem 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 100, background: a.role === "organizer" ? T.inkSoft : T.leafLight, color: a.role === "organizer" ? T.white : T.leaf }}>{a.role}</span>
                      <span style={{ color: T.inkSoft }}>User #{a.userId}</span>
                      <span style={{ color: T.inkMuted }}>Joined {fmt(a.joinedAt)}</span>
                      {a.leftAt && <span style={{ color: T.inkMuted }}>· Left {fmt(a.leftAt)}</span>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Audit log */}
            <SectionCard title="Change History">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
                <button onClick={refreshAuditLog} style={{ fontSize: "0.72rem", fontFamily: T.ff, border: `1px solid ${T.border}`, borderRadius: 100, padding: "0.2rem 0.7rem", background: T.white, color: T.inkMuted, cursor: "pointer" }}>↻ Refresh</button>
              </div>
              {auditLog.length === 0 ? (
                <p style={{ margin: 0, color: T.inkMuted, fontSize: "0.82rem" }}>No changes logged yet.</p>
              ) : auditLog.map(entry => (
                <div key={entry.id} style={{ padding: "0.75rem 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" as const, color: T.sky, letterSpacing: "0.05em" }}>{entry.field}</span>
                    <span style={{ fontSize: "0.68rem", color: T.inkMuted }}>{fmt(entry.createdAt)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ background: T.redLight, color: T.red, padding: "0.1rem 0.45rem", borderRadius: 4, fontFamily: "monospace" }}>
                      {entry.oldValue ? fmt(entry.oldValue) : "—"}
                    </span>
                    <span style={{ color: T.inkMuted }}>→</span>
                    <span style={{ background: T.leafLight, color: T.leaf, padding: "0.1rem 0.45rem", borderRadius: 4, fontFamily: "monospace" }}>
                      {entry.newValue ? fmt(entry.newValue) : "—"}
                    </span>
                  </div>
                  {entry.note && <div style={{ fontSize: "0.7rem", color: T.inkMuted, fontStyle: "italic" }}>"{entry.note}"</div>}
                  <div style={{ fontSize: "0.68rem", color: T.inkMuted, marginTop: "0.2rem" }}>
                    by {entry.admin ? userName(entry.admin) : `Admin #${entry.adminId}`}
                  </div>
                </div>
              ))}
            </SectionCard>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Schedule */}
            <SectionCard title="Schedule">
              {editSchedule ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <input type="datetime-local" value={editValue} onChange={e => setEditValue(e.target.value)}
                    style={{ fontFamily: T.ff, fontSize: "0.82rem", border: `1.5px solid ${T.leaf}`, borderRadius: 10, padding: "0.5rem 0.75rem", outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                  <input type="text" placeholder="Note for audit log (optional)" value={editNote} onChange={e => setEditNote(e.target.value)}
                    style={{ fontFamily: T.ff, fontSize: "0.78rem", border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.45rem 0.7rem", outline: "none", width: "100%", boxSizing: "border-box" as const, color: T.inkSoft }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button disabled={actionLoading === "schedule"} onClick={handleSaveSchedule}
                      style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: T.rs, background: T.leaf, color: T.white, fontFamily: T.ff, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", opacity: actionLoading === "schedule" ? 0.6 : 1 }}>
                      {actionLoading === "schedule" ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setEditSchedule(false); setEditNote(""); }}
                      style={{ flex: 1, padding: "0.5rem", border: `1px solid ${T.border}`, borderRadius: T.rs, background: T.white, color: T.inkMuted, fontFamily: T.ff, fontSize: "0.82rem", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink, marginBottom: "0.3rem" }}>
                    {new Date(session.scheduledAt).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: T.inkSoft, marginBottom: "1rem" }}>
                    {new Date(session.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} IST · {session.duration} min
                  </div>
                  <button onClick={() => setEditSchedule(true)}
                    style={{ width: "100%", padding: "0.5rem", border: `1.5px solid ${T.border}`, borderRadius: T.rs, background: T.white, color: T.inkSoft, fontFamily: T.ff, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                    ✏️ Edit Schedule
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Teacher card */}
            <SectionCard title="Teacher">
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1rem" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatarBg(session.user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                  {session.user.avatarUrl
                    ? <img src={`${API}${session.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : userInitials(session.user)
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: T.ink }}>{userName(session.user)}</div>
                  <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>{session.user.email}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", marginTop: "0.2rem", background: teacherLvl.bg, color: teacherLvl.color, fontSize: "0.62rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 100 }}>
                    {teacherLvl.icon} {teacherLvl.label}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
                <div style={{ flex: 1, textAlign: "center" as const, padding: "0.5rem", background: T.cream, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: T.ink }}>{session.user.sessionCount}</div>
                  <div style={{ fontSize: "0.65rem", color: T.inkMuted }}>Sessions</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" as const, padding: "0.5rem", background: T.cream, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: T.ink }}>{session.user.reviewCount}</div>
                  <div style={{ fontSize: "0.65rem", color: T.inkMuted }}>Reviews</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" as const, padding: "0.5rem", background: T.cream, borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: session.user.avgRating ? T.sun : T.inkMuted }}>
                    {session.user.avgRating ? `${session.user.avgRating}★` : "—"}
                  </div>
                  <div style={{ fontSize: "0.65rem", color: T.inkMuted }}>Rating</div>
                </div>
              </div>
              {session.user.title && <div style={{ fontSize: "0.78rem", color: T.inkSoft, marginBottom: "0.4rem", fontWeight: 600 }}>{session.user.title}</div>}
              {session.user.bio && <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: T.inkMuted, lineHeight: 1.6 }}>{session.user.bio.slice(0, 180)}{session.user.bio.length > 180 ? "…" : ""}</p>}
              <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginBottom: "0.75rem" }}>Joined {fmtDate(session.user.createdAt)}</div>
              <Link href={`/u/${teacherSlug}`} target="_blank"
                style={{ display: "block", textAlign: "center" as const, padding: "0.5rem", border: `1.5px solid ${T.border}`, borderRadius: T.rs, color: T.inkSoft, textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>
                View Public Profile →
              </Link>
            </SectionCard>

            {/* Quick links */}
            <SectionCard title="Quick Links">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link href={`/session/${session.id}`} target="_blank"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.75rem", borderRadius: T.rs, border: `1px solid ${T.border}`, textDecoration: "none", color: T.inkSoft, fontSize: "0.8rem", fontWeight: 600 }}>
                  Public Session Page <span>↗</span>
                </Link>
                <Link href="/admin?tab=approval"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.75rem", borderRadius: T.rs, border: `1px solid ${T.border}`, textDecoration: "none", color: T.inkSoft, fontSize: "0.8rem", fontWeight: 600 }}>
                  Back to Approval Queue <span>←</span>
                </Link>
              </div>
            </SectionCard>

          </div>
        </div>
      </div>

      {/* Rejection reason modal */}
      {showRejectModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,20,16,0.55)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowRejectModal(false); }}>
          <div style={{ background: T.white, borderRadius: T.r, padding: "2rem", width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontFamily: T.ffd, fontSize: "1.2rem", fontWeight: 700, color: T.ink, marginBottom: "0.3rem" }}>Reject Session</div>
            <div style={{ fontSize: "0.8rem", color: T.inkMuted, marginBottom: "1.25rem" }}>Select a reason. This is stored and shown to the teacher.</div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {REJECTION_REASONS.map(r => (
                <label key={r.value} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: T.rs, border: `1.5px solid ${rejectReason === r.value ? T.red : T.border}`, background: rejectReason === r.value ? T.redLight : T.white, cursor: "pointer" }}>
                  <input type="radio" name="rejectReason" value={r.value} checked={rejectReason === r.value} onChange={() => setRejectReason(r.value)}
                    style={{ marginTop: 2, accentColor: T.red, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: rejectReason === r.value ? T.red : T.ink }}>{r.label}</div>
                    <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.1rem" }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
              <button onClick={() => setShowRejectModal(false)}
                style={{ padding: "0.6rem 1.25rem", border: `1px solid ${T.border}`, borderRadius: T.rs, background: T.white, color: T.inkMuted, fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button disabled={!!actionLoading} onClick={() => handleReject(rejectReason)}
                style={{ padding: "0.6rem 1.5rem", border: "none", borderRadius: T.rs, background: T.red, color: T.white, fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading === "reject" ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
