import { apiFetch } from './api';

export async function signup(data: { name: string; email: string; password: string }) {
  const res = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Signup failed');
  return json;
}

export async function verifyOtp(data: { email: string; otp: string }) {
  const res = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Verification failed');
  return json;
}

export async function sendCode(email: string) {
  const res = await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to resend code');
  return json;
}

export async function forgotPassword(email: string) {
  const res = await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to send reset code');
  return json;
}

export async function resetPassword(data: { email: string; code: string; password: string }) {
  const res = await apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to reset password');
  return json;
}

export async function login(data: { email: string; password: string }) {
  const res = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Login failed');
  return json;
}
