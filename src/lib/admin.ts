import { apiFetch } from './api';

export interface AdminOverview {
  users: { total: number; today: number; week: number; month: number };
  sessions: { total: number; pending: number; active: number; completed: number };
  registrations: number;
  reviews: { total: number; avgRating: number | null };
  logins: { today: number; week: number };
}

export interface PendingSession {
  id: number;
  title: string;
  type: string;
  category: string | null;
  scheduledAt: string;
  status: string;
  createdAt: string;
  _count: { registrations: number };
  user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null };
}

export interface SessionStats {
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  byCategory: { category: string; count: number }[];
  recent: {
    id: number; title: string; type: string; category: string | null;
    scheduledAt: string; status: string; approved: boolean; qualityFlag: string | null; sessionStatus: string | null;
    actualDuration: number | null; createdAt: string;
    _count: { registrations: number };
    user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string };
  }[];
  trend: { day: string; count: number }[];
}

export interface UserStats {
  recentUsers: {
    id: number; firstName: string | null; lastName: string | null; name: string | null;
    email: string; role: string; verified: boolean; createdAt: string; lastLoginAt: string | null; avatarUrl: string | null;
  }[];
  loginLogs: {
    id: number; userId: number; ip: string | null; userAgent: string | null;
    createdAt: string; browser: string; os: string;
    user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string };
  }[];
  signupDaily:   { day: string; count: number }[];
  signupMonthly: { month: string; count: number }[];
  loginDaily:    { day: string; count: number }[];
  loginMonthly:  { month: string; count: number }[];
  browsers: { name: string; count: number }[];
  os: { name: string; count: number }[];
}

async function adminFetch(path: string, opts?: RequestInit) {
  return apiFetch(`/admin${path}`, opts);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const r = await adminFetch('/overview');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getPendingSessions(): Promise<PendingSession[]> {
  const r = await adminFetch('/sessions/pending');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function approveSession(id: number): Promise<void> {
  const r = await adminFetch(`/sessions/${id}/approve`, { method: 'POST' });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

export async function rejectSession(id: number, reason?: string): Promise<void> {
  const r = await adminFetch(`/sessions/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

export type SessionRow = SessionStats['recent'][number];

export interface AuditLogEntry {
  id: number; sessionId: number; adminId: number; field: string;
  oldValue: string | null; newValue: string | null; note: string | null; createdAt: string;
  admin: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string } | null;
}

export interface SessionSearchParams {
  q?: string; type?: string; status?: string;
  approved?: string; from?: string; to?: string; take?: number;
}

export async function searchSessions(p: SessionSearchParams): Promise<SessionRow[]> {
  const qs = new URLSearchParams();
  if (p.q)        qs.set('q',        p.q);
  if (p.type)     qs.set('type',     p.type);
  if (p.status)   qs.set('status',   p.status);
  if (p.approved) qs.set('approved', p.approved);
  if (p.from)     qs.set('from',     p.from);
  if (p.to)       qs.set('to',       p.to);
  if (p.take)     qs.set('take',     String(p.take));
  const r = await adminFetch(`/sessions/search?${qs}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function updateSessionSchedule(id: number, scheduledAt: string, note?: string): Promise<void> {
  const r = await adminFetch(`/sessions/${id}/schedule`, {
    method: 'PATCH', body: JSON.stringify({ scheduledAt, note }),
  });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

export interface AdminSessionDetail {
  id: number; title: string; type: string; description: string | null;
  category: string | null; skillLevel: string | null; tags: string | null;
  scheduledAt: string; duration: number; audienceLimit: number | null;
  visibility: string; passcode: string | null; inviteSlug: string | null;
  chatEnabled: boolean; autoRecording: boolean; requireApproval: boolean; sendReminder: boolean;
  status: string; approved: boolean; qualityFlag: string | null;
  sessionStatus: string | null; actualDuration: number | null; actualStartAt: string | null;
  recordingUrl: string | null; introVideoUrl: string | null; bannerUrl: string | null; bannerColor: string | null;
  createdAt: string; updatedAt: string;
  _count: { registrations: number };
  user: {
    id: number; firstName: string | null; lastName: string | null; name: string | null;
    email: string; avatarUrl: string | null; title: string | null; bio: string | null;
    primaryCategory: string | null; verified: boolean; createdAt: string;
    sessionCount: number; reviewCount: number; avgRating: number | null;
  };
  registrations: {
    id: number; userId: number; sessionId: number; createdAt: string;
    user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; createdAt: string } | null;
  }[];
  attendances: { id: number; sessionId: number; userId: number; role: string; joinedAt: string; leftAt: string | null }[];
  auditLog: AuditLogEntry[];
}

export async function getAdminSessionDetail(id: number): Promise<AdminSessionDetail> {
  const r = await adminFetch(`/sessions/${id}/detail`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getSessionAuditLog(id: number): Promise<AuditLogEntry[]> {
  const r = await adminFetch(`/sessions/${id}/audit-log`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getSessionStats(): Promise<SessionStats> {
  const r = await adminFetch('/sessions/stats');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export interface AdminUser {
  id: number; firstName: string | null; lastName: string | null; name: string | null;
  email: string; role: string; disabled: boolean; verified: boolean;
  createdAt: string; lastLoginAt: string | null; avatarUrl: string | null;
  title: string | null; primaryCategory: string | null;
  _count: { sessions: number };
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null; country: string | null; city: string | null; phone: string | null;
  registrationCount: number; reviewCount: number;
}

export interface EngagementRow {
  userId: number; loginCount: number;
  user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; role: string; lastLoginAt: string | null } | null;
}

export interface TopTeachers {
  byRating: { teacherId: number; avgRating: number; reviewCount: number; user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; title: string | null } | null }[];
  bySessions: { userId: number; sessionCount: number; webinarCount: number; liveCount: number; user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; title: string | null } | null }[];
}

export interface TopStudentRow {
  rank: number; userId: number; regCount: number;
  user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; createdAt: string; lastLoginAt: string | null } | null;
}

export interface SubscriberTeacherRow {
  teacherId: number;
  totalSubscribers: number;
  new7d: number; new30d: number; new90d: number;
  trend: { day: string; count: number }[];
  user: { id: number; firstName: string | null; lastName: string | null; name: string | null; email: string; avatarUrl: string | null; title: string | null } | null;
}

export async function getSubscriberInsights(): Promise<{ topTeachers: SubscriberTeacherRow[] }> {
  const r = await adminFetch('/insights/subscribers');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getLoginEngagement(period: string): Promise<EngagementRow[]> {
  const r = await adminFetch(`/insights/engagement?period=${period}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getTopTeachers(): Promise<TopTeachers> {
  const r = await adminFetch('/insights/teachers');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getTopStudents(page = 1, take = 50): Promise<{ data: TopStudentRow[]; total: number; page: number; take: number }> {
  const r = await adminFetch(`/insights/students?page=${page}&take=${take}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function searchUsers(q?: string, take = 50): Promise<AdminUser[]> {
  const qs = new URLSearchParams();
  if (q)    qs.set('q',    q);
  if (take) qs.set('take', String(take));
  const r = await adminFetch(`/users/search?${qs}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getAdminUser(id: number): Promise<AdminUserDetail> {
  const r = await adminFetch(`/users/${id}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function updateAdminUser(id: number, data: { disabled?: boolean; role?: string; firstName?: string; lastName?: string; email?: string }): Promise<void> {
  const r = await adminFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

export async function getUserStats(): Promise<UserStats> {
  const r = await adminFetch('/users/stats');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

/* ── Contact messages ─────────────────────────────────────── */
export interface ContactReply {
  id: number;
  contactMessageId: number;
  body: string;
  sentAt: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  replies: ContactReply[];
}

export async function getContactMessages(unreadOnly = false, email = ''): Promise<ContactMessage[]> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set('unread', 'true');
  if (email) params.set('email', email);
  const qs = params.toString();
  const r = await adminFetch(`/contact${qs ? `?${qs}` : ''}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function getContactThread(email: string): Promise<ContactMessage[]> {
  const r = await adminFetch(`/contact/thread?email=${encodeURIComponent(email)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function replyToContact(id: number, body: string): Promise<ContactReply> {
  const r = await adminFetch(`/contact/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function markContactRead(id: number): Promise<void> {
  const r = await adminFetch(`/contact/${id}/read`, { method: 'PATCH' });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

export async function deleteContactMessage(id: number): Promise<void> {
  const r = await adminFetch(`/contact/${id}`, { method: 'DELETE' });
  if (!r.ok) { const j = await r.json(); throw new Error(j.message || 'Failed'); }
}

/* ── Recording / Infra ──────────────────────────────────────────────── */

export interface InfraTestResult {
  ok: boolean;
  message: string;
  detail?: string;
}

export interface RecordingQueueStatus {
  pendingTotal: number;
  pendingOnDisk: number;
  uploadedSessions: number;
  totalRecordings: number;
  isRunning: boolean;
  cronExpression: string;
}

export interface UploadedSession {
  id: number;
  sessionId: number;
  s3Key: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordingLogEntry {
  ts: string;
  msg: string;
  level: 'info' | 'warn' | 'error';
}

export async function recordingRunManually(): Promise<{ ok: boolean; message: string }> {
  const r = await adminFetch('/recordings/run', { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingQueueStatus(): Promise<RecordingQueueStatus> {
  const r = await adminFetch('/recordings/queue');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingGetUploaded(): Promise<UploadedSession[]> {
  const r = await adminFetch('/recordings/uploaded');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingGetLogs(): Promise<RecordingLogEntry[]> {
  const r = await adminFetch('/recordings/logs');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function infraTestS3(): Promise<InfraTestResult> {
  const r = await adminFetch('/recordings/test/s3', { method: 'POST' });
  const j = await r.json();
  return j;
}

export async function infraTestBunny(): Promise<InfraTestResult> {
  const r = await adminFetch('/recordings/test/bunny', { method: 'POST' });
  const j = await r.json();
  return j;
}

export async function infraTestFfmpeg(): Promise<InfraTestResult> {
  const r = await adminFetch('/recordings/test/ffmpeg', { method: 'POST' });
  const j = await r.json();
  return j;
}

export async function infraTestLiveKit(): Promise<InfraTestResult> {
  const r = await adminFetch('/recordings/test/livekit', { method: 'POST' });
  const j = await r.json();
  return j;
}

export async function infraTestRedis(): Promise<InfraTestResult> {
  const r = await adminFetch('/recordings/test/redis', { method: 'POST' });
  const j = await r.json();
  return j;
}

export interface SystemStats {
  platform: string;
  uptime: number;
  cpu: { model: string; cores: number; usedPercent: number; loadAvg: [number, number, number] };
  memory: { totalMB: number; usedMB: number; freeMB: number; usedPercent: number };
  disk: { filesystem: string; size: string; used: string; avail: string; usePercent: string; mount: string };
  processes: { header: string; rows: { user: string; pid: string; cpu: string; mem: string; command: string }[] };
}

export async function getSystemStats(): Promise<SystemStats> {
  const r = await adminFetch('/recordings/system');
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingScanDisk(): Promise<{ created: number; skipped: number; files: string[] }> {
  const r = await adminFetch('/recordings/scan-disk', { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingSyncS3(): Promise<{ created: number; skipped: number; rows: { sessionId: number; s3Key: string }[] }> {
  const r = await adminFetch('/recordings/sync-s3', { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function storageMigrateUrls(): Promise<{ banners: number; videos: number; avatars: number }> {
  const r = await adminFetch('/recordings/migrate-urls', { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export interface EgressLog {
  id: number;
  sessionId: number;
  egressId: string;
  roomId: string | null;
  roomName: string | null;
  status: string;
  triggeredByUserId: number | null;
  triggeredByName: string | null;
  recordingStartedAt: string | null;
  recordingEndedAt: string | null;
  lkUpdatedAt: string | null;
  filename: string | null;
  fileSizeBytes: number | null;
  fileDurationSec: number | null;
  fileLocation: string | null;
  error: string | null;
  errorCode: number | null;
  details: string | null;
  retryCount: number;
  backupStorageUsed: boolean;
  createdAt: string;
  updatedAt: string;
  session: { id: number; title: string; scheduledAt: string };
}

export async function recordingGetEgressLogs(status?: string): Promise<EgressLog[]> {
  const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const r = await adminFetch(`/recordings/egress-logs${qs}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}

export async function recordingSyncEgressLogs(): Promise<{ updated: number; markedAborted: number; errors: string[] }> {
  const r = await adminFetch('/recordings/egress-logs/sync', { method: 'POST' });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || 'Failed');
  return j;
}
