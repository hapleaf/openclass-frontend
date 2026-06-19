import type { Metadata } from "next";
import type { ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

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

  if (!s) return { title: "Session | OpenClass" };

  const teacherName = s.user
    ? [s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.name || "OpenClass Teacher"
    : "OpenClass Teacher";

  const typeLabel = s.type === "webinar" ? "Webinar" : "Live Class";
  const title = `${s.title} — ${typeLabel} by ${teacherName} | OpenClass`;
  const desc = s.description
    ? s.description.slice(0, 200).replace(/\n/g, " ")
    : `Join this free ${typeLabel.toLowerCase()} on OpenClass${s.category ? ` · ${s.category}` : ""}${s.skillLevel ? ` · ${s.skillLevel}` : ""}.`;

  const images = s.bannerUrl
    ? [{ url: s.bannerUrl, width: 1200, height: 630, alt: s.title }]
    : [];

  return {
    title,
    description: desc,
    openGraph: {
      title: s.title,
      description: desc,
      type: "website",
      siteName: "OpenClass",
      ...(images.length && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: desc,
      ...(s.bannerUrl && { images: [s.bannerUrl] }),
    },
  };
}

export default function SessionDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
