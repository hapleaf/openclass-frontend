import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = "https://www.open-webinar.com";
const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  let s: {
    title?: string;
    description?: string;
    bannerUrl?: string;
    type?: string;
    category?: string;
    skillLevel?: string;
    scheduledAt?: string;
    user?: { firstName?: string; lastName?: string; name?: string };
  } | null = null;

  try {
    const res = await fetch(`${API}/sessions/browse/${id}`, { next: { revalidate: 60 } });
    if (res.ok) s = await res.json();
  } catch {}

  if (!s) return { title: "Session | OpenWebinar" };

  const speakerName = s.user
    ? [s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.name || "OpenWebinar Speaker"
    : "OpenWebinar Speaker";

  const title = `${s.title} — Webinar by ${speakerName} | OpenWebinar`;
  const desc = s.description
    ? s.description.slice(0, 200).replace(/\n/g, " ")
    : `Join this free webinar on OpenWebinar${s.category ? ` · ${s.category}` : ""}${s.skillLevel ? ` · ${s.skillLevel}` : ""}.`;

  const ogImage = s.bannerUrl
    ? { url: s.bannerUrl, width: 1200, height: 630, alt: s.title }
    : { url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: "OpenWebinar — Free Webinars for Everyone" };

  return {
    title,
    description: desc,
    openGraph: {
      title: s.title,
      description: desc,
      type: "website",
      siteName: "OpenWebinar",
      url: `${BASE_URL}/session/${id}`,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: desc,
      images: [ogImage.url],
    },
  };
}

export default function SessionDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
