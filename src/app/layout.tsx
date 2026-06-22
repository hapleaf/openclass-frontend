import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const BASE_URL = "https://www.open-webinar.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "OpenWebinar — The World's Only Free Webinar Hub",
    template: "%s | OpenWebinar",
  },

  description:
    "Host and attend free live webinars from expert speakers worldwide. Build your reputation, get discovered, and share knowledge — at zero cost. No subscription. No paywalls.",

  keywords: [
    "free webinars",
    "free online webinars",
    "live webinars",
    "host webinars free",
    "webinar platform",
    "free webinar hosting",
    "online webinar",
    "expert speakers",
    "free live classes",
    "knowledge sharing platform",
    "OpenWebinar",
    "webinar community",
    "attend free webinars",
    "learn online free",
    "Hapleaf Technologies",
  ],

  authors: [{ name: "Hapleaf Technologies Private Limited", url: BASE_URL }],
  creator: "Hapleaf Technologies Private Limited",
  publisher: "Hapleaf Technologies Private Limited",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "OpenWebinar",
    title: "OpenWebinar — The World's Only Free Webinar Hub",
    description:
      "Host and attend free live webinars from expert speakers worldwide. Build your reputation, get discovered, and share knowledge — at zero cost.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "OpenWebinar — Free Webinars for Everyone",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    site: "@openwebinar",
    creator: "@openwebinar",
    title: "OpenWebinar — The World's Only Free Webinar Hub",
    description:
      "Host and attend free live webinars from expert speakers worldwide. Zero cost. No paywalls.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },

  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
