import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenWebinar",
    short_name: "OpenWebinar",
    description: "Host and attend free live webinars from expert speakers worldwide.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#1d6b3c",
    icons: [
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  };
}
