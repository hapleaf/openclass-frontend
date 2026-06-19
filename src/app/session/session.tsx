"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/common/HeadFoot/header';
import Footer from '@/components/common/HeadFoot/footer';
const RichTextEditor = dynamic(() => import('@/components/common/RichTextEditor'), { ssr: false });
import { createSession, updateSession, getSession, uploadSessionBanner, uploadSessionIntroVideo } from '@/lib/session';
import { getCategories, CategoryData } from '@/lib/profile';
import './session.css';

// ── constants ──────────────────────────────────────────────────────────────
const BANNER_COLORS = [
  '#1d6b3c', '#145c30', '#2d7d9a', '#1a4f7a', '#9b2c4e', '#7b2fa0',
  '#b5470e', '#a38d00', '#2c2c2c', '#0f1410',
];


const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const TAG_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python',
  'Django', 'AI/ML', 'CSS', 'System Design',
];

const CHECKLIST_ITEMS = [
  { key: 'type', label: 'Choose session type' },
  { key: 'title', label: 'Add a title' },
  { key: 'description', label: 'Add description' },
  { key: 'schedule', label: 'Set date & time' },
  { key: 'category', label: 'Select category' },
  { key: 'tags', label: 'Add tags' },
];

const MAX_RECORDING_SECS = 120;

// ── types ──────────────────────────────────────────────────────────────────
interface FormState {
  type: 'webinar' | 'liveclass' | '';
  title: string;
  description: string;
  descriptionTextLen: number;
  bannerColor: string;
  bannerUrl: string;
  introVideoUrl: string;
  category: string;
  skillLevel: string;
  tags: string[];
  date: string;
  time: string;
  duration: number;
  audienceLimit: string;
  visibility: 'public' | 'private';
  passcode: string;
  sendReminder: boolean;
}

const defaultForm: FormState = {
  type: '',
  title: '',
  description: '',
  descriptionTextLen: 0,
  bannerColor: '#1d6b3c',
  bannerUrl: '',
  introVideoUrl: '',
  category: '',
  skillLevel: '',
  tags: [],
  date: '',
  time: '',
  duration: 60,
  audienceLimit: '',
  visibility: 'public',
  passcode: '',
  sendReminder: true,
};

// ── component ───────────────────────────────────────────────────────────────
export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ? Number(searchParams.get('edit')) : null;

  const [form, setForm] = useState<FormState>(defaultForm);
  const [sessionApproved, setSessionApproved] = useState(false);
  const [loadingSession, setLoadingSession] = useState(!!editId);
  const [tagInput, setTagInput] = useState('');
  const [videoTab, setVideoTab] = useState<'upload' | 'record'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoName, setVideoName] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dbCategories, setDbCategories] = useState<CategoryData[]>([]);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof FormState, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // checklist completion
  const clStatus = {
    type: !!form.type,
    title: form.title.trim().length >= 3,
    description: form.descriptionTextLen >= 250,
    schedule: !!form.date && !!form.time,
    category: !!form.category,
    skillLevel: !!form.skillLevel,
    tags: form.tags.length > 0,
  };
  const checklistDone = Object.values(clStatus).filter(Boolean).length;

  // toast helper
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── banner image upload ───────────────────────────────────────────────────
  async function handleBannerFile(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Only JPG, PNG, WebP allowed', false); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Banner must be under 5 MB', false); return; }
    setBannerUploading(true);
    try {
      const url = await uploadSessionBanner(file);
      set('bannerUrl', url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', false);
    } finally {
      setBannerUploading(false);
    }
  }

  // ── video upload ──────────────────────────────────────────────────────────
  function handleVideoFile(file: File) {
    if (!file.type.startsWith('video/')) { showToast('Please select a video file', false); return; }
    if (file.size > 500 * 1024 * 1024) { showToast('Video must be under 500 MB', false); return; }
    setVideoFile(file);
    setVideoName(file.name);
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.onloadedmetadata = () => {
      const s = Math.round(vid.duration);
      setVideoDuration(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
      URL.revokeObjectURL(url);
    };
    vid.src = url;
  }

  // ── recording ─────────────────────────────────────────────────────────────
  async function startRecording() {
    // clear any previous recording
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(''); }
    recChunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      showToast('Camera or microphone access denied. Please allow permissions and try again.', false);
      return;
    }
    setCameraStream(stream);
    if (cameraPreviewRef.current) {
      cameraPreviewRef.current.srcObject = stream;
      cameraPreviewRef.current.play();
    }

    const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recChunksRef.current, { type: 'video/webm' });
      recordedBlobRef.current = blob;
      setRecordedUrl(URL.createObjectURL(blob));
    };
    mr.start(200); // collect chunks every 200ms
    mediaRecorderRef.current = mr;

    setRecording(true);
    setRecSecs(0);
    recTimerRef.current = setInterval(() => {
      setRecSecs(s => {
        if (s + 1 >= MAX_RECORDING_SECS) { stopRecording(); return MAX_RECORDING_SECS; }
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    if (cameraPreviewRef.current) cameraPreviewRef.current.srcObject = null;
    setRecording(false);
  }

  function discardRecording() {
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); setRecordedUrl(''); }
    recordedBlobRef.current = null;
    set('introVideoUrl', '');
    setRecSecs(0);
  }

  useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    cameraStream?.getTracks().forEach(t => t.stop());
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── load existing session for editing ─────────────────────────────────────
  useEffect(() => {
    getCategories().then(setDbCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editId) return;
    setLoadingSession(true);
    getSession(editId)
      .then(s => {
        const d = new Date(s.scheduledAt);
        const pad = (n: number) => String(n).padStart(2, '0');
        if (s.approved) setSessionApproved(true);
        if (s.introVideoUrl) setVideoTab('record');
        setForm({
          type: (s.type as FormState['type']) || '',
          title: s.title,
          description: s.description || '',
          descriptionTextLen: s.description ? s.description.replace(/<[^>]*>/g, '').length : 0,
          bannerColor: s.bannerColor || '#1d6b3c',
          bannerUrl: s.bannerUrl || '',
          introVideoUrl: s.introVideoUrl || '',
          category: s.category || '',
          skillLevel: s.skillLevel || '',
          tags: (() => { try { return s.tags ? JSON.parse(s.tags) : []; } catch { return []; } })(),
          date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
          duration: s.duration,
          audienceLimit: s.audienceLimit ? String(s.audienceLimit) : '',
          visibility: (s.visibility as 'public' | 'private') || 'public',
          passcode: s.passcode || '',
          sendReminder: s.sendReminder,
        });
      })
      .catch(() => showToast('Failed to load session', false))
      .finally(() => setLoadingSession(false));
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── tags ──────────────────────────────────────────────────────────────────
  function addTag(val: string) {
    const t = val.trim();
    if (!t || form.tags.includes(t) || form.tags.length >= 8) return;
    set('tags', [...form.tags, t]);
    setTagInput('');
  }

  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && form.tags.length) {
      set('tags', form.tags.slice(0, -1));
    }
  }

  // ── passcode generator ────────────────────────────────────────────────────
  function genPasscode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    set('passcode', code);
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(status: 'published' | 'draft') {
    if (bannerUploading) { showToast('Please wait for the image to finish uploading', false); return; }
    if (!form.type) { showToast('Please choose a session type', false); return; }
    if (!form.title.trim()) { showToast('Please enter a title', false); return; }
    if (form.descriptionTextLen < 250) { showToast('Description must be at least 250 characters', false); return; }
    if (!form.category) { showToast('Please select a category', false); return; }
    if (!form.skillLevel) { showToast('Please select a skill level', false); return; }
    if (!form.date || !form.time) { showToast('Please set a date and time', false); return; }

    setSaving(true);
    try {
      // upload recorded intro video if a new recording was made
      let introVideoUrl = form.introVideoUrl;
      if (recordedBlobRef.current) {
        try {
          introVideoUrl = await uploadSessionIntroVideo(recordedBlobRef.current);
          recordedBlobRef.current = null;
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Video upload failed', false);
          setSaving(false);
          return;
        }
      }

      const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        bannerColor: form.bannerColor,
        bannerUrl: form.bannerUrl || undefined,
        introVideoUrl: introVideoUrl || undefined,
        category: form.category || undefined,
        skillLevel: form.skillLevel || undefined,
        tags: form.tags.length ? JSON.stringify(form.tags) : undefined,
        scheduledAt,
        duration: form.duration,
        audienceLimit: form.audienceLimit ? parseInt(form.audienceLimit) : undefined,
        visibility: form.visibility,
        passcode: form.visibility === 'private' && form.passcode ? form.passcode : undefined,
        sendReminder: form.sendReminder,
        status,
      };
      if (editId) {
        await updateSession(editId, payload);
      } else {
        await createSession(payload);
      }
      showToast(status === 'published' ? 'Session published!' : 'Saved as draft');
      localStorage.setItem('oc_dash_stale', '1');
      localStorage.setItem('oc_mysess_stale', '1');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', false);
    } finally {
      setSaving(false);
    }
  }

  // ── preview helpers ───────────────────────────────────────────────────────
  const typeLabel = form.type === 'webinar' ? 'Webinar' : form.type === 'liveclass' ? 'Live Class' : '';
  const previewDate = form.date && form.time
    ? new Date(`${form.date}T${form.time}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Date & Time TBD';
  const durationLabel = `${form.duration} min`;

  const recPct = Math.round((recSecs / MAX_RECORDING_SECS) * 100);
  const recDisplay = `${Math.floor(recSecs / 60)}:${String(recSecs % 60).padStart(2, '0')}`;

  return (
    <>
      <Header />

      {/* page header */}
      <div className="ph-header">
        <div className="ph-blob ph-blob-1" />
        <div className="ph-blob ph-blob-2" />
        <div className="ph-inner">
          <div className="ph-breadcrumb">
            <a href="/profile">Dashboard</a>
            <span className="sep">›</span>
            <span>{editId ? 'Edit Session' : 'Create Session'}</span>
          </div>
          <div className="ph-title">{editId ? 'Edit Session' : 'Create a New Session'}</div>
          <div className="ph-sub">{editId ? 'Update your session details below' : 'Share your knowledge with learners around the world'}</div>
        </div>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
          background: toast.ok ? '#1d6b3c' : '#9b2c4e', color: '#fff',
          padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem',
          fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}

      {loadingSession && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7a72', fontFamily: "'DM Sans',sans-serif", fontSize: '0.95rem' }}>
          Loading session…
        </div>
      )}

      {!loadingSession && <div className="page-wrap">
        {/* ── MAIN COLUMN ── */}
        <div>

          {/* approved warning banner */}
          {sessionApproved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1.25rem', marginBottom: '1.5rem', background: '#fdf3e0', border: '1.5px solid rgba(181,71,14,0.35)', borderRadius: 12, fontFamily: "'DM Sans',sans-serif" }}>
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b5470e' }}>This session is approved and live</div>
                <div style={{ fontSize: '0.78rem', color: '#7a3a0a', marginTop: 2 }}>Saving any changes will move it back to Draft and require re-approval before going live again.</div>
              </div>
            </div>
          )}

          {/* 1 · Session type */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">1</div>
              <div className="fs-title">Session Type</div>
            </div>
            <div className="type-grid">
              <div
                className={`type-card${form.type === 'webinar' ? ' selected' : ''}`}
                onClick={() => set('type', 'webinar')}
              >
                <div className="type-icon" style={{ background: 'rgba(26,79,122,0.1)' }}>📡</div>
                <div>
                  <div className="type-name">Webinar</div>
                  <div className="type-desc">Broadcast-style presentation with large audiences. You present, they watch.</div>
                </div>
                <ul className="type-perks">
                  <li>Up to 1000 attendees</li>
                  <li>Q&amp;A and polls</li>
                  <li>Screen sharing</li>
                </ul>
              </div>
              <div
                className="type-card"
                style={{ opacity: 0.5, cursor: 'not-allowed', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: '#f0a500', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: 100 }}>Coming Soon</span>
                <div className="type-icon" style={{ background: 'rgba(29,107,60,0.1)' }}>🎓</div>
                <div>
                  <div className="type-name">Live Class</div>
                  <div className="type-desc">Interactive classroom with participation. Teach and engage in real-time.</div>
                </div>
                <ul className="type-perks">
                  <li>Up to 50 students</li>
                  <li>Two-way audio/video</li>
                  <li>Whiteboard &amp; breakouts</li>
                  <li>Attendance tracking</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 2 · General info */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">2</div>
              <div className="fs-title">General Information</div>
            </div>

            <div className="cs-form-group">
              <div className="cs-label">
                Session Title
                <span className="cs-label-count">{form.title.length}/60</span>
              </div>
              <input
                className="cs-input"
                maxLength={60}
                placeholder="e.g. Building Scalable APIs with Node.js"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>

            <div className="cs-form-group">
              <div className="cs-label">Description <span style={{ color: '#c0392b' }}>*</span></div>
              <RichTextEditor
                value={form.description}
                onChange={(html, textLen) => {
                  set('description', html);
                  set('descriptionTextLen', textLen);
                }}
                minLength={250}
                maxLength={5000}
                placeholder="Write a detailed description of what learners will gain, prerequisites, what to expect…"
              />
            </div>

            <div className="cs-form-group">
              <div className="cs-label">Banner</div>
              {/* image upload strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                {form.bannerUrl ? (
                  <div style={{ position: 'relative', width: 120, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '2px solid #1d6b3c' }}>
                    <img src={`${process.env.NEXT_PUBLIC_API_URL}${form.bannerUrl}`} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => set('bannerUrl', '')} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <button
                      onClick={() => bannerInputRef.current?.click()}
                      disabled={bannerUploading}
                      style={{ padding: '0.5rem 1rem', border: '1.5px dashed #e2ded6', borderRadius: 8, background: '#faf7f2', fontFamily: "'DM Sans',sans-serif", fontSize: '0.78rem', fontWeight: 600, color: '#6b7a72', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {bannerUploading ? '⏳ Uploading…' : '🖼 Upload Image'}
                    </button>
                    <span style={{ fontSize: '0.67rem', color: '#9b9b8e' }}>JPG, PNG, WebP · Max 5 MB · 1200×400 px</span>
                  </div>
                )}
                <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleBannerFile(e.target.files[0]); e.target.value = ''; }} />
                <span style={{ fontSize: '0.72rem', color: '#6b7a72' }}>or pick a colour</span>
              </div>
              {/* colour swatches — disabled when image is loaded */}
              <div className="banner-picker" style={{ pointerEvents: form.bannerUrl ? 'none' : 'auto', opacity: form.bannerUrl ? 0.35 : 1 }}>
                {BANNER_COLORS.map(c => (
                  <div
                    key={c}
                    className={`banner-swatch${!form.bannerUrl && form.bannerColor === c ? ' selected' : ''}`}
                    style={{ background: c, cursor: form.bannerUrl ? 'not-allowed' : 'pointer' }}
                    onClick={() => { if (!form.bannerUrl) { set('bannerColor', c); } }}
                  />
                ))}
              </div>
              {form.bannerUrl && (
                <div className="cs-hint" style={{ color: '#9b2c4e' }}>Remove the image above to use a colour instead.</div>
              )}
            </div>

            <div className="cs-form-row cols-2">
              <div>
                <div className="cs-label">Category <span style={{ color: '#c0392b' }}>*</span></div>
                <select className="cs-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select category</option>
                  {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="cs-label">Skill Level <span style={{ color: '#c0392b' }}>*</span></div>
                <select className="cs-select" value={form.skillLevel} onChange={e => set('skillLevel', e.target.value)}>
                  <option value="">Select level</option>
                  {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="cs-form-group">
              <div className="cs-label">
                Tags
                <span className="cs-label-count">{form.tags.length}/8 tags</span>
              </div>
              <div className="tags-input-area" onClick={() => tagInputRef.current?.focus()}>
                {form.tags.map(t => (
                  <span key={t} className="tag-chip-green">
                    {t}
                    <button className="tag-chip-remove" onClick={e => { e.stopPropagation(); set('tags', form.tags.filter(x => x !== t)); }}>×</button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  className="tag-text-input"
                  placeholder={form.tags.length === 0 ? 'Type a tag and press Enter…' : ''}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onBlur={() => { if (tagInput) addTag(tagInput); }}
                />
              </div>
              <div className="tags-suggestions">
                {TAG_SUGGESTIONS.filter(s => !form.tags.includes(s)).map(s => (
                  <span key={s} className="tag-suggestion" onClick={() => addTag(s)}>{s}</span>
                ))}
              </div>
              <div className="cs-hint">Press Enter or comma to add. Max 8 tags.</div>
            </div>
          </div>

          {/* 3 · Schedule */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">3</div>
              <div className="fs-title">Schedule</div>
            </div>

            <div className="cs-form-row cols-3">
              <div>
                <div className="cs-label">Date</div>
                <input className="cs-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div>
                <div className="cs-label">Start Time</div>
                <input className="cs-input" type="time" value={form.time} onChange={e => set('time', e.target.value)} />
              </div>
              <div>
                <div className="cs-label">Duration</div>
                <select className="cs-select" value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
                  {[15, 30, 45, 60, 90, 120, 150, 180].map(d => (
                    <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.type === 'liveclass' && (
              <div className="audience-limit-group">
                <div className="cs-label">Audience Limit</div>
                <input
                  className="cs-input"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Max 100 for Live Class"
                  value={form.audienceLimit}
                  onChange={e => {
                    const v = Math.min(100, Math.max(1, parseInt(e.target.value) || 0));
                    set('audienceLimit', v ? String(v) : '');
                  }}
                  style={{ maxWidth: 200 }}
                />
                <div className="cs-hint">Live Classes support up to 100 participants.</div>
              </div>
            )}
            {form.type === 'webinar' && (
              <div className="audience-limit-group">
                <div className="cs-label">Audience Limit</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', border: '1.5px solid #e2ded6', borderRadius: 10, background: '#faf7f2', maxWidth: 260, color: '#1d6b3c', fontSize: '0.875rem', fontWeight: 600 }}>
                  ∞ Unlimited — Webinars have no audience cap
                </div>
              </div>
            )}
          </div>

          {/* 4 · Visibility */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">4</div>
              <div className="fs-title">Visibility &amp; Access</div>
            </div>

            <div className="visibility-grid">
              <div
                className={`visibility-card${form.visibility === 'public' ? ' selected' : ''}`}
                onClick={() => set('visibility', 'public')}
              >
                <div className="vis-icon" style={{ background: 'rgba(29,107,60,0.1)' }}>🌍</div>
                <div>
                  <div className="vis-name">Public</div>
                  <div className="vis-desc">Anyone can discover and join this session from the explore page.</div>
                </div>
              </div>
              <div
                className={`visibility-card${form.visibility === 'private' ? ' private-selected' : ''}`}
                onClick={() => set('visibility', 'private')}
              >
                <div className="vis-icon" style={{ background: 'rgba(155,44,78,0.1)' }}>🔒</div>
                <div>
                  <div className="vis-name">Private</div>
                  <div className="vis-desc">Only people with your invite link or passcode can join.</div>
                </div>
              </div>
            </div>

            {form.visibility === 'private' && (
              <div className="passcode-box">
                <div className="passcode-box-title">🔐 Passcode Protection</div>
                <div className="passcode-input-row">
                  <input
                    className="passcode-input"
                    maxLength={16}
                    placeholder="Set a passcode…"
                    value={form.passcode}
                    onChange={e => set('passcode', e.target.value.toUpperCase())}
                  />
                  <button className="passcode-gen" onClick={genPasscode}>Generate</button>
                </div>
                <div className="private-url-box" style={{ marginTop: '0.85rem' }}>
                  <span className="private-url-label">Invite URL</span>
                  <span className="private-url-value">Generated after publishing</span>
                </div>
              </div>
            )}
          </div>

          {/* 5 · Intro video */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">5</div>
              <div className="fs-title">Intro Video <span className="fs-optional">(optional)</span></div>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6b7a72', lineHeight: 1.6, marginBottom: '1.25rem', background: '#faf7f2', border: '1px solid #e2ded6', borderRadius: 10, padding: '0.75rem 1rem' }}>
              📣 <strong style={{ color: '#0f1410' }}>Why add an intro video?</strong> Sessions with an intro video get <strong style={{ color: '#1d6b3c' }}>2× more sign-ups</strong>. A 30–60 second clip explaining what you'll cover and who it's for builds trust instantly and helps learners decide if it's the right session for them.
            </p>

            <div className="video-tabs">
              <button
                className={`video-tab${videoTab === 'upload' ? ' active' : ''}`}
                onClick={() => { if (!form.introVideoUrl && !recordedUrl) setVideoTab('upload'); }}
                disabled={!!(form.introVideoUrl || recordedUrl)}
                style={{ opacity: (form.introVideoUrl || recordedUrl) ? 0.4 : 1, cursor: (form.introVideoUrl || recordedUrl) ? 'not-allowed' : 'pointer' }}
                title={form.introVideoUrl || recordedUrl ? 'Delete the existing video first to upload a file' : ''}
              >Upload</button>
              <button
                className={`video-tab${videoTab === 'record' ? ' active' : ''}`}
                onClick={() => { if (!videoFile) setVideoTab('record'); }}
                disabled={!!videoFile}
                style={{ opacity: videoFile ? 0.4 : 1, cursor: videoFile ? 'not-allowed' : 'pointer' }}
                title={videoFile ? 'Remove the uploaded file first to record instead' : ''}
              >Record</button>
            </div>

            {videoTab === 'upload' && (
              <>
                {!videoFile ? (
                  <div className="upload-zone" onClick={() => videoInputRef.current?.click()}>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleVideoFile(e.target.files[0]); }}
                    />
                    <div className="upload-icon">🎬</div>
                    <div className="upload-title">Drop your intro video here</div>
                    <div className="upload-sub">or click to browse files</div>
                    <span className="upload-limit">MP4, MOV, WebM · Max 500 MB · Up to 3 min</span>
                  </div>
                ) : (
                  <>
                    <video
                      src={URL.createObjectURL(videoFile)}
                      controls
                      style={{ width: '100%', borderRadius: 10, marginBottom: '0.65rem', maxHeight: 240, background: '#0f1410' }}
                    />
                    <div className="video-preview">
                      <div className="video-thumb">🎬</div>
                      <div>
                        <div className="video-file-name">{videoName}</div>
                        <div className="video-file-dur">{videoDuration}</div>
                      </div>
                      <button className="video-remove-btn" onClick={() => { setVideoFile(null); setVideoName(''); setVideoDuration(''); }}>Remove</button>
                    </div>
                  </>
                )}
              </>
            )}

            {videoTab === 'record' && (
              <div className="record-area">

                {/* ── saved video from server (edit mode) ── */}
                {form.introVideoUrl && !recordedUrl && !recording ? (
                  <>
                    <video
                      src={`${process.env.NEXT_PUBLIC_API_URL}${form.introVideoUrl}`}
                      controls
                      style={{ width: '100%', maxHeight: 320, background: '#0f1410', display: 'block' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#fff', borderTop: '1px solid #e2ded6' }}>
                      <span style={{ fontSize: '0.8rem', color: '#1d6b3c', fontWeight: 600 }}>✓ Intro video saved</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-rec"
                          onClick={() => { set('introVideoUrl', ''); setRecSecs(0); setVideoTab('upload'); }}
                          style={{ border: '1.5px solid #f8d7da', background: '#fff8f8', color: '#9b2c4e' }}
                          title="Delete this video — you can then upload a file or record a new one"
                        >
                          🗑 Delete
                        </button>
                        <button
                          className="btn-rec"
                          onClick={() => { set('introVideoUrl', ''); setRecSecs(0); startRecording(); }}
                          style={{ border: '1.5px solid #e2ded6', background: '#fff', color: '#3a4140' }}
                        >
                          🔄 Record New
                        </button>
                      </div>
                    </div>
                  </>
                ) : /* ── new recording preview ── */
                recordedUrl && !recording ? (
                  <>
                    <video
                      src={recordedUrl}
                      controls
                      style={{ width: '100%', maxHeight: 320, background: '#0f1410', display: 'block' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#fff', borderTop: '1px solid #e2ded6' }}>
                      <span style={{ fontSize: '0.8rem', color: '#1d6b3c', fontWeight: 600 }}>
                        ✓ Recording ready · {recDisplay} · will upload on save
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn-rec"
                          onClick={() => { discardRecording(); setVideoTab('upload'); }}
                          style={{ border: '1.5px solid #f8d7da', background: '#fff8f8', color: '#9b2c4e' }}
                          title="Delete this recording and switch to file upload"
                        >
                          🗑 Delete
                        </button>
                        <button
                          className="btn-rec"
                          onClick={discardRecording}
                          style={{ border: '1.5px solid #e2ded6', background: '#fff', color: '#3a4140' }}
                        >
                          🔄 Record Again
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── live camera / idle ── */}
                    <div className="record-preview-area">
                      <video ref={cameraPreviewRef} muted playsInline style={{ display: cameraStream ? 'block' : 'none' }} />
                      {!cameraStream && (
                        <>
                          <div className="cam-off">📷</div>
                          <p>Click Start — your browser will ask for camera &amp; mic permission</p>
                        </>
                      )}
                      {recording && (
                        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '4px 10px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                          <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 700 }}>REC</span>
                        </div>
                      )}
                    </div>
                    <div className="record-controls">
                      <span className={`rec-timer${recording ? ' recording' : ''}`}>{recDisplay}</span>
                      <div className="rec-bar">
                        <div className="rec-bar-fill" style={{ width: `${recPct}%` }} />
                      </div>
                      <span className="rec-limit">2:00 max</span>
                      {!recording
                        ? <button className="btn-rec start" onClick={startRecording}>⏺ Start</button>
                        : <button className="btn-rec stop" onClick={stopRecording}>⏹ Stop</button>
                      }
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 6 · Session settings */}
          <div className="form-section">
            <div className="fs-header">
              <div className="fs-number">6</div>
              <div className="fs-title">Session Settings</div>
            </div>

            {(
              [
                { key: 'sendReminder', label: 'Send Reminders', sub: 'Send email reminders 24h and 1h before the session' },
              ] as Array<{ key: keyof FormState; label: string; sub: string }>
            ).map(({ key, label, sub }) => (
              <div className="toggle-row" key={key}>
                <div className="toggle-label">
                  {label}
                  <small>{sub}</small>
                </div>
                <label className="cs-toggle">
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={e => set(key, e.target.checked)}
                  />
                  <span className="cs-toggle-track" />
                  <span className="cs-toggle-thumb" />
                </label>
              </div>
            ))}
          </div>

          {/* submit row */}
          <div className="submit-row">
            <button className="btn-publish" disabled={saving || bannerUploading} onClick={() => handleSubmit('published')}>
              {saving ? '⏳ Submitting…' : bannerUploading ? '⏳ Uploading image…' : '📋 Submit for Approval'}
            </button>
            <button className="btn-draft" disabled={saving || bannerUploading} onClick={() => handleSubmit('draft')}>
              {bannerUploading ? '⏳ Uploading image…' : 'Save as Draft'}
            </button>
            <button className="btn-cancel-link" onClick={() => router.push('/profile')}>Cancel</button>
            <div className="submit-note">
              <span>🛡️</span> Published sessions go live only after the OpenClass Moderator Team reviews and approves them.
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="cs-sidebar">

          {/* live preview */}
          <div className="sidebar-card">
            <div className="sc-label">Live Preview</div>
            <div
              className="preview-banner"
              style={form.bannerUrl ? {
                backgroundImage: `url(${process.env.NEXT_PUBLIC_API_URL}${form.bannerUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {
                background: form.bannerColor,
              }}
            >
              {!form.bannerUrl && <div className="preview-banner-overlay" />}
            </div>
            <div className="preview-body">
              <div className="preview-session-title">{form.title || 'Your Session Title'}</div>
              {typeLabel && (
                <span
                  className="preview-type-tag"
                  style={{
                    background: form.type === 'webinar' ? 'rgba(26,79,122,0.1)' : 'rgba(29,107,60,0.1)',
                    color: form.type === 'webinar' ? '#1a4f7a' : '#1d6b3c',
                  }}
                >
                  {form.type === 'webinar' ? '📡' : '🎓'} {typeLabel}
                </span>
              )}
              <span
                className="preview-vis-tag"
                style={{
                  background: form.visibility === 'private' ? 'rgba(155,44,78,0.1)' : 'rgba(29,107,60,0.1)',
                  color: form.visibility === 'private' ? '#9b2c4e' : '#1d6b3c',
                }}
              >
                {form.visibility === 'private' ? '🔒' : '🌍'} {form.visibility}
              </span>
              <div className="preview-meta-text">📅 {previewDate}</div>
              <div className="preview-meta-text">⏱ {durationLabel}</div>
              {form.category && <div className="preview-meta-text">📂 {form.category}</div>}
              <div className="preview-free" style={{ marginTop: '0.5rem' }}>Free · Open Enrollment</div>
            </div>
          </div>

          {/* checklist */}
          <div className="sidebar-card">
            <div className="sc-label">Checklist ({checklistDone}/{CHECKLIST_ITEMS.length})</div>
            <div className="checklist">
              {CHECKLIST_ITEMS.map(item => (
                <div key={item.key} className={`cl-item${clStatus[item.key as keyof typeof clStatus] ? ' done' : ''}`}>
                  <div className="cl-check">{clStatus[item.key as keyof typeof clStatus] ? '✓' : ''}</div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* tip card */}
          <div className="tip-card">
            <div className="tip-label">💡 Pro Tip</div>
            <div className="tip-text">
              Sessions with a compelling title and description get <strong>3×</strong> more
              sign-ups. Mention the key skill learners will walk away with.
            </div>
          </div>
        </div>
      </div>}
      <Footer />
    </>
  );
}
