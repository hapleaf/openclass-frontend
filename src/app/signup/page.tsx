"use client";

import { signup, verifyOtp, sendCode } from "@/lib/auth";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import LoginHeader from "../../components/common/HeadFoot/loginheader";
import Footer from "../../components/common/HeadFoot/footer";

/* ── tokens ── */
const T = {
  ink: "#0f1410",
  inkSoft: "#3a4140",
  inkMuted: "#6b7a72",
  leaf: "#1d6b3c",
  leafDark: "#145c30",
  leafLight: "#d4ead9",
  leafMid: "#4a9e68",
  cream: "#faf7f2",
  white: "#ffffff",
  border: "#e2ded6",
  error: "#c0392b",
  ff: "var(--font-dm-sans), sans-serif",
  ffD: "var(--font-fraunces), Georgia, serif",
  r: "10px",
};

/* ── style injection ── */
function injectStyles() {
  if (typeof document !== "undefined" && !document.getElementById("oc-signup-styles")) {
    const s = document.createElement("style");
    s.id = "oc-signup-styles";
    s.textContent = `
      @keyframes oc-spin { to { transform: rotate(360deg); } }
      @keyframes oc-fade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      * { box-sizing: border-box; }
      .oc-input { width:100%; padding:0.7rem 1rem; border:1.5px solid #e2ded6; border-radius:10px; font-family:var(--font-dm-sans), sans-serif; font-size:0.9rem; color:#0f1410; background:#fff; outline:none; transition:border-color 0.2s, box-shadow 0.2s; }
      .oc-input:focus { border-color:#1d6b3c; box-shadow:0 0 0 3px rgba(29,107,60,0.1); }
      .oc-input::placeholder { color:#6b7a72; }
      .oc-btn-primary { width:100%; padding:0.85rem; background:#1d6b3c; color:#fff; border:none; border-radius:10px; font-family:var(--font-dm-sans), sans-serif; font-size:0.95rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; transition:background 0.2s; }
      .oc-btn-primary:hover:not(:disabled) { background:#145c30; }
      .oc-btn-primary:disabled { background:#6b7a72; cursor:not-allowed; }
      .oc-btn-ghost { width:100%; padding:0.75rem; background:transparent; color:#3a4140; border:1.5px solid #e2ded6; border-radius:10px; font-family:var(--font-dm-sans), sans-serif; font-size:0.875rem; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.75rem; transition:border-color 0.2s, color 0.2s; }
      .oc-btn-ghost:hover { border-color:#1d6b3c; color:#1d6b3c; }
      .oc-text-link { background:none; border:none; color:#1d6b3c; font-weight:500; cursor:pointer; padding:0; font-family:var(--font-dm-sans), sans-serif; font-size:inherit; }
      .oc-text-link:hover { text-decoration:underline; }
      .oc-otp-digit { width:52px; height:60px; border:1.5px solid #e2ded6; border-radius:10px; font-family:var(--font-fraunces), Georgia, serif; font-size:1.5rem; font-weight:700; text-align:center; color:#0f1410; background:#fff; outline:none; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s; }
      .oc-otp-digit:focus { border-color:#1d6b3c; box-shadow:0 0 0 3px rgba(29,107,60,0.1); }
      .oc-otp-digit.filled { border-color:#1d6b3c; background:#d4ead9; }
      .oc-role-card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:1.25rem 1.5rem; transition:border-color 0.2s, background 0.2s; }
      .oc-role-card:hover { border-color:rgba(126,217,164,0.3); background:rgba(29,107,60,0.08); }
      @media (max-width: 860px) {
        .oc-auth-left { display: none !important; }
        .oc-auth-layout { grid-template-columns: 1fr !important; }
        .oc-auth-right { min-height: calc(100vh - 64px); padding: 2rem 1.25rem !important; }
      }
      @media (max-width: 480px) {
        .oc-otp-digit { width:44px; height:54px; font-size:1.3rem; }
      }
    `;
    document.head.appendChild(s);
  }
}

/* ── helpers ── */
function Spinner() {
  return (
    <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "oc-spin 0.7s linear infinite" }} />
  );
}
function EyeIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Left panel (inlined) ── */
const TEACHER_PERKS = [
  "Host free live webinars for a global audience",
  "Build a verified speaker profile & reputation",
  "Get discovered by attendees worldwide",
  "Manage webinars, recordings, and messages",
];
const STUDENT_PERKS = [
  "Join any live webinar instantly — free forever",
  "Chat, ask questions & interact in real time",
  "Follow speakers & get notified of new webinars",
  "Watch recordings at your own pace",
];

function RoleCard({ icon, iconBg, title, subtitle, description, perks }: {
  icon: string; iconBg: string; title: string; subtitle: string;
  description: string; perks: string[];
}) {
  return (
    <div className="oc-role-card">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, background: iconBg }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily: T.ffD, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>{title}</div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{description}</div>
      <ul style={{ marginTop: "0.65rem", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {perks.map((p) => (
          <li key={p} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ color: "#7ed9a4", fontWeight: 700, fontSize: "0.7rem", flexShrink: 0 }}>✓</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuthLeft() {
  return (
    <div style={{ background: T.ink, padding: "4rem 3.5rem", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden", minHeight: "calc(100vh - 64px)" }}>
      {/* dot grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />
      {/* blob 1 */}
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(29,107,60,0.15)", filter: "blur(60px)", top: -80, right: -60, pointerEvents: "none" }} />
      {/* blob 2 */}
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(26,79,122,0.12)", filter: "blur(60px)", bottom: 60, left: -40, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(29,107,60,0.2)", color: "#7ed9a4", border: "1px solid rgba(29,107,60,0.3)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "0.35rem 0.85rem", borderRadius: 100, marginBottom: "2rem" }}>
          ● Free forever
        </div>
        <h1 style={{ fontFamily: T.ffD, fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#fff", marginBottom: "1rem" }}>
          Webinars for<br />
          <em style={{ fontStyle: "italic", color: "#7ed9a4" }}>everyone, free.</em>
        </h1>
        <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 380, marginBottom: "2.5rem" }}>
          OpenWebinar connects expert speakers with curious attendees — live, free, and open to the world. No subscription. No paywalls. Ever.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <RoleCard icon="🎙️" iconBg="rgba(232,160,32,0.15)" title="For Speakers" subtitle="Share your expertise with the world" description="Whether you're a seasoned professional, researcher, or passionate expert — host live webinars that reach a global audience at absolutely zero cost." perks={TEACHER_PERKS} />
          <RoleCard icon="🎧" iconBg="rgba(29,107,60,0.2)" title="For Attendees" subtitle="Learn from experts, for free" description="Access live webinars from industry professionals, researchers, and domain experts worldwide. Ask questions in real time, rate webinars, and follow speakers you love." perks={STUDENT_PERKS} />
        </div>
      </div>
    </div>
  );
}

/* ── Step dots ── */
function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "1.75rem" }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ height: 8, width: n === step ? 24 : 8, borderRadius: n === step ? 4 : "50%", background: n < step ? T.leafMid : n === step ? T.leaf : T.border, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

/* ── Password strength ── */
function StrengthBar({ pw }: { pw: string }) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const colors = ["#e74c3c", "#e67e22", "#f1c40f", T.leaf];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const color = pw.length ? colors[score - 1] : T.inkMuted;
  const label = pw.length ? labels[score - 1] || "" : "";
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= score ? color : T.border, transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ fontSize: "0.72rem", color, marginTop: 4 }}>{label}</div>
    </div>
  );
}

/* ── OTP Input ── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      const next = [...value];
      next[i - 1] = "";
      onChange(next);
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...value];
    paste.split("").forEach((ch, idx) => { next[idx] = ch; });
    onChange(next);
    refs.current[Math.min(paste.length, 5)]?.focus();
  }

  return (
    <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", margin: "1.5rem 0" }}>
      {value.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={`oc-otp-digit${d ? " filled" : ""}`}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}

/* ── Email chip ── */
function EmailChip({ email }: { email: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.3rem 0.85rem", fontSize: "0.8rem", color: T.inkSoft, fontWeight: 500, marginBottom: "1.5rem" }}>
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 6 10-6" />
      </svg>
      {email}
    </div>
  );
}

/* ── Props ── */
export interface SignUpProps {
  onSendOtp?: (values: { name: string; email: string; password: string }) => Promise<void> | void;
  onVerifyOtp?: (code: string) => Promise<void> | void;
  onSuccess?: () => void;
  onGoSignIn?: () => void;
}

type Screen = "form" | "otp" | "success";

export default function SignUp({ onSendOtp, onVerifyOtp, onSuccess, onGoSignIn }: SignUpProps) {
  injectStyles();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; pw?: string }>({});
  const [formLoading, setFormLoading] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendSecs, setResendSecs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startResendTimer() {
    setResendSecs(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSecs((s) => { if (s <= 1) { clearInterval(timerRef.current!); return 0; } return s - 1; });
    }, 1000);
  }

  async function handleSendOtp(e: React.MouseEvent) {
    e.preventDefault();
    const errs: typeof formErrors = {};
    if (!name.trim()) errs.name = "Please enter your name.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email.";
    if (password.length < 8) errs.pw = "Password must be at least 8 characters.";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setFormLoading(true);
    try {
      if (onSendOtp) {
        await onSendOtp({ name: name.trim(), email, password });
      } else {
        await signup({ name: name.trim(), email, password });
      }
      setScreen("otp");
      startResendTimer();
    }
    catch (err) { setFormErrors({ email: err instanceof Error ? err.message : "Something went wrong. Please try again." }); }
    finally { setFormLoading(false); }
  }

  async function handleVerifyOtp(e: React.MouseEvent) {
    e.preventDefault();
    const code = otpDigits.join("");
    setOtpError("");
    if (code.length < 6) { setOtpError("Please enter the full 6-digit code."); return; }
    setOtpLoading(true);
    try {
      if (onVerifyOtp) {
        await onVerifyOtp(code);
      } else {
        const data = await verifyOtp({ email, otp: code });
        if (data?.accessToken) localStorage.setItem("token", data.accessToken);
      }
      setScreen("success");
    }
    catch (err) { setOtpError(err instanceof Error ? err.message : "Incorrect passcode. Please try again."); setOtpDigits(["", "", "", "", "", ""]); }
    finally { setOtpLoading(false); }
  }

  async function handleResend() {
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError("");
    try { await sendCode(email); } catch { /* silent — timer still starts */ }
    startResendTimer();
  }

  return (
    <>
      <LoginHeader />

      <div className="oc-auth-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh", paddingTop: 64 }}>

        {/* ── LEFT PANEL ── */}
        <div className="oc-auth-left">
          <AuthLeft />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="oc-auth-right" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 2rem", background: T.cream }}>
          <div style={{ width: "100%", maxWidth: 420, animation: "oc-fade 0.3s ease" }}>

            {/* ═══ FORM ═══ */}
            {screen === "form" && (
              <div>
                <StepDots step={1} />
                <h2 style={hs}>Create account</h2>
                <p style={ss}>Already have one?{" "}
                  {onGoSignIn ? (
                    <button className="oc-text-link" onClick={onGoSignIn}>Sign in</button>
                  ) : (
                    <Link href="/login" className="oc-text-link">Sign in</Link>
                  )}
                </p>

                <div style={fg}>
                  <label style={ls}>Full name</label>
                  <input className="oc-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                  {formErrors.name && <p style={es}>{formErrors.name}</p>}
                </div>

                <div style={fg}>
                  <label style={ls}>Email address</label>
                  <input className="oc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  {!formErrors.email
                    ? <p style={{ fontSize: "0.75rem", color: T.inkMuted, marginTop: "0.3rem" }}>A 6-digit passcode will be sent to this email.</p>
                    : <p style={es}>{formErrors.email}</p>}
                </div>

                <div style={fg}>
                  <label style={ls}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input className="oc-input" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ paddingRight: "2.75rem" }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={eyeBtn}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.leaf)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.inkMuted)}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {formErrors.pw && <p style={es}>{formErrors.pw}</p>}
                  {password && <StrengthBar pw={password} />}
                </div>

                <button className="oc-btn-primary" onClick={handleSendOtp} disabled={formLoading}>
                  <span>Send Verification Code</span>{formLoading && <Spinner />}
                </button>
                {onGoSignIn ? (
                  <button className="oc-btn-ghost" onClick={onGoSignIn}>← Back to sign in</button>
                ) : (
                  <Link href="/login" className="oc-btn-ghost">← Back to sign in</Link>
                )}
              </div>
            )}

            {/* ═══ OTP ═══ */}
            {screen === "otp" && (
              <div>
                <StepDots step={2} />
                <h2 style={hs}>Check your email</h2>
                <p style={{ fontSize: "0.875rem", color: T.inkMuted, marginBottom: "0.5rem" }}>We've sent a 6-digit passcode to</p>
                <EmailChip email={email} />
                <OtpInput value={otpDigits} onChange={setOtpDigits} />
                {otpError && <p style={{ ...es, textAlign: "center", marginBottom: "0.75rem" }}>{otpError}</p>}
                <button className="oc-btn-primary" onClick={handleVerifyOtp} disabled={otpLoading}>
                  <span>Verify &amp; Create Account</span>{otpLoading && <Spinner />}
                </button>
                <div style={{ textAlign: "center", fontSize: "0.8rem", color: T.inkMuted, marginTop: "1.25rem" }}>
                  Didn't receive it?{" "}
                  <button className="oc-text-link" style={{ fontSize: "0.8rem", opacity: resendSecs > 0 ? 0.45 : 1, cursor: resendSecs > 0 ? "default" : "pointer" }} onClick={resendSecs > 0 ? undefined : handleResend} disabled={resendSecs > 0}>
                    Resend code
                  </button>
                  {resendSecs > 0 && <span> in {resendSecs}s</span>}
                </div>
              </div>
            )}

            {/* ═══ SUCCESS ═══ */}
            {screen === "success" && (
              <div style={{ textAlign: "center" }}>
                <StepDots step={3} />
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.leafLight, color: T.leaf, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 1.25rem" }}>✓</div>
                <h2 style={{ ...hs, textAlign: "center" }}>You're in!</h2>
                <p style={{ fontSize: "0.875rem", color: T.inkMuted, marginBottom: "1.5rem" }}>
                  Your account has been created. Welcome to OpenWebinar — free webinars for everyone.
                </p>
                <button className="oc-btn-primary" onClick={onSuccess ?? (() => router.push("/dashboard"))}>Go to Dashboard →</button>
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

/* ── shared styles ── */
const hs: React.CSSProperties = { fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f1410", marginBottom: "0.35rem" };
const ss: React.CSSProperties = { fontSize: "0.875rem", color: "#6b7a72", marginBottom: "2rem" };
const ls: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#0f1410", marginBottom: "0.4rem" };
const fg: React.CSSProperties = { marginBottom: "1.1rem" };
const es: React.CSSProperties = { fontSize: "0.75rem", color: "#c0392b", marginTop: "0.3rem" };
const eyeBtn: React.CSSProperties = { position: "absolute", right: "0.85rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7a72", padding: 0, display: "flex", alignItems: "center", transition: "color 0.2s" };
