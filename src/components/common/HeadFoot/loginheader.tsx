"use client";

import React from "react";

interface LoginHeaderProps {
  backHref?: string;
  onBackClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function LoginHeader({
  backHref = "/",
  onBackClick,
}: LoginHeaderProps) {
  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(250,247,242,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #e2ded6",
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            fontFamily: "var(--font-fraunces), Georgia, serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#0f1410",
            letterSpacing: "-0.02em",
            textDecoration: "none",
          }}
        >
          Open<span style={{ color: "#1d6b3c" }}>Webinar</span>
        </a>

        {/* Back to home */}
        <a
          href={backHref}
          onClick={onBackClick}
          style={{
            fontSize: "0.85rem",
            color: "#6b7a72",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "#1d6b3c")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = "#6b7a72")
          }
        >
          <svg
            width="14"
            height="14"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to home
        </a>
      </nav>
    </>
  );
}
