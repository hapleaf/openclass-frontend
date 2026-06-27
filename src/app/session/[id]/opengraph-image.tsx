import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OpenWebinar Session";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

function speakerInitials(user?: { firstName?: string; lastName?: string; name?: string }): string {
  if (!user) return "?";
  if (user.firstName && user.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
  if (user.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user.name) return user.name.slice(0, 2).toUpperCase();
  return "?";
}

function speakerFullName(user?: { firstName?: string; lastName?: string; name?: string }): string {
  if (!user) return "OpenWebinar Speaker";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "OpenWebinar Speaker";
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(iso)) + " UTC";
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let s: {
    title?: string;
    scheduledAt?: string;
    duration?: number;
    category?: string;
    skillLevel?: string;
    user?: { firstName?: string; lastName?: string; name?: string };
  } | null = null;

  try {
    const res = await fetch(`${API}/sessions/browse/${id}`, { next: { revalidate: 60 } });
    if (res.ok) s = await res.json();
  } catch {}

  const title = s?.title ?? "Live Webinar";
  const name = speakerFullName(s?.user);
  const initials = speakerInitials(s?.user);
  const date = s?.scheduledAt ? fmtDate(s.scheduledAt) : null;
  const time = s?.scheduledAt ? fmtTime(s.scheduledAt) : null;
  const duration = s?.duration ? `${s.duration} min` : null;
  const category = s?.category ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0b1a10 0%, #0f2318 55%, #0d1c2e 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Green glow top-right */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            background: "rgba(29,107,60,0.2)",
            borderRadius: "50%",
            filter: "blur(90px)",
            top: -180,
            right: -80,
          }}
        />

        {/* Blue glow bottom-left */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            background: "rgba(26,79,122,0.18)",
            borderRadius: "50%",
            filter: "blur(90px)",
            bottom: -140,
            left: -80,
          }}
        />

        {/* Top bar: logo + LIVE WEBINAR badge */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "40px 56px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>
            <span style={{ color: "#ffffff" }}>Open</span>
            <span style={{ color: "#4a9e68" }}>Webinar</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(29,107,60,0.25)",
              border: "1px solid rgba(29,107,60,0.5)",
              color: "#7ed9a4",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              padding: "8px 20px",
              borderRadius: 100,
            }}
          >
            🎙️ Free Webinar
          </div>
        </div>

        {/* Main content — centered */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 56px",
            position: "relative",
          }}
        >
          {/* Category pill */}
          {category && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.55)",
                fontSize: 16,
                fontWeight: 600,
                padding: "5px 16px",
                borderRadius: 100,
                marginBottom: 20,
                letterSpacing: "0.03em",
              }}
            >
              {category}
            </div>
          )}

          {/* Session title */}
          <div
            style={{
              fontSize: title.length > 50 ? 42 : title.length > 35 ? 50 : 58,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-1px",
              maxWidth: 980,
              marginBottom: 36,
            }}
          >
            {title}
          </div>

          {/* Speaker row */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 36 }}>
            {/* Avatar */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1d6b3c, #2d9d5c)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Speaker
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                {name}
              </div>
            </div>
          </div>

          {/* Info pills row: date · time · duration */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {date && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 18,
                  fontWeight: 500,
                  padding: "9px 20px",
                  borderRadius: 100,
                }}
              >
                📅 {date}
              </div>
            )}
            {time && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 18,
                  fontWeight: 500,
                  padding: "9px 20px",
                  borderRadius: 100,
                }}
              >
                🕐 {time}
              </div>
            )}
            {duration && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "rgba(29,107,60,0.2)",
                  border: "1px solid rgba(29,107,60,0.4)",
                  color: "#7ed9a4",
                  fontSize: 18,
                  fontWeight: 600,
                  padding: "9px 20px",
                  borderRadius: 100,
                }}
              >
                ⏱ {duration}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "relative",
            padding: "0 56px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.2)", letterSpacing: "0.02em" }}>
            open-webinar.com
          </div>
          <div style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
            Free · No registration required
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
