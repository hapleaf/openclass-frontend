import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OpenWebinar — The World's Only Free Webinar Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b1a10 0%, #0f2318 50%, #0d1c2e 100%)",
          fontFamily: "serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dot grid texture */}
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
            width: 600,
            height: 600,
            background: "rgba(29,107,60,0.18)",
            borderRadius: "50%",
            filter: "blur(100px)",
            top: -200,
            right: -100,
          }}
        />
        {/* Blue glow bottom-left */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            background: "rgba(26,79,122,0.15)",
            borderRadius: "50%",
            filter: "blur(100px)",
            bottom: -150,
            left: -100,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(29,107,60,0.25)",
              border: "1px solid rgba(29,107,60,0.5)",
              color: "#7ed9a4",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "6px 20px",
              borderRadius: 100,
              marginBottom: 32,
              textTransform: "uppercase",
            }}
          >
            🌐 Free · No Subscription · No Paywalls
          </div>

          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-2px",
              marginBottom: 24,
              lineHeight: 1,
            }}
          >
            <span style={{ color: "#ffffff" }}>Open</span>
            <span style={{ color: "#4a9e68" }}>Webinar</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 400,
              maxWidth: 780,
              lineHeight: 1.5,
              marginBottom: 48,
              fontFamily: "sans-serif",
            }}
          >
            Host and attend free live webinars from expert speakers worldwide.
          </div>

          {/* Pill features */}
          <div style={{ display: "flex", gap: 16 }}>
            {["🎙️ Host for Free", "🎧 Attend Webinars", "📢 Build Your Audience"].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 20,
                  fontWeight: 500,
                  padding: "10px 24px",
                  borderRadius: 100,
                  fontFamily: "sans-serif",
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            fontSize: 18,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          open-webinar.com
        </div>
      </div>
    ),
    { ...size }
  );
}
