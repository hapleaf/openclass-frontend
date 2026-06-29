import { apiFetch } from './api';

export interface StreamIntegration {
  id: number;
  userId: number;
  platform: string;
  rtmpUrl: string;
  streamKey: string;
  streamKeyMasked: string;
  label?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const PLATFORMS: Record<string, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  rtmpBase: string;
  keyHint: string;
  steps: string[];
  docsUrl: string;
  note: string | null;
  perBroadcast: boolean;
}> = {
  facebook: {
    label: 'Facebook',
    emoji: '📘',
    color: '#1877F2',
    bg: '#e8f0fe',
    rtmpBase: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    keyHint: 'FB-123456789-0-AbXxxxxxxxx',
    steps: [
      'Go to facebook.com/live/producer',
      'Click "Create live stream"',
      'Select "Streaming software"',
      'Copy the Server URL and Stream Key below',
    ],
    docsUrl: 'https://www.facebook.com/live/producer',
    note: 'Stream key is persistent — save it once and reuse for all webinars.',
    perBroadcast: false,
  },
  youtube: {
    label: 'YouTube',
    emoji: '📺',
    color: '#FF0000',
    bg: '#fff0f0',
    rtmpBase: 'rtmp://a.rtmp.youtube.com/live2/',
    keyHint: 'xxxx-xxxx-xxxx-xxxx-xxxx',
    steps: [
      'Go to studio.youtube.com',
      'Click "Go Live" (camera icon, top right)',
      'Select the "Stream" tab (not Webcam)',
      'Copy the Stream URL and Stream Key below',
    ],
    docsUrl: 'https://studio.youtube.com',
    note: '⚠️ First-time live streaming activation takes up to 24 hours in YouTube Studio.',
    perBroadcast: false,
  },
  linkedin: {
    label: 'LinkedIn',
    emoji: '💼',
    color: '#0A66C2',
    bg: '#e6f2fb',
    rtmpBase: 'rtmp://live-api-s.linkedin.com/live/',
    keyHint: 'Your LinkedIn stream key',
    steps: [
      'Go to linkedin.com and create a new Post or Event',
      'Click "Live video" and select "Streaming software"',
      'Copy the Stream URL and Stream Key shown',
      'Paste both fields below — update before each broadcast',
    ],
    docsUrl: 'https://www.linkedin.com/help/linkedin/answer/a567180',
    note: '⚠️ LinkedIn Live requires prior approval. Stream keys change per broadcast — update below before each webinar.',
    perBroadcast: true,
  },
  x: {
    label: 'X (Twitter)',
    emoji: '🐦',
    color: '#000000',
    bg: '#f2f2f2',
    rtmpBase: 'rtmps://ingest.pscp.tv:443/x/',
    keyHint: 'Your X live stream key',
    steps: [
      'Go to studio.twitter.com',
      'Click "Broadcast" → "Go Live"',
      'Select "Streaming software (RTMP)"',
      'Copy the RTMP URL and Stream Key below',
    ],
    docsUrl: 'https://studio.twitter.com',
    note: '⚠️ X stream keys change per broadcast — paste the new key below before each webinar.',
    perBroadcast: true,
  },
  instagram: {
    label: 'Instagram',
    emoji: '📸',
    color: '#E1306C',
    bg: '#fdf0f7',
    rtmpBase: 'rtmps://live-upload.instagram.com:443/live/',
    keyHint: 'Your Instagram live stream key',
    steps: [
      'Requires a Creator or Professional Instagram account',
      'Open Instagram → Profile → "+" → Live Video',
      'In Live settings, enable "Use streaming software"',
      'Copy the Server URL and Stream Key below',
    ],
    docsUrl: 'https://help.instagram.com/1640021932942925',
    note: '⚠️ Instagram RTMP streaming requires a Professional account and may not be available in all regions. Keys change per broadcast.',
    perBroadcast: true,
  },
};

export async function getStreamIntegrations(): Promise<StreamIntegration[]> {
  const res = await apiFetch('/profile/stream-integrations');
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to load integrations');
  return json;
}

export async function saveStreamIntegration(
  platform: string,
  data: { rtmpUrl: string; streamKey: string; label?: string },
): Promise<StreamIntegration> {
  const res = await apiFetch(`/profile/stream-integrations/${platform}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to save integration');
  return json;
}

export async function removeStreamIntegration(platform: string): Promise<void> {
  const res = await apiFetch(`/profile/stream-integrations/${platform}`, { method: 'DELETE' });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Failed to remove integration');
  }
}

export async function startStream(sessionId: number, platforms: string[]): Promise<{ platforms: string[] }> {
  const res = await apiFetch(`/live/${sessionId}/start-stream`, {
    method: 'POST',
    body: JSON.stringify({ platforms }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to start stream');
  return json;
}

export async function getStreamStatus(sessionId: number): Promise<{ platforms: Record<string, string>; anyActive: boolean }> {
  const res = await apiFetch(`/live/${sessionId}/stream-status`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to get stream status');
  return json;
}

export async function stopStream(sessionId: number): Promise<void> {
  const res = await apiFetch(`/live/${sessionId}/stop-stream`, { method: 'POST' });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Failed to stop stream');
  }
}
