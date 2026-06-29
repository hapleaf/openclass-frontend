"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { makeProfileSlug } from "@/lib/profile";
import Header from "@/components/common/HeadFoot/header";
import {
  getAdminOverview, getPendingSessions, approveSession, rejectSession,
  getSessionStats, getUserStats, searchSessions, updateSessionSchedule, getSessionAuditLog,
  searchUsers, updateAdminUser, getLoginEngagement, getTopTeachers, getTopStudents, getSubscriberInsights,
  getContactMessages, getContactThread, replyToContact, markContactRead, deleteContactMessage,
  recordingRunManually, recordingQueueStatus, recordingGetUploaded, recordingGetLogs,
  infraTestS3, infraTestBunny, infraTestFfmpeg, infraTestLiveKit, infraTestRedis, getSystemStats,
  SystemStats, recordingScanDisk, recordingSyncS3, storageMigrateUrls, recordingGetEgressLogs, recordingSyncEgressLogs,
  AdminOverview, PendingSession, SessionStats, UserStats, SessionRow, AuditLogEntry, AdminUser,
  EngagementRow, TopTeachers, TopStudentRow, SubscriberTeacherRow, ContactMessage,
  InfraTestResult, RecordingQueueStatus, UploadedSession, RecordingLogEntry, EgressLog,
} from "@/lib/admin";

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
  ff: "var(--font-dm-sans), sans-serif", ffd: "var(--font-fraunces), Georgia, serif",
};

type Tab = "overview" | "approval" | "sessions" | "users" | "insights" | "messages" | "recordings" | "support";

interface SuppTicket {
  id: number; subject: string; category: string | null; status: string; priority: string;
  createdAt: string; updatedAt: string;
  user: { email: string; firstName: string | null; lastName: string | null };
  _count: { replies: number };
}
interface SuppTicketDetail extends SuppTicket {
  message: string;
  replies: { id: number; isAdmin: boolean; message: string; createdAt: string; authorId: number | null }[];
}

export const REJECTION_REASONS: { value: string; label: string; desc: string }[] = [
  { value: "REJECTED_QUALITY",       label: "Content Quality",         desc: "Content does not meet platform standards" },
  { value: "REJECTED_INAPPROPRIATE", label: "Inappropriate Content",   desc: "Violates community guidelines or policies" },
  { value: "REJECTED_DUPLICATE",     label: "Duplicate Session",       desc: "Very similar session already exists" },
  { value: "REJECTED_INCOMPLETE",    label: "Incomplete Information",  desc: "Missing required details or description" },
  { value: "REJECTED_WRONG_CAT",     label: "Wrong Category / Type",   desc: "Session is misclassified" },
  { value: "REJECTED_SPAM",          label: "Spam / Promotional",      desc: "Appears to be advertising or spam" },
  { value: "REJECTED_SCHEDULING",    label: "Scheduling Conflict",     desc: "Date/time conflicts with another session" },
  { value: "REJECTED_BY_ADMIN",      label: "Other (Admin Decision)",  desc: "Doesn't fit any specific category above" },
];

export const REJECTION_LABEL: Record<string, string> = Object.fromEntries(
  REJECTION_REASONS.map(r => [r.value, r.label])
);

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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ── Tiny bar-chart component ── */
function BarChart({ data, color = T.leaf, height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end" }}>
          <div title={`${d.label}: ${d.value}`} style={{ width: "100%", background: color, borderRadius: "4px 4px 0 0", height: `${Math.max((d.value / max) * 100, 2)}%`, opacity: 0.85, transition: "height 0.4s", cursor: "default" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Tiny donut / pill breakdown ── */
function PillBreakdown({ data, colors }: { data: { name: string; count: number }[]; colors: string[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem", color: T.inkSoft, flex: 1 }}>{d.name}</span>
          <div style={{ flex: 2, height: 6, background: T.border, borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(d.count / total) * 100}%`, background: colors[i % colors.length], borderRadius: 100 }} />
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: T.ink, minWidth: 28, textAlign: "right" }}>{d.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub, color = T.leaf }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: T.inkMuted, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ fontFamily: T.ffd, fontSize: "2rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: T.inkMuted, marginTop: "0.4rem" }}>{sub}</div>}
    </div>
  );
}

type Timeframe = "7d" | "30d" | "90d" | "12m";

/* ── Trend chart with timeframe toggle ── */
function TrendChart({
  title, color,
  daily, monthly,
}: {
  title: string; color: string;
  daily: { day: string; count: number }[];
  monthly?: { month: string; count: number }[];
}) {
  const [tf, setTf] = useState<Timeframe>("30d");

  const bars = (() => {
    if (tf === "12m") {
      const map = new Map((monthly ?? []).map(m => [m.month, m.count]));
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() - (11 - i));
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
        return { label, value: map.get(key) ?? 0 };
      });
    }
    const days = tf === "7d" ? 7 : tf === "30d" ? 30 : 90;
    const map = new Map(daily.map(d => [d.day, d.count]));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      const label = tf === "7d"
        ? d.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
        : tf === "90d" ? (i % 7 === 0 ? key.slice(5) : "") : key.slice(5);
      return { label, value: map.get(key) ?? 0 };
    });
  })();

  const tfBtn = (t: Timeframe, label: string) => (
    <button key={t} onClick={() => setTf(t)} style={{
      padding: "0.2rem 0.6rem", borderRadius: 100, border: "none", cursor: "pointer",
      fontFamily: T.ff, fontSize: "0.7rem", fontWeight: 600,
      background: tf === t ? color : T.border,
      color: tf === t ? T.white : T.inkMuted,
      transition: "all 0.15s",
    }}>{label}</button>
  );

  const total = bars.reduce((s, b) => s + b.value, 0);

  return (
    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{title}</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: T.ink, marginTop: "0.15rem" }}>{total.toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {tfBtn("7d", "7D")}
          {tfBtn("30d", "30D")}
          {tfBtn("90d", "90D")}
          {monthly && tfBtn("12m", "12M")}
        </div>
      </div>
      <BarChart data={bars} color={color} height={90} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: T.inkMuted, marginTop: "0.35rem" }}>
        <span>{bars[0]?.label}</span>
        <span>{bars[bars.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [pending, setPending] = useState<PendingSession[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [sessionQuery, setSessionQuery]   = useState("");
  const [filterType, setFilterType]       = useState("all");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterApproved, setFilterApproved] = useState("all");
  const [filterFrom, setFilterFrom]       = useState("");
  const [filterTo, setFilterTo]           = useState("");
  const [searchResults, setSearchResults] = useState<SessionRow[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editId, setEditId]               = useState<number | null>(null);
  const [editValue, setEditValue]         = useState("");
  const [editNote, setEditNote]           = useState("");
  const [editSaving, setEditSaving]       = useState(false);
  const [auditSessionId, setAuditSessionId] = useState<number | null>(null);
  const [auditLog, setAuditLog]           = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading]   = useState(false);
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason]   = useState("REJECTED_QUALITY");
  const [userList, setUserList]           = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch]       = useState("");
  const [userLoading, setUserLoading]     = useState(false);
  const [editUser, setEditUser]           = useState<AdminUser | null>(null);
  const [editUserData, setEditUserData]   = useState<{ firstName: string; lastName: string; email: string; role: string }>({ firstName: "", lastName: "", email: "", role: "user" });
  const [userSaving, setUserSaving]       = useState(false);
  const [engagementPeriod, setEngagementPeriod] = useState<"today" | "7d" | "30d" | "90d">("7d");
  const [engagement, setEngagement]       = useState<EngagementRow[] | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [topTeachers, setTopTeachers]     = useState<TopTeachers | null>(null);
  const [topStudents, setTopStudents]     = useState<{ data: TopStudentRow[]; total: number; page: number; take: number } | null>(null);
  const [studentPage, setStudentPage]     = useState(1);
  const [insightsLoaded, setInsightsLoaded] = useState(false);
  const [subscriberInsights, setSubscriberInsights] = useState<{ topTeachers: SubscriberTeacherRow[] } | null>(null);
  const [contactMessages, setContactMessages]   = useState<ContactMessage[] | null>(null);
  const [contactLoading, setContactLoading]     = useState(false);
  const [contactFilter, setContactFilter]       = useState<"all" | "unread">("all");
  const [contactSearch, setContactSearch]       = useState("");
  const [contactDeleting, setContactDeleting]   = useState<number | null>(null);
  const [threadEmail, setThreadEmail]           = useState<string | null>(null);
  const [thread, setThread]                     = useState<ContactMessage[] | null>(null);
  const [threadLoading, setThreadLoading]       = useState(false);
  const [replyBody, setReplyBody]               = useState("");
  const [replying, setReplying]                 = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [outcomeFrom, setOutcomeFrom]     = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10); });
  const [outcomeTo, setOutcomeTo]         = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10); });
  const [outcomeRows, setOutcomeRows]     = useState<SessionRow[] | null>(null);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [typeFrom, setTypeFrom]           = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10); });
  const [typeTo, setTypeTo]               = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10); });
  const [typeRows, setTypeRows]           = useState<SessionRow[] | null>(null);
  const [typeLoading, setTypeLoading]     = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recordings tab
  const [recQueue, setRecQueue]         = useState<RecordingQueueStatus | null>(null);
  const [recUploaded, setRecUploaded]   = useState<UploadedSession[] | null>(null);
  const [recLogs, setRecLogs]           = useState<RecordingLogEntry[] | null>(null);
  const [recLogsLoading, setRecLogsLoading] = useState(false);
  const [recRunning, setRecRunning]     = useState(false);
  const [infraS3, setInfraS3]           = useState<InfraTestResult | null>(null);
  const [infraBunny, setInfraBunny]     = useState<InfraTestResult | null>(null);
  const [infraFfmpeg, setInfraFfmpeg]   = useState<InfraTestResult | null>(null);
  const [infraS3Loading, setInfraS3Loading]       = useState(false);
  const [infraBunnyLoading, setInfraBunnyLoading] = useState(false);
  const [infraFfmpegLoading, setInfraFfmpegLoading] = useState(false);
  const [infraLiveKit, setInfraLiveKit]             = useState<InfraTestResult | null>(null);
  const [infraRedis, setInfraRedis]                 = useState<InfraTestResult | null>(null);
  const [infraLiveKitLoading, setInfraLiveKitLoading] = useState(false);
  const [infraRedisLoading, setInfraRedisLoading]     = useState(false);
  const [sysStats, setSysStats]         = useState<SystemStats | null>(null);
  const [sysStatsLoading, setSysStatsLoading] = useState(false);
  const [procSort, setProcSort] = useState<{ col: "cpu" | "mem" | "user" | "pid" | "command"; dir: 1 | -1 }>({ col: "cpu", dir: -1 });
  const [scanDiskRunning, setScanDiskRunning]       = useState(false);
  const [syncS3Running, setSyncS3Running]           = useState(false);
  const [migrateUrlsRunning, setMigrateUrlsRunning] = useState(false);
  const [egressLogs, setEgressLogs]                 = useState<EgressLog[] | null>(null);
  const [egressLogsLoading, setEgressLogsLoading]   = useState(false);
  const [egressFilter, setEgressFilter]             = useState("all");
  const [egressExpanded, setEgressExpanded]         = useState<number | null>(null);

  const [suppTickets, setSuppTickets]               = useState<SuppTicket[] | null>(null);
  const [suppLoading, setSuppLoading]               = useState(false);
  const [suppFilter, setSuppFilter]                 = useState("all");
  const [suppTicket, setSuppTicket]                 = useState<SuppTicketDetail | null>(null);
  const [suppTicketLoading, setSuppTicketLoading]   = useState(false);
  const [suppReply, setSuppReply]                   = useState("");
  const [suppReplying, setSuppReplying]             = useState(false);
  const [suppStatusUpdating, setSuppStatusUpdating] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  /* guard: only admin may enter */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.replace('/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'admin') { router.replace('/'); return; }
    } catch { router.replace('/'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadOverview = useCallback(async () => {
    try { setOverview(await getAdminOverview()); } catch { /* ignore */ }
  }, []);

  const loadPending = useCallback(async () => {
    try { setPending(await getPendingSessions()); } catch { /* ignore */ }
  }, []);

  const loadSessionStats = useCallback(async () => {
    try { setSessionStats(await getSessionStats()); } catch { /* ignore */ }
  }, []);

  const loadUserStats = useCallback(async () => {
    try { setUserStats(await getUserStats()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadPending()])
      .finally(() => setLoading(false));
  }, [loadOverview, loadPending]);

  useEffect(() => {
    if (tab === "sessions" && !sessionStats) loadSessionStats();
    if (tab === "users" && !userStats) loadUserStats();
  }, [tab, sessionStats, userStats, loadSessionStats, loadUserStats]);

  /* load contact messages on tab enter, filter change, or search */
  useEffect(() => {
    if (tab !== "messages") return;
    const handler = setTimeout(() => {
      setContactLoading(true);
      getContactMessages(contactFilter === "unread", contactSearch.trim())
        .then(setContactMessages)
        .catch(() => {})
        .finally(() => setContactLoading(false));
    }, contactSearch ? 300 : 0);
    return () => clearTimeout(handler);
  }, [tab, contactFilter, contactSearch]);

  /* load insights on tab enter */
  useEffect(() => {
    if (tab !== "insights") return;
    if (insightsLoaded) return;
    setInsightsLoaded(true);
    setEngagementLoading(true);
    Promise.all([
      getLoginEngagement("7d"),
      getTopTeachers(),
      getTopStudents(1, 50),
      getSubscriberInsights(),
    ]).then(([eng, teachers, students, subs]) => {
      setEngagement(eng);
      setTopTeachers(teachers);
      setTopStudents(students);
      setSubscriberInsights(subs);
    }).catch(() => {}).finally(() => setEngagementLoading(false));
  }, [tab, insightsLoaded]);

  /* load recordings tab data on enter */
  useEffect(() => {
    if (tab !== "recordings") return;
    recordingQueueStatus().then(setRecQueue).catch(() => {});
    recordingGetUploaded().then(setRecUploaded).catch(() => {});
    setRecLogsLoading(true);
    recordingGetLogs().then(setRecLogs).catch(() => {}).finally(() => setRecLogsLoading(false));
    setEgressLogsLoading(true);
    recordingGetEgressLogs().then(setEgressLogs).catch(() => {}).finally(() => setEgressLogsLoading(false));
  }, [tab]);

  /* outcome chart date filter */
  useEffect(() => {
    if (!outcomeFrom && !outcomeTo) { setOutcomeRows(null); return; }
    setOutcomeLoading(true);
    searchSessions({ from: outcomeFrom || undefined, to: outcomeTo || undefined, take: 1000 })
      .then(setOutcomeRows)
      .catch(() => setOutcomeRows(null))
      .finally(() => setOutcomeLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeFrom, outcomeTo]);

  /* type chart date filter */
  useEffect(() => {
    if (!typeFrom && !typeTo) { setTypeRows(null); return; }
    setTypeLoading(true);
    searchSessions({ from: typeFrom || undefined, to: typeTo || undefined, take: 1000 })
      .then(setTypeRows)
      .catch(() => setTypeRows(null))
      .finally(() => setTypeLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFrom, typeTo]);

  /* re-fetch engagement when period changes */
  useEffect(() => {
    if (tab !== "insights") return;
    setEngagementLoading(true);
    getLoginEngagement(engagementPeriod)
      .then(setEngagement)
      .catch(() => {})
      .finally(() => setEngagementLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementPeriod]);

  /* paginate students */
  useEffect(() => {
    if (tab !== "insights") return;
    getTopStudents(studentPage, 50)
      .then(setTopStudents)
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentPage]);

  /* load top-50 users when entering users tab */
  useEffect(() => {
    if (tab !== "users") return;
    setUserLoading(true);
    searchUsers("", 50).then(setUserList).catch(() => {}).finally(() => setUserLoading(false));
  }, [tab]);

  /* debounced user search */
  useEffect(() => {
    if (tab !== "users") return;
    if (userDebounceRef.current) clearTimeout(userDebounceRef.current);
    userDebounceRef.current = setTimeout(async () => {
      setUserLoading(true);
      try { setUserList(await searchUsers(userSearch, 50)); } catch { /* ignore */ }
      finally { setUserLoading(false); }
    }, 350);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  async function handleToggleDisable(u: AdminUser) {
    try {
      await updateAdminUser(u.id, { disabled: !u.disabled });
      setUserList(prev => prev.map(x => x.id === u.id ? { ...x, disabled: !u.disabled } : x));
      showToast(u.disabled ? "User enabled" : "User disabled");
    } catch (e: unknown) { showToast((e as Error).message, false); }
  }

  async function handleSaveUser() {
    if (!editUser) return;
    setUserSaving(true);
    try {
      await updateAdminUser(editUser.id, editUserData);
      setUserList(prev => prev.map(x => x.id === editUser.id
        ? { ...x, firstName: editUserData.firstName || null, lastName: editUserData.lastName || null, email: editUserData.email, role: editUserData.role }
        : x));
      setEditUser(null);
      showToast("User updated ✓");
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setUserSaving(false); }
  }

  /* debounced session search — fires on any filter change */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const hasFilter = sessionQuery.trim() || filterType !== "all" || filterStatus !== "all"
      || filterApproved !== "all" || filterFrom || filterTo;
    if (!hasFilter) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        setSearchResults(await searchSessions({
          q: sessionQuery.trim() || undefined,
          type: filterType !== "all" ? filterType : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          approved: filterApproved !== "all" ? filterApproved : undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined,
          take: 200,
        }));
      } catch { /* ignore */ }
      finally { setSearchLoading(false); }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sessionQuery, filterType, filterStatus, filterApproved, filterFrom, filterTo]);

  /* inline schedule edit */
  async function handleSaveSchedule(sessionId: number) {
    if (!editValue) return;
    setEditSaving(true);
    try {
      await updateSessionSchedule(sessionId, new Date(editValue).toISOString(), editNote || undefined);
      showToast("Schedule updated ✓");
      setEditId(null); setEditNote("");
      // refresh results
      if (searchResults) {
        setSearchResults(prev => prev?.map(s =>
          s.id === sessionId ? { ...s, scheduledAt: new Date(editValue).toISOString() } : s
        ) ?? null);
      }
      if (sessionStats) {
        setSessionStats(prev => prev ? {
          ...prev,
          recent: prev.recent.map(s =>
            s.id === sessionId ? { ...s, scheduledAt: new Date(editValue).toISOString() } : s
          ),
        } : null);
      }
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setEditSaving(false); }
  }

  /* open audit log panel */
  async function openAuditLog(sessionId: number) {
    setAuditSessionId(sessionId);
    setAuditLoading(true);
    setAuditLog([]);
    try { setAuditLog(await getSessionAuditLog(sessionId)); }
    catch { /* ignore */ }
    finally { setAuditLoading(false); }
  }

  function clearFilters() {
    setSessionQuery(""); setFilterType("all"); setFilterStatus("all");
    setFilterApproved("all"); setFilterFrom(""); setFilterTo("");
    setSearchResults(null);
  }

  async function handleApprove(id: number) {
    setActionLoading(id);
    try {
      await approveSession(id);
      setPending(p => p.filter(s => s.id !== id));
      showToast("Session approved ✓");
      loadOverview();
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setActionLoading(null); }
  }

  async function handleReject(id: number, reason: string) {
    setActionLoading(id);
    setRejectModalId(null);
    try {
      await rejectSession(id, reason);
      setPending(p => p.filter(s => s.id !== id));
      showToast("Session rejected");
      loadOverview();
    } catch (e: unknown) { showToast((e as Error).message, false); }
    finally { setActionLoading(null); }
  }

  const tabBtn = (t: Tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: "0.5rem 1.2rem", borderRadius: 100, border: "none", cursor: "pointer",
      fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 600,
      background: tab === t ? T.ink : "transparent",
      color: tab === t ? T.white : T.inkMuted,
      transition: "all 0.2s",
      flexShrink: 0, whiteSpace: "nowrap" as const,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.cream, fontFamily: T.ff }}>
      <Header activeLink="dashboard" />

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 80, right: 24, zIndex: 999, padding: "0.75rem 1.25rem", borderRadius: T.rs, background: toast.ok ? T.leaf : T.red, color: T.white, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", transition: "all 0.3s" }}>
          {toast.msg}
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectModalId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(15,20,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={e => { if (e.target === e.currentTarget) setRejectModalId(null); }}>
          <div style={{ background: T.white, borderRadius: T.r, width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink }}>Reject Session</div>
                <div style={{ fontSize: "0.75rem", color: T.inkMuted, marginTop: "0.15rem" }}>Select a reason — it will be shown to the teacher</div>
              </div>
              <button onClick={() => setRejectModalId(null)} style={{ border: "none", background: "none", fontSize: "1.2rem", cursor: "pointer", color: T.inkMuted, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {REJECTION_REASONS.map(r => (
                <label key={r.value} onClick={() => setRejectReason(r.value)}
                  style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 0.85rem", borderRadius: T.rs, border: `1.5px solid ${rejectReason === r.value ? T.red : T.border}`, background: rejectReason === r.value ? "#fff5f5" : T.white, cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${rejectReason === r.value ? T.red : T.border}`, background: rejectReason === r.value ? T.red : T.white, flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {rejectReason === r.value && <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.white }} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: T.ink }}>{r.label}</div>
                    <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.1rem" }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${T.border}`, display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
              <button onClick={() => setRejectModalId(null)}
                style={{ padding: "0.5rem 1.25rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.inkMuted, fontFamily: T.ff, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => handleReject(rejectModalId, rejectReason)} disabled={!!actionLoading}
                style={{ padding: "0.5rem 1.5rem", borderRadius: T.rs, border: "none", background: T.red, color: T.white, fontFamily: T.ff, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "73px 16px 40px" : "88px 24px 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>⚙</div>
            <h1 style={{ margin: 0, fontFamily: T.ffd, fontSize: "1.75rem", fontWeight: 700, color: T.ink }}>Admin Panel</h1>
            {overview?.sessions.pending ? (
              <span style={{ background: T.red, color: T.white, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 100 }}>
                {overview.sessions.pending} pending
              </span>
            ) : null}
          </div>
          <p style={{ margin: 0, fontSize: "0.875rem", color: T.inkMuted }}>Platform management and analytics</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.25rem", background: T.white, border: `1px solid ${T.border}`, borderRadius: 100, padding: "0.3rem", marginBottom: "1.75rem", overflowX: "auto" as const, maxWidth: "100%" }}>
          {tabBtn("overview", "📊 Overview")}
          {tabBtn("approval", `✅ Approval${overview?.sessions.pending ? ` (${overview.sessions.pending})` : ""}`)}
          {tabBtn("sessions", "🎓 Sessions")}
          {tabBtn("users", "👥 Users")}
          {tabBtn("insights", "💡 Insights")}
          {tabBtn("messages", "✉️ Messages")}
          {tabBtn("recordings", "🎬 Recordings")}
          {tabBtn("support", "🎫 Support")}
        </div>

        {loading && tab === "overview" ? (
          <div style={{ textAlign: "center", padding: "4rem", color: T.inkMuted }}>Loading…</div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === "overview" && overview && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Stat grid */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "1rem" }}>
                  <StatCard label="Total Users" value={overview.users.total} sub={`+${overview.users.today} today · +${overview.users.week} this week`} color={T.sky} />
                  <StatCard label="Total Sessions" value={overview.sessions.total} sub={`${overview.sessions.active} upcoming · ${overview.sessions.completed} completed`} color={T.leaf} />
                  <StatCard label="Registrations" value={overview.registrations} color={T.sun} />
                  <StatCard label="Avg Rating" value={overview.reviews.avgRating ? `${overview.reviews.avgRating} ★` : "—"} sub={`${overview.reviews.total} reviews`} color={T.clay} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: "1rem" }}>
                  <StatCard label="New Users (Month)" value={overview.users.month} color={T.sky} />
                  <StatCard label="Pending Approval" value={overview.sessions.pending} color={overview.sessions.pending > 0 ? T.red : T.leaf} />
                  <StatCard label="Logins Today" value={overview.logins.today} color={T.leaf} />
                  <StatCard label="Logins This Week" value={overview.logins.week} color={T.leaf} />
                </div>

                {/* Quick actions */}
                {overview.sessions.pending > 0 && (
                  <div style={{ background: T.sunLight, border: `1px solid #f0c060`, borderRadius: T.r, padding: "1rem 1.5rem", display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: T.ink, marginBottom: "0.2rem" }}>⏳ {overview.sessions.pending} session{overview.sessions.pending > 1 ? "s" : ""} waiting for approval</div>
                      <div style={{ fontSize: "0.8rem", color: T.inkMuted }}>Review and approve submitted sessions to make them visible.</div>
                    </div>
                    <button onClick={() => setTab("approval")} style={{ padding: "0.5rem 1.25rem", borderRadius: T.rs, border: "none", background: T.sun, color: T.white, fontWeight: 700, cursor: "pointer", fontFamily: T.ff, fontSize: "0.85rem" }}>
                      Review Now →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── APPROVAL ── */}
            {tab === "approval" && (
              <div>
                {pending.length === 0 ? (
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "3rem", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✅</div>
                    <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", color: T.inkSoft }}>All caught up — no sessions pending approval.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {pending.map(s => (
                      <div key={s.id} style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem", display: "flex", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap" as const, gap: "0.75rem" }}>
                        {/* Type badge */}
                        <span style={{ flexShrink: 0, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", padding: "0.2rem 0.65rem", borderRadius: 100, background: s.type === "webinar" ? T.leafLight : T.skyLight, color: s.type === "webinar" ? T.leaf : T.sky }}>
                          {s.type}
                        </span>

                        {/* Session info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link href={`/admin/session/${s.id}`} style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink, textDecoration: "none", display: "block", marginBottom: "0.25rem" }}>
                            {s.title}
                          </Link>
                          <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>
                            {s.category && <span style={{ marginRight: "0.75rem" }}>📂 {s.category}</span>}
                            <span style={{ marginRight: "0.75rem" }}>📅 {fmtDate(s.scheduledAt)}</span>
                            <span>👥 {s._count.registrations} registered</span>
                          </div>
                        </div>

                        {/* Teacher */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(s.user.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: T.white }}>
                            {userInitials(s.user)}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: T.ink }}>{userName(s.user)}</div>
                            <div style={{ fontSize: "0.7rem", color: T.inkMuted }}>{s.user.email}</div>
                          </div>
                        </div>

                        {/* Submitted */}
                        <div style={{ fontSize: "0.72rem", color: T.inkMuted, flexShrink: 0, textAlign: "right" as const }}>
                          Submitted<br />{fmtDateTime(s.createdAt)}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                          <button disabled={actionLoading === s.id} onClick={() => handleApprove(s.id)}
                            style={{ padding: "0.45rem 1rem", borderRadius: T.rs, border: "none", background: T.leaf, color: T.white, fontWeight: 700, cursor: "pointer", fontFamily: T.ff, fontSize: "0.8rem", opacity: actionLoading === s.id ? 0.6 : 1 }}>
                            {actionLoading === s.id ? "…" : "Approve"}
                          </button>
                          <button disabled={actionLoading === s.id} onClick={() => { setRejectModalId(s.id); setRejectReason("REJECTED_QUALITY"); }}
                            style={{ padding: "0.45rem 1rem", borderRadius: T.rs, border: `1.5px solid ${T.red}`, background: "transparent", color: T.red, fontWeight: 700, cursor: "pointer", fontFamily: T.ff, fontSize: "0.8rem", opacity: actionLoading === s.id ? 0.6 : 1 }}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SESSIONS ── */}
            {tab === "sessions" && (
              sessionStats ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Charts row */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr", gap: "1rem" }}>
                    <TrendChart title="Sessions Created" daily={sessionStats.trend} color={T.leaf} />

                    {/* By Type */}
                    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.75rem" }}>By Type</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.85rem" }}>
                        <input type="date" value={typeFrom} onChange={e => setTypeFrom(e.target.value)}
                          style={{ fontSize: "0.7rem", fontFamily: T.ff, border: `1px solid ${typeFrom ? T.leaf : T.border}`, borderRadius: 7, padding: "0.25rem 0.35rem", background: typeFrom ? T.leafLight : T.cream, color: T.inkSoft, outline: "none", cursor: "pointer", width: "100%" }} />
                        <span style={{ fontSize: "0.68rem", color: T.inkMuted, flexShrink: 0 }}>→</span>
                        <input type="date" value={typeTo} onChange={e => setTypeTo(e.target.value)}
                          style={{ fontSize: "0.7rem", fontFamily: T.ff, border: `1px solid ${typeTo ? T.leaf : T.border}`, borderRadius: 7, padding: "0.25rem 0.35rem", background: typeTo ? T.leafLight : T.cream, color: T.inkSoft, outline: "none", cursor: "pointer", width: "100%" }} />
                        {(typeFrom || typeTo) && (
                          <button onClick={() => { setTypeFrom(""); setTypeTo(""); }}
                            style={{ border: "none", background: "none", cursor: "pointer", color: T.inkMuted, fontSize: "1rem", lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
                        )}
                      </div>
                      {typeLoading ? (
                        <div style={{ fontSize: "0.75rem", color: T.inkMuted, textAlign: "center", padding: "0.75rem 0" }}>Loading…</div>
                      ) : (
                        <PillBreakdown
                          data={typeRows
                            ? Object.entries(typeRows.reduce<Record<string, number>>((acc, s) => {
                                acc[s.type] = (acc[s.type] ?? 0) + 1;
                                return acc;
                              }, {})).map(([name, count]) => ({ name, count }))
                            : sessionStats.byType.map(d => ({ name: d.type, count: d.count }))}
                          colors={[T.leaf, T.sky, T.clay]}
                        />
                      )}
                    </div>

                    {/* By Outcome */}
                    <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.75rem" }}>By Outcome</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.85rem" }}>
                        <input type="date" value={outcomeFrom} onChange={e => setOutcomeFrom(e.target.value)}
                          style={{ fontSize: "0.7rem", fontFamily: T.ff, border: `1px solid ${outcomeFrom ? T.leaf : T.border}`, borderRadius: 7, padding: "0.25rem 0.35rem", background: outcomeFrom ? T.leafLight : T.cream, color: T.inkSoft, outline: "none", cursor: "pointer", width: "100%" }} />
                        <span style={{ fontSize: "0.68rem", color: T.inkMuted, flexShrink: 0 }}>→</span>
                        <input type="date" value={outcomeTo} onChange={e => setOutcomeTo(e.target.value)}
                          style={{ fontSize: "0.7rem", fontFamily: T.ff, border: `1px solid ${outcomeTo ? T.leaf : T.border}`, borderRadius: 7, padding: "0.25rem 0.35rem", background: outcomeTo ? T.leafLight : T.cream, color: T.inkSoft, outline: "none", cursor: "pointer", width: "100%" }} />
                        {(outcomeFrom || outcomeTo) && (
                          <button onClick={() => { setOutcomeFrom(""); setOutcomeTo(""); }}
                            style={{ border: "none", background: "none", cursor: "pointer", color: T.inkMuted, fontSize: "1rem", lineHeight: 1, flexShrink: 0, padding: 0 }}>×</button>
                        )}
                      </div>
                      {outcomeLoading ? (
                        <div style={{ fontSize: "0.75rem", color: T.inkMuted, textAlign: "center", padding: "0.75rem 0" }}>Loading…</div>
                      ) : (
                        <PillBreakdown
                          data={outcomeRows
                            ? Object.entries(outcomeRows.reduce<Record<string, number>>((acc, s) => {
                                const k = s.sessionStatus ?? "Active";
                                acc[k] = (acc[k] ?? 0) + 1;
                                return acc;
                              }, {})).map(([name, count]) => ({ name, count }))
                            : sessionStats.byStatus.map(d => ({ name: d.status ?? "Active", count: d.count }))}
                          colors={[T.leaf, T.red, T.sun, T.sky, T.inkMuted]}
                        />
                      )}
                    </div>
                  </div>

                  {/* Category breakdown */}
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "1rem" }}>Sessions by Category</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                      {(() => {
                        const max = Math.max(...sessionStats.byCategory.map(d => d.count), 1);
                        return sessionStats.byCategory.map((d, i) => (
                          <div key={d.category} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                            <div style={{ width: "100%", background: T.leaf, borderRadius: "4px 4px 0 0", height: `${(d.count / max) * 100}%`, opacity: 0.75 + (i % 3) * 0.08, minHeight: 3 }} title={`${d.category}: ${d.count}`} />
                            <div style={{ fontSize: "0.58rem", color: T.inkMuted, textAlign: "center" as const, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, width: "100%" }}>
                              {d.category.length > 8 ? d.category.slice(0, 7) + "…" : d.category}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Sessions table — exhaustive search + filters + inline edit + audit log */}
                  {(() => {
                    const hasFilter = sessionQuery.trim() || filterType !== "all" || filterStatus !== "all"
                      || filterApproved !== "all" || filterFrom || filterTo;
                    const rows: SessionRow[] = searchResults ?? sessionStats.recent;

                    const sel = (val: string, set: (v: string) => void, opts: [string, string][]) => (
                      <select value={val} onChange={e => set(e.target.value)}
                        style={{ fontSize: "0.78rem", fontFamily: T.ff, border: `1px solid ${val !== "all" ? T.leaf : T.border}`, borderRadius: 8, padding: "0.3rem 0.5rem", background: val !== "all" ? T.leafLight : T.white, color: val !== "all" ? T.leaf : T.inkSoft, cursor: "pointer", outline: "none" }}>
                        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    );

                    return (
                      <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>

                        {/* ── Filter bar ── */}
                        <div style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap" as const, gap: "0.6rem", alignItems: "center" }}>
                          {/* Text search */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", background: T.cream, border: `1.5px solid ${sessionQuery ? T.leaf : T.border}`, borderRadius: 100, padding: "0.3rem 0.85rem", flex: "1 1 200px", minWidth: 180 }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={sessionQuery ? T.leaf : T.inkMuted} strokeWidth={2.2} style={{ flexShrink: 0 }}>
                              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                            </svg>
                            <input type="text" value={sessionQuery} onChange={e => setSessionQuery(e.target.value)}
                              placeholder="Search title, teacher, tags…"
                              style={{ border: "none", outline: "none", background: "transparent", fontFamily: T.ff, fontSize: "0.8rem", color: T.ink, width: "100%", minWidth: 0 }} />
                            {sessionQuery && <button onClick={() => setSessionQuery("")} style={{ border: "none", background: "none", cursor: "pointer", color: T.inkMuted, padding: 0, fontSize: "1rem", lineHeight: 1, flexShrink: 0 }}>×</button>}
                          </div>

                          {/* Dropdowns */}
                          {sel(filterType,     setFilterType,     [["all","All types"],["webinar","Webinar"],["liveclass","Live Class"]])}
                          {sel(filterStatus,   setFilterStatus,   [["all","All status"],["draft","Draft"],["published","Published"],["cancelled","Cancelled"]])}
                          {sel(filterApproved, setFilterApproved, [["all","Approval: all"],["true","Approved"],["false","Not Approved"]])}

                          {/* Time-range preset chips */}
                          {(() => {
                            const toStr = (d: Date) => d.toISOString().slice(0, 10);
                            const now = new Date();
                            const y = now.getFullYear(), mo = now.getMonth(), dy = now.getDate();
                            const todayStr = toStr(now);
                            const dow = now.getDay();
                            const monOff = dow === 0 ? -6 : 1 - dow;
                            const thisWeekMon = new Date(y, mo, dy + monOff);
                            const thisWeekSun = new Date(y, mo, dy + monOff + 6);
                            const nextWeekMon = new Date(y, mo, dy + monOff + 7);
                            const nextWeekSun = new Date(y, mo, dy + monOff + 13);
                            const chips = [
                              { label: "Past",        from: "",                       to: toStr(new Date(y, mo, dy - 1)) },
                              { label: "Today",       from: todayStr,                 to: todayStr },
                              { label: "This Week",   from: toStr(thisWeekMon),       to: toStr(thisWeekSun) },
                              { label: "Next Week",   from: toStr(nextWeekMon),       to: toStr(nextWeekSun) },
                              { label: "This Month",  from: toStr(new Date(y, mo, 1)),to: toStr(new Date(y, mo + 1, 0)) },
                              { label: "Next Month",  from: toStr(new Date(y, mo + 1, 1)), to: toStr(new Date(y, mo + 2, 0)) },
                            ];
                            return chips.map(chip => {
                              const active = filterFrom === chip.from && filterTo === chip.to;
                              return (
                                <button key={chip.label} onClick={() => { setFilterFrom(chip.from); setFilterTo(chip.to); }}
                                  style={{ fontSize: "0.7rem", fontFamily: T.ff, fontWeight: active ? 700 : 500, border: `1px solid ${active ? T.leaf : T.border}`, borderRadius: 100, padding: "0.2rem 0.65rem", background: active ? T.leafLight : T.white, color: active ? T.leaf : T.inkSoft, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                                  {chip.label}
                                </button>
                              );
                            });
                          })()}

                          {/* Date range */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                              style={{ fontSize: "0.75rem", fontFamily: T.ff, border: `1px solid ${filterFrom ? T.leaf : T.border}`, borderRadius: 8, padding: "0.3rem 0.4rem", background: filterFrom ? T.leafLight : T.white, color: T.inkSoft, outline: "none", cursor: "pointer" }} />
                            <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>→</span>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                              style={{ fontSize: "0.75rem", fontFamily: T.ff, border: `1px solid ${filterTo ? T.leaf : T.border}`, borderRadius: 8, padding: "0.3rem 0.4rem", background: filterTo ? T.leafLight : T.white, color: T.inkSoft, outline: "none", cursor: "pointer" }} />
                          </div>

                          {/* Status line */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
                            {searchLoading && <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>Searching…</span>}
                            <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                              {hasFilter ? `${rows.length} result${rows.length !== 1 ? "s" : ""}` : "Recent 20"}
                            </span>
                            {hasFilter && (
                              <button onClick={clearFilters}
                                style={{ fontSize: "0.72rem", fontFamily: T.ff, border: `1px solid ${T.border}`, borderRadius: 100, padding: "0.2rem 0.65rem", background: T.white, color: T.inkMuted, cursor: "pointer" }}>
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── Table ── */}
                        <div style={{ overflowX: "auto" as const }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
                            <thead>
                              <tr style={{ background: T.cream }}>
                                {["Title", "Type", "Teacher", "Scheduled", "Reg.", "Status", "Outcome", "Flag", "Actions"].map(h => (
                                  <th key={h} style={{ padding: "0.6rem 0.85rem", textAlign: "left" as const, fontWeight: 600, color: T.inkMuted, whiteSpace: "nowrap" as const, fontSize: "0.75rem" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>
                                  {hasFilter ? "No sessions match your filters" : "No sessions yet"}
                                </td></tr>
                              ) : rows.map((s, i) => {
                                const isEditing = editId === s.id;
                                const rowBg = i % 2 === 0 ? T.white : T.cream;
                                return (
                                  <tr key={s.id} style={{ borderTop: `1px solid ${T.border}`, background: rowBg }}>
                                    {/* Title */}
                                    <td style={{ padding: "0.6rem 0.85rem", maxWidth: 200 }}>
                                      <Link href={`/admin/session/${s.id}`}
                                        style={{ color: T.ink, textDecoration: "none", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, fontSize: "0.82rem" }}>
                                        {s.title}
                                      </Link>
                                      <div style={{ fontSize: "0.67rem", color: T.inkMuted }}>#{s.id}</div>
                                    </td>

                                    {/* Type */}
                                    <td style={{ padding: "0.6rem 0.85rem" }}>
                                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 100, background: s.type === "webinar" ? T.leafLight : T.skyLight, color: s.type === "webinar" ? T.leaf : T.sky }}>
                                        {s.type}
                                      </span>
                                    </td>

                                    {/* Teacher */}
                                    <td style={{ padding: "0.6rem 0.85rem", color: T.inkSoft, whiteSpace: "nowrap" as const, fontSize: "0.78rem" }}>{userName(s.user)}</td>

                                    {/* Scheduled — editable */}
                                    <td style={{ padding: "0.6rem 0.85rem", whiteSpace: "nowrap" as const, minWidth: 200 }}>
                                      {isEditing ? (
                                        <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.35rem" }}>
                                          <input type="datetime-local" defaultValue={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            style={{ fontSize: "0.75rem", fontFamily: T.ff, border: `1.5px solid ${T.leaf}`, borderRadius: 8, padding: "0.3rem 0.5rem", outline: "none", width: "100%" }} />
                                          <input type="text" placeholder="Note (optional)" value={editNote} onChange={e => setEditNote(e.target.value)}
                                            style={{ fontSize: "0.72rem", fontFamily: T.ff, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.25rem 0.45rem", outline: "none", width: "100%", color: T.inkSoft }} />
                                          <div style={{ display: "flex", gap: "0.35rem" }}>
                                            <button onClick={() => handleSaveSchedule(s.id)} disabled={editSaving}
                                              style={{ flex: 1, fontSize: "0.7rem", fontFamily: T.ff, fontWeight: 700, border: "none", borderRadius: 6, padding: "0.25rem", background: T.leaf, color: T.white, cursor: "pointer", opacity: editSaving ? 0.6 : 1 }}>
                                              {editSaving ? "…" : "Save"}
                                            </button>
                                            <button onClick={() => { setEditId(null); setEditNote(""); }}
                                              style={{ flex: 1, fontSize: "0.7rem", fontFamily: T.ff, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.25rem", background: T.white, color: T.inkMuted, cursor: "pointer" }}>
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                          <div>
                                            <div style={{ fontSize: "0.78rem", color: T.ink }}>{fmtDate(s.scheduledAt)}</div>
                                            <div style={{ fontSize: "0.68rem", color: T.inkMuted }}>{fmtTime(s.scheduledAt)}</div>
                                          </div>
                                          <button title="Edit schedule" onClick={() => {
                                            const local = new Date(s.scheduledAt);
                                            const pad = (n: number) => String(n).padStart(2, "0");
                                            setEditValue(`${local.getFullYear()}-${pad(local.getMonth()+1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`);
                                            setEditId(s.id); setEditNote("");
                                          }} style={{ border: "none", background: "none", cursor: "pointer", color: T.inkMuted, padding: "0.1rem", lineHeight: 1, opacity: 0.6 }}>
                                            ✏️
                                          </button>
                                        </div>
                                      )}
                                    </td>

                                    {/* Reg */}
                                    <td style={{ padding: "0.6rem 0.85rem", textAlign: "center" as const, fontWeight: 600, fontSize: "0.82rem" }}>{s._count.registrations}</td>

                                    {/* Status */}
                                    <td style={{ padding: "0.6rem 0.85rem" }}>
                                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.3rem", alignItems: "flex-start" }}>
                                        {s.approved ? (
                                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>Approved</span>
                                        ) : s.qualityFlag?.startsWith("REJECTED") && s.status === "draft" ? (
                                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 100, background: T.redLight, color: T.red }}>Rejected</span>
                                        ) : (
                                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 100, background: T.sunLight, color: T.sun }}>Pending</span>
                                        )}
                                        {s.qualityFlag && (
                                          <span style={{ fontSize: "0.6rem", fontWeight: 600, padding: "0.1rem 0.4rem", borderRadius: 100, background: T.border, color: T.inkSoft, whiteSpace: "nowrap" as const }}>
                                            {s.qualityFlag.startsWith("REJECTED")
                                              ? (REJECTION_LABEL[s.qualityFlag] ?? s.qualityFlag.replace("REJECTED_", ""))
                                              : s.qualityFlag.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Outcome */}
                                    <td style={{ padding: "0.6rem 0.85rem", color: T.inkMuted, fontSize: "0.72rem" }}>{s.sessionStatus ?? "—"}</td>

                                    {/* Quality Flag */}
                                    <td style={{ padding: "0.6rem 0.85rem" }}>
                                      {s.qualityFlag ? (() => {
                                        const isRejected = s.qualityFlag.startsWith("REJECTED");
                                        const flagColors: Record<string, [string, string]> = {
                                          NORMAL:           [T.leafLight, T.leaf],
                                          HIGH_ENGAGEMENT:  [T.skyLight, T.sky],
                                          LOW_ATTENDANCE:   [T.redLight, T.red],
                                          LATE_START:       [T.sunLight, T.sun],
                                          EARLY_COMPLETION: [T.sunLight, T.sun],
                                          VERY_SHORT_SESSION: [T.sunLight, T.sun],
                                        };
                                        const [bg, color] = isRejected ? [T.redLight, T.red] : (flagColors[s.qualityFlag] ?? [T.border, T.inkMuted]);
                                        const label = isRejected
                                          ? (REJECTION_LABEL[s.qualityFlag] ?? s.qualityFlag.replace("REJECTED_", ""))
                                          : s.qualityFlag.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                                        return <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: 100, background: bg, color, whiteSpace: "nowrap" as const, display: "inline-block" }}>{label}</span>;
                                      })() : <span style={{ color: T.inkMuted, fontSize: "0.75rem" }}>—</span>}
                                    </td>

                                    {/* Actions */}
                                    <td style={{ padding: "0.6rem 0.85rem" }}>
                                      <button title="View audit log" onClick={() => openAuditLog(s.id)}
                                        style={{ border: "none", background: T.cream, borderRadius: 6, padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.7rem", color: T.inkMuted, fontFamily: T.ff }}>
                                        📋 Log
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Audit Log panel (slide-in from right) ── */}
                  {auditSessionId && (
                    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "100vw" : 420, maxWidth: "100vw", background: T.white, borderLeft: `1px solid ${T.border}`, boxShadow: "-8px 0 32px rgba(15,20,16,0.1)", zIndex: 500, display: "flex", flexDirection: "column" as const }}>
                      <div style={{ padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontFamily: T.ffd, fontWeight: 700, fontSize: "1rem", color: T.ink }}>Audit Log</div>
                          <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>Session #{auditSessionId}</div>
                        </div>
                        <button onClick={() => { setAuditSessionId(null); setAuditLog([]); }}
                          style={{ border: "none", background: T.cream, borderRadius: 8, padding: "0.35rem 0.7rem", cursor: "pointer", fontFamily: T.ff, fontSize: "0.82rem", color: T.inkSoft }}>
                          Close ×
                        </button>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto" as const, padding: "1rem 1.5rem" }}>
                        {auditLoading ? (
                          <div style={{ textAlign: "center", padding: "2rem", color: T.inkMuted }}>Loading…</div>
                        ) : auditLog.length === 0 ? (
                          <div style={{ textAlign: "center", padding: "2rem", color: T.inkMuted }}>
                            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📋</div>
                            No changes have been logged for this session.
                          </div>
                        ) : auditLog.map(entry => (
                          <div key={entry.id} style={{ padding: "0.9rem 0", borderBottom: `1px solid ${T.border}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: T.sky }}>
                                {entry.field}
                              </span>
                              <span style={{ fontSize: "0.68rem", color: T.inkMuted }}>{fmtDateTime(entry.createdAt)}</span>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", marginBottom: "0.3rem", alignItems: "center" }}>
                              <span style={{ color: T.red, background: T.redLight, padding: "0.1rem 0.4rem", borderRadius: 4, fontFamily: "monospace" }}>
                                {entry.oldValue ? fmtDateTime(entry.oldValue) : "—"}
                              </span>
                              <span style={{ color: T.inkMuted }}>→</span>
                              <span style={{ color: T.leaf, background: T.leafLight, padding: "0.1rem 0.4rem", borderRadius: 4, fontFamily: "monospace" }}>
                                {entry.newValue ? fmtDateTime(entry.newValue) : "—"}
                              </span>
                            </div>
                            {entry.note && <div style={{ fontSize: "0.72rem", color: T.inkMuted, fontStyle: "italic" }}>Note: {entry.note}</div>}
                            <div style={{ fontSize: "0.7rem", color: T.inkMuted, marginTop: "0.25rem" }}>
                              by {entry.admin ? [entry.admin.firstName, entry.admin.lastName].filter(Boolean).join(" ") || entry.admin.email : "Unknown"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <div style={{ textAlign: "center", padding: "4rem", color: T.inkMuted }}>Loading…</div>
            )}

            {/* ── USERS ── */}
            {tab === "users" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* Trend charts */}
                {userStats && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
                    <TrendChart title="New Signups" daily={userStats.signupDaily} monthly={userStats.signupMonthly} color={T.sky} />
                    <TrendChart title="Daily Logins" daily={userStats.loginDaily} monthly={userStats.loginMonthly} color={T.leaf} />
                  </div>
                )}

                {/* User management */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                  {/* Header + search */}
                  <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" as const }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      User Management {userLoading ? "·  loading…" : `· ${userList.length} shown`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: T.cream, border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.4rem 1rem", minWidth: 260 }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.inkMuted} strokeWidth={2.2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      <input
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Search by name or email…"
                        style={{ border: "none", outline: "none", background: "transparent", fontFamily: T.ff, fontSize: "0.85rem", color: T.ink, width: "100%" }}
                      />
                      {userSearch && (
                        <button onClick={() => setUserSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: T.inkMuted, padding: 0, lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: "auto" as const }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: T.cream }}>
                          {["User", "Email", "Role", "Status", "Sessions", "Joined", "Last Login", "Actions"].map(h => (
                            <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left" as const, fontWeight: 600, color: T.inkMuted, whiteSpace: "nowrap" as const }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {userList.length === 0 && !userLoading ? (
                          <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center" as const, color: T.inkMuted }}>No users found.</td></tr>
                        ) : userList.map((u, i) => (
                          <tr key={u.id} style={{ borderTop: `1px solid ${T.border}`, background: u.disabled ? "#fff8f8" : i % 2 === 0 ? T.white : T.cream, opacity: u.disabled ? 0.75 : 1 }}>
                            {/* Name + avatar */}
                            <td style={{ padding: "0.65rem 1rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(u.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                                  {u.avatarUrl
                                    ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${u.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    : userInitials(u)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: T.ink }}>{userName(u)}</div>
                                  {u.title && <div style={{ fontSize: "0.68rem", color: T.inkMuted }}>{u.title}</div>}
                                </div>
                              </div>
                            </td>
                            {/* Email */}
                            <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, fontSize: "0.78rem" }}>{u.email}</td>
                            {/* Role */}
                            <td style={{ padding: "0.65rem 1rem" }}>
                              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 100, background: u.role === "admin" ? T.ink : T.leafLight, color: u.role === "admin" ? T.white : T.leaf }}>
                                {u.role}
                              </span>
                            </td>
                            {/* Status */}
                            <td style={{ padding: "0.65rem 1rem" }}>
                              {u.disabled
                                ? <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 100, background: T.redLight, color: T.red }}>Disabled</span>
                                : <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>Active</span>
                              }
                            </td>
                            {/* Sessions */}
                            <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, textAlign: "center" as const }}>{u._count.sessions}</td>
                            {/* Joined */}
                            <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{fmtDate(u.createdAt)}</td>
                            {/* Last login */}
                            <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Never"}</td>
                            {/* Actions */}
                            <td style={{ padding: "0.65rem 1rem" }}>
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                <button
                                  onClick={() => handleToggleDisable(u)}
                                  style={{ padding: "0.3rem 0.7rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${u.disabled ? T.leaf : T.red}`, background: u.disabled ? T.leafLight : T.redLight, color: u.disabled ? T.leaf : T.red, whiteSpace: "nowrap" as const }}>
                                  {u.disabled ? "Enable" : "Disable"}
                                </button>
                                <button
                                  onClick={() => { setEditUser(u); setEditUserData({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email, role: u.role }); }}
                                  style={{ padding: "0.3rem 0.7rem", borderRadius: T.rs, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${T.border}`, background: T.white, color: T.inkSoft }}>
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Login history */}
                {userStats && (
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Login History (last 100)</div>
                    <div style={{ overflowX: "auto" as const }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: T.cream }}>
                            {["User", "IP Address", "Browser", "OS", "Time"].map(h => (
                              <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left" as const, fontWeight: 600, color: T.inkMuted, whiteSpace: "nowrap" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {userStats.loginLogs.map((l, i) => (
                            <tr key={l.id} style={{ borderTop: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : T.cream }}>
                              <td style={{ padding: "0.65rem 1rem" }}>
                                <div style={{ fontWeight: 600, color: T.ink }}>{userName(l.user)}</div>
                                <div style={{ fontSize: "0.7rem", color: T.inkMuted }}>{l.user.email}</div>
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, fontFamily: "monospace", fontSize: "0.78rem" }}>{l.ip ?? "—"}</td>
                              <td style={{ padding: "0.65rem 1rem" }}><span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 100, background: T.skyLight, color: T.sky }}>{l.browser}</span></td>
                              <td style={{ padding: "0.65rem 1rem" }}><span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 100, background: T.leafLight, color: T.leaf }}>{l.os}</span></td>
                              <td style={{ padding: "0.65rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{fmtDateTime(l.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "insights" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* ── 1. Login Engagement ── */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "0.75rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      Top Users by Login Count
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {(["today", "7d", "30d", "90d"] as const).map(p => (
                        <button key={p} onClick={() => setEngagementPeriod(p)}
                          style={{ padding: "0.25rem 0.7rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${engagementPeriod === p ? T.leaf : T.border}`, background: engagementPeriod === p ? T.leafLight : T.white, color: engagementPeriod === p ? T.leaf : T.inkMuted }}>
                          {p === "today" ? "Today" : p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {engagementLoading ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
                  ) : !engagement?.length ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>No login data for this period.</div>
                  ) : (
                    <div style={{ overflowX: "auto" as const }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: T.cream }}>
                            {["#", "User", "Email", "Role", "Logins", "Last Login"].map(h => (
                              <th key={h} style={{ padding: "0.6rem 1rem", textAlign: "left" as const, fontWeight: 600, color: T.inkMuted, whiteSpace: "nowrap" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {engagement.map((row, i) => (
                            <tr key={row.userId} style={{ borderTop: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : T.cream }}>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarBg(row.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                                    {row.user?.avatarUrl
                                      ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${row.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      : row.user ? userInitials(row.user) : "?"}
                                  </div>
                                  {row.user
                                    ? <a href={`/u/${makeProfileSlug({ id: row.user.id, firstName: row.user.firstName ?? undefined, lastName: row.user.lastName ?? undefined })}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: T.leaf, textDecoration: "none" }}>{userName(row.user)}</a>
                                    : <span style={{ fontWeight: 600, color: T.ink }}>User #{row.userId}</span>}
                                </div>
                              </td>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, fontSize: "0.78rem" }}>{row.user?.email ?? "—"}</td>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                {row.user && <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 100, background: row.user.role === "admin" ? T.ink : T.leafLight, color: row.user.role === "admin" ? T.white : T.leaf }}>{row.user.role}</span>}
                              </td>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <span style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: i < 3 ? T.leaf : T.ink }}>{row.loginCount}</span>
                              </td>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{row.user?.lastLoginAt ? fmtDateTime(row.user.lastLoginAt) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── 2. Top Teachers ── */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.25rem" }}>

                  {/* By rating */}
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      ⭐ Top Teachers by Rating
                    </div>
                    {!topTeachers ? (
                      <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
                    ) : topTeachers.byRating.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>No reviews yet.</div>
                    ) : (
                      <div>
                        {topTeachers.byRating.map((t, i) => (
                          <div key={t.teacherId} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: i < topTeachers.byRating.length - 1 ? `1px solid ${T.border}` : "none" }}>
                            <span style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: i === 0 ? "#e8a020" : i === 1 ? T.inkMuted : T.ink, minWidth: 20 }}>{i + 1}</span>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg(t.teacherId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                              {t.user?.avatarUrl
                                ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${t.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : t.user ? userInitials(t.user) : "?"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {t.user
                                ? <a href={`/u/${makeProfileSlug({ id: t.user.id, firstName: t.user.firstName ?? undefined, lastName: t.user.lastName ?? undefined })}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: "0.85rem", color: T.leaf, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, display: "block" }}>{userName(t.user)}</a>
                                : <div style={{ fontWeight: 600, fontSize: "0.85rem", color: T.ink }}>#{t.teacherId}</div>}
                              {t.user?.title && <div style={{ fontSize: "0.68rem", color: T.inkMuted }}>{t.user.title}</div>}
                            </div>
                            <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                              <div style={{ fontFamily: T.ffd, fontSize: "1.05rem", fontWeight: 700, color: T.sun }}>{t.avgRating}★</div>
                              <div style={{ fontSize: "0.65rem", color: T.inkMuted }}>{t.reviewCount} reviews</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* By sessions */}
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                    <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      🎓 Top Teachers by Sessions
                    </div>
                    {!topTeachers ? (
                      <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
                    ) : topTeachers.bySessions.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>No sessions yet.</div>
                    ) : (
                      <div>
                        {topTeachers.bySessions.map((t, i) => (
                          <div key={t.userId} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: i < topTeachers.bySessions.length - 1 ? `1px solid ${T.border}` : "none" }}>
                            <span style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: i === 0 ? T.leaf : i === 1 ? T.inkMuted : T.ink, minWidth: 20 }}>{i + 1}</span>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg(t.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                              {t.user?.avatarUrl
                                ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${t.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : t.user ? userInitials(t.user) : "?"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {t.user
                                ? <a href={`/u/${makeProfileSlug({ id: t.user.id, firstName: t.user.firstName ?? undefined, lastName: t.user.lastName ?? undefined })}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: "0.85rem", color: T.leaf, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, display: "block" }}>{userName(t.user)}</a>
                                : <div style={{ fontWeight: 600, fontSize: "0.85rem", color: T.ink }}>#{t.userId}</div>}
                              <div style={{ fontSize: "0.68rem", color: T.inkMuted, display: "flex", gap: "0.4rem", marginTop: "0.1rem" }}>
                                <span style={{ background: T.skyLight, color: T.sky, padding: "0.08rem 0.35rem", borderRadius: 100, fontWeight: 600 }}>{t.webinarCount} webinars</span>
                                <span style={{ background: T.leafLight, color: T.leaf, padding: "0.08rem 0.35rem", borderRadius: 100, fontWeight: 600 }}>{t.liveCount} live</span>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                              <div style={{ fontFamily: T.ffd, fontSize: "1.05rem", fontWeight: 700, color: T.leaf }}>{t.sessionCount}</div>
                              <div style={{ fontSize: "0.65rem", color: T.inkMuted }}>sessions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 3. Top Teachers by Subscribers + Growth Trend ── */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                    👥 Top Teachers by Subscribers &amp; Growth
                  </div>
                  {!subscriberInsights ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
                  ) : subscriberInsights.topTeachers.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>No subscriptions yet.</div>
                  ) : subscriberInsights.topTeachers.map((t, i) => {
                    const slug = t.user ? makeProfileSlug({ id: t.user.id, firstName: t.user.firstName ?? undefined, lastName: t.user.lastName ?? undefined }) : null;
                    const trendMax = Math.max(...t.trend.map(d => d.count), 1);
                    return (
                      <div key={t.teacherId} style={{ padding: "1rem 1.5rem", borderBottom: i < subscriberInsights.topTeachers.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap" as const, gap: isMobile ? "0.5rem" : "1rem" }}>
                          {/* rank + avatar */}
                          <span style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: i === 0 ? T.sun : i === 1 ? T.inkMuted : T.ink, minWidth: 22, flexShrink: 0 }}>{i + 1}</span>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg(t.teacherId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                            {t.user?.avatarUrl
                              ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${t.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : t.user ? userInitials(t.user) : "?"}
                          </div>
                          {/* name + title */}
                          <div style={{ flex: "0 0 160px", minWidth: 0 }}>
                            {slug
                              ? <a href={`/u/${slug}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: "0.88rem", color: T.leaf, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.user ? userName(t.user) : `#${t.teacherId}`}</a>
                              : <span style={{ fontWeight: 600, fontSize: "0.88rem", color: T.ink }}>#{t.teacherId}</span>}
                            {t.user?.title && <div style={{ fontSize: "0.68rem", color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.user.title}</div>}
                          </div>
                          {/* total */}
                          <div style={{ textAlign: "center" as const, flexShrink: 0, minWidth: 64 }}>
                            <div style={{ fontFamily: T.ffd, fontSize: "1.3rem", fontWeight: 700, color: T.sky, lineHeight: 1 }}>{t.totalSubscribers.toLocaleString()}</div>
                            <div style={{ fontSize: "0.62rem", color: T.inkMuted }}>total</div>
                          </div>
                          {/* growth badges */}
                          <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                            {[{ label: "+7d", val: t.new7d, bg: T.leafLight, color: T.leaf },
                              { label: "+30d", val: t.new30d, bg: T.skyLight, color: T.sky },
                              { label: "+90d", val: t.new90d, bg: T.sunLight, color: T.sun }].map(({ label, val, bg, color }) => (
                              <div key={label} style={{ textAlign: "center" as const, background: bg, borderRadius: T.rs, padding: "0.3rem 0.6rem" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.85rem", color }}>{val > 0 ? `+${val}` : "0"}</div>
                                <div style={{ fontSize: "0.58rem", color, opacity: 0.7 }}>{label}</div>
                              </div>
                            ))}
                          </div>
                          {/* 30-day sparkline */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.6rem", color: T.inkMuted, marginBottom: "0.2rem" }}>Last 30 days</div>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 32 }}>
                              {t.trend.map((d, di) => (
                                <div key={di} title={`${d.day}: ${d.count} new`}
                                  style={{ flex: 1, borderRadius: "2px 2px 0 0", background: d.count > 0 ? T.sky : T.border, height: `${Math.max((d.count / trendMax) * 100, d.count > 0 ? 15 : 5)}%`, transition: "height 0.3s" }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── 4. Top Students by Registrations ── */}

                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, overflow: "hidden" }}>
                  <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                      🏅 Top Students by Registrations
                      {topStudents && <span style={{ fontWeight: 400, marginLeft: "0.5rem" }}>({topStudents.total.toLocaleString()} total)</span>}
                    </div>
                    {topStudents && topStudents.total > 50 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: T.inkMuted }}>
                        <button disabled={studentPage === 1} onClick={() => setStudentPage(p => p - 1)}
                          style={{ padding: "0.25rem 0.65rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, cursor: studentPage === 1 ? "not-allowed" : "pointer", color: studentPage === 1 ? T.border : T.inkSoft, fontFamily: T.ff, fontSize: "0.78rem" }}>← Prev</button>
                        <span>Page {studentPage} of {Math.ceil(Math.min(topStudents.total, 1000) / 50)}</span>
                        <button disabled={studentPage >= Math.ceil(Math.min(topStudents.total, 1000) / 50)} onClick={() => setStudentPage(p => p + 1)}
                          style={{ padding: "0.25rem 0.65rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, cursor: "pointer", color: T.inkSoft, fontFamily: T.ff, fontSize: "0.78rem" }}>Next →</button>
                      </div>
                    )}
                  </div>
                  {!topStudents ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
                  ) : topStudents.data.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center" as const, color: T.inkMuted }}>No registrations found.</div>
                  ) : (
                    <div style={{ overflowX: "auto" as const }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: T.cream }}>
                            {["Rank", "Student", "Email", "Sessions Registered", "Joined Platform", "Last Login"].map(h => (
                              <th key={h} style={{ padding: "0.6rem 1rem", textAlign: "left" as const, fontWeight: 600, color: T.inkMuted, whiteSpace: "nowrap" as const }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topStudents.data.map((row, i) => (
                            <tr key={row.userId} style={{ borderTop: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : T.cream }}>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <span style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: row.rank <= 3 ? T.sun : T.inkMuted }}>#{row.rank}</span>
                              </td>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: avatarBg(row.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, color: T.white, flexShrink: 0, overflow: "hidden" }}>
                                    {row.user?.avatarUrl
                                      ? <img src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}${row.user.avatarUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      : row.user ? userInitials(row.user) : "?"}
                                  </div>
                                  {row.user
                                    ? <a href={`/u/${makeProfileSlug({ id: row.user.id, firstName: row.user.firstName ?? undefined, lastName: row.user.lastName ?? undefined })}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: T.leaf, textDecoration: "none" }}>{userName(row.user)}</a>
                                    : <span style={{ fontWeight: 600, color: T.ink }}>User #{row.userId}</span>}
                                </div>
                              </td>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, fontSize: "0.78rem" }}>{row.user?.email ?? "—"}</td>
                              <td style={{ padding: "0.6rem 1rem" }}>
                                <span style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: row.rank <= 10 ? T.leaf : T.ink }}>{row.regCount}</span>
                              </td>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{row.user?.createdAt ? fmtDate(row.user.createdAt) : "—"}</td>
                              <td style={{ padding: "0.6rem 1rem", color: T.inkMuted, whiteSpace: "nowrap" as const }}>{row.user?.lastLoginAt ? fmtDateTime(row.user.lastLoginAt) : "Never"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Edit user modal */}
            {editUser && (
              <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,20,16,0.55)" }}
                onClick={e => { if (e.target === e.currentTarget) setEditUser(null); }}>
                <div style={{ background: T.white, borderRadius: T.r, padding: "2rem", width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
                  <div style={{ fontFamily: T.ffd, fontSize: "1.1rem", fontWeight: 700, color: T.ink, marginBottom: "1.25rem" }}>Edit User #{editUser.id}</div>

                  {[
                    { label: "First Name", key: "firstName" as const },
                    { label: "Last Name",  key: "lastName"  as const },
                    { label: "Email",      key: "email"     as const },
                  ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: "0.85rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.inkMuted, marginBottom: "0.3rem" }}>{label}</label>
                      <input
                        value={editUserData[key]}
                        onChange={e => setEditUserData(d => ({ ...d, [key]: e.target.value }))}
                        style={{ width: "100%", boxSizing: "border-box" as const, padding: "0.5rem 0.75rem", borderRadius: T.rs, border: `1.5px solid ${T.border}`, fontFamily: T.ff, fontSize: "0.85rem", outline: "none", color: T.ink }}
                      />
                    </div>
                  ))}

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.inkMuted, marginBottom: "0.3rem" }}>Role</label>
                    <select
                      value={editUserData.role}
                      onChange={e => setEditUserData(d => ({ ...d, role: e.target.value }))}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: T.rs, border: `1.5px solid ${T.border}`, fontFamily: T.ff, fontSize: "0.85rem", outline: "none", color: T.ink, background: T.white }}>
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: "0.65rem", justifyContent: "flex-end" }}>
                    <button onClick={() => setEditUser(null)} style={{ padding: "0.55rem 1.25rem", border: `1px solid ${T.border}`, borderRadius: T.rs, background: T.white, color: T.inkMuted, fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button disabled={userSaving} onClick={handleSaveUser} style={{ padding: "0.55rem 1.5rem", border: "none", borderRadius: T.rs, background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", opacity: userSaving ? 0.6 : 1 }}>
                      {userSaving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MESSAGES ── */}
            {tab === "messages" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {threadEmail ? (
                  /* ── THREAD VIEW ── */
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Thread header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <button onClick={() => { setThreadEmail(null); setThread(null); setReplyBody(""); }}
                        style={{ background: "none", border: `1.5px solid ${T.border}`, borderRadius: T.rs, padding: "0.4rem 0.85rem", fontFamily: T.ff, fontSize: "0.8rem", fontWeight: 600, color: T.inkSoft, cursor: "pointer" }}>
                        ← Back
                      </button>
                      <div>
                        <div style={{ fontFamily: T.ffd, fontSize: "1.05rem", fontWeight: 700, color: T.ink }}>Thread with {thread?.[0]?.name ?? threadEmail}</div>
                        <div style={{ fontSize: "0.78rem", color: T.inkMuted }}>{threadEmail}</div>
                      </div>
                    </div>

                    {threadLoading ? (
                      <div style={{ textAlign: "center" as const, padding: "2rem", color: T.inkMuted }}>Loading thread…</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {thread?.map(msg => (
                          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {/* Inbound message bubble */}
                            <div style={{ background: T.white, border: `1.5px solid ${msg.isRead ? T.border : T.leaf}`, borderRadius: T.r, overflow: "hidden" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.75rem 1rem", borderBottom: `1px solid ${T.border}`, background: T.cream }}>
                                {!msg.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.leaf, flexShrink: 0 }} />}
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: T.inkMuted, background: T.white, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.15rem 0.5rem" }}>{msg.subject}</div>
                                <div style={{ flex: 1 }} />
                                <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>{fmtDateTime(msg.createdAt)}</div>
                                <button onClick={async () => {
                                  if (!confirm(`Delete this message?`)) return;
                                  setContactDeleting(msg.id);
                                  await deleteContactMessage(msg.id).catch(() => {});
                                  setThread(prev => prev ? prev.filter(m => m.id !== msg.id) : prev);
                                  setContactDeleting(null);
                                  showToast("Deleted");
                                }} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkMuted, fontSize: "0.8rem", padding: "0.1rem 0.35rem" }}>✕</button>
                              </div>
                              <div style={{ padding: "1rem", fontSize: "0.88rem", color: T.ink, lineHeight: 1.75, whiteSpace: "pre-wrap" as const }}>{msg.message}</div>
                              {!msg.isRead && (
                                <div style={{ padding: "0 1rem 0.75rem", display: "flex", justifyContent: "flex-end" }}>
                                  <button onClick={async () => {
                                    await markContactRead(msg.id).catch(() => {});
                                    setThread(prev => prev ? prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m) : prev);
                                    showToast("Marked as read");
                                  }} style={{ padding: "0.3rem 0.75rem", borderRadius: T.rs, border: `1.5px solid ${T.leaf}`, background: T.leafLight, color: T.leaf, fontFamily: T.ff, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                                    Mark as read
                                  </button>
                                </div>
                              )}
                              {/* Replies to this message */}
                              {msg.replies.map(r => (
                                <div key={r.id} style={{ margin: "0 1rem 1rem", background: "#f0faf4", border: `1px solid ${T.leafLight}`, borderRadius: T.rs, padding: "0.75rem 1rem" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.leaf, marginBottom: "0.4rem", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                                    You replied · {fmtDateTime(r.sentAt)}
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: T.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>{r.body}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Reply compose */}
                        <div style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: T.r, padding: "1.1rem 1.25rem" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: T.inkMuted, marginBottom: "0.65rem", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                            Reply to {threadEmail}
                          </div>
                          <textarea
                            value={replyBody}
                            onChange={e => setReplyBody(e.target.value)}
                            rows={5}
                            placeholder="Write your reply…"
                            style={{ width: "100%", boxSizing: "border-box" as const, padding: "0.75rem 0.9rem", borderRadius: T.rs, border: `1.5px solid ${T.border}`, fontFamily: T.ff, fontSize: "0.88rem", color: T.ink, resize: "vertical" as const, outline: "none", lineHeight: 1.6 }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.65rem" }}>
                            <button
                              disabled={replying || !replyBody.trim() || !thread?.length}
                              onClick={async () => {
                                const lastMsg = thread![thread!.length - 1];
                                setReplying(true);
                                try {
                                  const saved = await replyToContact(lastMsg.id, replyBody.trim());
                                  setThread(prev => prev ? prev.map((m, i) => i === prev.length - 1 ? { ...m, isRead: true, replies: [...m.replies, saved] } : m) : prev);
                                  setReplyBody("");
                                  showToast("Reply sent ✓");
                                } catch (err) {
                                  showToast((err as Error).message || "Failed to send", false);
                                } finally {
                                  setReplying(false);
                                }
                              }}
                              style={{ padding: "0.55rem 1.5rem", borderRadius: 100, border: "none", background: T.leaf, color: T.white, fontFamily: T.ff, fontSize: "0.875rem", fontWeight: 600, cursor: replying ? "default" : "pointer", opacity: replying || !replyBody.trim() ? 0.6 : 1 }}>
                              {replying ? "Sending…" : "Send reply →"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── LIST VIEW ── */
                  <>
                    {/* Header + search + filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" as const }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: T.ffd, fontSize: "1.15rem", fontWeight: 700, color: T.ink }}>Contact Messages</div>
                        <div style={{ fontSize: "0.8rem", color: T.inkMuted, marginTop: "0.15rem" }}>Click a row to open the full thread and reply</div>
                      </div>
                      <input
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        placeholder="Search by email…"
                        style={{ padding: "0.5rem 0.9rem", borderRadius: 100, border: `1.5px solid ${T.border}`, fontFamily: T.ff, fontSize: "0.82rem", outline: "none", color: T.ink, width: isMobile ? "100%" : 200 }}
                      />
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {(["all", "unread"] as const).map(f => (
                          <button key={f} onClick={() => setContactFilter(f)}
                            style={{ padding: "0.3rem 0.9rem", borderRadius: 100, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", border: `1.5px solid ${contactFilter === f ? T.leaf : T.border}`, background: contactFilter === f ? T.leafLight : T.white, color: contactFilter === f ? T.leaf : T.inkMuted }}>
                            {f === "all" ? "All" : "Unread"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {contactLoading ? (
                      <div style={{ textAlign: "center" as const, padding: "3rem", color: T.inkMuted }}>Loading…</div>
                    ) : !contactMessages?.length ? (
                      <div style={{ textAlign: "center" as const, padding: "3rem", color: T.inkMuted, background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r }}>
                        {contactFilter === "unread" ? "No unread messages." : contactSearch ? "No messages match that email." : "No messages yet."}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {contactMessages.map(msg => (
                          <div
                            key={msg.id}
                            onClick={async () => {
                              setThreadEmail(msg.email);
                              setThreadLoading(true);
                              setThread(null);
                              setReplyBody("");
                              try {
                                const t = await getContactThread(msg.email);
                                setThread(t);
                              } finally {
                                setThreadLoading(false);
                              }
                            }}
                            style={{ background: T.white, border: `1.5px solid ${msg.isRead && !msg.replies.length ? T.border : T.leaf}`, borderRadius: T.r, padding: "0.85rem 1.1rem", cursor: "pointer", display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: "0.5rem", opacity: contactDeleting === msg.id ? 0.4 : 1, transition: "box-shadow 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,20,16,0.08)")}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: msg.isRead ? "transparent" : T.leaf, border: msg.isRead ? `1.5px solid ${T.border}` : "none", flexShrink: 0 }} />
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: T.inkMuted, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.15rem 0.5rem", flexShrink: 0 }}>{msg.subject}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                                {msg.name}
                                <span style={{ fontWeight: 400, color: T.inkMuted, marginLeft: "0.4rem", fontSize: "0.8rem" }}>{msg.email}</span>
                              </div>
                              <div style={{ fontSize: "0.77rem", color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginTop: "0.1rem" }}>
                                {msg.message.slice(0, 90)}{msg.message.length > 90 ? "…" : ""}
                              </div>
                            </div>
                            {msg.replies.length > 0 && (
                              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.leaf, background: T.leafLight, border: `1px solid ${T.leafLight}`, borderRadius: 100, padding: "0.15rem 0.55rem", flexShrink: 0 }}>
                                {msg.replies.length} repl{msg.replies.length === 1 ? "y" : "ies"}
                              </div>
                            )}
                            <div style={{ fontSize: "0.72rem", color: T.inkMuted, flexShrink: 0 }}>{fmtDateTime(msg.createdAt)}</div>
                            <div style={{ color: T.inkMuted, fontSize: "0.8rem", flexShrink: 0 }}>→</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── RECORDINGS ── */}
            {tab === "recordings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* Infrastructure health checks */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink, marginBottom: "1rem" }}>Infrastructure Health</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "1rem" }}>
                    {/* S3 */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.ink }}>iDrive S3</div>
                        <button disabled={infraS3Loading}
                          onClick={async () => { setInfraS3Loading(true); setInfraS3(null); const r = await infraTestS3().catch(e => ({ ok: false, message: (e as Error).message })); setInfraS3(r); setInfraS3Loading(false); }}
                          style={{ padding: "0.3rem 0.9rem", borderRadius: T.rs, border: "none", background: T.sky, color: T.white, fontWeight: 700, fontSize: "0.75rem", cursor: infraS3Loading ? "not-allowed" : "pointer", opacity: infraS3Loading ? 0.6 : 1, fontFamily: T.ff }}>
                          {infraS3Loading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {infraS3 ? (
                        <div style={{ fontSize: "0.78rem", color: infraS3.ok ? T.leaf : T.red, background: infraS3.ok ? T.leafLight : T.redLight, padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                          {infraS3.ok ? "✅" : "❌"} {infraS3.message}
                          {infraS3.detail && <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>{infraS3.detail}</div>}
                        </div>
                      ) : <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>Press Test to check connectivity</div>}
                    </div>

                    {/* Bunny CDN */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.ink }}>Bunny CDN</div>
                        <button disabled={infraBunnyLoading}
                          onClick={async () => { setInfraBunnyLoading(true); setInfraBunny(null); const r = await infraTestBunny().catch(e => ({ ok: false, message: (e as Error).message })); setInfraBunny(r); setInfraBunnyLoading(false); }}
                          style={{ padding: "0.3rem 0.9rem", borderRadius: T.rs, border: "none", background: T.sky, color: T.white, fontWeight: 700, fontSize: "0.75rem", cursor: infraBunnyLoading ? "not-allowed" : "pointer", opacity: infraBunnyLoading ? 0.6 : 1, fontFamily: T.ff }}>
                          {infraBunnyLoading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {infraBunny ? (
                        <div style={{ fontSize: "0.78rem", color: infraBunny.ok ? T.leaf : T.red, background: infraBunny.ok ? T.leafLight : T.redLight, padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                          {infraBunny.ok ? "✅" : "❌"} {infraBunny.message}
                          {infraBunny.detail && <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>{infraBunny.detail}</div>}
                        </div>
                      ) : <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>Press Test to check signed URL fetch</div>}
                    </div>

                    {/* ffmpeg */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.ink }}>ffmpeg</div>
                        <button disabled={infraFfmpegLoading}
                          onClick={async () => { setInfraFfmpegLoading(true); setInfraFfmpeg(null); const r = await infraTestFfmpeg().catch(e => ({ ok: false, message: (e as Error).message })); setInfraFfmpeg(r); setInfraFfmpegLoading(false); }}
                          style={{ padding: "0.3rem 0.9rem", borderRadius: T.rs, border: "none", background: T.sky, color: T.white, fontWeight: 700, fontSize: "0.75rem", cursor: infraFfmpegLoading ? "not-allowed" : "pointer", opacity: infraFfmpegLoading ? 0.6 : 1, fontFamily: T.ff }}>
                          {infraFfmpegLoading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {infraFfmpeg ? (
                        <div style={{ fontSize: "0.78rem", color: infraFfmpeg.ok ? T.leaf : T.red, background: infraFfmpeg.ok ? T.leafLight : T.redLight, padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                          {infraFfmpeg.ok ? "✅" : "❌"} {infraFfmpeg.message}
                          {infraFfmpeg.detail && <div style={{ color: T.inkMuted, marginTop: "0.2rem", fontSize: "0.7rem", wordBreak: "break-all" as const }}>{infraFfmpeg.detail}</div>}
                        </div>
                      ) : <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>Press Test to verify installation</div>}
                    </div>

                    {/* LiveKit */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.ink }}>LiveKit Egress</div>
                        <button disabled={infraLiveKitLoading}
                          onClick={async () => { setInfraLiveKitLoading(true); setInfraLiveKit(null); const r = await infraTestLiveKit().catch(e => ({ ok: false, message: (e as Error).message })); setInfraLiveKit(r); setInfraLiveKitLoading(false); }}
                          style={{ padding: "0.3rem 0.9rem", borderRadius: T.rs, border: "none", background: T.sky, color: T.white, fontWeight: 700, fontSize: "0.75rem", cursor: infraLiveKitLoading ? "not-allowed" : "pointer", opacity: infraLiveKitLoading ? 0.6 : 1, fontFamily: T.ff }}>
                          {infraLiveKitLoading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {infraLiveKit ? (
                        <div style={{ fontSize: "0.78rem", color: infraLiveKit.ok ? T.leaf : T.red, background: infraLiveKit.ok ? T.leafLight : T.redLight, padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                          {infraLiveKit.ok ? "✅" : "❌"} {infraLiveKit.message}
                          {infraLiveKit.detail && <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>{infraLiveKit.detail}</div>}
                        </div>
                      ) : <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>Press Test to verify LiveKit server</div>}
                    </div>

                    {/* Redis */}
                    <div style={{ border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: T.ink }}>Redis</div>
                        <button disabled={infraRedisLoading}
                          onClick={async () => { setInfraRedisLoading(true); setInfraRedis(null); const r = await infraTestRedis().catch(e => ({ ok: false, message: (e as Error).message })); setInfraRedis(r); setInfraRedisLoading(false); }}
                          style={{ padding: "0.3rem 0.9rem", borderRadius: T.rs, border: "none", background: T.sky, color: T.white, fontWeight: 700, fontSize: "0.75rem", cursor: infraRedisLoading ? "not-allowed" : "pointer", opacity: infraRedisLoading ? 0.6 : 1, fontFamily: T.ff }}>
                          {infraRedisLoading ? "Testing…" : "Test"}
                        </button>
                      </div>
                      {infraRedis ? (
                        <div style={{ fontSize: "0.78rem", color: infraRedis.ok ? T.leaf : T.red, background: infraRedis.ok ? T.leafLight : T.redLight, padding: "0.5rem 0.75rem", borderRadius: 6 }}>
                          {infraRedis.ok ? "✅" : "❌"} {infraRedis.message}
                          {infraRedis.detail && <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>{infraRedis.detail}</div>}
                        </div>
                      ) : <div style={{ fontSize: "0.75rem", color: T.inkMuted }}>Press Test to verify Redis connectivity</div>}
                    </div>
                  </div>
                </div>

                {/* System Stats */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink }}>System Resources</div>
                    <button disabled={sysStatsLoading} onClick={async () => { setSysStatsLoading(true); try { setSysStats(await getSystemStats()); } catch { /* ignore */ } finally { setSysStatsLoading(false); } }}
                      style={{ padding: "0.4rem 1rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.ink, fontWeight: 700, fontSize: "0.8rem", cursor: sysStatsLoading ? "not-allowed" : "pointer", opacity: sysStatsLoading ? 0.6 : 1, fontFamily: T.ff }}>
                      {sysStatsLoading ? "Loading…" : "🔄 Refresh"}
                    </button>
                  </div>
                  {sysStats ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {/* CPU + Memory + Disk row */}
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "0.75rem" }}>
                        {/* CPU */}
                        <div style={{ background: T.cream, borderRadius: T.rs, padding: "0.9rem 1rem" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.4rem" }}>CPU</div>
                          <div style={{ fontSize: "0.8rem", color: T.ink, fontWeight: 600, marginBottom: "0.25rem" }}>{sysStats.cpu.cores} cores</div>
                          <div style={{ fontSize: "0.72rem", color: T.inkSoft, marginBottom: "0.5rem", wordBreak: "break-all" as const }}>{sysStats.cpu.model}</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: sysStats.cpu.usedPercent > 85 ? T.red : T.leaf, marginBottom: "0.25rem" }}>
                            {sysStats.cpu.usedPercent}% used
                          </div>
                          <div style={{ height: 6, background: T.border, borderRadius: 3, marginBottom: "0.4rem" }}>
                            <div style={{ height: 6, borderRadius: 3, width: `${sysStats.cpu.usedPercent}%`, background: sysStats.cpu.usedPercent > 85 ? T.red : T.leaf, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: "0.7rem", color: T.inkMuted }}>Load avg (1m / 5m / 15m)</div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: sysStats.cpu.loadAvg[0] > sysStats.cpu.cores * 0.8 ? T.red : T.inkSoft }}>
                            {sysStats.cpu.loadAvg.map(l => l.toFixed(2)).join(" / ")}
                          </div>
                        </div>
                        {/* Memory */}
                        <div style={{ background: T.cream, borderRadius: T.rs, padding: "0.9rem 1rem" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Memory</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: sysStats.memory.usedPercent > 85 ? T.red : T.ink, marginBottom: "0.4rem" }}>
                            {sysStats.memory.usedPercent}% used
                          </div>
                          <div style={{ height: 6, background: T.border, borderRadius: 3, marginBottom: "0.4rem" }}>
                            <div style={{ height: 6, borderRadius: 3, width: `${sysStats.memory.usedPercent}%`, background: sysStats.memory.usedPercent > 85 ? T.red : T.leaf, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: "0.72rem", color: T.inkSoft }}>{sysStats.memory.usedMB.toLocaleString()} MB / {sysStats.memory.totalMB.toLocaleString()} MB</div>
                        </div>
                        {/* Disk */}
                        <div style={{ background: T.cream, borderRadius: T.rs, padding: "0.9rem 1rem" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Disk ({sysStats.disk.mount})</div>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: parseInt(sysStats.disk.usePercent) > 85 ? T.red : T.ink, marginBottom: "0.4rem" }}>
                            {sysStats.disk.usePercent} used
                          </div>
                          <div style={{ height: 6, background: T.border, borderRadius: 3, marginBottom: "0.4rem" }}>
                            <div style={{ height: 6, borderRadius: 3, width: sysStats.disk.usePercent, background: parseInt(sysStats.disk.usePercent) > 85 ? T.red : T.leaf, transition: "width 0.3s" }} />
                          </div>
                          <div style={{ fontSize: "0.72rem", color: T.inkSoft }}>{sysStats.disk.used} / {sysStats.disk.size} — {sysStats.disk.avail} free</div>
                        </div>
                      </div>
                      {/* Uptime + platform */}
                      <div style={{ fontSize: "0.72rem", color: T.inkMuted }}>
                        Platform: <strong>{sysStats.platform}</strong> · Uptime: <strong>{Math.floor(sysStats.uptime / 3600)}h {Math.floor((sysStats.uptime % 3600) / 60)}m</strong>
                      </div>
                      {/* Process table */}
                      <div>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.inkMuted, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
                          Top Processes — click column to sort
                        </div>
                        <div style={{ overflowX: "auto" as const }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.72rem", fontFamily: "monospace" }}>
                            <thead>
                              <tr style={{ background: T.cream }}>
                                {([ ["user","USER"], ["pid","PID"], ["cpu","CPU%"], ["mem","MEM%"], ["command","COMMAND"] ] as [typeof procSort["col"], string][]).map(([col, label]) => {
                                  const active = procSort.col === col;
                                  return (
                                    <th key={col} onClick={() => setProcSort(s => s.col === col ? { col, dir: s.dir === 1 ? -1 : 1 } : { col, dir: col === "cpu" || col === "mem" ? -1 : 1 })}
                                      style={{ textAlign: "left" as const, padding: "0.3rem 0.5rem", color: active ? T.ink : T.inkMuted, fontWeight: 700, whiteSpace: "nowrap" as const, cursor: "pointer", userSelect: "none" as const }}>
                                      {label} {active ? (procSort.dir === -1 ? "▼" : "▲") : "⇅"}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {[...sysStats.processes.rows].sort((a, b) => {
                                const col = procSort.col;
                                const av = col === "cpu" || col === "mem" || col === "pid" ? parseFloat(a[col]) : a[col];
                                const bv = col === "cpu" || col === "mem" || col === "pid" ? parseFloat(b[col]) : b[col];
                                return (av < bv ? -1 : av > bv ? 1 : 0) * procSort.dir;
                              }).map((r, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                                  <td style={{ padding: "0.3rem 0.5rem", color: T.inkSoft }}>{r.user}</td>
                                  <td style={{ padding: "0.3rem 0.5rem", color: T.inkSoft }}>{r.pid}</td>
                                  <td style={{ padding: "0.3rem 0.5rem", color: parseFloat(r.cpu) > 50 ? T.red : T.ink, fontWeight: parseFloat(r.cpu) > 10 ? 700 : 400 }}>{r.cpu}</td>
                                  <td style={{ padding: "0.3rem 0.5rem", color: parseFloat(r.mem) > 20 ? T.red : T.ink, fontWeight: parseFloat(r.mem) > 10 ? 700 : 400 }}>{r.mem}</td>
                                  <td style={{ padding: "0.3rem 0.5rem", color: T.ink, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.command}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: T.inkMuted }}>Press Refresh to load system stats</div>
                  )}
                </div>

                {/* Queue status + Run Now */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink }}>Upload Queue</div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => recordingQueueStatus().then(setRecQueue).catch(() => {})}
                        style={{ padding: "0.4rem 1rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.inkSoft, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: T.ff }}>
                        Refresh
                      </button>
                      <button disabled={scanDiskRunning}
                        onClick={async () => {
                          setScanDiskRunning(true);
                          try {
                            const r = await recordingScanDisk();
                            showToast(`Imported ${r.created} file${r.created !== 1 ? 's' : ''}, skipped ${r.skipped}`, true);
                            setTimeout(() => recordingQueueStatus().then(setRecQueue).catch(() => {}), 1000);
                          } catch (e: unknown) { showToast((e as Error).message, false); }
                          finally { setScanDiskRunning(false); }
                        }}
                        style={{ padding: "0.4rem 1.1rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.ink, fontWeight: 700, fontSize: "0.8rem", cursor: scanDiskRunning ? "not-allowed" : "pointer", opacity: scanDiskRunning ? 0.6 : 1, fontFamily: T.ff }}>
                        {scanDiskRunning ? "Scanning…" : "🔍 Scan Disk"}
                      </button>
                      <button disabled={syncS3Running}
                        onClick={async () => {
                          setSyncS3Running(true);
                          try {
                            const r = await recordingSyncS3();
                            showToast(`Synced ${r.created} from S3, skipped ${r.skipped}`, true);
                            setTimeout(() => Promise.all([recordingQueueStatus().then(setRecQueue), recordingGetUploaded().then(setRecUploaded)]).catch(() => {}), 1000);
                          } catch (e: unknown) { showToast((e as Error).message, false); }
                          finally { setSyncS3Running(false); }
                        }}
                        style={{ padding: "0.4rem 1.1rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.ink, fontWeight: 700, fontSize: "0.8rem", cursor: syncS3Running ? "not-allowed" : "pointer", opacity: syncS3Running ? 0.6 : 1, fontFamily: T.ff }}>
                        {syncS3Running ? "Syncing…" : "☁️ Sync S3"}
                      </button>
                      <button disabled={migrateUrlsRunning}
                        onClick={async () => {
                          setMigrateUrlsRunning(true);
                          try {
                            const r = await storageMigrateUrls();
                            showToast(`Migrated: ${r.banners} banners, ${r.videos} videos, ${r.avatars} avatars`, true);
                          } catch (e: unknown) { showToast((e as Error).message, false); }
                          finally { setMigrateUrlsRunning(false); }
                        }}
                        style={{ padding: "0.4rem 1.1rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.ink, fontWeight: 700, fontSize: "0.8rem", cursor: migrateUrlsRunning ? "not-allowed" : "pointer", opacity: migrateUrlsRunning ? 0.6 : 1, fontFamily: T.ff }}>
                        {migrateUrlsRunning ? "Migrating…" : "🔁 Migrate URLs"}
                      </button>
                      <button disabled={recRunning || !!recQueue?.isRunning}
                        onClick={async () => {
                          setRecRunning(true);
                          try {
                            const r = await recordingRunManually();
                            showToast(r.message, r.ok);
                            setTimeout(() => recordingQueueStatus().then(setRecQueue).catch(() => {}), 2000);
                          } catch (e: unknown) { showToast((e as Error).message, false); }
                          finally { setRecRunning(false); }
                        }}
                        style={{ padding: "0.4rem 1.1rem", borderRadius: T.rs, border: "none", background: T.leaf, color: T.white, fontWeight: 700, fontSize: "0.8rem", cursor: (recRunning || recQueue?.isRunning) ? "not-allowed" : "pointer", opacity: (recRunning || recQueue?.isRunning) ? 0.6 : 1, fontFamily: T.ff }}>
                        {recRunning || recQueue?.isRunning ? "Running…" : "▶ Run Now"}
                      </button>
                    </div>
                  </div>
                  {recQueue ? (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: "0.75rem" }}>
                      {([
                        { label: "Pending", value: recQueue.pendingTotal, color: recQueue.pendingTotal > 0 ? T.sun : T.leaf },
                        { label: "On Disk", value: recQueue.pendingOnDisk, color: T.sky },
                        { label: "Sessions Uploaded", value: recQueue.uploadedSessions, color: T.leaf },
                        { label: "Total Recordings", value: recQueue.totalRecordings, color: T.ink },
                      ] as { label: string; value: number; color: string }[]).map(s => (
                        <div key={s.label} style={{ background: T.cream, borderRadius: T.rs, padding: "0.75rem 1rem" }}>
                          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, fontFamily: T.ffd }}>{s.value}</div>
                          <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginTop: "0.15rem" }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ color: T.inkMuted, fontSize: "0.82rem" }}>Loading…</div>}
                  {recQueue && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: T.inkMuted }}>
                      Cron: <code style={{ background: T.cream, padding: "0.1rem 0.4rem", borderRadius: 4 }}>{recQueue.cronExpression}</code>
                      {" · "}Status: <span style={{ color: recQueue.isRunning ? T.sun : T.leaf, fontWeight: 600 }}>{recQueue.isRunning ? "Running" : "Idle"}</span>
                    </div>
                  )}
                </div>

                {/* Uploaded sessions */}
                {recUploaded && recUploaded.length > 0 && (
                  <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink, marginBottom: "1rem" }}>Uploaded to S3 ({recUploaded.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 280, overflowY: "auto" as const }}>
                      {recUploaded.map(u => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", background: T.cream, borderRadius: T.rs, fontSize: "0.8rem" }}>
                          <span style={{ fontWeight: 700, color: T.leaf, flexShrink: 0 }}>✅</span>
                          <span style={{ fontWeight: 600, color: T.ink, flexShrink: 0 }}>Session {u.sessionId}</span>
                          <span style={{ color: T.inkMuted, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{u.s3Key}</span>
                          <span style={{ color: T.inkMuted, flexShrink: 0, fontSize: "0.7rem" }}>{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing logs */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink }}>Processing Logs</div>
                    <button onClick={() => { setRecLogsLoading(true); recordingGetLogs().then(setRecLogs).catch(() => {}).finally(() => setRecLogsLoading(false)); }}
                      style={{ padding: "0.3rem 0.85rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.inkSoft, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", fontFamily: T.ff }}>
                      Refresh
                    </button>
                  </div>
                  {recLogsLoading ? (
                    <div style={{ color: T.inkMuted, fontSize: "0.82rem" }}>Loading…</div>
                  ) : recLogs && recLogs.length > 0 ? (
                    <div style={{ background: "#0f1410", borderRadius: T.rs, padding: "0.85rem 1rem", maxHeight: 360, overflowY: "auto" as const, fontFamily: "monospace", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {recLogs.map((entry, i) => (
                        <div key={i} style={{ color: entry.level === "error" ? "#ff6b6b" : entry.level === "warn" ? "#ffd93d" : "#a8d5b5" }}>
                          <span style={{ opacity: 0.5, marginRight: "0.6rem" }}>{new Date(entry.ts).toLocaleTimeString()}</span>
                          {entry.msg}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: T.inkMuted, fontSize: "0.82rem" }}>No logs yet — logs appear once the cron runs or you click Run Now</div>
                  )}
                </div>

                {/* ── Egress Logs ─────────────────────────────────────────── */}
                <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: "1.25rem 1.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{ fontFamily: T.ffd, fontSize: "1rem", fontWeight: 700, color: T.ink }}>Egress Logs</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      {/* Filter pills */}
                      {(["all","EGRESS_ACTIVE","EGRESS_COMPLETE","EGRESS_FAILED","EGRESS_ABORTED"] as const).map(f => {
                        const labels: Record<string, string> = { all: "All", EGRESS_ACTIVE: "Active", EGRESS_COMPLETE: "Complete", EGRESS_FAILED: "Failed", EGRESS_ABORTED: "Aborted" };
                        const active = egressFilter === f;
                        return (
                          <button key={f} onClick={() => {
                            setEgressFilter(f);
                            setEgressLogsLoading(true);
                            recordingGetEgressLogs(f === "all" ? undefined : f).then(setEgressLogs).catch(() => {}).finally(() => setEgressLogsLoading(false));
                          }}
                            style={{ padding: "0.25rem 0.75rem", borderRadius: 100, border: `1px solid ${active ? T.leaf : T.border}`, background: active ? T.leafLight : T.white, color: active ? T.leaf : T.inkMuted, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", fontFamily: T.ff }}>
                            {labels[f]}
                          </button>
                        );
                      })}
                      <button onClick={() => {
                        setEgressLogsLoading(true);
                        recordingGetEgressLogs(egressFilter === "all" ? undefined : egressFilter).then(setEgressLogs).catch(() => {}).finally(() => setEgressLogsLoading(false));
                      }}
                        style={{ padding: "0.25rem 0.85rem", borderRadius: T.rs, border: `1px solid ${T.border}`, background: T.white, color: T.inkSoft, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", fontFamily: T.ff }}>
                        Refresh
                      </button>
                      <button onClick={() => {
                        setEgressLogsLoading(true);
                        recordingSyncEgressLogs()
                          .then(r => {
                            const parts = [];
                            if (r.updated) parts.push(`${r.updated} updated`);
                            if (r.markedAborted) parts.push(`${r.markedAborted} marked aborted (webhook missed)`);
                            if (r.errors?.length) parts.push(`${r.errors.length} errors:\n${r.errors.join('\n')}`);
                            alert(parts.length ? `Sync complete: ${parts.join('\n')}` : 'Nothing to sync — all logs up to date');
                            return recordingGetEgressLogs(egressFilter === "all" ? undefined : egressFilter);
                          })
                          .then(setEgressLogs)
                          .catch(e => alert(e.message))
                          .finally(() => setEgressLogsLoading(false));
                      }}
                        style={{ padding: "0.25rem 0.85rem", borderRadius: T.rs, border: `1px solid ${T.sky}`, background: "#e8f4ff", color: T.sky, fontWeight: 600, fontSize: "0.72rem", cursor: "pointer", fontFamily: T.ff }}>
                        Sync LiveKit
                      </button>
                    </div>
                  </div>

                  {egressLogsLoading ? (
                    <div style={{ color: T.inkMuted, fontSize: "0.82rem" }}>Loading…</div>
                  ) : !egressLogs || egressLogs.length === 0 ? (
                    <div style={{ color: T.inkMuted, fontSize: "0.82rem" }}>
                      No egress logs yet — they appear as soon as a speaker clicks &quot;Start Recording&quot; in a session.
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" as const }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.78rem" }}>
                        <thead>
                          <tr style={{ background: T.cream, textAlign: "left" as const }}>
                            {["Session","Egress ID","Status","Triggered By","Started","Ended","Duration","File Size","Error"].map(h => (
                              <th key={h} style={{ padding: "0.5rem 0.75rem", fontWeight: 700, color: T.inkMuted, whiteSpace: "nowrap" as const, fontSize: "0.7rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {egressLogs.map(log => {
                            const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
                              EGRESS_STARTING: { bg: T.sunLight,  color: T.sun },
                              EGRESS_ACTIVE:   { bg: "#e8f4ff",   color: T.sky },
                              EGRESS_ENDING:   { bg: T.sunLight,  color: T.sun },
                              EGRESS_COMPLETE: { bg: T.leafLight, color: T.leaf },
                              EGRESS_FAILED:   { bg: T.redLight,  color: T.red },
                              EGRESS_ABORTED:  { bg: "#f0ede8",   color: T.inkMuted },
                            };
                            const sty = STATUS_STYLE[log.status] ?? { bg: "#f0ede8", color: T.inkMuted };
                            const isExpanded = egressExpanded === log.id;
                            const durationStr = log.fileDurationSec != null
                              ? `${Math.floor(log.fileDurationSec / 60)}m ${log.fileDurationSec % 60}s`
                              : log.recordingStartedAt && log.recordingEndedAt
                                ? `${Math.round((new Date(log.recordingEndedAt).getTime() - new Date(log.recordingStartedAt).getTime()) / 60000)}m`
                                : "—";
                            const sizeStr = log.fileSizeBytes != null
                              ? log.fileSizeBytes > 1_000_000_000
                                ? `${(log.fileSizeBytes / 1_000_000_000).toFixed(1)} GB`
                                : `${(log.fileSizeBytes / 1_000_000).toFixed(1)} MB`
                              : "—";

                            return (
                              <Fragment key={log.id}>
                                <tr
                                  onClick={() => setEgressExpanded(isExpanded ? null : log.id)}
                                  style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer", background: isExpanded ? T.cream : "transparent", transition: "background 0.15s" }}>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.ink, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                                    <div style={{ fontSize: "0.75rem", color: T.inkMuted, marginBottom: "0.1rem" }}>#{log.session.id}</div>
                                    {log.session.title}
                                  </td>
                                  <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", fontSize: "0.7rem", color: T.inkSoft, whiteSpace: "nowrap" as const }}>{log.egressId.slice(0, 16)}…</td>
                                  <td style={{ padding: "0.55rem 0.75rem", whiteSpace: "nowrap" as const }}>
                                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: 100, background: sty.bg, color: sty.color, fontWeight: 700, fontSize: "0.68rem" }}>
                                      {log.status.replace("EGRESS_", "")}
                                    </span>
                                  </td>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.inkSoft, whiteSpace: "nowrap" as const }}>{log.triggeredByName ?? <span style={{ color: T.inkMuted }}>—</span>}</td>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.inkSoft, whiteSpace: "nowrap" as const, fontSize: "0.72rem" }}>{log.recordingStartedAt ? fmtDateTime(log.recordingStartedAt) : <span style={{ color: T.inkMuted }}>—</span>}</td>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.inkSoft, whiteSpace: "nowrap" as const, fontSize: "0.72rem" }}>{log.recordingEndedAt ? fmtDateTime(log.recordingEndedAt) : <span style={{ color: T.inkMuted }}>—</span>}</td>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.inkSoft, whiteSpace: "nowrap" as const }}>{durationStr}</td>
                                  <td style={{ padding: "0.55rem 0.75rem", color: T.inkSoft, whiteSpace: "nowrap" as const }}>{sizeStr}</td>
                                  <td style={{ padding: "0.55rem 0.75rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: log.error ? T.red : T.inkMuted }}>
                                    {log.error ?? "—"}
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr key={`${log.id}-detail`} style={{ borderTop: `1px solid ${T.border}` }}>
                                    <td colSpan={9} style={{ padding: "0.75rem 1rem", background: "#fafafa" }}>
                                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "0.75rem", fontSize: "0.75rem" }}>
                                        <div>
                                          <div style={{ fontWeight: 700, color: T.inkMuted, marginBottom: "0.3rem", textTransform: "uppercase" as const, fontSize: "0.65rem", letterSpacing: "0.05em" }}>Egress Identity</div>
                                          <div style={{ fontFamily: "monospace", color: T.ink, wordBreak: "break-all" as const }}>{log.egressId}</div>
                                          <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>Room: {log.roomName ?? "—"}</div>
                                          <div style={{ color: T.inkMuted }}>Room ID: {log.roomId?.slice(0, 20) ?? "—"}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 700, color: T.inkMuted, marginBottom: "0.3rem", textTransform: "uppercase" as const, fontSize: "0.65rem", letterSpacing: "0.05em" }}>File Output</div>
                                          <div style={{ color: T.ink, wordBreak: "break-all" as const }}>{log.filename ?? "—"}</div>
                                          <div style={{ color: T.inkMuted, marginTop: "0.2rem" }}>Location: {log.fileLocation ?? "—"}</div>
                                          <div style={{ color: T.inkMuted }}>Size: {sizeStr} · Duration: {durationStr}</div>
                                          {log.backupStorageUsed && <div style={{ color: T.sun, marginTop: "0.2rem", fontWeight: 600 }}>⚠ Backup storage was used</div>}
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: 700, color: T.inkMuted, marginBottom: "0.3rem", textTransform: "uppercase" as const, fontSize: "0.65rem", letterSpacing: "0.05em" }}>Diagnostics</div>
                                          <div style={{ color: T.inkMuted }}>Retry count: <span style={{ color: log.retryCount > 0 ? T.sun : T.ink, fontWeight: 600 }}>{log.retryCount}</span></div>
                                          <div style={{ color: T.inkMuted }}>Last heartbeat: {log.lkUpdatedAt ? fmtDateTime(log.lkUpdatedAt) : "—"}</div>
                                          <div style={{ color: T.inkMuted }}>Created: {fmtDateTime(log.createdAt)}</div>
                                          {log.error && (
                                            <div style={{ marginTop: "0.4rem", padding: "0.4rem 0.6rem", background: T.redLight, borderRadius: 6, color: T.red, fontWeight: 600 }}>
                                              Error {log.errorCode ? `(${log.errorCode})` : ""}: {log.error}
                                              {log.details && <div style={{ fontWeight: 400, marginTop: "0.2rem", color: T.inkSoft, wordBreak: "break-all" as const }}>{log.details}</div>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {tab === "support" && (
              <AdminSupportTab
                showToast={showToast}
                isMobile={isMobile}
                suppTickets={suppTickets}
                setSuppTickets={setSuppTickets}
                suppLoading={suppLoading}
                setSuppLoading={setSuppLoading}
                suppFilter={suppFilter}
                setSuppFilter={setSuppFilter}
                suppTicket={suppTicket}
                setSuppTicket={setSuppTicket}
                suppTicketLoading={suppTicketLoading}
                setSuppTicketLoading={setSuppTicketLoading}
                suppReply={suppReply}
                setSuppReply={setSuppReply}
                suppReplying={suppReplying}
                setSuppReplying={setSuppReplying}
                suppStatusUpdating={suppStatusUpdating}
                setSuppStatusUpdating={setSuppStatusUpdating}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══ Admin Support Tab ══════════════════════════════════════════════════════ */

const SUPP_STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  OPEN:        { bg: "#e8f4ff", color: "#1a4f7a", label: "Open" },
  IN_PROGRESS: { bg: "#fff4e0", color: "#a05f00", label: "In Progress" },
  RESOLVED:    { bg: "#d4ead9", color: "#1d6b3c", label: "Resolved" },
  CLOSED:      { bg: "#f0f0f0", color: "#6b7a72", label: "Closed" },
};

const SUPP_PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  LOW:    { bg: "#f0f0f0", color: "#6b7a72" },
  NORMAL: { bg: "#e8f4ff", color: "#1a4f7a" },
  HIGH:   { bg: "#fff4e0", color: "#a05f00" },
  URGENT: { bg: "#fdecea", color: "#c0392b" },
};

const API_SUPP = process.env.NEXT_PUBLIC_API_URL ?? "";

function AdminSupportTab({
  showToast, isMobile,
  suppTickets, setSuppTickets, suppLoading, setSuppLoading,
  suppFilter, setSuppFilter,
  suppTicket, setSuppTicket, suppTicketLoading, setSuppTicketLoading,
  suppReply, setSuppReply, suppReplying, setSuppReplying,
  suppStatusUpdating, setSuppStatusUpdating,
}: {
  showToast: (msg: string, ok?: boolean) => void;
  isMobile: boolean;
  suppTickets: SuppTicket[] | null;
  setSuppTickets: (v: SuppTicket[] | null) => void;
  suppLoading: boolean;
  setSuppLoading: (v: boolean) => void;
  suppFilter: string;
  setSuppFilter: (v: string) => void;
  suppTicket: SuppTicketDetail | null;
  setSuppTicket: (v: SuppTicketDetail | null) => void;
  suppTicketLoading: boolean;
  setSuppTicketLoading: (v: boolean) => void;
  suppReply: string;
  setSuppReply: (v: string) => void;
  suppReplying: boolean;
  setSuppReplying: (v: boolean) => void;
  suppStatusUpdating: boolean;
  setSuppStatusUpdating: (v: boolean) => void;
}) {
  function getToken() { return localStorage.getItem("token") ?? ""; }

  function loadTickets(filter = suppFilter) {
    setSuppLoading(true);
    const qs = filter !== "all" ? `?status=${filter}&limit=50` : "?limit=50";
    fetch(`${API_SUPP}/support/admin/tickets${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((d: { tickets: SuppTicket[] }) => setSuppTickets(d.tickets ?? []))
      .catch(() => showToast("Failed to load tickets", false))
      .finally(() => setSuppLoading(false));
  }

  function openTicket(id: number) {
    setSuppTicketLoading(true);
    fetch(`${API_SUPP}/support/admin/tickets/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((d: SuppTicketDetail) => setSuppTicket(d))
      .catch(() => showToast("Failed to load ticket", false))
      .finally(() => setSuppTicketLoading(false));
  }

  async function sendReply() {
    if (!suppTicket || !suppReply.trim()) return;
    setSuppReplying(true);
    try {
      const res = await fetch(`${API_SUPP}/support/admin/tickets/${suppTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: suppReply.trim() }),
      });
      if (!res.ok) throw new Error();
      setSuppReply("");
      showToast("Reply sent — email dispatched to user");
      openTicket(suppTicket.id);
      loadTickets();
    } catch { showToast("Failed to send reply", false); }
    finally { setSuppReplying(false); }
  }

  async function updateStatus(status?: string, priority?: string) {
    if (!suppTicket) return;
    setSuppStatusUpdating(true);
    try {
      const res = await fetch(`${API_SUPP}/support/admin/tickets/${suppTicket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...(status && { status }), ...(priority && { priority }) }),
      });
      if (!res.ok) throw new Error();
      showToast("Ticket updated");
      openTicket(suppTicket.id);
      loadTickets();
    } catch { showToast("Failed to update ticket", false); }
    finally { setSuppStatusUpdating(false); }
  }

  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && suppTickets === null) {
      didInit.current = true;
      loadTickets();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const FILTERS = [
    { v: "all", label: "All" },
    { v: "OPEN", label: "Open" },
    { v: "IN_PROGRESS", label: "In Progress" },
    { v: "RESOLVED", label: "Resolved" },
    { v: "CLOSED", label: "Closed" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: suppTicket && !isMobile ? "1fr 1.6fr" : "1fr", gap: "1.5rem" }}>

      {/* Ticket list */}
      <div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" as const, marginBottom: "1rem" }}>
          {FILTERS.map(f => (
            <button key={f.v} onClick={() => { setSuppFilter(f.v); loadTickets(f.v); }}
              style={{ padding: "0.3rem 0.85rem", borderRadius: 100, border: "none", cursor: "pointer", fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, background: suppFilter === f.v ? T.ink : T.border, color: suppFilter === f.v ? T.white : T.inkMuted }}>
              {f.label}
            </button>
          ))}
          <button onClick={() => loadTickets(suppFilter)} style={{ marginLeft: "auto", padding: "0.3rem 0.85rem", borderRadius: 100, border: `1px solid ${T.border}`, background: T.white, color: T.inkSoft, fontFamily: T.ff, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {suppLoading ? (
          <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
        ) : !suppTickets || suppTickets.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted, background: T.white, borderRadius: T.r, border: `1px solid ${T.border}` }}>No tickets found</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.5rem" }}>
            {suppTickets.map(t => {
              const s = SUPP_STATUS_COLORS[t.status] ?? SUPP_STATUS_COLORS.OPEN;
              const p = SUPP_PRIORITY_COLORS[t.priority] ?? SUPP_PRIORITY_COLORS.NORMAL;
              const uName = [t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || t.user.email;
              return (
                <div key={t.id} onClick={() => openTicket(t.id)}
                  style={{ background: T.white, border: `1.5px solid ${suppTicket?.id === t.id ? T.leaf : T.border}`, borderRadius: 12, padding: "0.85rem 1rem", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.ink, flex: 1, lineHeight: 1.3 }}>#{t.id} — {t.subject}</div>
                    <span style={{ padding: "0.15rem 0.55rem", borderRadius: 100, fontSize: "0.7rem", fontWeight: 600, background: s.bg, color: s.color, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{s.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" as const }}>
                    <span style={{ fontSize: "0.72rem", color: T.inkMuted }}>{uName}</span>
                    {t.category && <span style={{ fontSize: "0.7rem", color: T.inkMuted }}>· {t.category}</span>}
                    <span style={{ fontSize: "0.7rem", color: T.inkMuted }}>· {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    {t._count.replies > 0 && <span style={{ fontSize: "0.7rem", color: T.inkMuted }}>· {t._count.replies} replies</span>}
                    <span style={{ marginLeft: "auto", padding: "0.1rem 0.4rem", borderRadius: 100, fontSize: "0.68rem", fontWeight: 600, background: p.bg, color: p.color }}>{t.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Thread view */}
      {suppTicket && (
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r, padding: isMobile ? "1rem" : "1.25rem", display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
          {suppTicketLoading ? (
            <div style={{ padding: "2rem", textAlign: "center" as const, color: T.inkMuted }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginBottom: "0.2rem" }}>
                    Ticket #{suppTicket.id} · {[suppTicket.user.firstName, suppTicket.user.lastName].filter(Boolean).join(" ") || suppTicket.user.email}
                  </div>
                  <div style={{ fontFamily: T.ffd, fontSize: "1.05rem", fontWeight: 700, color: T.ink, lineHeight: 1.3 }}>{suppTicket.subject}</div>
                  {suppTicket.category && <div style={{ fontSize: "0.75rem", color: T.inkMuted, marginTop: "0.2rem" }}>{suppTicket.category}</div>}
                </div>
                <button onClick={() => setSuppTicket(null)} style={{ border: "none", background: "none", fontSize: "1.1rem", cursor: "pointer", color: T.inkMuted, lineHeight: 1 }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", paddingBottom: "0.75rem", borderBottom: `1px solid ${T.border}` }}>
                <select value={suppTicket.status} disabled={suppStatusUpdating} onChange={e => updateStatus(e.target.value)}
                  style={{ padding: "0.3rem 0.65rem", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: "0.78rem", fontFamily: T.ff, background: T.white, cursor: "pointer" }}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <select value={suppTicket.priority} disabled={suppStatusUpdating} onChange={e => updateStatus(undefined, e.target.value)}
                  style={{ padding: "0.3rem 0.65rem", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: "0.78rem", fontFamily: T.ff, background: T.white, cursor: "pointer" }}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem", maxHeight: 380, overflowY: "auto" as const }}>
                <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: "4px 12px 12px 12px", padding: "0.85rem 1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: T.inkMuted, marginBottom: "0.4rem" }}>
                    {[suppTicket.user.firstName, suppTicket.user.lastName].filter(Boolean).join(" ") || suppTicket.user.email}
                    {" · "}{new Date(suppTicket.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.65, color: T.ink, whiteSpace: "pre-wrap" as const }}>{suppTicket.message}</p>
                </div>
                {suppTicket.replies.map(r => (
                  <div key={r.id} style={{ display: "flex", justifyContent: r.isAdmin ? "flex-start" : "flex-end" as const }}>
                    <div style={{ maxWidth: "85%", background: r.isAdmin ? T.leafLight : T.cream, border: `1px solid ${r.isAdmin ? "#a8d4b5" : T.border}`, borderRadius: r.isAdmin ? "4px 12px 12px 12px" : "12px 4px 12px 12px", padding: "0.75rem 0.9rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        {r.isAdmin && <span style={{ fontSize: "0.68rem", fontWeight: 700, color: T.leaf }}>OpenWebinar Team</span>}
                        <span style={{ fontSize: "0.68rem", color: T.inkMuted }}>{new Date(r.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: T.ink, whiteSpace: "pre-wrap" as const }}>{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {suppTicket.status !== "RESOLVED" && suppTicket.status !== "CLOSED" && (
                <div style={{ paddingTop: "0.75rem", borderTop: `1px solid ${T.border}` }}>
                  <textarea value={suppReply} onChange={e => setSuppReply(e.target.value)}
                    placeholder="Write a reply… (email will be sent to the user)"
                    rows={3}
                    style={{ width: "100%", padding: "0.65rem 0.85rem", border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: "0.875rem", fontFamily: T.ff, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, lineHeight: 1.6 }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" as const, marginTop: "0.65rem" }}>
                    <button onClick={sendReply} disabled={suppReplying || !suppReply.trim()}
                      style={{ padding: "0.55rem 1.25rem", background: T.leaf, border: "none", borderRadius: 100, fontSize: "0.85rem", fontWeight: 600, color: T.white, cursor: (suppReplying || !suppReply.trim()) ? "not-allowed" : "pointer", opacity: (suppReplying || !suppReply.trim()) ? 0.6 : 1, fontFamily: T.ff }}>
                      {suppReplying ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
