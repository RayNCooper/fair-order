import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FairOrder – Dein Speiseplan, digital",
    short_name: "FairOrder",
    description:
      "Speiseplan hochladen, QR-Code ausdrucken, fertig. Das einfachste Tool für Kantinen, Mensen & Bäckereien.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#22C55E",
    lang: "de",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
