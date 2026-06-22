"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCachedProfile, getProfile, clearProfileCache, shortName, initials } from "@/lib/profile";

interface HeaderProps {
  userName?: string;
  userRole?: string;
  userInitials?: string;
  activeLink?: "dashboard" | "profile" | "live" | "teachers" | "speakers" | "sessions";
  onSignOut?: () => void;
}

export default function Header({
  userName,
  userRole,
  userInitials,
  activeLink = "dashboard",
  onSignOut,
}: HeaderProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleHover, setRoleHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cachedName, setCachedName] = useState('');
  const [cachedInitials, setCachedInitials] = useState('');
  const [cachedRole, setCachedRole] = useState('');
  const [dashRole, setDashRole] = useState<'teacher' | 'student' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile menu on route change / resize to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useLayoutEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
    if (token) {
      const p = getCachedProfile();
      setCachedName(shortName(p));
      setCachedInitials(initials(p));
      setCachedRole(p.title || '');
      setDashRole((localStorage.getItem('oc_default_role') as 'teacher' | 'student') || null);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsAdmin(payload.role === 'admin');
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    getProfile().then(p => {
      setCachedName(shortName(p));
      setCachedInitials(initials(p));
      setCachedRole(p.title || '');
    }).catch(() => {
      localStorage.removeItem('token');
      clearProfileCache();
      setIsLoggedIn(false);
    });
  }, [isLoggedIn]);

  const displayName     = userName     || cachedName     || '';
  const displayRole     = userRole     || cachedRole     || '';
  const displayInitials = userInitials || cachedInitials || '?';

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    textDecoration: "none",
    color: active ? "#1d6b3c" : "#3a4140",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "0.4rem 0.85rem",
    borderRadius: 100,
    background: active ? "#d4ead9" : "transparent",
    transition: "all 0.2s",
    fontFamily: "var(--font-dm-sans), sans-serif",
  });

  const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
    textDecoration: "none",
    color: active ? "#1d6b3c" : "#0f1410",
    fontSize: "1rem",
    fontWeight: active ? 600 : 500,
    padding: "0.85rem 1rem",
    borderRadius: 12,
    background: active ? "#d4ead9" : "transparent",
    display: "block",
    fontFamily: "var(--font-dm-sans), sans-serif",
    transition: "background 0.15s",
  });

  const handleSignOut = () => {
    localStorage.removeItem("token");
    clearProfileCache();
    setIsLoggedIn(false);
    onSignOut?.();
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push("/login");
  };

  const switchRole = () => {
    const newRole = dashRole === "student" ? "teacher" : "student";
    localStorage.setItem("oc_default_role", newRole);
    setDashRole(newRole);
    setRoleHover(false);
    setMenuOpen(false);
    router.push(newRole === "student" ? "/student-dashboard" : "/dashboard");
  };

  return (
    <>

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        padding: isMobile ? "0.75rem 1.25rem" : "0.85rem 2rem",
        display: "flex", alignItems: "center", gap: "1rem",
        background: "rgba(250,247,242,0.95)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid #e2ded6",
      }}>

        {/* Logo */}
        <Link href="/" style={{ fontFamily: "var(--font-fraunces), Georgia, serif", fontSize: "1.4rem", fontWeight: 700, color: "#0f1410", letterSpacing: "-0.02em", textDecoration: "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          {/* Mic icon — straight, elegant */}
          <svg width="18" height="25" viewBox="0 0 22 30" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="micG" x1="30%" y1="0%" x2="70%" y2="100%">
                <stop offset="0%" stopColor="#34a85a"/>
                <stop offset="100%" stopColor="#1a5e34"/>
              </linearGradient>
              <linearGradient id="micShine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </linearGradient>
            </defs>
            {/* Capsule body — slender pill */}
            <rect x="7" y="1" width="8" height="16" rx="4" fill="url(#micG)"/>
            {/* Left-side shine */}
            <rect x="7" y="1" width="4" height="16" rx="4" fill="url(#micShine)"/>
            {/* Top highlight dot */}
            <ellipse cx="9.5" cy="4.5" rx="1.5" ry="2" fill="rgba(255,255,255,0.28)"/>
            {/* Fine mesh lines */}
            <line x1="7.5" y1="11" x2="14.5" y2="11" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
            <line x1="7.5" y1="13" x2="14.5" y2="13" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
            <line x1="7.5" y1="15" x2="14.5" y2="15" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>
            {/* Stand arc — smooth, thin */}
            <path d="M3 14C3 19.799 6.686 23.5 11 23.5C15.314 23.5 19 19.799 19 14" stroke="#1d6b3c" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            {/* Stand rod */}
            <line x1="11" y1="23.5" x2="11" y2="27" stroke="#1d6b3c" strokeWidth="1.8" strokeLinecap="round"/>
            {/* Base — elegant, tapered */}
            <path d="M6.5 27 Q11 26.2 15.5 27" stroke="#1d6b3c" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
          <span style={{ letterSpacing: "-0.02em" }}>Open<span style={{ color: "#1d6b3c" }}>Webinar</span></span>
        </Link>

        {isMobile ? (
          /* ── Mobile: auth + hamburger ─────────────────────── */
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Show login btn or avatar even on mobile */}
            {isLoggedIn ? (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e8a020", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                {displayInitials}
              </div>
            ) : (
              <Link href="/login" style={{ textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, color: "#fff", background: "#1d6b3c", padding: "0.4rem 0.85rem", borderRadius: 100, fontFamily: "var(--font-dm-sans), sans-serif", whiteSpace: "nowrap" }}>
                Sign in
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{ background: "transparent", border: "1.5px solid #e2ded6", borderRadius: 8, padding: "0.35rem 0.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", justifyContent: "center", width: 38, height: 38 }}
            >
              {menuOpen ? (
                /* X icon */
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0f1410" strokeWidth={2.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                /* Hamburger icon */
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0f1410" strokeWidth={2.5}>
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          /* ── Desktop: nav links + auth ────────────────────── */
          <>
            <ul style={{ display: "flex", alignItems: "center", gap: "0.35rem", listStyle: "none", margin: "0 0 0 auto", padding: 0 }}>
              {isLoggedIn && <li><Link href={dashRole === "student" ? "/student-dashboard" : "/dashboard"} style={linkStyle(activeLink === "dashboard")}>Dashboard</Link></li>}
              <li><Link href="/live" style={linkStyle(activeLink === "live")}>Webinars</Link></li>
              <li><Link href="/speakers" style={linkStyle(activeLink === "speakers" || activeLink === "teachers")}>Speakers</Link></li>
              {isLoggedIn && userRole !== "Student" && dashRole !== "student" && <li><Link href="/my-sessions" style={linkStyle(activeLink === "sessions")}>My Webinars</Link></li>}
              {isLoggedIn && (
                <li style={{ position: "relative" }}
                  onMouseEnter={() => setRoleHover(true)}
                  onMouseLeave={() => setRoleHover(false)}>
                  <button onClick={switchRole} style={{ display: "flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: "#1a4f7a", background: "#ddeaf8", border: "1.5px solid #b8d4ee", padding: "0.35rem 0.85rem", borderRadius: 100, fontFamily: "var(--font-dm-sans), sans-serif", whiteSpace: "nowrap" as const, cursor: "pointer" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} style={{ flexShrink: 0 }}><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
                    {dashRole === "student" ? "Switch to Speaker" : "Switch to Attendee"}
                  </button>

                  {roleHover && (
                    <div style={{ position: "absolute", top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", width: 280, background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 14, boxShadow: "0 8px 28px rgba(15,20,16,0.12)", padding: "1rem 1.1rem", zIndex: 400, pointerEvents: "none" }}>
                      <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, background: "#fff", border: "1.5px solid #e2ded6", borderBottom: "none", borderRight: "none", rotate: "45deg" }} />
                      {dashRole === "student" ? (
                        <>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f1410", marginBottom: "0.4rem" }}>Switch to Speaker view</div>
                          <div style={{ fontSize: "0.76rem", color: "#3a4140", lineHeight: 1.55 }}>
                            You are currently in <strong>Attendee mode</strong>. Switching to Speaker view lets you host webinars, manage your schedule, track registrations, and build your speaker profile.
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f1410", marginBottom: "0.4rem" }}>Switch to Attendee view</div>
                          <div style={{ fontSize: "0.76rem", color: "#3a4140", lineHeight: 1.55 }}>
                            You are currently in <strong>Speaker mode</strong>. Switching to Attendee view lets you browse and join webinars — discover sessions from other speakers, register, and track your learning journey.
                          </div>
                        </>
                      )}
                      <div style={{ marginTop: "0.65rem", fontSize: "0.7rem", color: "#1a4f7a", fontWeight: 600 }}>Click to switch →</div>
                    </div>
                  )}
                </li>
              )}
              {isAdmin && (
                <li>
                  <Link href="/admin" style={{ textDecoration: "none", fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: "#0f1410", padding: "0.35rem 0.9rem", borderRadius: 100, fontFamily: "var(--font-dm-sans), sans-serif", letterSpacing: "0.02em" }}>
                    ⚙ Admin
                  </Link>
                </li>
              )}
            </ul>

            {/* Desktop auth */}
            {isLoggedIn ? (
              <div ref={userRef} style={{ position: "relative" }}>
                <div onClick={() => setDropdownOpen((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.4rem 0.9rem 0.4rem 0.5rem", border: `1.5px solid ${dropdownOpen ? "#1d6b3c" : "#e2ded6"}`, borderRadius: 100, cursor: "pointer", background: "#fff", transition: "border-color 0.2s" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#e8a020", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                    {displayInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f1410", lineHeight: 1.2 }}>{displayName}</div>
                    {displayRole && <div style={{ fontSize: "0.7rem", color: "#1d6b3c", fontWeight: 500 }}>{displayRole}</div>}
                  </div>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#6b7a72" strokeWidth={2.5} style={{ transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>

                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200, background: "#fff", border: "1.5px solid #e2ded6", borderRadius: 16, boxShadow: "0 8px 32px rgba(15,20,16,0.1)", overflow: "hidden", zIndex: 300 }}>
                    <Link href="/profile" onClick={() => setDropdownOpen(false)} style={ddItem()}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      My Profile
                    </Link>
                    <div style={{ height: 1, background: "#e2ded6" }} />
                    <button onClick={handleSignOut} style={{ ...ddItem(true), width: "100%", textAlign: "left" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" style={{ textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, color: "#fff", background: "#1d6b3c", padding: "0.45rem 1.2rem", borderRadius: 100, fontFamily: "var(--font-dm-sans), sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                Sign in to Host / Attend Webinar
              </Link>
            )}
          </>
        )}
      </nav>

      {/* ── Mobile slide-down menu ─────────────────────────────────── */}
      {isMobile && menuOpen && (
        <div style={{
          position: "fixed", top: 57, left: 0, right: 0, bottom: 0,
          zIndex: 199,
          background: "rgba(250,247,242,0.98)", backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
          padding: "0.75rem 1.25rem 2rem",
          borderTop: "1px solid #e2ded6",
        }}>

          {/* Main nav links */}
          {isLoggedIn && (
            <Link href={dashRole === "student" ? "/student-dashboard" : "/dashboard"} onClick={() => setMenuOpen(false)} style={mobileLinkStyle(activeLink === "dashboard")}>
              Dashboard
            </Link>
          )}
          <Link href="/live" onClick={() => setMenuOpen(false)} style={mobileLinkStyle(activeLink === "live")}>
            Webinars
          </Link>
          <Link href="/speakers" onClick={() => setMenuOpen(false)} style={mobileLinkStyle(activeLink === "speakers" || activeLink === "teachers")}>
            Speakers
          </Link>
          {isLoggedIn && userRole !== "Student" && dashRole !== "student" && (
            <Link href="/my-sessions" onClick={() => setMenuOpen(false)} style={mobileLinkStyle(activeLink === "sessions")}>
              My Webinars
            </Link>
          )}

          {/* Role switcher */}
          {isLoggedIn && (
            <button onClick={switchRole} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#1a4f7a", background: "#ddeaf8", border: "1.5px solid #b8d4ee", padding: "0.7rem 1rem", borderRadius: 12, fontFamily: "var(--font-dm-sans), sans-serif", cursor: "pointer", margin: "0.25rem 0", textAlign: "left" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} style={{ flexShrink: 0 }}><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
              {dashRole === "student" ? "Switch to Speaker" : "Switch to Attendee"}
            </button>
          )}

          {/* Admin */}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", fontSize: "0.9rem", fontWeight: 700, color: "#fff", background: "#0f1410", padding: "0.7rem 1rem", borderRadius: 12, fontFamily: "var(--font-dm-sans), sans-serif", margin: "0.25rem 0", display: "block" }}>
              ⚙ Admin Panel
            </Link>
          )}

          {/* Divider + user section */}
          {isLoggedIn && (
            <>
              <div style={{ height: 1, background: "#e2ded6", margin: "1rem 0" }} />

              {/* User info */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.5rem 1rem" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#e8a020", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
                  {displayInitials}
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f1410" }}>{displayName}</div>
                  {displayRole && <div style={{ fontSize: "0.78rem", color: "#1d6b3c" }}>{displayRole}</div>}
                </div>
              </div>

              <Link href="/profile" onClick={() => setMenuOpen(false)} style={{ ...mobileLinkStyle(false), display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                My Profile
              </Link>

              <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "1rem", fontWeight: 500, color: "#c0392b", background: "transparent", border: "none", padding: "0.85rem 1rem", borderRadius: 12, fontFamily: "var(--font-dm-sans), sans-serif", cursor: "pointer", textAlign: "left" }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                Sign Out
              </button>
            </>
          )}

          {/* Logged out CTA */}
          {!isLoggedIn && (
            <>
              <div style={{ height: 1, background: "#e2ded6", margin: "1rem 0" }} />
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", fontSize: "1rem", fontWeight: 600, color: "#fff", background: "#1d6b3c", padding: "0.85rem 1rem", borderRadius: 12, fontFamily: "var(--font-dm-sans), sans-serif", display: "block", textAlign: "center", margin: "0.25rem 0" }}>
                Sign in to Host / Attend Webinar
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none", fontSize: "1rem", fontWeight: 500, color: "#0f1410", background: "transparent", border: "1.5px solid #e2ded6", padding: "0.85rem 1rem", borderRadius: 12, fontFamily: "var(--font-dm-sans), sans-serif", display: "block", textAlign: "center", margin: "0.25rem 0" }}>
                Create account
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ddItem(danger = false): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.65rem 1rem", fontSize: "0.85rem",
    color: danger ? "#c0392b" : "#3a4140",
    textDecoration: "none", cursor: "pointer",
    background: "transparent", border: "none",
    fontFamily: "var(--font-dm-sans), sans-serif",
    transition: "background 0.15s",
  };
}
