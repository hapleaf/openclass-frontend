import { apiFetch } from './api';

export interface SessionData {
  id: number;
  userId: number;
  type: string;
  title: string;
  description: string | null;
  bannerColor: string | null;
  bannerUrl: string | null;
  introVideoUrl: string | null;
  category: string | null;
  skillLevel: string | null;
  tags: string | null;
  scheduledAt: string;
  duration: number;
  audienceLimit: number | null;
  visibility: string;
  passcode: string | null;
  inviteSlug: string | null;
  chatEnabled: boolean;
  autoRecording: boolean;
  requireApproval: boolean;
  sendReminder: boolean;
  status: string;
  approved: boolean;
  sessionStatus: string | null;
  qualityFlag: string | null;
  actualDuration: number | null;
  actualStartAt: string | null;
  recordingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { registrations: number };
}

export async function uploadSessionBanner(file: File): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('banner', file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/upload-banner`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  return json.bannerUrl as string;
}

export async function uploadSessionIntroVideo(blob: Blob): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('video', blob, 'intro.webm');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/upload-intro-video`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Video upload failed');
  return json.introVideoUrl as string;
}

export interface CreateSessionPayload {
  type: string;
  title: string;
  description?: string;
  bannerColor?: string;
  bannerUrl?: string;
  introVideoUrl?: string;
  category?: string;
  skillLevel?: string;
  tags?: string;
  scheduledAt: string;
  duration: number;
  audienceLimit?: number;
  visibility?: string;
  passcode?: string;
  chatEnabled?: boolean;
  autoRecording?: boolean;
  requireApproval?: boolean;
  sendReminder?: boolean;
  status?: string;
}

export async function createSession(data: CreateSessionPayload): Promise<SessionData> {
  const res = await apiFetch('/sessions', { method: 'POST', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to create session');
  return json;
}

export async function getSession(id: number): Promise<SessionData> {
  const res = await apiFetch(`/sessions/${id}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load session');
  return json;
}

export async function getMySessions(): Promise<SessionData[]> {
  const res = await apiFetch('/sessions/my');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load sessions');
  return json;
}

export async function updateSession(id: number, data: Partial<CreateSessionPayload>): Promise<SessionData> {
  const res = await apiFetch(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update session');
  return json;
}

export interface SessionReview {
  id: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SessionRecording {
  id: number;
  filename: string;
  s3Key?: string | null;
  hlsUrl?: string | null;
  createdAt: string;
}

export interface PublicSessionData extends SessionData {
  user: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    title: string | null;
    avatarUrl: string | null;
    verified: boolean;
    sessionCount?: number;
    avgRating?: number | null;
    reviewCount?: number;
  };
  reviews?: SessionReview[];
  recordings?: SessionRecording[];
}

export async function getPublicSessions(): Promise<PublicSessionData[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/browse`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load sessions');
  return json;
}

export async function getPublicSession(id: number): Promise<PublicSessionData> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sessions/browse/${id}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Session not found');
  return json;
}

export async function toggleRegistration(sessionId: number): Promise<{ registered: boolean }> {
  const res = await apiFetch(`/sessions/${sessionId}/register`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to register');
  return json;
}

export async function getMyRegistrationIds(): Promise<number[]> {
  const res = await apiFetch('/sessions/my-registrations');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load registrations');
  return json;
}

export async function deleteSession(id: number): Promise<void> {
  const res = await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
  if (!res.ok) { const json = await res.json(); throw new Error(json.message || 'Failed to delete session'); }
}

export async function getSessionRecording(id: number): Promise<{ recordings: string[]; processing: boolean }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live/${id}/recording`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch recording');
  return json;
}

export async function cancelSession(id: number): Promise<void> {
  const res = await apiFetch(`/live/${id}/cancel`, { method: 'POST' });
  if (!res.ok) { const json = await res.json(); throw new Error(json.message || 'Failed to cancel session'); }
}

export async function setSessionRecording(sessionId: number, recordingUrl: string): Promise<void> {
  const res = await apiFetch(`/sessions/${sessionId}/recording`, {
    method: 'POST',
    body: JSON.stringify({ recordingUrl }),
  });
  if (!res.ok) { const json = await res.json(); throw new Error(json.message || 'Failed to save recording URL'); }
}

export async function getCaptcha(): Promise<{ token: string; challenge: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/live/captcha`);
  const json = await res.json();
  if (!res.ok) throw new Error('Failed to load captcha');
  return json;
}
