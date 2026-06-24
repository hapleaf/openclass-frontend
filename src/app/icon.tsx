import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d6b3c",
          borderRadius: 7,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="12" y="5" width="8" height="13" rx="4" fill="white" />
          <path
            d="M8 15.5C8 20.194 11.582 24 16 24C20.418 24 24 20.194 24 15.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <line x1="16" y1="24" x2="16" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="28" x2="20" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
