"use client";

import LoginHeader from "../../components/common/HeadFoot/loginheader";
import Footer from "../../components/common/HeadFoot/footer";
import { login, forgotPassword, resetPassword } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import "./page.css";

/* ── tokens ── */
const T = {
  ink: "#0f1410",
  inkSoft: "#3a4140",
  inkMuted: "#6b7a72",
  leaf: "#1d6b3c",
  leafDark: "#145c30",
  leafLight: "#d4ead9",
  leafMid: "#4a9e68",
  sky: "#1a4f7a",
  skyLight: "#ddeaf8",
  cream: "#faf7f2",
  white: "#ffffff",
  border: "#e2ded6",
  error: "#c0392b",
  ff: "var(--font-dm-sans), sans-serif",
  ffD: "var(--font-fraunces), Georgia, serif",
  r: "10px",
};

/* ── helpers ── */
function Spinner() {
  return (
    <span style={{
      width: 18, height: 18,
      border: "2px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff", borderRadius: "50%",
      display: "inline-block",
      animation: "oc-spin 0.7s linear infinite",
    }} />
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
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

/* ── Left panel ── */
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
    <div style={{
      background: T.ink, padding: "4rem 3.5rem",
      display: "flex", flexDirection: "column", justifyContent: "center",
      position: "relative", overflow: "hidden",
      minHeight: "calc(100vh - 64px)",
    }}>
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
          <RoleCard
            icon="🎙️" iconBg="rgba(232,160,32,0.15)"
            title="For Speakers" subtitle="Share your expertise with the world"
            description="Whether you're a seasoned professional, researcher, or passionate expert — host live webinars that reach a global audience at absolutely zero cost."
            perks={TEACHER_PERKS}
          />
          <RoleCard
            icon="🎧" iconBg="rgba(29,107,60,0.2)"
            title="For Attendees" subtitle="Learn from experts, for free"
            description="Access live webinars from industry professionals, researchers, and domain experts worldwide. Ask questions in real time, rate webinars, and follow speakers you love."
            perks={STUDENT_PERKS}
          />
        </div>
      </div>
    </div>
  );
}

/* ── OTP Input ── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value]; next[i] = digit; onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      const next = [...value]; next[i - 1] = ""; onChange(next);
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
        <input key={i} ref={(el) => { refs.current[i] = el; }}
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

/* ── Props ── */
export interface SignInProps {
  /** Called with email+password credentials */
  onSubmit?: (values: { email: string; password: string }) => Promise<void> | void;
  /** Navigate to Sign Up page */
  onGoSignUp?: () => void;
  /** External API error */
  errorMessage?: string;
}

type Screen = "login" | "forgot" | "forgot-reset" | "forgot-done";

export default function SignIn({ onSubmit, onGoSignUp, errorMessage }: SignInProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("login");

  useEffect(() => {
    if (localStorage.getItem("token")) router.replace(localStorage.getItem("oc_default_role") === "teacher" ? "/dashboard" : localStorage.getItem("oc_default_role") === "student" ? "/student-dashboard" : "/roles");
  }, [router]);

  /* login */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  /* forgot */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  /* reset */
  const [resetOtp, setResetOtp] = useState(["", "", "", "", "", ""]);
  const [resetPw, setResetPw] = useState("");
  const [resetConfirmPw, setResetConfirmPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResendSecs, setResetResendSecs] = useState(0);
  const resetTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  React.useEffect(() => () => { if (resetTimerRef.current) clearInterval(resetTimerRef.current); }, []);

  function startResetTimer() {
    setResetResendSecs(30);
    if (resetTimerRef.current) clearInterval(resetTimerRef.current);
    resetTimerRef.current = setInterval(() => {
      setResetResendSecs((s) => { if (s <= 1) { clearInterval(resetTimerRef.current!); return 0; } return s - 1; });
    }, 1000);
  }

  const displayError = loginError || errorMessage || "";

  async function handleLogin(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    setLoginError("");
    if (!email || !password) { setLoginError("Please enter your email and password."); return; }
    setLoginLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ email, password });
      } else {
        const data = await login({ email, password });
        localStorage.setItem("token", data.accessToken);
        await getProfile().catch(() => {});
        const def = localStorage.getItem("oc_default_role");
        router.push(def === "teacher" ? "/dashboard" : def === "student" ? "/student-dashboard" : "/roles");
      }
    }
    catch (err) { setLoginError(err instanceof Error ? err.message : "Incorrect email or password. Please try again."); }
    finally { setLoginLoading(false); }
  }

  async function handleForgot(e: React.MouseEvent) {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      setSentEmail(forgotEmail);
      setScreen("forgot-reset");
      startResetTimer();
    }
    catch (err) { setForgotError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setForgotLoading(false); }
  }

  async function handleResetPassword(e: React.MouseEvent) {
    e.preventDefault();
    setResetError("");
    const code = resetOtp.join("");
    if (code.length < 6) { setResetError("Please enter the full 6-digit code."); return; }
    if (resetPw.length < 8) { setResetError("Password must be at least 8 characters."); return; }
    if (resetPw !== resetConfirmPw) { setResetError("Passwords do not match."); return; }
    setResetLoading(true);
    try {
      await resetPassword({ email: sentEmail, code, password: resetPw });
      setScreen("forgot-done");
    }
    catch (err) { setResetError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setResetLoading(false); }
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

            {/* ═══ LOGIN ═══ */}
            {screen === "login" && (
              <div>
                <h2 style={hs}>Welcome back</h2>
                <p style={ss}>
                  Don't have an account?{" "}
                  {onGoSignUp ? (
                    <button className="oc-text-link" onClick={onGoSignUp}>Sign up free</button>
                  ) : (
                    <Link href="/signup" className="oc-text-link">Sign up free</Link>
                  )}
                </p>

                {/* Email */}
                <div style={fg}>
                  <label style={ls}>Email address</label>
                  <input
                    className="oc-input" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                  />
                </div>

                {/* Password */}
                <div style={fg}>
                  <label style={ls}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="oc-input" type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{ paddingRight: "2.75rem" }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogin(e)}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={eyeBtn}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.leaf)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.inkMuted)}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {displayError && <p style={es}>{displayError}</p>}
                </div>

                <button className="oc-forgot-link" onClick={() => setScreen("forgot")}>Forgot password?</button>

                <button className="oc-btn-primary" onClick={handleLogin} disabled={loginLoading}>
                  <span>Sign In</span>{loginLoading && <Spinner />}
                </button>
                {onGoSignUp ? (
                  <button className="oc-btn-ghost" onClick={onGoSignUp}>Create a free account →</button>
                ) : (
                  <Link href="/signup" className="oc-btn-ghost">Create a free account →</Link>
                )}
              </div>
            )}

            {/* ═══ FORGOT PASSWORD ═══ */}
            {screen === "forgot" && (
              <div>
                <h2 style={hs}>Forgot password?</h2>
                <p style={{ ...ss, marginBottom: "1.75rem" }}>Enter your email and we'll send you a reset link.</p>
                <div style={fg}>
                  <label style={ls}>Email address</label>
                  <input
                    className="oc-input" type="email" value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={(e) => e.key === "Enter" && handleForgot(e as unknown as React.MouseEvent)}
                  />
                  {forgotError && <p style={es}>{forgotError}</p>}
                </div>
                <button className="oc-btn-primary" onClick={handleForgot} disabled={forgotLoading}>
                  <span>Send Reset Link</span>{forgotLoading && <Spinner />}
                </button>
                <button className="oc-btn-ghost" onClick={() => setScreen("login")}>← Back to sign in</button>
              </div>
            )}

            {/* ═══ FORGOT RESET ═══ */}
            {screen === "forgot-reset" && (
              <div>
                <h2 style={hs}>Reset your password</h2>
                <p style={{ fontSize: "0.875rem", color: T.inkMuted, marginBottom: "0.5rem" }}>We've sent a 6-digit code to</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 100, padding: "0.3rem 0.85rem", fontSize: "0.8rem", color: T.inkSoft, fontWeight: 500, marginBottom: "0.25rem" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8l10 6 10-6" /></svg>
                  {sentEmail}
                </div>
                <OtpInput value={resetOtp} onChange={setResetOtp} />
                <div style={fg}>
                  <label style={ls}>New password</label>
                  <div style={{ position: "relative" }}>
                    <input className="oc-input" type={showResetPw ? "text" : "password"} value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)} placeholder="At least 8 characters"
                      style={{ paddingRight: "2.75rem" }} />
                    <button type="button" onClick={() => setShowResetPw((v) => !v)} style={eyeBtn}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.leaf)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = T.inkMuted)}>
                      {showResetPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div style={fg}>
                  <label style={ls}>Confirm new password</label>
                  <input className="oc-input" type="password" value={resetConfirmPw}
                    onChange={(e) => setResetConfirmPw(e.target.value)} placeholder="Repeat your new password" />
                </div>
                {resetError && <p style={{ ...es, marginBottom: "0.75rem" }}>{resetError}</p>}
                <button className="oc-btn-primary" onClick={handleResetPassword} disabled={resetLoading}>
                  <span>Reset Password</span>{resetLoading && <Spinner />}
                </button>
                <div style={{ textAlign: "center", fontSize: "0.8rem", color: T.inkMuted, marginTop: "1.25rem" }}>
                  Didn't receive it?{" "}
                  <button className="oc-text-link"
                    style={{ fontSize: "0.8rem", opacity: resetResendSecs > 0 ? 0.45 : 1, cursor: resetResendSecs > 0 ? "default" : "pointer" }}
                    disabled={resetResendSecs > 0}
                    onClick={resetResendSecs > 0 ? undefined : async () => {
                      try { await forgotPassword(sentEmail); startResetTimer(); } catch { /* silent */ }
                    }}>
                    Resend code
                  </button>
                  {resetResendSecs > 0 && <span> in {resetResendSecs}s</span>}
                </div>
                <button className="oc-btn-ghost" onClick={() => setScreen("forgot")}>← Back</button>
              </div>
            )}

            {/* ═══ FORGOT DONE ═══ */}
            {screen === "forgot-done" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.leafLight, color: T.leaf, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 1.25rem" }}>✓</div>
                <h2 style={{ ...hs, textAlign: "center" }}>Password reset!</h2>
                <p style={{ fontSize: "0.875rem", color: T.inkMuted, marginBottom: "1.5rem" }}>
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <button className="oc-btn-primary" onClick={() => setScreen("login")}>Back to Sign In</button>
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
