import { apiFetch } from './api';

export interface CategoryData {
  id: number;
  name: string;
  sortOrder: number;
}

export async function getCategories(): Promise<CategoryData[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`);
  const json = await res.json();
  if (!res.ok) throw new Error('Failed to load categories');
  return json;
}

export interface ProfileData {
  id: number;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  primaryCategory: string | null;
  title: string | null;
  subject: string | null;
  bio: string | null;
  avatarUrl: string | null;
  expertiseTags: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  timezone: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  websiteUrl: string | null;
  youtubeUrl: string | null;
  notifySignups: boolean;
  notifyReviews: boolean;
  notifyReminders: boolean;
  notifyDigest: boolean;
  profilePublic: boolean;
}

const PROFILE_CACHE_KEY = 'oc_profile_cache';

export function getCachedProfile(): Partial<ProfileData> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_CACHE_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function setCachedProfile(p: ProfileData) {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function clearProfileCache() {
  try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
}

export async function getProfile(): Promise<ProfileData> {
  const res = await apiFetch('/profile/me');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load profile');
  setCachedProfile(json);
  return json;
}

export async function updateProfile(data: Partial<ProfileData>): Promise<ProfileData> {
  const res = await apiFetch('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save profile');
  setCachedProfile(json);
  return json;
}

/** "kapil-suri-42" — unique public profile slug */
export function makeProfileSlug(p: Partial<ProfileData> & { id?: number }): string {
  const namePart = [p.firstName, p.lastName]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') || 'user';
  return `${namePart}-${p.id ?? 0}`;
}

/** Extract userId from a slug like "kapil-suri-42" */
export function userIdFromSlug(slug: string): number {
  return parseInt(slug.split('-').pop() ?? '0', 10);
}

export interface ReviewData {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  authorFirstName?: string | null;
  authorLastName?: string | null;
  authorSessionCount?: number;
  authorReviewCount?: number;
  authorAvgRating?: number | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PublicProfileData {
  profile: Partial<ProfileData> & { id: number };
  sessions: import('./session').SessionData[];
  subscriberCount: number;
  isSubscribed: boolean;
  /** ISO timestamp of the viewer's most recent review, or null if never reviewed */
  lastReviewAt: string | null;
  reviews: ReviewData[];
}

export async function getPublicProfile(userId: number): Promise<PublicProfileData> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/public/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Profile not found');
  return json;
}

// ── Expertise levels ──────────────────────────────────────────────────────────
export interface ExpertiseLevelMeta {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  icon: string;
  color: string;
  bg: string;
  minSessions: number;
  minReviews: number;
  minRating: number;
  tagline: string;
  description: string;
}

export const EXPERTISE_LEVELS: ExpertiseLevelMeta[] = [
  {
    level: 1, label: "Newcomer", icon: "🌱",
    color: "#4a7a5c", bg: "#d4ead9",
    minSessions: 0, minReviews: 0, minRating: 0,
    tagline: "Just getting started",
    description: "Every expert was once a beginner. Newcomers have hosted their first webinar on OpenWebinar and are beginning to build their presence as a speaker.",
  },
  {
    level: 2, label: "Rising Star", icon: "⭐",
    color: "#856400", bg: "#fef3c7",
    minSessions: 3, minReviews: 1, minRating: 0,
    tagline: "Building momentum",
    description: "Rising Stars have hosted at least 3 webinars and received their first attendee feedback. They're actively building their reputation on the platform.",
  },
  {
    level: 3, label: "Established", icon: "🎓",
    color: "#1a4f7a", bg: "#ddeaf8",
    minSessions: 8, minReviews: 3, minRating: 3.5,
    tagline: "Proven track record",
    description: "Established hosts have run 8+ webinars, collected meaningful attendee reviews, and maintain a solid rating. Attendees can trust them for quality sessions.",
  },
  {
    level: 4, label: "Expert", icon: "🏆",
    color: "#1d6b3c", bg: "#c6e6d2",
    minSessions: 15, minReviews: 8, minRating: 4.0,
    tagline: "Highly trusted speaker",
    description: "Experts are among the top hosts on OpenWebinar. With 15+ webinars, 8+ glowing reviews, and a 4.0+ rating, they consistently deliver outstanding sessions.",
  },
  {
    level: 5, label: "Master", icon: "💎",
    color: "#5b21b6", bg: "#ede9fe",
    minSessions: 25, minReviews: 15, minRating: 4.5,
    tagline: "Elite-tier speaker",
    description: "Masters represent the very best on OpenWebinar. They've hosted 25+ webinars, earned 15+ reviews averaging 4.5 stars or higher, and are the benchmark for quality on the platform.",
  },
];

export function computeExpertiseLevel(
  sessionCount: number,
  reviewCount: number,
  avgRating: number | null,
): ExpertiseLevelMeta {
  const rating = avgRating ?? 0;
  let level: 1 | 2 | 3 | 4 | 5 = 1;
  if (sessionCount >= 25 && reviewCount >= 15 && rating >= 4.5) level = 5;
  else if (sessionCount >= 15 && reviewCount >= 8  && rating >= 4.0) level = 4;
  else if (sessionCount >= 8  && reviewCount >= 3  && rating >= 3.5) level = 3;
  else if (sessionCount >= 3  || reviewCount >= 1)                   level = 2;
  return EXPERTISE_LEVELS[level - 1];
}

export interface TeacherListItem {
  id: number;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  title: string | null;
  primaryCategory: string | null;
  bio: string | null;
  avatarUrl: string | null;
  expertiseTags: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  verified: boolean;
  sessionCount: number;
  subscriberCount: number;
  avgRating: number | null;
  reviewCount: number;
}

export async function getTeachers(): Promise<TeacherListItem[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/teachers`);
  const json = await res.json();
  if (!res.ok) throw new Error('Failed to load teachers');
  return json;
}

export async function getMySubscriptions(): Promise<{ teacherIds: number[] }> {
  const res = await apiFetch('/profile/my-subscriptions');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load subscriptions');
  return json;
}

export async function toggleSubscription(teacherId: number): Promise<{ subscribed: boolean; count: number }> {
  const res = await apiFetch(`/profile/subscribe/${teacherId}`, { method: 'POST' });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update subscription');
  return json;
}

export async function createReview(teacherId: number, rating: number, comment: string): Promise<ReviewData> {
  const res = await apiFetch(`/profile/review/${teacherId}`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to submit review');
  return json;
}

/** "Kapil Suri" — full name from firstName + lastName, fallback to name/email */
export function fullName(p: Partial<ProfileData>): string {
  const n = [p.firstName, p.lastName].filter(Boolean).join(' ');
  return n || p.name || p.email || 'User';
}

/** "Kapil S." — compact for tight spaces like the header */
export function shortName(p: Partial<ProfileData>): string {
  if (p.firstName) {
    return p.lastName ? `${p.firstName} ${p.lastName.charAt(0).toUpperCase()}.` : p.firstName;
  }
  return p.name?.split(' ')[0] || p.email?.split('@')[0] || 'User';
}

/** "KS" — two-letter initials */
export function initials(p: Partial<ProfileData>): string {
  if (p.firstName && p.lastName) return (p.firstName[0] + p.lastName[0]).toUpperCase();
  if (p.firstName) return p.firstName[0].toUpperCase();
  const fallback = p.name || p.email || '';
  return fallback ? fallback[0].toUpperCase() : 'U';
}

export interface DashboardData {
  profile: ProfileData;
  sessions: import('./session').SessionData[];
  stats: {
    subscriberCount: number;
    avgRating: number | null;
    totalSessions: number;
    totalReviews: number;
  };
  thisMonth: {
    sessionsHeld: number;
    newSubscribers: number;
    teachingMinutes: number;
    newReviews: number;
  };
  recentReviews: ReviewData[];
  recentActivity: { type: 'subscribe' | 'review'; text: string; createdAt: string }[];
}

export interface FollowedTeacher {
  id: number;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  title: string | null;
  primaryCategory: string | null;
  avatarUrl: string | null;
  verified: boolean;
  liveCount: number;
  webinarCount: number;
  subscriberCount: number;
  avgRating: number | null;
  reviewCount: number;
}

export interface StudentDashboardData {
  profile: ProfileData;
  stats: { following: number };
  followedTeachers: FollowedTeacher[];
  upcomingSessions: import('./session').PublicSessionData[];
  registeredSessions: import('./session').PublicSessionData[];
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  const res = await apiFetch('/profile/student-dashboard');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load student dashboard');
  return json;
}

export interface SubscriberItem {
  id: number;
  name: string;
  avatarUrl: string | null;
  subscribedAt: string;
  isFollowedBack: boolean;
}

export async function getSubscribers(): Promise<SubscriberItem[]> {
  const res = await apiFetch('/profile/subscribers');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load subscribers');
  return json;
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await apiFetch('/profile/dashboard');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load dashboard');
  return json;
}

export async function uploadAvatar(file: File): Promise<ProfileData> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('avatar', file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/avatar`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  setCachedProfile(json);
  return json;
}
